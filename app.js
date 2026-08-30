// State Management
let state = {
  fuelLogs: [],
  maintLogs: [],
  rides: [],
  shelterChecks: {
    airFilter: '',
    fuses: '',
    radiator: ''
  },
  settings: {
    modelYear: '1978',
    initialOdo: 45000,
    currency: '$',
    lastBackupAt: '',
    lang: 'es',
    customMaintTypes: []
  }
};

const BACKUP_WARN_DAYS = 14;
const PHOTO_DB_NAME = 'goldwing_gas_photos';
const PHOTO_STORE = 'photos';

let photoDbPromise = null;
let photoDbAvailable = false;

// GL-1000 Maintenance intervals (in km)
const MAINTENANCE_SCHEDULES = {
  'Correas de Distribución': { interval: 24000, label: 'Correas', desc: 'Reemplazo de correas de distribución' },
  'Sincronización Carburadores': { interval: 5000, label: 'Carbs', desc: 'Sincronizar los 4 carburadores Keihin' },
  'Ajuste de Válvulas': { interval: 5000, label: 'Válvulas', desc: 'Revisión y ajuste de holgura' },
  'Cambio de Aceite y Filtro': { interval: 5000, label: 'Aceite', desc: 'Aceite de motor 20W-50 y filtro' },
  'Aceite Transmisión Final': { interval: 10000, label: 'Cardán', desc: 'Aceite de transmisión final (cardán)' },
  'Platinos y Bujías': { interval: 10000, label: 'Platinos', desc: 'Ajuste de platinos y cambio de bujías' }
};

// Seed Data for GL-1000 (if local storage is empty)
const SEED_FUEL_LOGS = [
  { id: 'seed-fuel-1', date: '2026-05-15', odometer: 45150, liters: 15.2, cost: 16500, type: 'Turismo', station: 'Shell Apoquindo', notes: 'Carga inicial', photoId: '', image: '' },
  { id: 'seed-fuel-2', date: '2026-05-28', odometer: 45360, liters: 14.8, cost: 16100, type: 'Ciudad', station: 'Copec Vitacura', notes: 'Ruta urbana', photoId: '', image: '' },
  { id: 'seed-fuel-3', date: '2026-06-10', odometer: 45610, liters: 16.5, cost: 18000, type: 'Autopista', station: 'Shell Ruta 68', notes: 'Viaje a Viña', photoId: '', image: '' },
  { id: 'seed-fuel-4', date: '2026-06-25', odometer: 45840, liters: 15.0, cost: 16300, type: 'Turismo', station: 'Petrobras', notes: 'Paseo de fin de semana', photoId: '', image: '' }
];

const SEED_MAINT_LOGS = [
  { id: 'seed-maint-1', date: '2026-05-10', type: 'Correas de Distribución', odometer: 45000, cost: 120000, notes: 'Se instalaron correas Gates nuevas y tensores. Crítico para motor GL-1000.', photoId: '', image: '' },
  { id: 'seed-maint-2', date: '2026-05-10', type: 'Cambio de Aceite y Filtro', odometer: 45000, cost: 35000, notes: 'Aceite Liqui Moly 20W-50 mineral y filtro de aceite original.', photoId: '', image: '' },
  { id: 'seed-maint-3', date: '2026-05-12', type: 'Sincronización Carburadores', odometer: 45050, cost: 50000, notes: 'Sincronización de los 4 carburadores Keihin con vacuómetro. Quedó ralentí muy parejo.', photoId: '', image: '' },
  { id: 'seed-maint-4', date: '2026-05-12', type: 'Ajuste de Válvulas', odometer: 45050, cost: 25000, notes: 'Ajuste de holgura de válvulas (Admisión: 0.10mm, Escape: 0.13mm).', photoId: '', image: '' }
];

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  bootApp();
});

async function bootApp() {
  await openPhotoDb();
  await loadData();
  initTabs();
  initFormListeners();
  initOcrEngine();
  initBatchImporter();
  
  // Advanced GL-1000 specialist tools
  initShelterGuide();
  initFuelAdditiveCalc();
  initAltitudeCalc();
  initSparkPlugDiag();
  initServiceWorker();
  initPwaInstall();
  initBackupUi();
  initTableFilters();
  initCustomMaintTypes();
  
  if (typeof applyI18n === 'function') applyI18n();
  updateUI();
  consumeSharedGpxInbox();
  initFileLaunchHandler();
}

function createLogId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `log_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function isDataUrl(value) {
  return typeof value === 'string' && value.startsWith('data:');
}

function logHasPhoto(log) {
  return !!(log && (log.photoId || isDataUrl(log.image)));
}

function openPhotoDb() {
  if (photoDbPromise) return photoDbPromise;
  photoDbPromise = new Promise((resolve) => {
    if (!window.indexedDB) {
      photoDbAvailable = false;
      resolve(null);
      return;
    }
    const req = indexedDB.open(PHOTO_DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(PHOTO_STORE)) {
        db.createObjectStore(PHOTO_STORE);
      }
    };
    req.onsuccess = () => {
      photoDbAvailable = true;
      resolve(req.result);
    };
    req.onerror = () => {
      photoDbAvailable = false;
      console.warn('IndexedDB no disponible; las fotos se mantienen en el JSON si hace falta.');
      resolve(null);
    };
  });
  return photoDbPromise;
}

function idbRequest(txOp) {
  return new Promise((resolve, reject) => {
    txOp.oncomplete = () => resolve();
    txOp.onerror = () => reject(txOp.error);
    txOp.onabort = () => reject(txOp.error);
  });
}

async function putPhoto(id, dataUrl) {
  if (!id || !isDataUrl(dataUrl)) return false;
  const db = await openPhotoDb();
  if (!db) return false;
  try {
    const tx = db.transaction(PHOTO_STORE, 'readwrite');
    tx.objectStore(PHOTO_STORE).put(dataUrl, id);
    await idbRequest(tx);
    return true;
  } catch (err) {
    console.error('No se pudo guardar la foto en IndexedDB', err);
    return false;
  }
}

async function getPhoto(id) {
  if (!id) return '';
  const db = await openPhotoDb();
  if (!db) return '';
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(PHOTO_STORE, 'readonly');
      const req = tx.objectStore(PHOTO_STORE).get(id);
      req.onsuccess = () => resolve(req.result || '');
      req.onerror = () => resolve('');
    } catch (err) {
      resolve('');
    }
  });
}

async function deletePhoto(id) {
  if (!id) return;
  const db = await openPhotoDb();
  if (!db) return;
  try {
    const tx = db.transaction(PHOTO_STORE, 'readwrite');
    tx.objectStore(PHOTO_STORE).delete(id);
    await idbRequest(tx);
  } catch (err) {
    console.warn('No se pudo borrar la foto', err);
  }
}

async function clearAllPhotos() {
  const db = await openPhotoDb();
  if (!db) return;
  try {
    const tx = db.transaction(PHOTO_STORE, 'readwrite');
    tx.objectStore(PHOTO_STORE).clear();
    await idbRequest(tx);
  } catch (err) {
    console.warn('No se pudieron vaciar las fotos', err);
  }
}

async function getAllPhotos() {
  const db = await openPhotoDb();
  if (!db) return {};
  return new Promise((resolve) => {
    const out = {};
    try {
      const tx = db.transaction(PHOTO_STORE, 'readonly');
      const req = tx.objectStore(PHOTO_STORE).openCursor();
      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          out[cursor.key] = cursor.value;
          cursor.continue();
        } else {
          resolve(out);
        }
      };
      req.onerror = () => resolve(out);
    } catch (err) {
      resolve(out);
    }
  });
}

async function resolveLogPhoto(log) {
  if (!log) return '';
  if (isDataUrl(log.image)) return log.image;
  if (log.photoId) return await getPhoto(log.photoId);
  return '';
}

async function attachPhotoToLog(log, imageData) {
  if (!log.id) log.id = createLogId();
  if (!isDataUrl(imageData)) return;
  const stored = await putPhoto(log.id, imageData);
  if (stored) {
    log.photoId = log.id;
    log.image = '';
  } else {
    log.photoId = log.id;
    log.image = imageData;
  }
}

function ensureSettingsDefaults() {
  if (!state.settings) {
    state.settings = { modelYear: '1978', initialOdo: 45000, currency: '$', lastBackupAt: '', lang: 'es', customMaintTypes: [] };
  }
  if (state.settings.lastBackupAt === undefined) {
    state.settings.lastBackupAt = '';
  }
  if (!state.settings.lang) {
    state.settings.lang = 'es';
  }
  if (!Array.isArray(state.settings.customMaintTypes)) {
    state.settings.customMaintTypes = [];
  }
  if (!state.shelterChecks) {
    state.shelterChecks = { airFilter: '', fuses: '', radiator: '' };
  }
  if (!Array.isArray(state.rides)) {
    state.rides = [];
  }
}

const EXTRA_MAINT_TYPES = ['Frenos / Líquido', 'Neumáticos', 'Batería / Eléctrico', 'Otro'];

function getCustomMaintTypes() {
  return Array.isArray(state.settings && state.settings.customMaintTypes) ? state.settings.customMaintTypes : [];
}

function getAllMaintSchedules() {
  const all = { ...MAINTENANCE_SCHEDULES };
  getCustomMaintTypes().forEach((item) => {
    if (!item || !item.name) return;
    const interval = parseInt(item.interval, 10) || 0;
    if (interval > 0) {
      all[item.name] = { interval, label: item.name, desc: 'Servicio personalizado' };
    }
  });
  return all;
}

function getMaintTypeNames() {
  const names = [...Object.keys(MAINTENANCE_SCHEDULES), ...EXTRA_MAINT_TYPES];
  getCustomMaintTypes().forEach((item) => {
    if (item && item.name && !names.includes(item.name)) names.push(item.name);
  });
  return names;
}

function populateMaintTypeSelect(selected) {
  const sel = document.getElementById('maint-type');
  if (!sel) return;
  const current = selected || sel.value || 'Cambio de Aceite y Filtro';
  sel.innerHTML = getMaintTypeNames().map((name) => {
    const pick = name === current ? ' selected' : '';
    return `<option value="${escapeHtml(name)}"${pick}>${escapeHtml(name)}</option>`;
  }).join('');
}

function populateMaintFilterTypes() {
  const sel = document.getElementById('maint-filter-type');
  if (!sel) return;
  const keep = sel.value;
  const used = [...new Set((state.maintLogs || []).map((l) => l.type).filter(Boolean))];
  const names = [...new Set([...getMaintTypeNames(), ...used])];
  sel.innerHTML = `<option value="">Todos los servicios</option>` +
    names.map((n) => `<option value="${escapeHtml(n)}"${n === keep ? ' selected' : ''}>${escapeHtml(n)}</option>`).join('');
}

function getFuelFilterState() {
  return {
    q: (document.getElementById('fuel-filter-q') || {}).value || '',
    from: (document.getElementById('fuel-filter-from') || {}).value || '',
    to: (document.getElementById('fuel-filter-to') || {}).value || '',
    type: (document.getElementById('fuel-filter-type') || {}).value || ''
  };
}

function getMaintFilterState() {
  return {
    q: (document.getElementById('maint-filter-q') || {}).value || '',
    from: (document.getElementById('maint-filter-from') || {}).value || '',
    to: (document.getElementById('maint-filter-to') || {}).value || '',
    type: (document.getElementById('maint-filter-type') || {}).value || ''
  };
}

function logMatchesFilter(log, f) {
  if (f.from && log.date < f.from) return false;
  if (f.to && log.date > f.to) return false;
  if (f.type && log.type !== f.type) return false;
  if (f.q) {
    const hay = `${log.station || ''} ${log.notes || ''} ${log.type || ''}`.toLowerCase();
    if (!hay.includes(f.q.trim().toLowerCase())) return false;
  }
  return true;
}

function initTableFilters() {
  ['fuel-filter-q', 'fuel-filter-from', 'fuel-filter-to', 'fuel-filter-type'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => renderFuelLogsTable());
    if (el && el.tagName === 'SELECT') el.addEventListener('change', () => renderFuelLogsTable());
  });
  const clearFuel = document.getElementById('btn-fuel-filter-clear');
  if (clearFuel) {
    clearFuel.addEventListener('click', () => {
      ['fuel-filter-q', 'fuel-filter-from', 'fuel-filter-to', 'fuel-filter-type'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
      renderFuelLogsTable();
    });
  }
  ['maint-filter-q', 'maint-filter-from', 'maint-filter-to', 'maint-filter-type'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => renderMaintLogsTable());
    if (el && el.tagName === 'SELECT') el.addEventListener('change', () => renderMaintLogsTable());
  });
  const clearMaint = document.getElementById('btn-maint-filter-clear');
  if (clearMaint) {
    clearMaint.addEventListener('click', () => {
      ['maint-filter-q', 'maint-filter-from', 'maint-filter-to', 'maint-filter-type'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
      renderMaintLogsTable();
    });
  }
}

function renderCustomMaintList() {
  const box = document.getElementById('custom-maint-list');
  if (!box) return;
  const items = getCustomMaintTypes();
  if (!items.length) {
    box.innerHTML = '<p class="text-muted" style="font-size: 0.8rem;">Todavía no hay tipos extra. El schedule GL-1000 sigue fijo.</p>';
    return;
  }
  box.innerHTML = items.map((item, i) => `
    <div class="custom-maint-row">
      <span><strong>${escapeHtml(item.name)}</strong> · cada ${(parseInt(item.interval, 10) || 0).toLocaleString()} km</span>
      <button type="button" class="btn-icon btn-icon-danger" onclick="deleteCustomMaintType(${i})" title="Quitar"><i class="fa-solid fa-trash-can"></i></button>
    </div>`).join('');
}

function initCustomMaintTypes() {
  const form = document.getElementById('form-custom-maint');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = (document.getElementById('custom-maint-name').value || '').trim();
    const interval = parseInt(document.getElementById('custom-maint-interval').value, 10);
    if (!name || !interval || interval < 100) {
      notifyUser('Indica un nombre y un intervalo de al menos 100 km.', 'error');
      return;
    }
    const list = getCustomMaintTypes();
    if (list.some((x) => x.name.toLowerCase() === name.toLowerCase()) || MAINTENANCE_SCHEDULES[name]) {
      notifyUser('Ese tipo ya existe.', 'error');
      return;
    }
    list.push({ name, interval });
    state.settings.customMaintTypes = list;
    saveData();
    form.reset();
    updateUI();
  });
}

window.deleteCustomMaintType = function (index) {
  const list = getCustomMaintTypes();
  list.splice(index, 1);
  state.settings.customMaintTypes = list;
  saveData();
  updateUI();
};

function ensureLogIds(logs) {
  logs.forEach((log) => {
    if (!log.id) log.id = createLogId();
    if (!log.photoId) log.photoId = '';
  });
}

async function migrateEmbeddedPhotosToIdb() {
  let moved = 0;
  const migrateList = async (logs) => {
    for (const log of logs) {
      if (!log.id) log.id = createLogId();
      if (isDataUrl(log.image)) {
        const stored = await putPhoto(log.id, log.image);
        log.photoId = log.id;
        if (stored) {
          log.image = '';
          moved++;
        }
      }
    }
  };
  await migrateList(state.fuelLogs || []);
  await migrateList(state.maintLogs || []);
  return moved;
}

function persistableState() {
  const clone = JSON.parse(JSON.stringify(state));
  const stripInlinePhotos = photoDbAvailable;
  (clone.fuelLogs || []).forEach((log) => {
    delete log.efficiency;
    delete log.gpsKm;
    delete log.gpsEfficiency;
    if (stripInlinePhotos && isDataUrl(log.image)) log.image = '';
  });
  (clone.maintLogs || []).forEach((log) => {
    if (stripInlinePhotos && isDataUrl(log.image)) log.image = '';
  });
  return clone;
}

// Load state from localStorage or seed
async function loadData() {
  const savedState = localStorage.getItem('goldwing_gas_state');
  if (savedState) {
    try {
      state = JSON.parse(savedState);
      ensureSettingsDefaults();
      ensureLogIds(state.fuelLogs || (state.fuelLogs = []));
      ensureLogIds(state.maintLogs || (state.maintLogs = []));
      const moved = await migrateEmbeddedPhotosToIdb();
      if (moved > 0) saveData();
    } catch (e) {
      console.error('Error al cargar datos de localStorage. Iniciando con semillas.', e);
      seedState();
    }
  } else {
    seedState();
  }
}

function seedState() {
  state.fuelLogs = SEED_FUEL_LOGS.map((log) => ({ ...log }));
  state.maintLogs = SEED_MAINT_LOGS.map((log) => ({ ...log }));
  state.rides = [];
  state.shelterChecks = { airFilter: '', fuses: '', radiator: '' };
  state.settings = {
    modelYear: '1978',
    initialOdo: 45000,
    currency: '$',
    lastBackupAt: '',
    lang: 'es',
    customMaintTypes: []
  };
  saveData();
}

function saveData() {
  try {
    localStorage.setItem('goldwing_gas_state', JSON.stringify(persistableState()));
  } catch (e) {
    console.error('Error al guardar localStorage', e);
    if (e && (e.name === 'QuotaExceededError' || e.code === 22)) {
      notifyUser('El almacenamiento del navegador está lleno. Descarga un respaldo JSON desde Ajustes y libera espacio.', 'error');
    }
  }
}

function notifyUser(message, type) {
  if (typeof showToast === 'function') {
    showToast(message, type || 'info');
    return;
  }
  alert(message);
}

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));
}

function todayIsoDate() {
  return new Date().toISOString().split('T')[0];
}

function getMaxLoggedOdometer(excludeLogId) {
  const initialOdo = parseInt(state.settings.initialOdo, 10) || 0;
  let maxOdo = initialOdo;
  const allLogs = [...(state.fuelLogs || []), ...(state.maintLogs || [])];
  allLogs.forEach((log) => {
    if (excludeLogId && log.id === excludeLogId) return;
    const odo = parseInt(log.odometer, 10);
    if (odo > 0 && odo > maxOdo) maxOdo = odo;
  });
  return maxOdo;
}

function validateFuelLogForm({ date, odometer, liters, cost, logId }) {
  const errors = [];
  const warnings = [];
  const initialOdo = parseInt(state.settings.initialOdo, 10) || 0;

  if (!date) errors.push(typeof t === 'function' ? t('validation.dateRequired') : 'La fecha es obligatoria.');
  if (date && date > todayIsoDate()) {
    warnings.push(typeof t === 'function' ? t('validation.futureDate') : 'La fecha es posterior a hoy.');
  }
  if (isNaN(odometer)) {
    errors.push(typeof t === 'function' ? t('validation.odometerRequired') : 'El odómetro es obligatorio.');
  } else if (odometer < initialOdo) {
    const msg = typeof t === 'function' ? t('validation.odometerBelowInitial', { km: initialOdo.toLocaleString() }) : `El kilometraje no puede ser inferior al odómetro inicial (${initialOdo.toLocaleString()} km).`;
    errors.push(msg);
  } else if (odometer > 0) {
    const maxOdo = getMaxLoggedOdometer(logId);
    if (odometer < maxOdo) {
      const msg = typeof t === 'function' ? t('validation.odometerBelowPrevious', { km: maxOdo.toLocaleString() }) : `El odómetro (${maxOdo.toLocaleString()} km) es menor al último registro.`;
      warnings.push(msg);
    }
  }
  if (isNaN(liters) || liters <= 0) {
    errors.push(typeof t === 'function' ? t('validation.litersPositive') : 'Los litros deben ser mayores que 0.');
  }
  if (isNaN(cost) || cost <= 0) {
    errors.push(typeof t === 'function' ? t('validation.costPositive') : 'El costo debe ser mayor que 0.');
  }
  return { errors, warnings };
}

function validateMaintLogForm({ date, odometer, cost, logId }) {
  const errors = [];
  const warnings = [];
  const initialOdo = parseInt(state.settings.initialOdo, 10) || 0;

  if (!date) errors.push(typeof t === 'function' ? t('validation.dateRequired') : 'La fecha es obligatoria.');
  if (date && date > todayIsoDate()) {
    warnings.push(typeof t === 'function' ? t('validation.futureDate') : 'La fecha es posterior a hoy.');
  }
  if (isNaN(odometer)) {
    errors.push(typeof t === 'function' ? t('validation.odometerRequired') : 'El odómetro es obligatorio.');
  } else if (odometer < initialOdo) {
    const msg = typeof t === 'function' ? t('validation.odometerBelowInitial', { km: initialOdo.toLocaleString() }) : `El kilometraje no puede ser inferior al odómetro inicial (${initialOdo.toLocaleString()} km).`;
    errors.push(msg);
  } else if (odometer > 0) {
    const maxOdo = getMaxLoggedOdometer(logId);
    if (odometer < maxOdo) {
      const msg = typeof t === 'function' ? t('validation.odometerBelowPrevious', { km: maxOdo.toLocaleString() }) : `El odómetro (${maxOdo.toLocaleString()} km) es menor al último registro.`;
      warnings.push(msg);
    }
  }
  if (cost !== null && cost !== '' && (isNaN(cost) || cost < 0)) {
    errors.push(typeof t === 'function' ? t('validation.costInvalid') : 'El costo no puede ser negativo.');
  }
  return { errors, warnings };
}

function confirmIfWarnings(warnings) {
  if (!warnings.length) return true;
  const title = typeof t === 'function' ? t('validation.warningsTitle') : 'Revisa estos avisos:';
  const footer = typeof t === 'function' ? t('validation.continueAnyway') : '¿Deseas guardar de todos modos?';
  const body = warnings.map((w, i) => `${i + 1}. ${w}`).join('\n');
  return confirm(`${title}\n\n${body}\n\n${footer}`);
}

function showValidationErrors(errors) {
  alert(errors.join('\n'));
}

function haversineKm(a, b) {
  const R = 6371;
  const toRad = (deg) => deg * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h = sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLon * sinLon;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function gpxElements(doc, tag) {
  const namespaces = [
    'http://www.topografix.com/GPX/1/1',
    'http://www.topografix.com/GPX/1/0'
  ];
  let nodes = [];
  namespaces.forEach((ns) => {
    nodes = nodes.concat(Array.from(doc.getElementsByTagNameNS(ns, tag)));
  });
  if (!nodes.length) nodes = Array.from(doc.getElementsByTagName(tag));
  return nodes;
}

function isoDateFromGpxTime(raw) {
  if (!raw) return '';
  const d = new Date(raw.trim());
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
}

function addIsoDays(iso, days) {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return '';
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}

function parseGpxText(xmlText, fileName) {
  const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
  if (doc.querySelector('parsererror')) {
    throw new Error('El archivo GPX no es XML válido.');
  }

  const trk = gpxElements(doc, 'trk')[0];
  const rte = gpxElements(doc, 'rte')[0];
  const meta = gpxElements(doc, 'metadata')[0];
  const nameFrom = (el) => {
    if (!el) return '';
    const n = gpxElements(el, 'name')[0];
    return n ? n.textContent.trim() : '';
  };
  const metaName = nameFrom(trk) || nameFrom(rte) || nameFrom(meta);
  const fallbackName = (fileName || 'Viaje Beeline').replace(/\.gpx$/i, '');

  let pts = gpxElements(doc, 'trkpt');
  if (!pts.length) pts = gpxElements(doc, 'rtept');

  const points = pts.map((el) => {
    const timeEl = gpxElements(el, 'time')[0];
    return {
      lat: parseFloat(el.getAttribute('lat')),
      lon: parseFloat(el.getAttribute('lon')),
      time: timeEl ? timeEl.textContent.trim() : ''
    };
  }).filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon));

  if (points.length < 2) {
    throw new Error('El GPX no trae una traza suficiente (mínimo 2 puntos). Exporta la ruta recorrida desde Beeline.');
  }

  let distanceKm = 0;
  for (let i = 1; i < points.length; i++) {
    distanceKm += haversineKm(points[i - 1], points[i]);
  }

  const timed = points.filter((p) => p.time);
  const startTime = timed.length ? timed[0].time : '';
  const endTime = timed.length ? timed[timed.length - 1].time : '';
  let durationMin = null;
  if (startTime && endTime) {
    const ms = new Date(endTime).getTime() - new Date(startTime).getTime();
    if (Number.isFinite(ms) && ms > 0) durationMin = Math.round(ms / 60000);
  }

  return {
    name: metaName || fallbackName,
    date: isoDateFromGpxTime(startTime) || isoDateFromGpxTime(endTime),
    distanceKm: Math.round(distanceKm * 10) / 10,
    durationMin,
    pointCount: points.length,
    startedAt: startTime,
    endedAt: endTime
  };
}

function rideForFuelLog(log) {
  if (!log || !log.id || !Array.isArray(state.rides)) return null;
  return state.rides.find((r) => r.fuelLogId === log.id) || null;
}

function usedRideFuelIds() {
  return new Set((state.rides || []).map((r) => r.fuelLogId).filter(Boolean));
}

function fuelSegmentKm(log) {
  const initialOdo = parseInt(state.settings.initialOdo, 10) || 0;
  const sorted = [...state.fuelLogs].sort((a, b) => new Date(a.date) - new Date(b.date));
  const idx = sorted.findIndex((l) => l === log || l.id === log.id);
  if (idx < 0) return 0;
  const current = parseInt(sorted[idx].odometer, 10) || 0;
  if (!current) return 0;
  let prev = initialOdo;
  for (let j = idx - 1; j >= 0; j--) {
    if (sorted[j].odometer > 0) {
      prev = sorted[j].odometer;
      break;
    }
  }
  return current > prev ? current - prev : 0;
}

function matchFuelLogForRide(ride) {
  const used = usedRideFuelIds();
  const dates = [ride.date, addIsoDays(ride.date, 1)].filter(Boolean);
  const candidates = state.fuelLogs.filter((l) => !used.has(l.id) && dates.includes(l.date));
  if (!candidates.length) return null;
  if (candidates.length === 1) return candidates[0];
  let best = candidates[0];
  let bestDelta = Infinity;
  candidates.forEach((log) => {
    const seg = fuelSegmentKm(log);
    const delta = Math.abs(seg - ride.distanceKm);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = log;
    }
  });
  return best;
}

function isDuplicateRide(ride) {
  return (state.rides || []).some((existing) => {
    if (existing.date !== ride.date) return false;
    return Math.abs((existing.distanceKm || 0) - ride.distanceKm) < 1;
  });
}

function importParsedRide(parsed, source) {
  if (isDuplicateRide(parsed)) {
    return { status: 'duplicate', ride: null };
  }
  const ride = {
    id: createLogId(),
    source: source || 'beeline',
    name: parsed.name,
    date: parsed.date || '',
    distanceKm: parsed.distanceKm,
    durationMin: parsed.durationMin,
    pointCount: parsed.pointCount,
    fuelLogId: ''
  };
  const match = ride.date ? matchFuelLogForRide(ride) : null;
  if (match) ride.fuelLogId = match.id;
  state.rides.push(ride);
  return { status: 'ok', ride, linked: !!match };
}

function unlinkRidesFromFuel(fuelLogId) {
  (state.rides || []).forEach((ride) => {
    if (ride.fuelLogId === fuelLogId) ride.fuelLogId = '';
  });
}

function populateFuelRideSelect(currentFuelId, selectedRideId) {
  const select = document.getElementById('fuel-ride-id');
  if (!select) return;
  const current = selectedRideId || '';
  const options = ['<option value="">Sin viaje GPS</option>'];
  (state.rides || []).forEach((ride) => {
    const taken = ride.fuelLogId && ride.fuelLogId !== currentFuelId;
    if (taken) return;
    const dur = ride.durationMin ? ` · ${ride.durationMin} min` : '';
    const label = `${ride.date || 's/fecha'} — ${ride.distanceKm.toFixed(1)} km${dur} — ${ride.name}`;
    const sel = ride.id === current ? ' selected' : '';
    options.push(`<option value="${ride.id}"${sel}>${escapeHtml(label)}</option>`);
  });
  select.innerHTML = options.join('');
}

function renderRidesList() {
  const lists = document.querySelectorAll('.rides-list');
  if (!lists.length) return;
  const rides = [...(state.rides || [])].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const html = !rides.length
    ? '<p class="text-muted" style="font-size: 0.8rem; margin: 8px 0 0;">Todavía no hay viajes GPS. Exporta un GPX <em>ridden</em> desde Beeline.</p>'
    : rides.map((ride) => {
      const fuel = state.fuelLogs.find((l) => l.id === ride.fuelLogId);
      const link = fuel
        ? `ligado a carga del ${new Date(fuel.date).toLocaleDateString('es-ES', { timeZone: 'UTC' })} (${fuel.odometer.toLocaleString()} km)`
        : 'sin carga asociada';
      const dur = ride.durationMin ? ` · ${ride.durationMin} min` : '';
      return `<div class="ride-row">
      <div>
        <strong>${escapeHtml(ride.name)}</strong>
        <span class="text-muted">${ride.date || 's/fecha'} · ${ride.distanceKm.toFixed(1)} km${dur}<br>${escapeHtml(link)}</span>
      </div>
      <button type="button" class="btn-icon btn-icon-danger" onclick="deleteRide('${ride.id}')" title="Quitar viaje"><i class="fa-solid fa-trash-can"></i></button>
    </div>`;
    }).join('');
  lists.forEach((list) => { list.innerHTML = html; });
}

window.deleteRide = function(rideId) {
  if (!confirm('¿Quitar este viaje GPS de la bitácora? No borra la carga de bencina.')) return;
  state.rides = (state.rides || []).filter((r) => r.id !== rideId);
  saveData();
  updateUI();
};

async function fileLooksLikeGpx(file) {
  if (!file) return false;
  if (/\.gpx$/i.test(file.name || '') || /gpx/i.test(file.type || '')) return true;
  try {
    const head = await file.slice(0, 900).text();
    return /<gpx[\s>]/i.test(head) || /topografix\.com\/GPX/i.test(head);
  } catch (err) {
    return false;
  }
}

async function importGpxTexts(items) {
  let imported = 0;
  let linked = 0;
  let duplicates = 0;
  let errors = 0;
  for (const item of items) {
    try {
      const parsed = parseGpxText(item.text, item.name || 'viaje.gpx');
      const result = importParsedRide(parsed, 'beeline');
      if (result.status === 'duplicate') duplicates++;
      else {
        imported++;
        if (result.linked) linked++;
      }
    } catch (err) {
      console.error(err);
      errors++;
    }
  }
  if (imported) saveData();
  updateUI();
  notifyUser(
    `GPX: ${imported} viaje(s) importado(s)` +
      (linked ? `, ${linked} ligado(s) a una carga` : '') +
      (duplicates ? `, ${duplicates} duplicado(s)` : '') +
      (errors ? `, ${errors} con error` : '') + '.',
    imported ? 'success' : 'error'
  );
}

async function importGpxFiles(fileList) {
  const raw = Array.from(fileList || []);
  const files = [];
  for (const f of raw) {
    if (await fileLooksLikeGpx(f)) files.push(f);
  }
  if (!files.length) {
    notifyUser('Selecciona un archivo .gpx exportado desde Beeline (ruta recorrida / ridden).', 'error');
    return;
  }
  const items = [];
  for (const file of files) {
    items.push({ name: file.name, text: await readFileAsText(file) });
  }
  await importGpxTexts(items);
}

async function consumeSharedGpxInbox() {
  if (!('caches' in window)) return;
  try {
    const inbox = await caches.open('goldwinggas-share-inbox');
    const keys = await inbox.keys();
    if (!keys.length) return;
    const items = [];
    for (const req of keys) {
      const res = await inbox.match(req);
      if (!res) continue;
      const text = await res.text();
      const rawName = res.headers.get('X-Filename') || 'beeline.gpx';
      const name = decodeURIComponent(rawName);
      items.push({ name, text });
      await inbox.delete(req);
    }
    if (items.length) {
      await importGpxTexts(items);
      const params = new URLSearchParams(window.location.search);
      if (params.get('share') === 'beeline') {
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  } catch (err) {
    console.warn('No se pudieron leer GPX compartidos', err);
  }
}

function initFileLaunchHandler() {
  if (!('launchQueue' in window)) return;
  window.launchQueue.setConsumer(async (params) => {
    if (!params.files || !params.files.length) return;
    const files = [];
    for (const handle of params.files) {
      try {
        files.push(await handle.getFile());
      } catch (err) {
        console.warn(err);
      }
    }
    if (files.length) importGpxFiles(files);
  });
}

// Navigation Tabs
function initTabs() {
  const tabs = document.querySelectorAll('.nav-tab');
  const panes = document.querySelectorAll('.tab-pane');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panes.forEach(p => p.classList.remove('active'));
      
      tab.classList.add('active');
      const targetPane = document.getElementById(tab.dataset.tab);
      if (targetPane) {
        targetPane.classList.add('active');
      }
      
      // If fuel tab, redraw Chart.js graph
      if (tab.dataset.tab === 'tab-fuel') {
        renderFuelChart();
        updateEfficiencyStyleChart();
      }
    });
  });
}

// Global UI Updater
function updateUI() {
  // Update Header Odometer
  updateHeaderOdometer();
  
  // Model year badges
  document.getElementById('model-year-display').textContent = state.settings.modelYear;
  
  // Settings Form values
  document.getElementById('settings-model-year').value = state.settings.modelYear;
  document.getElementById('settings-initial-odo').value = state.settings.initialOdo;
  document.getElementById('settings-currency').value = state.settings.currency;
  const langEl = document.getElementById('settings-language');
  if (langEl) langEl.value = state.settings.lang || 'es';
  if (typeof applyI18n === 'function') applyI18n();
  
  // Calculate Stats
  const stats = calculateStats();
  
  // Update Digital Stats
  document.getElementById('stat-total-dist').textContent = stats.totalDist.toLocaleString();
  document.getElementById('stat-total-fuel').textContent = stats.totalFuel.toFixed(1);
  document.getElementById('stat-total-cost').textContent = `${state.settings.currency}${stats.totalCost.toLocaleString()}`;
  document.getElementById('stat-avg-consumption').textContent = stats.avgConsumption > 0 ? stats.avgConsumption.toFixed(2) : '--.-';
  document.getElementById('val-eff-digital').textContent = stats.avgEfficiency > 0 ? stats.avgEfficiency.toFixed(1) : '--.-';
  
  const estimatedRange = stats.avgEfficiency > 0 ? Math.round(stats.avgEfficiency * 15) : 0; // 15 liters usable before reserve
  document.getElementById('val-fuel-range').textContent = estimatedRange > 0 ? estimatedRange : '---';

  // Update Gauges needles
  updateGauges(stats.avgEfficiency, estimatedRange);
  
  populateMaintTypeSelect();
  populateMaintFilterTypes();
  renderCustomMaintList();
  
  // Render logs lists tables
  renderFuelLogsTable();
  renderMaintLogsTable();
  
  // Update maintenance lamps & schedules list
  updateMaintenanceStatus(stats.currentOdo);
  renderExtraCharts();
  
  // Update Shelter UI if initialized
  if (typeof selectedShelterComponent !== 'undefined' && document.getElementById('shelter-status-badge')) {
    showShelterComponentDetails(selectedShelterComponent);
  }
  
  // Update driving style chart if active tab is fuel
  const activeTab = document.querySelector('.nav-tab.active');
  if (activeTab && activeTab.dataset.tab === 'tab-fuel') {
    updateEfficiencyStyleChart();
  }

  updateBackupStatus();
  renderRidesList();
}

// Update Odometer display in the header (mechanical drum look)
function updateHeaderOdometer() {
  const stats = calculateStats();
  const currentOdo = stats.currentOdo;
  const odoStr = String(currentOdo).padStart(6, '0');
  const digits = document.querySelectorAll('#header-odo .odo-digit');
  
  for (let i = 0; i < digits.length; i++) {
    if (odoStr[i]) {
      digits[i].textContent = odoStr[i];
    }
  }
}

// Calculation Utilities
function calculateStats() {
  // Sort logs chronologically to ensure correct math
  state.fuelLogs.sort((a, b) => new Date(a.date) - new Date(b.date));
  state.maintLogs.sort((a, b) => new Date(a.date) - new Date(b.date));
  
  const initialOdo = parseInt(state.settings.initialOdo) || 0;
  
  let currentOdo = initialOdo;
  let totalDist = 0;
  let totalFuel = 0;
  let totalCost = 0;
  
  if (state.fuelLogs.length > 0) {
    // Current Odometer is the maximum of all logs
    const maxFuelOdo = Math.max(...state.fuelLogs.map(l => l.odometer), initialOdo);
    const maxMaintOdo = state.maintLogs.length > 0 ? Math.max(...state.maintLogs.map(l => l.odometer), initialOdo) : initialOdo;
    currentOdo = Math.max(maxFuelOdo, maxMaintOdo);
    
    // Total fuel volume and cost
    totalFuel = state.fuelLogs.reduce((sum, log) => sum + parseFloat(log.liters || 0), 0);
    totalCost = state.fuelLogs.reduce((sum, log) => sum + parseFloat(log.cost || 0), 0);
    
    // Total Distance traveled from initial odo (filtering out 0 values)
    const nonZeroOdos = state.fuelLogs.map(l => l.odometer).filter(o => o > 0);
    const minFuelOdo = nonZeroOdos.length > 0 ? Math.min(...nonZeroOdos) : initialOdo;
    const maxFuelOdoVal = Math.max(...state.fuelLogs.map(l => l.odometer));
    
    if (minFuelOdo > initialOdo && initialOdo > 0) {
      totalDist = maxFuelOdoVal - initialOdo;
    } else {
      totalDist = maxFuelOdoVal - minFuelOdo;
    }
  } else if (state.maintLogs.length > 0) {
    const nonZeroMaintOdos = state.maintLogs.map(l => l.odometer).filter(o => o > 0);
    currentOdo = nonZeroMaintOdos.length > 0 ? Math.max(...nonZeroMaintOdos, initialOdo) : initialOdo;
    totalDist = currentOdo - initialOdo;
  }
  
  // Calculate individual fuel efficiencies
  let totalEfficiencySum = 0;
  let efficiencyCounts = 0;
  
  for (let i = 0; i < state.fuelLogs.length; i++) {
    const currentOdoVal = state.fuelLogs[i].odometer;
    if (currentOdoVal === 0) {
      state.fuelLogs[i].efficiency = null;
      continue;
    }
    
    // Find the last record with a non-zero odometer reading
    let prevOdo = initialOdo;
    for (let j = i - 1; j >= 0; j--) {
      if (state.fuelLogs[j].odometer > 0) {
        prevOdo = state.fuelLogs[j].odometer;
        break;
      }
    }
    
    // If the previous non-zero odo is same as initialOdo and initialOdo is 0, we can't calculate efficiency
    if (prevOdo === 0) {
      state.fuelLogs[i].efficiency = null;
      continue;
    }
    
    const dist = currentOdoVal - prevOdo;
    if (dist > 0 && state.fuelLogs[i].liters > 0) {
      const eff = dist / state.fuelLogs[i].liters; // km/L
      state.fuelLogs[i].efficiency = eff;
      totalEfficiencySum += eff;
      efficiencyCounts++;
    } else {
      state.fuelLogs[i].efficiency = null;
    }

    const ride = rideForFuelLog(state.fuelLogs[i]);
    if (ride && ride.distanceKm > 0 && state.fuelLogs[i].liters > 0) {
      state.fuelLogs[i].gpsKm = ride.distanceKm;
      state.fuelLogs[i].gpsEfficiency = ride.distanceKm / state.fuelLogs[i].liters;
    } else {
      state.fuelLogs[i].gpsKm = null;
      state.fuelLogs[i].gpsEfficiency = null;
    }
  }
  
  const avgEfficiency = efficiencyCounts > 0 ? (totalEfficiencySum / efficiencyCounts) : 0;
  const avgConsumption = avgEfficiency > 0 ? (100 / avgEfficiency) : 0; // L/100km
  
  return {
    currentOdo,
    totalDist,
    totalFuel,
    totalCost,
    avgEfficiency, // km/L
    avgConsumption // L/100km
  };
}

// Update Gauge Needle Positions
function updateGauges(avgEff, estimatedRange) {
  // Efficiency Gauge (0 to 25 km/L)
  // Physical gauge angle ranges from -120deg to +120deg (240 degrees span)
  const effNeedle = document.getElementById('needle-eff');
  const cappedEff = Math.min(Math.max(avgEff, 0), 25);
  const effAngle = -120 + (cappedEff / 25) * 240;
  effNeedle.style.transform = `rotate(${effAngle}deg)`;
  
  // Autonomy Range Gauge (0 to 400 km range)
  const fuelNeedle = document.getElementById('needle-fuel');
  const cappedRange = Math.min(Math.max(estimatedRange, 0), 400);
  const rangeAngle = -120 + (cappedRange / 400) * 240;
  fuelNeedle.style.transform = `rotate(${rangeAngle}deg)`;
}

// Maintenance Dashboard Status & Cards List
function updateMaintenanceStatus(currentOdo) {
  const listContainer = document.getElementById('schedules-list');
  listContainer.innerHTML = '';
  
  // For each type in schedules, find the last completed log
  const allSchedules = getAllMaintSchedules();
  Object.keys(allSchedules).forEach(type => {
    const sched = allSchedules[type];
    
    // Find last maint log of this type
    const matches = state.maintLogs.filter(l => l.type === type);
    let lastMaintOdo = parseInt(state.settings.initialOdo) || 0;
    let lastMaintDate = 'Nunca registrado';
    
    if (matches.length > 0) {
      // Sort to get newest
      matches.sort((a, b) => b.odometer - a.odometer);
      lastMaintOdo = matches[0].odometer;
      lastMaintDate = new Date(matches[0].date).toLocaleDateString('es-ES');
    }
    
    const kmSince = Math.max(0, currentOdo - lastMaintOdo);
    const remaining = Math.max(0, sched.interval - kmSince);
    const progressPercent = Math.min(100, (kmSince / sched.interval) * 100);
    
    // Determine status (green, yellow, red)
    let statusClass = 'green';
    let labelText = 'OK';
    if (progressPercent >= 100) {
      statusClass = 'red';
      labelText = 'VENCIDO';
    } else if (progressPercent >= 80) {
      statusClass = 'yellow';
      labelText = 'PRÓXIMO';
    }
    
    // Update Dashboard Indicator Lamps
    const lamp = document.getElementById(getLampId(type));
    if (lamp) {
      const lens = lamp.querySelector('.lamp-lens');
      lens.className = `lamp-lens ${statusClass} active`;
    }
    
    // Render Maintenance Card
    const card = document.createElement('div');
    card.className = `maint-schedule-card border-${statusClass}`;
    card.innerHTML = `
      <div class="maint-sched-header">
        <span class="maint-title">${type}</span>
        <span class="tag-badge ${statusClass}">${labelText}</span>
      </div>
      <div class="maint-interval">Intervalo: cada ${sched.interval.toLocaleString()} km</div>
      <div class="maint-bar-container">
        <div class="maint-bar ${statusClass}" style="width: ${progressPercent}%"></div>
      </div>
      <div class="maint-sched-footer">
        <span>Último: ${lastMaintOdo.toLocaleString()} km (${lastMaintDate})</span>
        <span>Hace: ${kmSince.toLocaleString()} km</span>
      </div>
      <div class="text-muted" style="font-size: 0.75rem; margin-top: 5px;">
        Restante: <strong>${remaining.toLocaleString()} km</strong>
      </div>
    `;
    listContainer.appendChild(card);
  });
}

function getLampId(maintType) {
  switch (maintType) {
    case 'Correas de Distribución': return 'lamp-belts';
    case 'Sincronización Carburadores': return 'lamp-carbs';
    case 'Ajuste de Válvulas': return 'lamp-valves';
    case 'Cambio de Aceite y Filtro': return 'lamp-oil';
    case 'Aceite Transmisión Final': return 'lamp-shaft';
    case 'Platinos y Bujías': return 'lamp-points';
    default: return '';
  }
}

// Render Fuel logs list
function renderFuelLogsTable() {
  const tbody = document.getElementById('tbody-fuel-logs');
  tbody.innerHTML = '';
  
  if (state.fuelLogs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center">${typeof t === 'function' ? t('table.fuel.empty') : 'No hay registros de bencina cargados.'}</td></tr>`;
    const countEl = document.getElementById('fuel-filter-count');
    if (countEl) countEl.textContent = '';
    return;
  }
  
  const dateLocale = typeof getDateLocale === 'function' ? getDateLocale() : 'es-ES';
  const filters = getFuelFilterState();
  
  // Sort reverse chronological
  const displayLogs = [...state.fuelLogs]
    .filter((log) => logMatchesFilter(log, filters))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  const countEl = document.getElementById('fuel-filter-count');
  if (countEl) {
    countEl.textContent = displayLogs.length === state.fuelLogs.length
      ? `${displayLogs.length} carga(s)`
      : `${displayLogs.length} de ${state.fuelLogs.length} carga(s)`;
  }
  if (!displayLogs.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center">Ninguna carga coincide con el filtro.</td></tr>`;
    return;
  }
  
  displayLogs.forEach(log => {
    const originalIndex = state.fuelLogs.indexOf(log);
    const dateFormatted = new Date(log.date).toLocaleDateString(dateLocale, { timeZone: 'UTC' });
    const efficiencyDisplay = log.efficiency 
      ? `<strong>${log.efficiency.toFixed(2)}</strong> km/L<br><span class="text-muted">${(100/log.efficiency).toFixed(2)} L/100km</span>`
      : `<span class="text-muted">${typeof t === 'function' ? t('table.fuel.initialLoad') : 'N/A (Carga inicial)'}</span>`;
    const gpsNote = (log.gpsKm && log.gpsEfficiency)
      ? `<br><span class="gps-fuel-note" title="Kilómetros del GPX Beeline"><i class="fa-solid fa-route"></i> GPS ${log.gpsKm.toFixed(1)} km · ${log.gpsEfficiency.toFixed(2)} km/L</span>`
      : '';
      
    const hasPhoto = logHasPhoto(log)
      ? `<button class="ticket-attachment-btn" onclick="viewPhoto(${originalIndex})"><i class="fa-solid fa-receipt"></i> ${typeof t === 'function' ? t('table.fuel.viewReceipt') : 'Ver boleta'}</button>`
      : '<span class="text-muted">-</span>';
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${dateFormatted}</td>
      <td><strong>${log.odometer.toLocaleString()} km</strong></td>
      <td>${log.liters.toFixed(2)} L</td>
      <td>${state.settings.currency}${log.cost.toLocaleString()}</td>
      <td>${efficiencyDisplay}${gpsNote}</td>
      <td>${hasPhoto}</td>
      <td><span class="tag-badge ${log.type.toLowerCase()}">${log.type}</span>${log.station ? '<br><small class="text-muted">' + log.station + '</small>' : ''}${log.notes ? '<p class="text-muted" style="font-size: 0.75rem; margin-top:2px;">' + log.notes + '</p>' : ''}</td>
      <td>
        <button class="btn-icon" onclick="editFuelLog(${originalIndex})" title="${typeof t === 'function' ? t('common.edit') : 'Editar'}"><i class="fa-solid fa-pen-to-square"></i></button>
        <button class="btn-icon btn-icon-danger" onclick="deleteFuelLog(${originalIndex})" title="${typeof t === 'function' ? t('common.delete') : 'Eliminar'}"><i class="fa-solid fa-trash-can"></i></button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Render Maintenance Logs Table
function renderMaintLogsTable() {
  const tbody = document.getElementById('tbody-maint-logs');
  tbody.innerHTML = '';
  
  if (state.maintLogs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center">${typeof t === 'function' ? t('table.maint.empty') : 'No hay mantenimientos registrados.'}</td></tr>`;
    const countEl = document.getElementById('maint-filter-count');
    if (countEl) countEl.textContent = '';
    return;
  }
  
  const dateLocale = typeof getDateLocale === 'function' ? getDateLocale() : 'es-ES';
  const filters = getMaintFilterState();
  
  // Sort reverse chronological
  const displayMaint = [...state.maintLogs]
    .filter((log) => logMatchesFilter(log, filters))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  const countEl = document.getElementById('maint-filter-count');
  if (countEl) {
    countEl.textContent = displayMaint.length === state.maintLogs.length
      ? `${displayMaint.length} servicio(s)`
      : `${displayMaint.length} de ${state.maintLogs.length} servicio(s)`;
  }
  if (!displayMaint.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center">Ningún servicio coincide con el filtro.</td></tr>`;
    return;
  }
  
  displayMaint.forEach(log => {
    const originalIndex = state.maintLogs.indexOf(log);
    const dateFormatted = new Date(log.date).toLocaleDateString(dateLocale, { timeZone: 'UTC' });
    const costDisplay = log.cost ? `${state.settings.currency}${parseInt(log.cost).toLocaleString()}` : '<span class="text-muted">-</span>';
    const hasPhoto = logHasPhoto(log)
      ? `<button class="ticket-attachment-btn" onclick="viewMaintPhoto(${originalIndex})"><i class="fa-solid fa-receipt"></i> ${typeof t === 'function' ? t('table.maint.viewNote') : 'Ver nota'}</button>`
      : '<span class="text-muted">-</span>';
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${dateFormatted}</td>
      <td><strong>${log.type}</strong></td>
      <td><strong>${log.odometer.toLocaleString()} km</strong></td>
      <td>${costDisplay}</td>
      <td><p style="margin: 0; max-width: 250px; font-size: 0.85rem;">${log.notes || '-'}</p></td>
      <td>${hasPhoto}</td>
      <td>
        <button class="btn-icon" onclick="editMaintLog(${originalIndex})" title="${typeof t === 'function' ? t('common.edit') : 'Editar'}"><i class="fa-solid fa-pen-to-square"></i></button>
        <button class="btn-icon btn-icon-danger" onclick="deleteMaintLog(${originalIndex})" title="${typeof t === 'function' ? t('common.delete') : 'Eliminar'}"><i class="fa-solid fa-trash-can"></i></button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Chart.js Graph Rendering
let fuelChart = null;
function renderFuelChart() {
  const ctx = document.getElementById('fuelChart').getContext('2d');
  
  // Clean logs with valid efficiency numbers, sorted chronologically
  const chartData = state.fuelLogs
    .filter(l => l.efficiency !== null && l.efficiency !== undefined)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
    
  if (fuelChart) {
    fuelChart.destroy();
  }
  
  if (chartData.length === 0) {
    return;
  }
  
  const labels = chartData.map(log => new Date(log.date).toLocaleDateString('es-ES', { timeZone: 'UTC', month: 'short', day: 'numeric' }));
  const efficiencies = chartData.map(log => parseFloat(log.efficiency.toFixed(2)));
  
  fuelChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Consumo (km/L)',
        data: efficiencies,
        borderColor: '#ffb300',
        backgroundColor: 'rgba(255, 179, 0, 0.1)',
        borderWidth: 3,
        pointBackgroundColor: '#fff',
        pointBorderColor: '#ffb300',
        pointRadius: 5,
        pointHoverRadius: 7,
        tension: 0.3,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          grid: { color: '#23272a' },
          ticks: { color: '#8899a6', font: { family: 'Montserrat' } },
          title: { display: true, text: 'Kilómetros por Litro (km/L)', color: '#8899a6' }
        },
        x: {
          grid: { color: 'transparent' },
          ticks: { color: '#8899a6', font: { family: 'Montserrat' } }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#14171a',
          titleColor: '#fff',
          bodyColor: '#ffb300',
          borderColor: '#23272a',
          borderWidth: 1,
          displayColors: false,
          callbacks: {
            label: function(context) {
              const kmL = context.parsed.y;
              const l100 = (100 / kmL).toFixed(2);
              return [`Rendimiento: ${kmL} km/L`, `Consumo: ${l100} L/100km`];
            }
          }
        }
      }
    }
  });
}

let costChart = null;
let histChart = null;
let serviceGapChart = null;

function chartDarkOptions(yTitle) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        grid: { color: '#23272a' },
        ticks: { color: '#8899a6', font: { family: 'Montserrat' } },
        title: yTitle ? { display: true, text: yTitle, color: '#8899a6' } : undefined
      },
      x: {
        grid: { color: 'transparent' },
        ticks: { color: '#8899a6', font: { family: 'Montserrat', size: 10 } }
      }
    },
    plugins: { legend: { display: false } }
  };
}

function renderExtraCharts() {
  if (typeof Chart === 'undefined') return;
  const sortedFuel = [...state.fuelLogs].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const loc = typeof getDateLocale === 'function' ? getDateLocale() : 'es-ES';
  const labels = sortedFuel.map((l) => new Date(l.date).toLocaleDateString(loc, { timeZone: 'UTC', month: 'short', day: 'numeric' }));
  let running = 0;
  const cumulative = sortedFuel.map((l) => {
    running += parseInt(l.cost, 10) || 0;
    return running;
  });
  const costCtx = document.getElementById('costChart');
  if (costCtx) {
    if (costChart) costChart.destroy();
    if (sortedFuel.length) {
      costChart = new Chart(costCtx, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            data: cumulative,
            borderColor: '#17bf63',
            backgroundColor: 'rgba(23, 191, 99, 0.12)',
            fill: true,
            tension: 0.3,
            pointRadius: 3
          }]
        },
        options: chartDarkOptions((state.settings.currency || '$') + ' acumulado')
      });
    }
  }

  const l100 = state.fuelLogs
    .filter((l) => l.efficiency && l.efficiency > 0)
    .map((l) => 100 / l.efficiency);
  const bins = [
    { label: '≤6', min: 0, max: 6 },
    { label: '6–8', min: 6, max: 8 },
    { label: '8–10', min: 8, max: 10 },
    { label: '10–12', min: 10, max: 12 },
    { label: '>12', min: 12, max: 999 }
  ];
  const histCounts = bins.map((b) => l100.filter((v) => v > b.min && v <= b.max).length);
  const histCtx = document.getElementById('histChart');
  if (histCtx) {
    if (histChart) histChart.destroy();
    histChart = new Chart(histCtx, {
      type: 'bar',
      data: {
        labels: bins.map((b) => b.label),
        datasets: [{
          data: histCounts,
          backgroundColor: 'rgba(255, 179, 0, 0.55)',
          borderColor: '#ffb300',
          borderWidth: 1
        }]
      },
      options: chartDarkOptions('Cargas')
    });
  }

  const gaps = [];
  const byType = {};
  [...state.maintLogs].sort((a, b) => a.odometer - b.odometer).forEach((log) => {
    if (!log.odometer) return;
    const prev = byType[log.type];
    if (prev && log.odometer > prev) {
      gaps.push({
        label: `${log.type.split(' ')[0]} ${new Date(log.date).toLocaleDateString(loc, { timeZone: 'UTC', month: 'short' })}`,
        km: log.odometer - prev
      });
    }
    byType[log.type] = log.odometer;
  });
  const recent = gaps.slice(-10);
  const gapCtx = document.getElementById('serviceGapChart');
  if (gapCtx) {
    if (serviceGapChart) serviceGapChart.destroy();
    serviceGapChart = new Chart(gapCtx, {
      type: 'bar',
      data: {
        labels: recent.length ? recent.map((g) => g.label) : ['—'],
        datasets: [{
          data: recent.length ? recent.map((g) => g.km) : [0],
          backgroundColor: 'rgba(29, 161, 242, 0.5)',
          borderColor: '#1da1f2',
          borderWidth: 1
        }]
      },
      options: chartDarkOptions('km entre servicios')
    });
  }
}

// Modal handling & forms submission listeners
function initFormListeners() {
  // Fuel Modal open buttons
  const openFuelBtns = [document.getElementById('btn-open-fuel-modal'), document.getElementById('btn-open-fuel-modal-2')];
  const fuelModal = document.getElementById('modal-fuel');
  
  openFuelBtns.forEach(btn => {
    if (btn) {
      btn.addEventListener('click', () => {
        // Reset form
        document.getElementById('form-fuel-log').reset();
        document.getElementById('fuel-log-index').value = "-1";
        document.getElementById('fuel-image-data').value = "";
        document.getElementById('fuel-photo-id').value = "";
        
        // Hide OCR preview
        document.getElementById('ocr-preview-container').style.display = 'none';
        document.getElementById('ocr-preview-img').src = '';
        document.getElementById('ocr-results-alert').style.display = 'none';
        document.getElementById('ocr-file-input').value = '';
        
        // Set date to today
        document.getElementById('fuel-date').value = new Date().toISOString().split('T')[0];
        populateFuelRideSelect('', '');
        
        fuelModal.classList.add('open');
      });
    }
  });
  
  // Close Fuel Modal
  document.getElementById('close-fuel-modal').addEventListener('click', () => {
    fuelModal.classList.remove('open');
  });
  document.getElementById('btn-cancel-fuel').addEventListener('click', () => {
    fuelModal.classList.remove('open');
  });
  
  // Save Fuel Log Form
  document.getElementById('form-fuel-log').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const index = parseInt(document.getElementById('fuel-log-index').value);
    const date = document.getElementById('fuel-date').value;
    const odometer = parseInt(document.getElementById('fuel-odo').value);
    const liters = parseFloat(document.getElementById('fuel-liters').value);
    const cost = parseInt(document.getElementById('fuel-cost').value);
    const type = document.getElementById('fuel-type').value;
    const station = document.getElementById('fuel-station').value;
    const imageData = document.getElementById('fuel-image-data').value;
    const existingPhotoId = document.getElementById('fuel-photo-id').value;
    const rideId = document.getElementById('fuel-ride-id') ? document.getElementById('fuel-ride-id').value : '';
    
    const previous = index === -1 ? null : state.fuelLogs[index];
    const validation = validateFuelLogForm({
      date,
      odometer,
      liters,
      cost,
      logId: previous ? previous.id : null
    });
    if (validation.errors.length) {
      showValidationErrors(validation.errors);
      return;
    }
    if (!confirmIfWarnings(validation.warnings)) return;
    
    const logData = {
      id: (previous && previous.id) || createLogId(),
      date,
      odometer,
      liters,
      cost,
      type,
      station,
      notes: (previous && previous.notes) || '',
      photoId: existingPhotoId || (previous && previous.photoId) || '',
      image: ''
    };
    
    if (isDataUrl(imageData)) {
      await attachPhotoToLog(logData, imageData);
    }
    
    if (index === -1) {
      state.fuelLogs.push(logData);
    } else {
      state.fuelLogs[index] = { ...previous, ...logData };
    }

    unlinkRidesFromFuel(logData.id);
    if (rideId) {
      const ride = (state.rides || []).find((r) => r.id === rideId);
      if (ride) ride.fuelLogId = logData.id;
    }
    
    saveData();
    updateUI();
    fuelModal.classList.remove('open');
  });
  
  // Maintenance Modal open buttons
  const openMaintBtns = [document.getElementById('btn-open-maint-modal'), document.getElementById('btn-open-maint-modal-2')];
  const maintModal = document.getElementById('modal-maint');
  
  openMaintBtns.forEach(btn => {
    if (btn) {
      btn.addEventListener('click', () => {
        document.getElementById('form-maint-log').reset();
        document.getElementById('maint-log-index').value = "-1";
        document.getElementById('maint-image-data').value = "";
        document.getElementById('maint-photo-id').value = "";
        
        // Hide OCR preview
        document.getElementById('ocr-maint-preview-container').style.display = 'none';
        document.getElementById('ocr-maint-preview-img').src = '';
        document.getElementById('ocr-maint-results-alert').style.display = 'none';
        document.getElementById('ocr-maint-file-input').value = '';
        
        document.getElementById('maint-date').value = new Date().toISOString().split('T')[0];
        populateMaintTypeSelect('Cambio de Aceite y Filtro');
        maintModal.classList.add('open');
      });
    }
  });
  
  // Close Maintenance Modal
  document.getElementById('close-maint-modal').addEventListener('click', () => {
    maintModal.classList.remove('open');
  });
  document.getElementById('btn-cancel-maint').addEventListener('click', () => {
    maintModal.classList.remove('open');
  });
  
  // Save Maintenance Log Form
  document.getElementById('form-maint-log').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const index = parseInt(document.getElementById('maint-log-index').value);
    const type = document.getElementById('maint-type').value;
    const date = document.getElementById('maint-date').value;
    const odometer = parseInt(document.getElementById('maint-odo').value);
    const cost = document.getElementById('maint-cost').value ? parseInt(document.getElementById('maint-cost').value) : null;
    const notes = document.getElementById('maint-notes').value;
    const imageData = document.getElementById('maint-image-data').value;
    const existingPhotoId = document.getElementById('maint-photo-id').value;
    
    const previous = index === -1 ? null : state.maintLogs[index];
    const validation = validateMaintLogForm({
      date,
      odometer,
      cost,
      logId: previous ? previous.id : null
    });
    if (validation.errors.length) {
      showValidationErrors(validation.errors);
      return;
    }
    if (!confirmIfWarnings(validation.warnings)) return;
    
    const maintData = {
      id: (previous && previous.id) || createLogId(),
      type,
      date,
      odometer,
      cost,
      notes,
      photoId: existingPhotoId || (previous && previous.photoId) || '',
      image: ''
    };
    
    if (isDataUrl(imageData)) {
      await attachPhotoToLog(maintData, imageData);
    }
    
    if (index === -1) {
      state.maintLogs.push(maintData);
    } else {
      state.maintLogs[index] = { ...previous, ...maintData };
    }
    
    saveData();
    updateUI();
    maintModal.classList.remove('open');
  });
  
  // Image Viewer Close
  const viewerModal = document.getElementById('modal-viewer');
  document.getElementById('close-viewer-modal').addEventListener('click', () => {
    viewerModal.classList.remove('open');
  });
  
  // Settings Form submit
  document.getElementById('form-bike-settings').addEventListener('submit', (e) => {
    e.preventDefault();
    
    state.settings.modelYear = document.getElementById('settings-model-year').value;
    state.settings.initialOdo = parseInt(document.getElementById('settings-initial-odo').value) || 0;
    state.settings.currency = document.getElementById('settings-currency').value || '$';
    const langEl = document.getElementById('settings-language');
    if (langEl) state.settings.lang = langEl.value === 'en' ? 'en' : 'es';
    
    saveData();
    if (typeof applyI18n === 'function') applyI18n();
    updateUI();
    alert(typeof t === 'function' ? t('settings.saved') : 'Configuración de la moto guardada con éxito.');
  });
  
  // Export/Import JSON data
  document.getElementById('btn-export-data').addEventListener('click', () => {
    downloadBackupFile();
  });
  const reportBtn = document.getElementById('btn-export-report');
  if (reportBtn) {
    reportBtn.addEventListener('click', () => {
      if (typeof exportHtmlReport === 'function') exportHtmlReport();
    });
  }
  
  document.getElementById('input-import-data').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fileReader = new FileReader();
    fileReader.onload = async function(event) {
      try {
        const importedState = JSON.parse(event.target.result);
        const ok = await importBackupPayload(importedState);
        if (ok) {
          updateUI();
          alert('¡Datos respaldados cargados correctamente!');
        } else {
          alert('El formato del archivo JSON no coincide con el esquema requerido.');
        }
      } catch (err) {
        alert('Error al leer el archivo JSON: ' + err.message);
      }
      e.target.value = '';
    };
    fileReader.readAsText(file);
  });

  // Download CSV template
  document.getElementById('btn-download-csv-template').addEventListener('click', () => {
    const csvContent = "Fecha;Kilometraje;Litros;Costo;Tipo;Notas\n" +
                       "2026-05-15;45150;15.2;16500;Turismo;Carga inicial\n" +
                       "2026-05-28;45360;14.8;16100;Ciudad;Ruta urbana\n" +
                       "2026-06-10;45610;16.5;18000;Autopista;Viaje a Vina";
    const dataUri = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(csvContent); // BOM for Excel compatibility
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', 'goldwing_gas_plantilla.csv');
    linkElement.click();
  });

  // Import CSV data
  document.getElementById('input-import-csv').addEventListener('change', (e) => {
    const fileReader = new FileReader();
    fileReader.onload = function(event) {
      const text = event.target.result;
      parseAndImportCSV(text);
    };
    if (e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], 'UTF-8');
    }
  });

  const bindGpxInput = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length) {
        importGpxFiles(e.target.files);
        e.target.value = '';
      }
    });
  };
  bindGpxInput('input-import-gpx');
  bindGpxInput('input-import-gpx-fuel');
  
  // Clear/Reset Data
  document.getElementById('btn-reset-data').addEventListener('click', async () => {
    if (confirm('¿Estás seguro de que deseas borrar por completo todo el historial? Esta acción vaciará la base de datos para que puedas importar tus propios datos.')) {
      state.fuelLogs = [];
      state.maintLogs = [];
      state.rides = [];
      state.shelterChecks = { airFilter: '', fuses: '', radiator: '' };
      state.settings.initialOdo = 0;
      state.settings.lastBackupAt = '';
      
      await clearAllPhotos();
      saveData();
      updateUI();
      alert('Se han borrado todos los registros. La base de datos está vacía y lista para importar tu planilla.');
    }
  });
}

// Global actions triggers (via window for inline HTML onclick attributes)
window.editFuelLog = async function(index) {
  const log = state.fuelLogs[index];
  
  document.getElementById('fuel-log-index').value = index;
  document.getElementById('fuel-date').value = log.date;
  document.getElementById('fuel-odo').value = log.odometer;
  document.getElementById('fuel-liters').value = log.liters;
  document.getElementById('fuel-cost').value = log.cost;
  document.getElementById('fuel-type').value = log.type;
  document.getElementById('fuel-station').value = log.station || '';
  document.getElementById('fuel-image-data').value = '';
  document.getElementById('fuel-photo-id').value = log.photoId || '';
  const linkedRide = rideForFuelLog(log);
  populateFuelRideSelect(log.id, linkedRide ? linkedRide.id : '');
  
  // Pre-fill image view if edit contains ticket image
  const previewContainer = document.getElementById('ocr-preview-container');
  const previewImg = document.getElementById('ocr-preview-img');
  const photoSrc = await resolveLogPhoto(log);
  
  if (photoSrc) {
    previewContainer.style.display = 'block';
    previewImg.src = photoSrc;
    document.getElementById('scan-status').style.display = 'none';
    document.getElementById('scanner-laser').style.display = 'none';
  } else {
    previewContainer.style.display = 'none';
    previewImg.src = '';
  }
  
  document.getElementById('ocr-results-alert').style.display = 'none';
  document.getElementById('modal-fuel').classList.add('open');
};

window.deleteFuelLog = async function(index) {
  if (confirm('¿Eliminar este registro de bencina?')) {
    const log = state.fuelLogs[index];
    if (log && log.photoId) await deletePhoto(log.photoId);
    if (log && log.id) unlinkRidesFromFuel(log.id);
    state.fuelLogs.splice(index, 1);
    saveData();
    updateUI();
  }
};

window.editMaintLog = async function(index) {
  const log = state.maintLogs[index];
  
  document.getElementById('maint-log-index').value = index;
  populateMaintTypeSelect(log.type);
  document.getElementById('maint-date').value = log.date;
  document.getElementById('maint-odo').value = log.odometer;
  document.getElementById('maint-cost').value = log.cost || '';
  document.getElementById('maint-notes').value = log.notes || '';
  document.getElementById('maint-image-data').value = '';
  document.getElementById('maint-photo-id').value = log.photoId || '';
  
  const previewContainer = document.getElementById('ocr-maint-preview-container');
  const previewImg = document.getElementById('ocr-maint-preview-img');
  const photoSrc = await resolveLogPhoto(log);
  
  if (photoSrc) {
    previewContainer.style.display = 'block';
    previewImg.src = photoSrc;
    document.getElementById('scanner-maint-status').style.display = 'none';
    document.getElementById('scanner-maint-laser').style.display = 'none';
  } else {
    previewContainer.style.display = 'none';
    previewImg.src = '';
  }
  
  document.getElementById('ocr-maint-results-alert').style.display = 'none';
  document.getElementById('modal-maint').classList.add('open');
};

window.deleteMaintLog = async function(index) {
  if (confirm('¿Eliminar este registro de mantenimiento?')) {
    const log = state.maintLogs[index];
    if (log && log.photoId) await deletePhoto(log.photoId);
    state.maintLogs.splice(index, 1);
    saveData();
    updateUI();
  }
};

window.viewPhoto = async function(index) {
  const log = state.fuelLogs[index];
  const src = await resolveLogPhoto(log);
  if (src) {
    const viewerModal = document.getElementById('modal-viewer');
    const viewerImg = document.getElementById('viewer-img');
    viewerImg.src = src;
    viewerModal.classList.add('open');
  }
};

window.viewMaintPhoto = async function(index) {
  const log = state.maintLogs[index];
  const src = await resolveLogPhoto(log);
  if (src) {
    const viewerModal = document.getElementById('modal-viewer');
    const viewerImg = document.getElementById('viewer-img');
    viewerImg.src = src;
    viewerModal.classList.add('open');
  }
};

// ==========================================
// TESSERACT OCR SCANNING INTEGRATION
// ==========================================
function initOcrEngine() {
  // Fuel OCR
  const dropzone = document.getElementById('ocr-dropzone');
  const fileInput = document.getElementById('ocr-file-input');
  
  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleOcrImage(e.target.files[0]);
      }
    });
  }
  
  if (dropzone) {
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.style.borderColor = 'var(--accent-gold)';
    });
    
    dropzone.addEventListener('dragleave', () => {
      dropzone.style.borderColor = '#3a3f44';
    });
    
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.style.borderColor = '#3a3f44';
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleOcrImage(e.dataTransfer.files[0]);
      }
    });
  }

  // Maintenance OCR
  const maintDropzone = document.getElementById('ocr-maint-dropzone');
  const maintFileInput = document.getElementById('ocr-maint-file-input');
  
  if (maintFileInput) {
    maintFileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleMaintOcrImage(e.target.files[0]);
      }
    });
  }
  
  if (maintDropzone) {
    maintDropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      maintDropzone.style.borderColor = 'var(--accent-gold)';
    });
    
    maintDropzone.addEventListener('dragleave', () => {
      maintDropzone.style.borderColor = '#3a3f44';
    });
    
    maintDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      maintDropzone.style.borderColor = '#3a3f44';
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleMaintOcrImage(e.dataTransfer.files[0]);
      }
    });
  }
}

// Convert uploaded file to base64 & run Tesseract.js OCR engine
function handleOcrImage(file) {
  const reader = new FileReader();
  reader.onload = async function(e) {
    const originalData = e.target.result;
    const base64Data = typeof preprocessReceiptImage === 'function'
      ? await preprocessReceiptImage(originalData)
      : originalData;
    
    // Save original (color) image to hidden form input
    document.getElementById('fuel-image-data').value = originalData;
    
    // Render UI loading/scanning animations
    const previewContainer = document.getElementById('ocr-preview-container');
    const previewImg = document.getElementById('ocr-preview-img');
    const laser = document.getElementById('scanner-laser');
    const statusOverlay = document.getElementById('scan-status');
    const alertResult = document.getElementById('ocr-results-alert');
    
    previewContainer.style.display = 'block';
    previewImg.src = originalData;
    laser.style.display = 'block';
    statusOverlay.style.display = 'flex';
    statusOverlay.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Cargando Tesseract OCR...`;
    alertResult.style.display = 'none';
    
    // Call Tesseract.js
    Tesseract.recognize(
      base64Data,
      'spa', // Spanish model
      { 
        logger: m => {
          if (m.status === 'recognizing') {
            statusOverlay.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Leyendo boleta: ${Math.round(m.progress * 100)}%`;
          }
        }
      }
    ).then(({ data: { text } }) => {
      // Hide scanner overlays
      laser.style.display = 'none';
      statusOverlay.style.display = 'none';
      
      // Parse text details
      parseOcrResults(text);
      
    }).catch(err => {
      console.error("Tesseract Engine OCR error: ", err);
      laser.style.display = 'none';
      statusOverlay.style.display = 'none';
      alert("Hubo un error procesando la imagen con OCR: " + err.message + ". Puedes rellenar los datos manualmente.");
    });
  };
  
  reader.readAsDataURL(file);
}

// Extract Date, Liters, and Odometer using Regex from raw OCR text
function parseOcrResults(text) {
  console.log("--- OCR TEXT DETECTED ---");
  console.log(text);
  console.log("-------------------------");
  
  const alertResult = document.getElementById('ocr-results-alert');
  const alertText = document.getElementById('ocr-alert-text');
  
  // Clean text: normalize spacing, dots, commas, convert uppercase
  const normalizedText = text.toUpperCase().replace(/\s+/g, ' ');
  
  let detectedDate = '';
  let detectedLiters = 0;
  let detectedOdo = 0;
  let detectedPrice = 0;
  
  // 1. EXTRACT DATE
  // Formats supported: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, DD/MM/YY
  const dateRegex = /\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})\b/;
  const dateMatch = normalizedText.match(dateRegex);
  if (dateMatch) {
    let day = dateMatch[1];
    let month = dateMatch[2];
    let year = dateMatch[3];
    
    if (day.length === 1) day = '0' + day;
    if (month.length === 1) month = '0' + month;
    if (year.length === 2) year = '20' + year; // Convert 26 to 2026
    
    detectedDate = `${year}-${month}-${day}`;
  }
  
  // 2. EXTRACT LITERS
  if (typeof extractOcrLiters === 'function') {
    detectedLiters = extractOcrLiters(normalizedText);
  } else {
    const litersRegex = /(\d+[\.,]\d{1,3})\s*(?:L|LTS|LIT|LITROS|LTR|VOLUMEN)\b/g;
    let literMatches = [...normalizedText.matchAll(litersRegex)];
    if (literMatches.length > 0) {
      const possibleLiters = parseFloat(literMatches[0][1].replace(',', '.'));
      if (possibleLiters >= 1 && possibleLiters <= 25) detectedLiters = possibleLiters;
    }
  }
  
  // 3. EXTRACT ODOMETER
  // Looking for 5-6 digit integers (GL-1000 has 5-digit mechanical odo with tenths digit, or users might have 6-digit readout)
  // Let's filter numbers of 5 to 6 digits, avoiding common dates like 2026 or postcodes.
  // Especially numbers near key terms: "KM", "KMS", "ODOMETRO", "ODO", "KILOMETRAJE", "TOTAL"
  const odoKeywords = ['KM', 'KMS', 'ODOMETRO', 'ODO', 'KILOMETRAJE', 'TOTAL', 'CUENTAKILOMETROS', 'KILOMETROS'];
  const integerRegex = /\b(\d{5,6})\b/g;
  const odoMatches = [...normalizedText.matchAll(integerRegex)];
  
  let bestOdoCandidate = 0;
  let highestOdoInState = state.fuelLogs.length > 0 ? Math.max(...state.fuelLogs.map(l => l.odometer)) : parseInt(state.settings.initialOdo);
  
  // Check candidates
  for (const match of odoMatches) {
    const val = parseInt(match[1]);
    
    // Odometer must be greater or equal to our highest logged odometer
    if (val >= highestOdoInState && val < highestOdoInState + 2000) {
      bestOdoCandidate = val;
      break;
    }
  }
  
  // If no candidate matches, look for numbers of 5 digits in the text
  if (bestOdoCandidate === 0 && odoMatches.length > 0) {
    bestOdoCandidate = parseInt(odoMatches[0][1]);
  }
  detectedOdo = bestOdoCandidate;
  
  // 4. EXTRACT PRICE
  if (typeof extractOcrPrice === 'function') {
    detectedPrice = extractOcrPrice(normalizedText);
  }
  if (!detectedPrice) {
    const priceRegex = /(?:TOTAL|PAGO|NETO|\$|PESOS|MONTO|CLP)\s*[:\.]?\s*(\d{3,6})\b/;
    const priceMatch = normalizedText.match(priceRegex);
    if (priceMatch) detectedPrice = parseInt(priceMatch[1], 10);
  }
  
  // Populate Form Fields if values detected
  let alertContent = [];
  
  if (detectedDate) {
    document.getElementById('fuel-date').value = detectedDate;
    alertContent.push(`<strong>Fecha:</strong> ${new Date(detectedDate).toLocaleDateString('es-ES', { timeZone: 'UTC' })}`);
  }
  if (detectedOdo) {
    document.getElementById('fuel-odo').value = detectedOdo;
    alertContent.push(`<strong>Odómetro:</strong> ${detectedOdo.toLocaleString()} km`);
  }
  if (detectedLiters) {
    document.getElementById('fuel-liters').value = detectedLiters;
    alertContent.push(`<strong>Litros:</strong> ${detectedLiters} L`);
  }
  if (detectedPrice) {
    document.getElementById('fuel-cost').value = detectedPrice;
    alertContent.push(`<strong>Costo Total:</strong> ${state.settings.currency}${detectedPrice.toLocaleString()}`);
  }
  const stationGuess = typeof detectFuelStation === 'function' ? detectFuelStation(normalizedText) : '';
  if (stationGuess && document.getElementById('fuel-station')) {
    document.getElementById('fuel-station').value = stationGuess;
    alertContent.push(`<strong>Estación:</strong> ${stationGuess}`);
  }
  
  alertResult.style.display = 'flex';
  if (alertContent.length > 0) {
    alertText.innerHTML = `<strong>Datos detectados con éxito:</strong><br>` + alertContent.join('<br>') + `<br><small class="text-muted" style="display:block; margin-top:5px;">Por favor, revisa y completa el resto de campos antes de guardar.</small>`;
  } else {
    alertText.innerHTML = `No pudimos identificar la fecha, litros o kilometraje claramente en esta foto. Por favor, ingresa los datos a mano.`;
    alertResult.style.backgroundColor = 'rgba(224, 36, 94, 0.1)';
    alertResult.style.borderColor = 'var(--accent-red)';
  }
}

// Convert uploaded file to base64 & run Tesseract.js OCR for maintenance notes
function handleMaintOcrImage(file) {
  const reader = new FileReader();
  reader.onload = function(e) {
    const base64Data = e.target.result;
    
    // Save image to hidden form input
    document.getElementById('maint-image-data').value = base64Data;
    
    // Render UI loading/scanning animations
    const previewContainer = document.getElementById('ocr-maint-preview-container');
    const previewImg = document.getElementById('ocr-maint-preview-img');
    const laser = document.getElementById('scanner-maint-laser');
    const statusOverlay = document.getElementById('scanner-maint-status');
    const alertResult = document.getElementById('ocr-maint-results-alert');
    
    previewContainer.style.display = 'block';
    previewImg.src = base64Data;
    laser.style.display = 'block';
    statusOverlay.style.display = 'flex';
    statusOverlay.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Cargando Tesseract OCR...`;
    alertResult.style.display = 'none';
    
    // Call Tesseract.js
    Tesseract.recognize(
      base64Data,
      'spa', // Spanish model
      { 
        logger: m => {
          if (m.status === 'recognizing') {
            statusOverlay.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Leyendo nota: ${Math.round(m.progress * 100)}%`;
          }
        }
      }
    ).then(({ data: { text } }) => {
      // Hide scanner overlays
      laser.style.display = 'none';
      statusOverlay.style.display = 'none';
      
      // Parse text details
      parseMaintOcrResults(text);
      
    }).catch(err => {
      console.error("Tesseract Engine OCR error (Maint): ", err);
      laser.style.display = 'none';
      statusOverlay.style.display = 'none';
      alert("Hubo un error procesando la imagen con OCR: " + err.message + ". Puedes rellenar los datos manualmente.");
    });
  };
  
  reader.readAsDataURL(file);
}

// Extract details from maintenance ticket
function parseMaintOcrResults(text) {
  console.log("--- MAINTENANCE OCR TEXT DETECTED ---");
  console.log(text);
  console.log("--------------------------------------");
  
  const alertResult = document.getElementById('ocr-maint-results-alert');
  const alertText = document.getElementById('ocr-maint-alert-text');
  
  const normalizedText = text.toUpperCase().replace(/\s+/g, ' ');
  
  let detectedDate = '';
  let detectedOdo = 0;
  let detectedPrice = 0;
  
  // 1. EXTRACT DATE
  const dateRegex = /\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})\b/;
  const dateMatch = normalizedText.match(dateRegex);
  if (dateMatch) {
    let day = dateMatch[1];
    let month = dateMatch[2];
    let year = dateMatch[3];
    
    if (day.length === 1) day = '0' + day;
    if (month.length === 1) month = '0' + month;
    if (year.length === 2) year = '20' + year;
    
    detectedDate = `${year}-${month}-${day}`;
  }
  
  // 2. EXTRACT ODOMETER
  const odoKeywords = ['KM', 'KMS', 'ODOMETRO', 'ODO', 'KILOMETRAJE', 'TOTAL', 'CUENTAKILOMETROS', 'KILOMETROS'];
  const integerRegex = /\b(\d{5,6})\b/g;
  const odoMatches = [...normalizedText.matchAll(integerRegex)];
  
  let bestOdoCandidate = 0;
  let highestOdoInState = state.fuelLogs.length > 0 ? Math.max(...state.fuelLogs.map(l => l.odometer)) : parseInt(state.settings.initialOdo);
  
  for (const match of odoMatches) {
    const val = parseInt(match[1]);
    if (val >= highestOdoInState && val < highestOdoInState + 5000) {
      bestOdoCandidate = val;
      break;
    }
  }
  
  if (bestOdoCandidate === 0 && odoMatches.length > 0) {
    bestOdoCandidate = parseInt(odoMatches[0][1]);
  }
  detectedOdo = bestOdoCandidate;
  
  // 3. EXTRACT PRICE
  const priceRegex = /(?:TOTAL|PAGO|NETO|\$|PESOS|VALOR|COSTO)\s*[:\.]?\s*(\d{3,6})\b/;
  const priceMatch = normalizedText.match(priceRegex);
  if (priceMatch) {
    detectedPrice = parseInt(priceMatch[1]);
  } else {
    const intRegex = /\b(\d{4,6})\b/g;
    const intMatches = [...normalizedText.matchAll(intRegex)];
    for (const match of intMatches) {
      const val = parseInt(match[1]);
      if (val >= 2000 && val <= 150000 && val !== detectedOdo) {
        detectedPrice = val;
        break;
      }
    }
  }
  
  // Populate form fields
  let alertContent = [];
  
  if (detectedDate) {
    document.getElementById('maint-date').value = detectedDate;
    alertContent.push(`<strong>Fecha:</strong> ${new Date(detectedDate).toLocaleDateString('es-ES', { timeZone: 'UTC' })}`);
  }
  if (detectedOdo) {
    document.getElementById('maint-odo').value = detectedOdo;
    alertContent.push(`<strong>Odómetro:</strong> ${detectedOdo.toLocaleString()} km`);
  }
  if (detectedPrice) {
    document.getElementById('maint-cost').value = detectedPrice;
    alertContent.push(`<strong>Costo:</strong> ${state.settings.currency}${detectedPrice.toLocaleString()}`);
  }
  
  // Append raw text to notes textarea
  const cleanNotesText = text.trim();
  document.getElementById('maint-notes').value = cleanNotesText;
  alertContent.push(`<strong>Detalles:</strong> Copiados directamente al campo de notas.`);
  
  // Show alert
  alertResult.style.display = 'flex';
  alertText.innerHTML = `<strong>Lectura de Nota Finalizada:</strong><br>` + alertContent.join('<br>') + `<br><small class="text-muted" style="display:block; margin-top:5px;">Por favor, revisa y edita el texto copiado abajo si el mecánico tiene letra difícil.</small>`;
}

// Parse date strings from spreadsheet files (handles verbal month names)
function parseExcelDate(rawDate) {
  if (!rawDate) return '';
  const dateStr = rawDate.trim();
  
  // 1. Try standard YYYY-MM-DD
  let match = dateStr.match(/^(\d{4})[\-\/](\d{1,2})[\-\/](\d{1,2})/);
  if (match) {
    return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
  }
  
  // 2. Try standard DD/MM/YYYY or DD-MM-YYYY
  match = dateStr.match(/^(\d{1,2})[\-\/](\d{1,2})[\-\/](\d{2,4})/);
  if (match) {
    let day = match[1];
    let month = match[2];
    let year = match[3];
    if (year.length === 2) year = '20' + year;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // 3. Try verbal dates like 14-Nov-2023, 3-Jan-2024, 22-Sep-2025
  const months = {
    'jan': '01', 'ene': '01',
    'feb': '02',
    'mar': '03',
    'apr': '04', 'abr': '04',
    'may': '05',
    'jun': '06',
    'jul': '07',
    'aug': '08', 'ago': '08',
    'sep': '09',
    'oct': '10',
    'nov': '11',
    'dec': '12', 'dic': '12'
  };
  
  match = dateStr.match(/^(\d{1,2})[\s\-\/]([a-zA-Z]{3,4})[\s\-\/](\d{2,4})/i);
  if (match) {
    let day = match[1].padStart(2, '0');
    let monthName = match[2].toLowerCase().substring(0, 3);
    let year = match[3];
    if (year.length === 2) year = '20' + year;
    
    let month = months[monthName];
    if (month) {
      return `${year}-${month}-${day}`;
    }
  }
  
  // 4. Try JS Date constructor fallback
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  } catch(e) {}
  
  return '';
}

// Parse and import CSV spreadsheet files from Excel
function parseAndImportCSV(text) {
  try {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 2) {
      alert("El archivo está vacío o no contiene registros.");
      return;
    }
    
    // Detect separator: comma, semicolon or tab
    const header = lines[0];
    let sep = ';';
    if (header.includes('\t')) {
      sep = '\t';
    } else if (header.includes(',')) {
      if (header.includes(';')) {
        sep = ';';
      } else {
        sep = ',';
      }
    }
    
    const headers = header.split(sep).map(h => h.trim().toLowerCase().replace(/\"/g, ''));
    console.log("Headers detected:", headers);
    
    // Map header indices
    let dateIdx = headers.findIndex(h => h.includes('fech') || h.includes('date'));
    let odoIdx = headers.findIndex(h => h.includes('kilomet') || h.includes('odo') || h.includes('read') || h.includes('km'));
    let litersIdx = headers.findIndex(h => h.includes('litr') || h.includes('cant') || h.includes('vol') || h.includes('add'));
    let costIdx = headers.findIndex(h => h.includes('cost') || h.includes('tot') || h.includes('prec') || h.includes('val'));
    let typeIdx = headers.findIndex(h => h.includes('tipo') || h.includes('modo') || h.includes('style'));
    let notesIdx = headers.findIndex(h => h.includes('not') || h.includes('coment') || h.includes('detall'));
    
    if (dateIdx === -1 || odoIdx === -1 || litersIdx === -1 || costIdx === -1) {
      alert("No pudimos encontrar todas las columnas requeridas (Fecha, Kilometraje, Litros, Costo). Verifica las cabeceras de la planilla.");
      return;
    }
    
    let importedCount = 0;
    let duplicateCount = 0;
    let errorCount = 0;
    
    const existingOdos = new Set(state.fuelLogs.map(l => parseInt(l.odometer)));
    
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(sep).map(c => c.trim().replace(/\"/g, ''));
      if (row.length < Math.max(dateIdx, odoIdx, litersIdx, costIdx) + 1) {
        errorCount++;
        continue;
      }
      
      const rawDate = row[dateIdx];
      const rawOdo = row[odoIdx];
      const rawLiters = row[litersIdx];
      const rawCost = row[costIdx];
      
      let parsedDate = parseExcelDate(rawDate);
      
      const odometer = parseInt(rawOdo) || 0;
      const liters = parseFloat(rawLiters.replace(/[^\d\.,]/g, '').replace(',', '.'));
      const cost = parseInt(rawCost.replace(/[^\d]/g, ''));
      
      if (!parsedDate || isNaN(odometer) || isNaN(liters) || isNaN(cost)) {
        errorCount++;
        continue;
      }
      
      // If odometer is 0, ignore duplicate checks (multiple 0 odometers are allowed)
      if (odometer > 0 && existingOdos.has(odometer)) {
        duplicateCount++;
        continue;
      }
      
      const type = typeIdx !== -1 && row[typeIdx] ? row[typeIdx] : 'Turismo';
      const notes = notesIdx !== -1 && row[notesIdx] ? row[notesIdx] : '';
      
      state.fuelLogs.push({
        id: createLogId(),
        date: parsedDate,
        odometer: odometer,
        liters: liters,
        cost: cost,
        type: type,
        station: '',
        notes: notes,
        photoId: '',
        image: ''
      });
      
      if (odometer > 0) {
        existingOdos.add(odometer);
      }
      importedCount++;
    }
    
    if (importedCount > 0) {
      const currentInitialOdo = parseInt(state.settings.initialOdo) || 0;
      if (currentInitialOdo === 0 && state.fuelLogs.length > 0) {
        // Filter out 0 values for initial odometer calculation
        const nonZeroOdos = state.fuelLogs.map(l => l.odometer).filter(o => o > 0);
        if (nonZeroOdos.length > 0) {
          state.settings.initialOdo = Math.min(...nonZeroOdos);
        }
      }
      saveData();
      updateUI();
    }
    
    let summaryMsg = `¡Importación finalizada!\n` +
                     `- Se agregaron con éxito: ${importedCount} registros.\n`;
    if (duplicateCount > 0) {
      summaryMsg += `- Se omitieron (duplicados de odómetro): ${duplicateCount} registros.\n`;
    }
    if (errorCount > 0) {
      summaryMsg += `- Filas con errores/vacías omitidas: ${errorCount}.\n`;
    }
    alert(summaryMsg);
    
  } catch (err) {
    alert("Error al procesar el archivo CSV: " + err.message);
  }
}

// ==========================================
// BATCH PROCESSING ENGINE (IMPORTACIÓN MASIVA)
// ==========================================
function initBatchImporter() {
  const batchDropzone = document.getElementById('batch-dropzone');
  const batchFileInput = document.getElementById('batch-file-input');
  const finishBtn = document.getElementById('btn-finish-batch');
  const closeBtn = document.getElementById('close-batch-modal');
  
  if (batchDropzone && batchFileInput) {
    // Click on dropzone opens file dialog
    batchDropzone.addEventListener('click', () => {
      batchFileInput.click();
    });
    
    // File change
    batchFileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        processBatchFiles(Array.from(e.target.files));
      }
    });
    
    // Drag/Drop
    batchDropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      batchDropzone.style.borderColor = 'var(--accent-gold)';
    });
    
    batchDropzone.addEventListener('dragleave', () => {
      batchDropzone.style.borderColor = '#3a3f44';
    });
    
    batchDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      batchDropzone.style.borderColor = '#3a3f44';
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        processBatchFiles(Array.from(e.dataTransfer.files));
      }
    });
  }
  
  if (finishBtn) {
    finishBtn.addEventListener('click', () => {
      const currentInitialOdo = parseInt(state.settings.initialOdo) || 0;
      if (currentInitialOdo === 0 && state.fuelLogs.length > 0) {
        state.settings.initialOdo = Math.min(...state.fuelLogs.map(l => l.odometer));
      }
      saveData();
      updateUI();
      document.getElementById('modal-batch-process').classList.remove('open');
      alert("¡Importación masiva completada y guardada con éxito!");
    });
  }
  
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      document.getElementById('modal-batch-process').classList.remove('open');
    });
  }
}

// Sequential file process queue
async function processBatchFiles(files) {
  const modal = document.getElementById('modal-batch-process');
  const progressBar = document.getElementById('batch-progress');
  const countLabel = document.getElementById('batch-count-label');
  const percentageLabel = document.getElementById('batch-percentage-label');
  const resultsList = document.getElementById('batch-results-list');
  const finishFooter = document.getElementById('batch-modal-footer');
  const closeBtn = document.getElementById('close-batch-modal');
  
  modal.classList.add('open');
  resultsList.innerHTML = '';
  finishFooter.style.display = 'none';
  closeBtn.style.display = 'none';
  progressBar.style.width = '0%';
  countLabel.textContent = `Preparando ${files.length} archivos...`;
  percentageLabel.textContent = '0%';
  
  const total = files.length;
  let successCount = 0;
  
  // Sort files: process CSVs first so that we have odometer baseline established before processing images!
  files.sort((a, b) => {
    const isCsvA = a.name.toLowerCase().endsWith('.csv');
    const isCsvB = b.name.toLowerCase().endsWith('.csv');
    if (isCsvA && !isCsvB) return -1;
    if (!isCsvA && isCsvB) return 1;
    return 0;
  });
  
  for (let i = 0; i < total; i++) {
    const file = files[i];
    const itemIdx = i + 1;
    
    countLabel.textContent = `Procesando (${itemIdx}/${total}): ${file.name}...`;
    
    // Create status element in modal results
    const statusDiv = document.createElement('div');
    statusDiv.style.padding = '8px';
    statusDiv.style.borderRadius = '4px';
    statusDiv.style.backgroundColor = 'rgba(255,255,255,0.03)';
    statusDiv.style.borderLeft = '3px solid var(--text-muted)';
    statusDiv.innerHTML = `<strong>${file.name}</strong>: <span class="text-muted"><i class="fa-solid fa-spinner fa-spin"></i> Cargando...</span>`;
    resultsList.appendChild(statusDiv);
    resultsList.scrollTop = resultsList.scrollHeight; // Scroll to bottom
    
    try {
      if (file.name.toLowerCase().endsWith('.csv')) {
        // Handle CSV import
        const csvText = await readFileAsText(file);
        const report = parseAndMergeCSVData(csvText);
        statusDiv.style.borderLeftColor = 'var(--accent-green)';
        statusDiv.innerHTML = `<strong>${file.name}</strong>: <span style="color: var(--accent-green);">Éxito.</span> Se agregaron ${report.imported} registros (omitidos: ${report.duplicates} duplicados, ${report.errors} errores).`;
        successCount++;
      } else if (file.name.toLowerCase().endsWith('.gpx')) {
        const gpxText = await readFileAsText(file);
        const parsed = parseGpxText(gpxText, file.name);
        const result = importParsedRide(parsed, 'beeline');
        if (result.status === 'duplicate') {
          statusDiv.style.borderLeftColor = 'var(--accent-gold)';
          statusDiv.innerHTML = `<strong>${file.name}</strong>: <span style="color: var(--accent-gold);">Omitido.</span> Viaje duplicado (${parsed.distanceKm} km).`;
        } else {
          statusDiv.style.borderLeftColor = 'var(--accent-green)';
          const linked = result.linked ? ' ligado a una carga' : ' sin carga ese día';
          statusDiv.innerHTML = `<strong>${file.name}</strong>: <span style="color: var(--accent-green);">[Beeline]</span> ${parsed.distanceKm} km${linked}.`;
          successCount++;
        }
      } else if (file.type.startsWith('image/')) {
        // Handle Image OCR
        const base64 = await readFileAsDataURL(file);
        
        statusDiv.innerHTML = `<strong>${file.name}</strong>: <span class="text-muted"><i class="fa-solid fa-circle-notch fa-spin"></i> Ejecutando OCR local...</span>`;
        
        const ocrText = await runTesseractOCR(base64, (progress) => {
          statusDiv.innerHTML = `<strong>${file.name}</strong>: <span class="text-muted"><i class="fa-solid fa-circle-notch fa-spin"></i> Leyendo: ${Math.round(progress * 100)}%</span>`;
        });
        
        // Classify image based on text keywords
        const normalized = ocrText.toUpperCase();
        const isMaint = /CORREA|DISTRIBUC|VALVUL|BUJIA|ACEITE|FILTRO|CARDAN|FRENO|PLATIN|MECANIC|REPARAC|TALLER|SERVICIO|AFINAMIENTO|REPUESTO/i.test(normalized);
        
        if (isMaint) {
          // Parse as Maintenance note
          const parsed = extractMaintOcrProperties(ocrText);
          
          // Save Maintenance log
          const maintLog = {
            id: createLogId(),
            type: parsed.type,
            date: parsed.date,
            odometer: parsed.odometer,
            cost: parsed.cost,
            notes: ocrText.trim(),
            photoId: '',
            image: ''
          };
          await attachPhotoToLog(maintLog, base64);
          state.maintLogs.push(maintLog);
          
          statusDiv.style.borderLeftColor = 'var(--accent-blue)';
          statusDiv.innerHTML = `<strong>${file.name}</strong>: <span style="color: var(--accent-blue);">[Mantenimiento]</span> ${parsed.type} - ${parsed.date ? formatDateString(parsed.date) : 'Sin fecha'} - ${parsed.odometer ? parsed.odometer.toLocaleString() + ' km' : 'Sin km'} - $${parsed.cost ? parsed.cost.toLocaleString() : '0'}`;
        } else {
          // Parse as Fuel receipt
          const parsed = extractFuelOcrProperties(ocrText);
          
          // Check if odometer duplicate exists
          const existingOdos = new Set(state.fuelLogs.map(l => parseInt(l.odometer)));
          if (parsed.odometer && existingOdos.has(parsed.odometer)) {
            statusDiv.style.borderLeftColor = 'var(--accent-gold)';
            statusDiv.innerHTML = `<strong>${file.name}</strong>: <span style="color: var(--accent-gold);">Omitido.</span> Boleta de bencina duplicada en odómetro (${parsed.odometer.toLocaleString()} km).`;
          } else {
            const fuelLog = {
              id: createLogId(),
              date: parsed.date || new Date().toISOString().split('T')[0],
              odometer: parsed.odometer || (state.fuelLogs.length > 0 ? Math.max(...state.fuelLogs.map(l => l.odometer)) : parseInt(state.settings.initialOdo)),
              liters: parsed.liters || 15.0,
              cost: parsed.cost || 16000,
              type: 'Turismo',
              station: parsed.station || 'Gasolinera Detectada',
              notes: 'Importado de foto antigua',
              photoId: '',
              image: ''
            };
            await attachPhotoToLog(fuelLog, base64);
            state.fuelLogs.push(fuelLog);
            
            statusDiv.style.borderLeftColor = 'var(--accent-green)';
            statusDiv.innerHTML = `<strong>${file.name}</strong>: <span style="color: var(--accent-green);">[Bencina]</span> ${parsed.date ? formatDateString(parsed.date) : 'Hoy'} - ${parsed.liters ? parsed.liters + ' L' : '15 L'} - ${parsed.odometer ? parsed.odometer.toLocaleString() + ' km' : 'Sin km'} - $${parsed.cost ? parsed.cost.toLocaleString() : '0'}`;
          }
        }
        successCount++;
      } else {
        statusDiv.style.borderLeftColor = 'var(--accent-red)';
        statusDiv.innerHTML = `<strong>${file.name}</strong>: <span style="color: var(--accent-red);">Omitido.</span> Formato no soportado.`;
      }
    } catch (err) {
      console.error(err);
      statusDiv.style.borderLeftColor = 'var(--accent-red)';
      statusDiv.innerHTML = `<strong>${file.name}</strong>: <span style="color: var(--accent-red);">Error:</span> ${err.message}`;
    }
    
    // Update progress
    const pct = Math.round((itemIdx / total) * 100);
    progressBar.style.width = `${pct}%`;
    percentageLabel.textContent = `${pct}%`;
  }
  
  countLabel.textContent = `Proceso finalizado. ${successCount} exitosos de ${total} archivos.`;
  finishFooter.style.display = 'block';
  closeBtn.style.display = 'block';
}

// Promise wrapper for reading files
function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (err) => reject(err);
    reader.readAsText(file);
  });
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

// Promise wrapper for Tesseract recognize
function runTesseractOCR(base64, progressCallback) {
  return new Promise((resolve, reject) => {
    Tesseract.recognize(
      base64,
      'spa',
      {
        logger: m => {
          if (m.status === 'recognizing') {
            progressCallback(m.progress);
          }
        }
      }
    ).then(({ data: { text } }) => {
      resolve(text);
    }).catch(err => {
      reject(err);
    });
  });
}

// Helper: format YYYY-MM-DD to DD/MM/YYYY
function formatDateString(str) {
  const pts = str.split('-');
  if (pts.length === 3) {
    return `${pts[2]}/${pts[1]}/${pts[0]}`;
  }
  return str;
}

// Helper parser to merge CSV and return counts
function parseAndMergeCSVData(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length < 2) return { imported: 0, duplicates: 0, errors: lines.length };
  
  const header = lines[0];
  let sep = ';';
  if (header.includes('\t')) {
    sep = '\t';
  } else if (header.includes(',')) {
    if (header.includes(';')) sep = ';';
    else sep = ',';
  }
  
  const headers = header.split(sep).map(h => h.trim().toLowerCase().replace(/\"/g, ''));
  
  let dateIdx = headers.findIndex(h => h.includes('fech') || h.includes('date'));
  let odoIdx = headers.findIndex(h => h.includes('kilomet') || h.includes('odo') || h.includes('read') || h.includes('km'));
  let litersIdx = headers.findIndex(h => h.includes('litr') || h.includes('cant') || h.includes('vol') || h.includes('add'));
  let costIdx = headers.findIndex(h => h.includes('cost') || h.includes('tot') || h.includes('prec') || h.includes('val'));
  let typeIdx = headers.findIndex(h => h.includes('tipo') || h.includes('modo') || h.includes('style'));
  let notesIdx = headers.findIndex(h => h.includes('not') || h.includes('coment') || h.includes('detall'));
  
  if (dateIdx === -1 || odoIdx === -1 || litersIdx === -1 || costIdx === -1) {
    return { imported: 0, duplicates: 0, errors: lines.length - 1 };
  }
  
  let imported = 0;
  let duplicates = 0;
  let errors = 0;
  
  const existingOdos = new Set(state.fuelLogs.map(l => parseInt(l.odometer)));
  
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(sep).map(c => c.trim().replace(/\"/g, ''));
    if (row.length < Math.max(dateIdx, odoIdx, litersIdx, costIdx) + 1) {
      errors++;
      continue;
    }
    
    const rawDate = row[dateIdx];
    const rawOdo = row[odoIdx];
    const rawLiters = row[litersIdx];
    const rawCost = row[costIdx];
    
    let parsedDate = parseExcelDate(rawDate);
    
    const odometer = parseInt(rawOdo) || 0;
    const liters = parseFloat(rawLiters.replace(/[^\d\.,]/g, '').replace(',', '.'));
    const cost = parseInt(rawCost.replace(/[^\d]/g, ''));
    
    if (!parsedDate || isNaN(odometer) || isNaN(liters) || isNaN(cost)) {
      errors++;
      continue;
    }
    
    if (odometer > 0 && existingOdos.has(odometer)) {
      duplicates++;
      continue;
    }
    
    const type = typeIdx !== -1 && row[typeIdx] ? row[typeIdx] : 'Turismo';
    const notes = notesIdx !== -1 && row[notesIdx] ? row[notesIdx] : '';
    
    state.fuelLogs.push({
      id: createLogId(),
      date: parsedDate,
      odometer: odometer,
      liters: liters,
      cost: cost,
      type: type,
      station: '',
      notes: notes,
      photoId: '',
      image: ''
    });
    
    if (odometer > 0) {
      existingOdos.add(odometer);
    }
    imported++;
  }
  
  return { imported, duplicates, errors };
}

// Extraction helpers for OCR
function extractMaintOcrProperties(text) {
  const normalized = text.toUpperCase().replace(/\s+/g, ' ');
  
  let date = '';
  const dateMatch = normalized.match(/\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})\b/);
  if (dateMatch) {
    let day = dateMatch[1];
    let month = dateMatch[2];
    let year = dateMatch[3];
    if (day.length === 1) day = '0' + day;
    if (month.length === 1) month = '0' + month;
    if (year.length === 2) year = '20' + year;
    date = `${year}-${month}-${day}`;
  }
  
  let odometer = 0;
  const odoMatch = [...normalized.matchAll(/\b(\d{5,6})\b/g)];
  let highestOdo = state.fuelLogs.length > 0 ? Math.max(...state.fuelLogs.map(l => l.odometer)) : parseInt(state.settings.initialOdo);
  for (const m of odoMatch) {
    const val = parseInt(m[1]);
    if (val >= highestOdo && val < highestOdo + 5000) {
      odometer = val;
      break;
    }
  }
  if (!odometer && odoMatch.length > 0) {
    odometer = parseInt(odoMatch[0][1]);
  }
  
  let cost = 0;
  const priceMatch = normalized.match(/(?:TOTAL|PAGO|NETO|\$|PESOS|VALOR|COSTO)\s*[:\.]?\s*(\d{3,6})\b/);
  if (priceMatch) {
    cost = parseInt(priceMatch[1]);
  } else {
    const numMatches = [...normalized.matchAll(/\b(\d{4,6})\b/g)];
    for (const m of numMatches) {
      const val = parseInt(m[1]);
      if (val >= 2000 && val <= 150000 && val !== odometer) {
        cost = val;
        break;
      }
    }
  }
  
  // Classify maintenance type
  let type = 'Otro';
  if (/CORREA/i.test(normalized)) type = 'Correas de Distribución';
  else if (/SINCRONIZ|CARBURAD/i.test(normalized)) type = 'Sincronización Carburadores';
  else if (/VALVUL/i.test(normalized)) type = 'Ajuste de Válvulas';
  else if (/ACEITE|FILTRO/i.test(normalized)) type = 'Cambio de Aceite y Filtro';
  else if (/CARDAN|DIFERENC/i.test(normalized)) type = 'Aceite Transmisión Final';
  else if (/PLATIN|BUJIA/i.test(normalized)) type = 'Platinos y Bujías';
  else if (/FRENO/i.test(normalized)) type = 'Frenos / Líquido';
  else if (/NEUMAT/i.test(normalized)) type = 'Neumáticos';
  else if (/BATER|ELECTR/i.test(normalized)) type = 'Batería / Eléctrico';
  
  return { date, odometer, cost, type };
}

function extractFuelOcrProperties(text) {
  const normalized = text.toUpperCase().replace(/\s+/g, ' ');
  
  let date = '';
  const dateMatch = normalized.match(/\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})\b/);
  if (dateMatch) {
    let day = dateMatch[1];
    let month = dateMatch[2];
    let year = dateMatch[3];
    if (day.length === 1) day = '0' + day;
    if (month.length === 1) month = '0' + month;
    if (year.length === 2) year = '20' + year;
    date = `${year}-${month}-${day}`;
  }
  
  let odometer = 0;
  const odoMatch = [...normalized.matchAll(/\b(\d{5,6})\b/g)];
  let highestOdo = state.fuelLogs.length > 0 ? Math.max(...state.fuelLogs.map(l => l.odometer)) : parseInt(state.settings.initialOdo);
  for (const m of odoMatch) {
    const val = parseInt(m[1]);
    if (val >= highestOdo && val < highestOdo + 5000) {
      odometer = val;
      break;
    }
  }
  if (!odometer && odoMatch.length > 0) {
    odometer = parseInt(odoMatch[0][1]);
  }
  
  let liters = typeof extractOcrLiters === 'function' ? extractOcrLiters(normalized) : 0;
  if (!liters) {
    const litersMatch = normalized.match(/(\d{1,2}[\.,]\d{1,2})\s*(?:L|LTS|LITROS|LTR|G|GLS)/);
    if (litersMatch) liters = parseFloat(litersMatch[1].replace(',', '.'));
  }
  
  let cost = typeof extractOcrPrice === 'function' ? extractOcrPrice(normalized) : 0;
  if (!cost) {
    const priceMatch = normalized.match(/(?:TOTAL|PAGO|NETO|\$|PESOS|VALOR|COSTO)\s*[:\.]?\s*(\d{3,6})\b/);
    if (priceMatch) cost = parseInt(priceMatch[1], 10);
  }
  
  let station = typeof detectFuelStation === 'function' ? detectFuelStation(normalized) : '';
  if (!station) station = 'Gasolinera';
  
  return { date, odometer, liters, cost, station };
}

// ==========================================
// ADVANCED GL-1000 SPECIALIST TOOLS
// ==========================================

// 1. Shelter Guide (Estanque Falso) Lógica
let selectedShelterComponent = 'radiator';

const SHELTER_DETAILS = {
  radiator: {
    title: 'Depósito de Expansión del Radiador',
    desc: '<strong>Ubicación:</strong> Frente del shelter, lado derecho.<br><strong>Función:</strong> Recupera y contiene el líquido refrigerante caliente.<br><strong>Falla Clásica:</strong> El depósito original de plástico se seca con los años y se agrieta, perdiendo refrigerante y provocando calentamientos.<br><strong>Revisión:</strong> El nivel debe estar entre las marcas min y max con el motor frío. Rellena solo con refrigerante verde de etilenglicol compatible con radiadores de aluminio (no uses agua de la llave).',
    badgeClass: 'radiator'
  },
  airFilter: {
    title: 'Filtro de Aire OEM (Caja de Aire)',
    desc: '<strong>Ubicación:</strong> Centro del shelter (bajo la bandeja de herramientas).<br><strong>Función:</strong> Filtra el aire para las 4 gargantas de carburador Keihin.<br><strong>Falla Clásica:</strong> Las esponjas originales se desarman y son succionadas por el motor. Los filtros de papel tapados enriquecen demasiado la mezcla, manchando bujías y ahogando la moto.<br><strong>Revisión:</strong> Abre los ganchos rápidos, levanta la tapa y saca el elemento. Limpia con aire comprimido o reemplaza. Imprescindible para que los carburadores sincronicen correctamente.',
    badgeClass: 'airFilter'
  },
  fuses: {
    title: 'Caja de Fusibles y Regulador',
    desc: '<strong>Ubicación:</strong> Lado posterior del shelter (bajo el compartimento de herramientas).<br><strong>Función:</strong> Fusibles de instrumentos clásicos de vidrio de 5A/10A/15A y relé de partida.<br><strong>Falla Clásica:</strong> Los terminales de bronce originales acumulan óxido verde, provocando caídas de tensión y cortes eléctricos falsos. Los fusibles de vidrio se fatigan solos internamente.<br><strong>Revisión:</strong> Limpia los contactos periódicamente con spray limpia-contactos eléctrico. Muchos dueños reemplazan esta caja por una moderna de fusibles ATC.',
    badgeClass: 'fuses'
  }
};

function initShelterGuide() {
  const hotzones = document.querySelectorAll('.shelter-hotzone');
  const checkBtn = document.getElementById('btn-check-shelter-component');
  
  hotzones.forEach(hz => {
    hz.addEventListener('click', () => {
      hotzones.forEach(h => h.classList.remove('active'));
      hz.classList.add('active');
      
      selectedShelterComponent = hz.dataset.component;
      showShelterComponentDetails(selectedShelterComponent);
    });
  });
  
  if (checkBtn) {
    checkBtn.addEventListener('click', () => {
      state.shelterChecks[selectedShelterComponent] = new Date().toISOString().split('T')[0];
      saveData();
      showShelterComponentDetails(selectedShelterComponent);
      alert(`Se ha registrado la inspección de "${SHELTER_DETAILS[selectedShelterComponent].title}" con éxito.`);
    });
  }
  
  // Show default component
  showShelterComponentDetails('radiator');
}

function showShelterComponentDetails(compKey) {
  const details = SHELTER_DETAILS[compKey];
  if (!details) return;
  
  const titleEl = document.getElementById('shelter-component-title');
  const descEl = document.getElementById('shelter-component-desc');
  
  if (titleEl) titleEl.textContent = details.title;
  if (descEl) descEl.innerHTML = details.desc;
  
  const badge = document.getElementById('shelter-status-badge');
  const checkBtn = document.getElementById('btn-check-shelter-component');
  
  if (badge) {
    badge.style.display = 'inline-flex';
    
    // Calculate status
    const lastCheck = state.shelterChecks ? state.shelterChecks[compKey] : '';
    if (!lastCheck) {
      badge.className = 'shelter-status-badge plug-rich';
      badge.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> Requiere Inspección (Sin registro)`;
    } else {
      const diffTime = Math.abs(new Date() - new Date(lastCheck));
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > 60) {
        badge.className = 'shelter-status-badge plug-lean';
        badge.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Vencido (${diffDays} días)`;
      } else {
        badge.className = 'shelter-status-badge plug-optimal';
        badge.innerHTML = `<i class="fa-solid fa-circle-check"></i> Inspeccionado (hace ${diffDays} días)`;
      }
    }
  }
  
  if (checkBtn) checkBtn.style.display = 'block';
}

// 2. Calculadora de aditivos
function initFuelAdditiveCalc() {
  const litInput = document.getElementById('additive-liters');
  const typeSelect = document.getElementById('additive-type');
  
  const calculate = () => {
    const liters = parseFloat(litInput.value) || 0;
    const type = typeSelect.value;
    let ratio = 5; // ml per liter
    
    if (type === 'stabilizer') ratio = 4;
    else if (type === 'cleaner') ratio = 5;
    else if (type === 'lead') ratio = 2;
    
    const dose = Math.round(liters * ratio);
    
    const doseValEl = document.getElementById('additive-dose-val');
    const fuelValEl = document.getElementById('additive-fuel-val');
    
    if (doseValEl) doseValEl.textContent = dose;
    if (fuelValEl) fuelValEl.textContent = liters.toFixed(1);
  };
  
  if (litInput) litInput.addEventListener('input', calculate);
  if (typeSelect) typeSelect.addEventListener('change', calculate);
  
  // Initial calculate
  if (litInput) calculate();
}

// 3. Calculadora de altitud
function initAltitudeCalc() {
  const slider = document.getElementById('slider-altitude');
  
  const calculate = () => {
    const alt = parseInt(slider.value) || 0;
    
    const altValEl = document.getElementById('slider-alt-val');
    const screwValEl = document.getElementById('alt-screw-val');
    const powerValEl = document.getElementById('alt-power-val');
    const powerDescEl = document.getElementById('alt-power-desc');
    const recTextEl = document.getElementById('alt-rec-text');
    
    if (altValEl) altValEl.textContent = `${alt.toLocaleString()} metros`;
    
    // Keihin standard mixture screw turns (Pilot screw turns)
    let turns = 1.25 - (alt / 1000) * 0.15;
    if (turns < 0.5) turns = 0.5; // safety limit
    if (screwValEl) screwValEl.textContent = `${turns.toFixed(2)} vueltas`;
    
    // Performance HP calculations
    const originalHP = 80.0;
    const lossPct = (alt / 300) * 0.03;
    const hp = originalHP * (1 - lossPct);
    const hpPct = Math.round((1 - lossPct) * 100);
    
    if (powerValEl) {
      powerValEl.textContent = `${hp.toFixed(1)} HP`;
      if (hpPct > 85) {
        powerValEl.style.color = 'var(--accent-green)';
        if (powerDescEl) powerDescEl.textContent = `${hpPct}% de fábrica (Buena)`;
      } else if (hpPct > 70) {
        powerValEl.style.color = 'var(--accent-gold)';
        if (powerDescEl) powerDescEl.textContent = `${hpPct}% de fábrica (Aceptable)`;
      } else {
        powerValEl.style.color = 'var(--accent-red)';
        if (powerDescEl) powerDescEl.textContent = `${hpPct}% de fábrica (Baja)`;
      }
    }
    
    // Recommendations text
    if (recTextEl) {
      if (alt < 800) {
        recTextEl.innerHTML = `<strong>Recomendación:</strong> Mezcla ideal a nivel del mar. Chicleres de alta estándar (#120) funcionan óptimo. Tornillo de aire a 1.25 vueltas.`;
      } else if (alt < 2000) {
        recTextEl.innerHTML = `<strong>Recomendación:</strong> Altitud media. Cierra un poco el tornillo de aire del carburador (${turns.toFixed(2)} vueltas) para empobrecer la mezcla y evitar bujías carbonizadas.`;
      } else {
        recTextEl.innerHTML = `<strong>Recomendación:</strong> Cordillera/Gran Altura. La moto andará muy rica de mezcla. Cierra el tornillo de aire al mínimo (${turns.toFixed(2)} vueltas). Para estancias largas, reduce los chicleres de alta de #120 a #115.`;
      }
    }
  };
  
  if (slider) {
    slider.addEventListener('input', calculate);
    calculate();
  }
}

// 4. Diagnóstico de bujías
function initSparkPlugDiag() {
  const selects = document.querySelectorAll('.plug-select');
  
  selects.forEach(select => {
    select.addEventListener('change', (e) => {
      const cyl = e.target.dataset.cylinder;
      const status = e.target.value;
      
      const icon = document.getElementById(`plug-icon-${cyl}`);
      if (icon) {
        icon.className = `plug-visual-icon plug-${status}`;
      }
      
      recalculatePlugDiagnostic();
    });
  });
}

function recalculatePlugDiagnostic() {
  const select1 = document.getElementById('select-plug-1');
  const select2 = document.getElementById('select-plug-2');
  const select3 = document.getElementById('select-plug-3');
  const select4 = document.getElementById('select-plug-4');
  
  if (!select1 || !select2 || !select3 || !select4) return;
  
  const statuses = [
    select1.value,
    select2.value,
    select3.value,
    select4.value
  ];
  
  const reportBox = document.getElementById('plug-diagnostic-report');
  if (!reportBox) return;
  
  let richCount = 0;
  let leanCount = 0;
  let oilCount = 0;
  let optimalCount = 0;
  
  statuses.forEach(s => {
    if (s === 'optimal') optimalCount++;
    else if (s === 'rich') richCount++;
    else if (s === 'lean') leanCount++;
    else if (s === 'oil') oilCount++;
  });
  
  if (optimalCount === 4) {
    reportBox.style.backgroundColor = 'rgba(23, 191, 99, 0.05)';
    reportBox.style.borderColor = 'var(--accent-green)';
    reportBox.innerHTML = `<strong>Estado General:</strong> Motor bien balanceado. Todos los cilindros muestran una combustión ideal de color café canela. Los Keihin están bien calibrados.`;
  } else if (oilCount > 0) {
    reportBox.style.backgroundColor = 'rgba(224, 36, 94, 0.05)';
    reportBox.style.borderColor = 'var(--accent-red)';
    reportBox.innerHTML = `<strong>¡Atención: Presencia de Aceite!</strong> Tienes bujías negras aceitosas. Esto indica que está entrando aceite a las cámaras de combustión. Revisa los retenes de guías de válvulas o anillos de pistón gastados.`;
  } else if (richCount > 0 && leanCount > 0) {
    reportBox.style.backgroundColor = 'rgba(255, 179, 0, 0.05)';
    reportBox.style.borderColor = 'var(--accent-gold)';
    reportBox.innerHTML = `<strong>Carburadores desbalanceados:</strong> Tienes cilindros con mezcla rica (negros secos) y otros con mezcla pobre (blancos). Requiere urgente sincronización de carburadores con vacuómetro y balanceo de tornillos de mezcla.`;
  } else if (richCount > 0) {
    reportBox.style.backgroundColor = 'rgba(255, 179, 0, 0.05)';
    reportBox.style.borderColor = 'var(--accent-gold)';
    reportBox.innerHTML = `<strong>Mezcla demasiado rica:</strong> Varios cilindros tienen exceso de bencina. Verifica que el filtro de aire no esté tapado o reduce las vueltas de los tornillos piloto.`;
  } else if (leanCount > 0) {
    reportBox.style.backgroundColor = 'rgba(224, 36, 94, 0.05)';
    reportBox.style.borderColor = 'var(--accent-red)';
    reportBox.innerHTML = `<strong>Mezcla peligrosa pobre:</strong> Tienes cilindros con bujías blancas. Esto aumenta la temperatura y puede derretir un pistón. Revisa posibles fugas de vacío en los O-rings de los colectores de admisión o chicleres tapados.`;
  }
}

// 5. Gráfico de consumo por estilo de conducción
let efficiencyStyleChart = null;

function updateEfficiencyStyleChart() {
  const canvas = document.getElementById('efficiencyStyleChart');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  
  // Calculate average L/100km by style
  const styles = ['Turismo', 'Ciudad', 'Autopista', 'Deportivo'];
  const dataMap = { 'Turismo': [], 'Ciudad': [], 'Autopista': [], 'Deportivo': [] };
  
  // Sort logs by odometer to calculate individual consumptions
  const sortedLogs = [...state.fuelLogs].sort((a, b) => a.odometer - b.odometer);
  const initialOdo = parseInt(state.settings.initialOdo) || 0;
  
  for (let i = 0; i < sortedLogs.length; i++) {
    const curr = sortedLogs[i];
    let prevOdo = initialOdo;
    if (i > 0) {
      prevOdo = sortedLogs[i - 1].odometer;
    }
    
    const distance = curr.odometer - prevOdo;
    if (distance > 0 && curr.liters > 0) {
      const consumption = (curr.liters / distance) * 100; // L/100km
      const style = curr.type || 'Turismo';
      if (dataMap[style]) {
        dataMap[style].push(consumption);
      }
    }
  }
  
  // Average values
  const averages = styles.map(style => {
    const arr = dataMap[style];
    if (arr && arr.length > 0) {
      const sum = arr.reduce((a, b) => a + b, 0);
      return parseFloat((sum / arr.length).toFixed(1));
    }
    return 0; // fallback if no data
  });
  
  // Check if chart exists and destroy to avoid overlay bugs
  if (efficiencyStyleChart) {
    efficiencyStyleChart.destroy();
  }
  
  efficiencyStyleChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: styles,
      datasets: [{
        label: 'Promedio (L/100km)',
        data: averages,
        backgroundColor: [
          'rgba(23, 191, 99, 0.4)',  // Green (Turismo)
          'rgba(29, 161, 242, 0.4)', // Blue (Ciudad)
          'rgba(255, 179, 0, 0.4)',  // Gold (Autopista)
          'rgba(224, 36, 94, 0.4)'   // Red (Deportivo)
        ],
        borderColor: [
          '#17bf63',
          '#1da1f2',
          '#ffb300',
          '#e0245e'
        ],
        borderWidth: 1.5,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `Consumo: ${context.raw} L/100km`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#8899a6', font: { size: 9 } }
        },
        y: {
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: { color: '#8899a6', font: { size: 8 } },
          beginAtZero: true
        }
      }
    }
  });
}

// ==========================================
// SERVICE WORKER + PWA INSTALL
// ==========================================
function isPwaStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

function isIosDevice() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
}

function initServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then((reg) => {
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            showSwUpdateBanner();
          }
        });
      });
    }).catch((err) => {
      console.warn('Service worker no registrado:', err);
    });
  });

  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
}

function showSwUpdateBanner() {
  const banner = document.getElementById('sw-update-banner');
  const reloadBtn = document.getElementById('btn-sw-reload');
  if (!banner) return;
  banner.hidden = false;
  if (reloadBtn && !reloadBtn.dataset.bound) {
    reloadBtn.dataset.bound = '1';
    reloadBtn.addEventListener('click', () => {
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
      } else {
        window.location.reload();
      }
    });
  }
}

function isAndroidDevice() {
  return /android/i.test(navigator.userAgent);
}

function isXiaomiDevice() {
  return /xiaomi|miui|redmi|hyperos|mi\s15|mi\s14/i.test(navigator.userAgent);
}

function initPwaInstall() {
  const installBtn = document.getElementById('btn-install-pwa');
  const bannerBtn = document.getElementById('btn-install-banner');
  const bannerLater = document.getElementById('btn-install-later');
  const installBanner = document.getElementById('install-banner');
  const bannerText = document.getElementById('install-banner-text');
  const statusEl = document.getElementById('pwa-install-status');
  const iosHint = document.getElementById('pwa-install-ios-hint');
  const androidHint = document.getElementById('pwa-install-android-hint');
  const xiaomiNote = document.getElementById('pwa-xiaomi-note');
  const desktopHint = document.getElementById('pwa-install-desktop-hint');
  if (!installBtn) return;

  let deferredPrompt = null;
  const isStandalone = isPwaStandalone();
  const isIos = isIosDevice();
  const isAndroid = isAndroidDevice();
  const snoozed = sessionStorage.getItem('goldwing_install_snooze') === '1';

  if (isStandalone && statusEl) {
    statusEl.textContent = 'GoldwingGas ya está instalada en este dispositivo.';
  } else if (isIos && iosHint) {
    iosHint.hidden = false;
    if (statusEl) {
      statusEl.textContent = 'En iPhone/iPad usa Safari y añade la app a la pantalla de inicio (ver instrucciones abajo).';
    }
    if (!snoozed && installBanner) {
      installBanner.hidden = false;
      if (bannerText) {
        bannerText.textContent = 'En Safari: Compartir → Añadir a pantalla de inicio.';
      }
      if (bannerBtn) bannerBtn.style.display = 'none';
    }
  } else if (isAndroid && androidHint) {
    androidHint.hidden = false;
    if (xiaomiNote && isXiaomiDevice()) xiaomiNote.hidden = false;
    if (statusEl) {
      statusEl.textContent = isXiaomiDevice()
        ? 'En tu Xiaomi, abre esta página en Chrome y añádela a la pantalla de inicio (instrucciones abajo).'
        : 'En Android usa Chrome y el menú ⋮ para instalar la app (instrucciones abajo).';
    }
    if (!snoozed && installBanner) {
      installBanner.hidden = false;
      if (bannerText) {
        bannerText.textContent = isXiaomiDevice()
          ? 'Xiaomi/HyperOS: Chrome → ⋮ → Añadir a pantalla de inicio.'
          : 'Chrome → ⋮ → Instalar aplicación o Añadir a pantalla de inicio.';
      }
    }
  } else if (!isIos && desktopHint && !isAndroid) {
    desktopHint.hidden = false;
  }

  const triggerInstall = async () => {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    try {
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted' && statusEl) {
        statusEl.textContent = 'Instalación iniciada. Busca el icono GoldwingGas en la pantalla de inicio.';
      }
    } catch (err) {
      console.warn('Install prompt error:', err);
    }
    deferredPrompt = null;
    installBtn.style.display = 'none';
    if (installBanner) installBanner.hidden = true;
    return true;
  };

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.style.display = 'inline-flex';
    if (statusEl) {
      statusEl.textContent = 'Listo para instalar. Usa el botón o el menú del navegador → Instalar app.';
    }
    if (!snoozed && installBanner) {
      installBanner.hidden = false;
      if (bannerText) {
        bannerText.textContent = 'Instálala como app a pantalla completa, sin tienda de aplicaciones.';
      }
      if (bannerBtn) bannerBtn.style.display = '';
    }
  });

  installBtn.addEventListener('click', () => triggerInstall());
  if (bannerBtn) {
    bannerBtn.addEventListener('click', () => triggerInstall());
  }
  if (bannerLater) {
    bannerLater.addEventListener('click', () => {
      sessionStorage.setItem('goldwing_install_snooze', '1');
      if (installBanner) installBanner.hidden = true;
    });
  }

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    installBtn.style.display = 'none';
    if (installBanner) installBanner.hidden = true;
    if (statusEl) {
      statusEl.textContent = 'GoldwingGas quedó instalada. Ábrela desde el icono de la pantalla de inicio.';
    }
  });
}

// ==========================================
// BACKUP + LAST-EXPORT STATUS
// ==========================================
function daysSinceBackup() {
  const raw = state.settings && state.settings.lastBackupAt;
  if (!raw) return Infinity;
  const then = new Date(raw).getTime();
  if (Number.isNaN(then)) return Infinity;
  return (Date.now() - then) / (1000 * 60 * 60 * 24);
}

function formatBackupDate(iso) {
  if (!iso) return typeof t === 'function' ? t('backup.never') : 'Nunca';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return typeof t === 'function' ? t('backup.never') : 'Nunca';
  const locale = typeof getDateLocale === 'function' ? getDateLocale() : 'es-CL';
  return d.toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' });
}

function markBackupDone() {
  state.settings.lastBackupAt = new Date().toISOString();
  saveData();
  sessionStorage.removeItem('goldwing_backup_snooze');
  updateBackupStatus();
}

async function buildBackupPayload() {
  const payload = persistableState();
  payload.exportedAt = new Date().toISOString();
  payload.photos = await getAllPhotos();
  (payload.fuelLogs || []).forEach((log) => {
    if (isDataUrl(log.image) && log.id) {
      payload.photos[log.id] = log.image;
      log.image = '';
      log.photoId = log.photoId || log.id;
    }
  });
  (payload.maintLogs || []).forEach((log) => {
    if (isDataUrl(log.image) && log.id) {
      payload.photos[log.id] = log.image;
      log.image = '';
      log.photoId = log.photoId || log.id;
    }
  });
  return payload;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function backupFilename() {
  return `goldwing_gas_backup_${new Date().toISOString().split('T')[0]}.json`;
}

async function downloadBackupFile() {
  try {
    const payload = await buildBackupPayload();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    downloadBlob(blob, backupFilename());
    markBackupDone();
  } catch (err) {
    alert('No se pudo generar el respaldo: ' + err.message);
  }
}

async function shareBackupFile() {
  try {
    const payload = await buildBackupPayload();
    const filename = backupFilename();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const file = new File([blob], filename, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ title: 'Respaldo GoldwingGas', files: [file] });
      markBackupDone();
      return;
    }
    downloadBlob(blob, filename);
    markBackupDone();
  } catch (err) {
    if (err && err.name === 'AbortError') return;
    alert('No se pudo compartir el respaldo: ' + err.message);
  }
}

async function importBackupPayload(importedState) {
  if (!importedState || !importedState.fuelLogs || !importedState.maintLogs || !importedState.settings) {
    return false;
  }
  const photos = importedState.photos && typeof importedState.photos === 'object' ? importedState.photos : {};
  const next = { ...importedState };
  delete next.photos;
  delete next.exportedAt;
  state = next;
  ensureSettingsDefaults();
  ensureLogIds(state.fuelLogs);
  ensureLogIds(state.maintLogs);
  if (!Array.isArray(state.rides)) state.rides = [];
  await clearAllPhotos();
  for (const [id, dataUrl] of Object.entries(photos)) {
    if (isDataUrl(dataUrl)) await putPhoto(id, dataUrl);
  }
  await migrateEmbeddedPhotosToIdb();
  if (!state.settings.lastBackupAt) {
    state.settings.lastBackupAt = importedState.exportedAt || new Date().toISOString();
  }
  saveData();
  return true;
}

function backupIsOverdue() {
  return daysSinceBackup() >= BACKUP_WARN_DAYS;
}

async function updateBackupStatus() {
  const lastEl = document.getElementById('backup-last-label');
  const hintEl = document.getElementById('backup-status-hint');
  const boxEl = document.getElementById('backup-status-box');
  const banner = document.getElementById('backup-banner');
  const bannerText = document.getElementById('backup-banner-text');
  const storageEl = document.getElementById('backup-storage-label');

  const last = state.settings.lastBackupAt || '';
  const overdue = backupIsOverdue();
  const snoozed = sessionStorage.getItem('goldwing_backup_snooze') === '1';

  if (lastEl) lastEl.textContent = formatBackupDate(last);
  if (boxEl) boxEl.classList.toggle('is-overdue', overdue);
  if (hintEl) {
    if (!last) {
      hintEl.textContent = 'Todavía no hay un archivo de respaldo. Descárgalo y guárdalo fuera del teléfono (Drive, PC o USB).';
    } else if (overdue) {
      hintEl.textContent = `Han pasado ${Math.floor(daysSinceBackup())} días. Conviene descargar un JSON nuevo.`;
    } else {
      hintEl.textContent = 'Las fotos de boletas viven en IndexedDB (aparte del historial) para no llenar el navegador. El JSON de respaldo las incluye.';
    }
  }

  if (banner) {
    const show = overdue && !snoozed;
    banner.hidden = !show;
    if (show && bannerText) {
      bannerText.textContent = last
        ? `Último archivo: ${formatBackupDate(last)}. Descarga una copia nueva para no perder la bitácora.`
        : 'Los datos viven en este navegador. Descarga un JSON y guárdalo fuera del teléfono.';
    }
  }

  if (storageEl && navigator.storage && navigator.storage.estimate) {
    try {
      const est = await navigator.storage.estimate();
      const usage = est.usage || 0;
      const quota = est.quota || 0;
      const fmt = (n) => {
        if (n > 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
        if (n > 1024) return `${Math.round(n / 1024)} KB`;
        return `${n} B`;
      };
      storageEl.textContent = quota ? `${fmt(usage)} de ${fmt(quota)}` : fmt(usage);
    } catch (err) {
      storageEl.textContent = photoDbAvailable ? 'Fotos en IndexedDB' : 'Solo localStorage';
    }
  } else if (storageEl) {
    storageEl.textContent = photoDbAvailable ? 'Fotos en IndexedDB' : 'Solo localStorage';
  }
}

function initBackupUi() {
  const backupNow = document.getElementById('btn-backup-now');
  const backupLater = document.getElementById('btn-backup-later');
  const shareBtn = document.getElementById('btn-share-backup');

  if (backupNow) {
    backupNow.addEventListener('click', () => downloadBackupFile());
  }
  if (backupLater) {
    backupLater.addEventListener('click', () => {
      sessionStorage.setItem('goldwing_backup_snooze', '1');
      const banner = document.getElementById('backup-banner');
      if (banner) banner.hidden = true;
    });
  }
  if (shareBtn) {
    try {
      const probe = new File(['{}'], 'goldwing_gas_backup.json', { type: 'application/json' });
      if (navigator.canShare && navigator.canShare({ files: [probe] })) {
        shareBtn.style.display = 'inline-flex';
        shareBtn.addEventListener('click', () => shareBackupFile());
      }
    } catch (err) {
      // Share API no soporta archivos en este navegador
    }
  }
}

