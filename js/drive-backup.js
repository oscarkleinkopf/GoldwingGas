/* GoldwingGas — respaldo opcional en Google Drive (OAuth, solo archivos de esta app) */

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file openid email';
const DRIVE_FOLDER_NAME = 'GoldwingGas';
const DRIVE_FILE_NAME = 'goldwing_gas_backup.json';
const DRIVE_TOKEN_KEY = 'goldwing_google_token';

function getGoogleClientId() {
  const fromSettings = state.settings && state.settings.googleClientId;
  const fromConfig = typeof window.GOLDWING_GOOGLE_CLIENT_ID === 'string' ? window.GOLDWING_GOOGLE_CLIENT_ID : '';
  return String(fromSettings || fromConfig || '').trim();
}

function readStoredDriveToken() {
  try {
    const raw = sessionStorage.getItem(DRIVE_TOKEN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed.accessToken || !parsed.expiresAt) return null;
    if (Date.now() > parsed.expiresAt - 15000) return null;
    return parsed;
  } catch (err) {
    return null;
  }
}

function writeStoredDriveToken(accessToken, expiresIn) {
  const expiresAt = Date.now() + (Math.max(30, Number(expiresIn) || 3600) * 1000);
  sessionStorage.setItem(DRIVE_TOKEN_KEY, JSON.stringify({ accessToken, expiresAt }));
}

function clearStoredDriveToken() {
  sessionStorage.removeItem(DRIVE_TOKEN_KEY);
}

function waitForGoogleIdentity() {
  return new Promise((resolve, reject) => {
    if (window.google && google.accounts && google.accounts.oauth2) {
      resolve();
      return;
    }
    let n = 0;
    const timer = setInterval(() => {
      if (window.google && google.accounts && google.accounts.oauth2) {
        clearInterval(timer);
        resolve();
        return;
      }
      if (++n > 60) {
        clearInterval(timer);
        reject(new Error('No se cargó el inicio de sesión de Google. Revisa la conexión.'));
      }
    }, 100);
  });
}

function requestGoogleAccessToken() {
  const clientId = getGoogleClientId();
  if (!clientId) {
    return Promise.reject(new Error('Falta el Client ID de Google. Pégalo en Ajustes (sección Google Drive).'));
  }
  return waitForGoogleIdentity().then(() => new Promise((resolve, reject) => {
    const tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: DRIVE_SCOPE,
      callback: (resp) => {
        if (resp && resp.access_token) {
          writeStoredDriveToken(resp.access_token, resp.expires_in);
          resolve(resp.access_token);
          return;
        }
        reject(new Error((resp && resp.error_description) || 'No se obtuvo permiso de Google.'));
      },
      error_callback: (err) => {
        reject(new Error((err && err.message) || 'Inicio de sesión cancelado.'));
      }
    });
    tokenClient.requestAccessToken({ prompt: readStoredDriveToken() ? '' : 'consent' });
  }));
}

async function getDriveAccessToken(interactive) {
  const stored = readStoredDriveToken();
  if (stored) return stored.accessToken;
  if (!interactive) return '';
  return requestGoogleAccessToken();
}

async function driveFetch(url, options) {
  const token = await getDriveAccessToken(true);
  const headers = Object.assign({ Authorization: `Bearer ${token}` }, (options && options.headers) || {});
  const res = await fetch(url, Object.assign({}, options, { headers }));
  if (res.status === 401) {
    clearStoredDriveToken();
    const retryToken = await requestGoogleAccessToken();
    headers.Authorization = `Bearer ${retryToken}`;
    return fetch(url, Object.assign({}, options, { headers }));
  }
  return res;
}

async function fetchGoogleAccount() {
  const res = await driveFetch('https://www.googleapis.com/oauth2/v3/userinfo');
  if (!res.ok) return null;
  return res.json();
}

async function findDriveItem(name, mimeType, parentId) {
  const parts = [`name = '${name.replace(/'/g, "\\'")}'`, 'trashed = false'];
  if (mimeType) parts.push(`mimeType = '${mimeType}'`);
  if (parentId) parts.push(`'${parentId}' in parents`);
  const q = encodeURIComponent(parts.join(' and '));
  const res = await driveFetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,modifiedTime)&pageSize=5`);
  if (!res.ok) throw new Error('No se pudo buscar en Drive.');
  const data = await res.json();
  return (data.files && data.files[0]) || null;
}

async function ensureDriveFolder() {
  if (state.settings.driveFolderId) {
    const probe = await driveFetch(`https://www.googleapis.com/drive/v3/files/${state.settings.driveFolderId}?fields=id,trashed`);
    if (probe.ok) {
      const info = await probe.json();
      if (!info.trashed) return state.settings.driveFolderId;
    }
    state.settings.driveFolderId = '';
  }
  const existing = await findDriveItem(DRIVE_FOLDER_NAME, 'application/vnd.google-apps.folder');
  if (existing) {
    state.settings.driveFolderId = existing.id;
    saveData();
    return existing.id;
  }
  const res = await driveFetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: DRIVE_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder'
    })
  });
  if (!res.ok) throw new Error('No se pudo crear la carpeta GoldwingGas en Drive.');
  const created = await res.json();
  state.settings.driveFolderId = created.id;
  saveData();
  return created.id;
}

async function uploadBackupToDrive(payload) {
  const folderId = await ensureDriveFolder();
  const body = JSON.stringify(payload, null, 2);
  const metadata = {
    name: DRIVE_FILE_NAME,
    mimeType: 'application/json',
    parents: [folderId]
  };
  let fileId = state.settings.driveFileId || '';
  if (fileId) {
    const probe = await driveFetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,trashed`);
    if (!probe.ok) fileId = '';
    else {
      const info = await probe.json();
      if (info.trashed) fileId = '';
    }
  }
  if (!fileId) {
    const existing = await findDriveItem(DRIVE_FILE_NAME, 'application/json', folderId);
    if (existing) fileId = existing.id;
  }

  const boundary = 'goldwinggas_' + Date.now();
  const multipart = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(fileId ? { name: DRIVE_FILE_NAME, mimeType: 'application/json' } : metadata),
    `--${boundary}`,
    'Content-Type: application/json',
    '',
    body,
    `--${boundary}--`
  ].join('\r\n');

  const url = fileId
    ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`
    : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
  const res = await driveFetch(url, {
    method: fileId ? 'PATCH' : 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body: multipart
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error('Drive rechazó el archivo: ' + (text.slice(0, 180) || res.status));
  }
  const saved = await res.json();
  state.settings.driveFileId = saved.id;
  state.settings.lastDriveBackupAt = new Date().toISOString();
  saveData();
  return saved;
}

async function downloadBackupFromDrive() {
  let fileId = state.settings.driveFileId || '';
  if (!fileId) {
    const folderId = state.settings.driveFolderId || '';
    const found = await findDriveItem(DRIVE_FILE_NAME, 'application/json', folderId || undefined);
    if (!found) throw new Error('No hay un goldwing_gas_backup.json de esta app en tu Drive.');
    fileId = found.id;
    state.settings.driveFileId = fileId;
  }
  const res = await driveFetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`);
  if (!res.ok) throw new Error('No se pudo leer el respaldo de Drive.');
  return res.json();
}

function renderDriveBackupStatus(account) {
  const statusEl = document.getElementById('drive-backup-status');
  const accountEl = document.getElementById('drive-account-label');
  const lastEl = document.getElementById('drive-last-label');
  const signedIn = !!(account && account.email);
  if (accountEl) {
    accountEl.textContent = signedIn ? account.email : 'Sin sesión de Google';
  }
  if (lastEl) {
    lastEl.textContent = formatBackupDate(state.settings.lastDriveBackupAt || '');
  }
  if (statusEl) {
    statusEl.classList.toggle('is-connected', signedIn);
  }
  document.querySelectorAll('[data-drive-authed]').forEach((el) => {
    el.hidden = !signedIn;
  });
  document.querySelectorAll('[data-drive-guest]').forEach((el) => {
    el.hidden = signedIn;
  });
}

async function refreshDriveUi(interactive) {
  try {
    const token = await getDriveAccessToken(!!interactive);
    if (!token) {
      renderDriveBackupStatus(null);
      return null;
    }
    const account = await fetchGoogleAccount();
    renderDriveBackupStatus(account);
    return account;
  } catch (err) {
    renderDriveBackupStatus(null);
    return null;
  }
}

async function connectGoogleDrive() {
  const account = await refreshDriveUi(true);
  if (!account) throw new Error('No se pudo iniciar sesión con Google.');
  notifyUser('Conectado a Google Drive como ' + account.email, 'success');
  return account;
}

async function disconnectGoogleDrive() {
  const stored = readStoredDriveToken();
  if (stored && window.google && google.accounts && google.accounts.oauth2) {
    try { google.accounts.oauth2.revoke(stored.accessToken); } catch (err) { /* ignore */ }
  }
  clearStoredDriveToken();
  renderDriveBackupStatus(null);
  notifyUser('Sesión de Google cerrada. Los datos locales siguen en este teléfono.', 'info');
}

async function pushBackupToDrive() {
  const payload = await buildBackupPayload();
  await uploadBackupToDrive(payload);
  markBackupDone();
  renderDriveBackupStatus({ email: (document.getElementById('drive-account-label') || {}).textContent });
  await refreshDriveUi(false);
}

async function pullBackupFromDrive() {
  const payload = await downloadBackupFromDrive();
  const ok = await importBackupPayload(payload);
  if (!ok) throw new Error('El JSON de Drive no es un respaldo GoldwingGas válido.');
}

function initDriveBackupUi() {
  const clientInput = document.getElementById('settings-google-client-id');
  if (clientInput) clientInput.value = getGoogleClientId();

  const saveClient = document.getElementById('btn-save-google-client');
  if (saveClient) {
    saveClient.addEventListener('click', () => {
      const value = (document.getElementById('settings-google-client-id').value || '').trim();
      state.settings.googleClientId = value;
      saveData();
      notifyUser(value ? 'Client ID guardado en este navegador.' : 'Client ID borrado.', 'success');
    });
  }

  const connectBtn = document.getElementById('btn-drive-connect');
  if (connectBtn) {
    connectBtn.addEventListener('click', async () => {
      try {
        await connectGoogleDrive();
      } catch (err) {
        notifyUser(err.message, 'error');
      }
    });
  }

  const disconnectBtn = document.getElementById('btn-drive-disconnect');
  if (disconnectBtn) {
    disconnectBtn.addEventListener('click', () => disconnectGoogleDrive());
  }

  const uploadBtn = document.getElementById('btn-drive-upload');
  const bannerDrive = document.getElementById('btn-backup-drive');
  const doUpload = async () => {
    try {
      await connectGoogleDrive();
      await pushBackupToDrive();
      notifyUser('Respaldo subido a Google Drive (carpeta GoldwingGas).', 'success');
      updateBackupStatus();
    } catch (err) {
      notifyUser(err.message || 'No se pudo subir a Drive.', 'error');
    }
  };
  if (uploadBtn) uploadBtn.addEventListener('click', doUpload);
  if (bannerDrive) bannerDrive.addEventListener('click', doUpload);

  const restoreBtn = document.getElementById('btn-drive-restore');
  if (restoreBtn) {
    restoreBtn.addEventListener('click', async () => {
      if (!confirm('Esto reemplaza la bitácora de este navegador por el JSON de Google Drive. ¿Continuar?')) return;
      try {
        await connectGoogleDrive();
        await pullBackupFromDrive();
        updateUI();
        notifyUser('Bitácora restaurada desde Google Drive.', 'success');
      } catch (err) {
        notifyUser(err.message || 'No se pudo restaurar desde Drive.', 'error');
      }
    });
  }

  renderDriveBackupStatus(null);
  refreshDriveUi(false);
}
