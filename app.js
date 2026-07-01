// State Management
let state = {
  fuelLogs: [],
  maintLogs: [],
  settings: {
    modelYear: '1978',
    initialOdo: 45000,
    currency: '$'
  }
};

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
  { date: '2026-05-15', odometer: 45150, liters: 15.2, cost: 16500, type: 'Turismo', station: 'Shell Apoquindo', notes: 'Carga inicial', image: '' },
  { date: '2026-05-28', odometer: 45360, liters: 14.8, cost: 16100, type: 'Ciudad', station: 'Copec Vitacura', notes: 'Ruta urbana', image: '' },
  { date: '2026-06-10', odometer: 45610, liters: 16.5, cost: 18000, type: 'Autopista', station: 'Shell Ruta 68', notes: 'Viaje a Viña', image: '' },
  { date: '2026-06-25', odometer: 45840, liters: 15.0, cost: 16300, type: 'Turismo', station: 'Petrobras', notes: 'Paseo de fin de semana', image: '' }
];

const SEED_MAINT_LOGS = [
  { date: '2026-05-10', type: 'Correas de Distribución', odometer: 45000, cost: 120000, notes: 'Se instalaron correas Gates nuevas y tensores. Crítico para motor GL-1000.' },
  { date: '2026-05-10', type: 'Cambio de Aceite y Filtro', odometer: 45000, cost: 35000, notes: 'Aceite Liqui Moly 20W-50 mineral y filtro de aceite original.' },
  { date: '2026-05-12', type: 'Sincronización Carburadores', odometer: 45050, cost: 50000, notes: 'Sincronización de los 4 carburadores Keihin con vacuómetro. Quedó ralentí muy parejo.' },
  { date: '2026-05-12', type: 'Ajuste de Válvulas', odometer: 45050, cost: 25000, notes: 'Ajuste de holgura de válvulas (Admisión: 0.10mm, Escape: 0.13mm).' }
];

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  initTabs();
  initFormListeners();
  initOcrEngine();
  updateUI();
});

// Load state from localStorage or seed
function loadData() {
  const savedState = localStorage.getItem('goldwing_gas_state');
  if (savedState) {
    try {
      state = JSON.parse(savedState);
    } catch (e) {
      console.error('Error al cargar datos de localStorage. Iniciando con semillas.', e);
      seedState();
    }
  } else {
    seedState();
  }
}

function seedState() {
  state.fuelLogs = [...SEED_FUEL_LOGS];
  state.maintLogs = [...SEED_MAINT_LOGS];
  state.settings = {
    modelYear: '1978',
    initialOdo: 45000,
    currency: '$'
  };
  saveData();
}

function saveData() {
  localStorage.setItem('goldwing_gas_state', JSON.stringify(state));
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
  
  // Render logs lists tables
  renderFuelLogsTable();
  renderMaintLogsTable();
  
  // Update maintenance lamps & schedules list
  updateMaintenanceStatus(stats.currentOdo);
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
    
    // Total Distance traveled from initial odo
    const minFuelOdo = Math.min(...state.fuelLogs.map(l => l.odometer));
    const maxFuelOdoVal = Math.max(...state.fuelLogs.map(l => l.odometer));
    
    if (minFuelOdo > initialOdo) {
      totalDist = maxFuelOdoVal - initialOdo;
    } else {
      totalDist = maxFuelOdoVal - minFuelOdo;
    }
  } else if (state.maintLogs.length > 0) {
    currentOdo = Math.max(...state.maintLogs.map(l => l.odometer), initialOdo);
    totalDist = currentOdo - initialOdo;
  }
  
  // Calculate individual fuel efficiencies
  let totalEfficiencySum = 0;
  let efficiencyCounts = 0;
  
  for (let i = 0; i < state.fuelLogs.length; i++) {
    let prevOdo = initialOdo;
    if (i > 0) {
      prevOdo = state.fuelLogs[i - 1].odometer;
    }
    
    const dist = state.fuelLogs[i].odometer - prevOdo;
    if (dist > 0 && state.fuelLogs[i].liters > 0) {
      const eff = dist / state.fuelLogs[i].liters; // km/L
      state.fuelLogs[i].efficiency = eff;
      totalEfficiencySum += eff;
      efficiencyCounts++;
    } else {
      state.fuelLogs[i].efficiency = null;
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
  Object.keys(MAINTENANCE_SCHEDULES).forEach(type => {
    const sched = MAINTENANCE_SCHEDULES[type];
    
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
    tbody.innerHTML = `<tr><td colspan="8" class="text-center">No hay registros de bencina cargados.</td></tr>`;
    return;
  }
  
  // Sort reverse chronological
  const displayLogs = [...state.fuelLogs].sort((a, b) => new Date(b.date) - new Date(a.date));
  
  displayLogs.forEach(log => {
    const originalIndex = state.fuelLogs.indexOf(log);
    const dateFormatted = new Date(log.date).toLocaleDateString('es-ES', { timeZone: 'UTC' });
    const efficiencyDisplay = log.efficiency 
      ? `<strong>${log.efficiency.toFixed(2)}</strong> km/L<br><span class="text-muted">${(100/log.efficiency).toFixed(2)} L/100km</span>`
      : '<span class="text-muted">N/A (Carga inicial)</span>';
      
    const hasPhoto = log.image ? `<button class="ticket-attachment-btn" onclick="viewPhoto(${originalIndex})"><i class="fa-solid fa-receipt"></i> Ver boleta</button>` : '<span class="text-muted">-</span>';
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${dateFormatted}</td>
      <td><strong>${log.odometer.toLocaleString()} km</strong></td>
      <td>${log.liters.toFixed(2)} L</td>
      <td>${state.settings.currency}${log.cost.toLocaleString()}</td>
      <td>${efficiencyDisplay}</td>
      <td>${hasPhoto}</td>
      <td><span class="tag-badge ${log.type.toLowerCase()}">${log.type}</span>${log.station ? '<br><small class="text-muted">' + log.station + '</small>' : ''}${log.notes ? '<p class="text-muted" style="font-size: 0.75rem; margin-top:2px;">' + log.notes + '</p>' : ''}</td>
      <td>
        <button class="btn-icon" onclick="editFuelLog(${originalIndex})" title="Editar"><i class="fa-solid fa-pen-to-square"></i></button>
        <button class="btn-icon btn-icon-danger" onclick="deleteFuelLog(${originalIndex})" title="Eliminar"><i class="fa-solid fa-trash-can"></i></button>
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
    tbody.innerHTML = `<tr><td colspan="6" class="text-center">No hay mantenimientos registrados.</td></tr>`;
    return;
  }
  
  // Sort reverse chronological
  const displayMaint = [...state.maintLogs].sort((a, b) => new Date(b.date) - new Date(a.date));
  
  displayMaint.forEach(log => {
    const originalIndex = state.maintLogs.indexOf(log);
    const dateFormatted = new Date(log.date).toLocaleDateString('es-ES', { timeZone: 'UTC' });
    const costDisplay = log.cost ? `${state.settings.currency}${parseInt(log.cost).toLocaleString()}` : '<span class="text-muted">-</span>';
    const hasPhoto = log.image ? `<button class="ticket-attachment-btn" onclick="viewMaintPhoto(${originalIndex})"><i class="fa-solid fa-receipt"></i> Ver nota</button>` : '<span class="text-muted">-</span>';
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${dateFormatted}</td>
      <td><strong>${log.type}</strong></td>
      <td><strong>${log.odometer.toLocaleString()} km</strong></td>
      <td>${costDisplay}</td>
      <td><p style="margin: 0; max-width: 250px; font-size: 0.85rem;">${log.notes || '-'}</p></td>
      <td>${hasPhoto}</td>
      <td>
        <button class="btn-icon" onclick="editMaintLog(${originalIndex})" title="Editar"><i class="fa-solid fa-pen-to-square"></i></button>
        <button class="btn-icon btn-icon-danger" onclick="deleteMaintLog(${originalIndex})" title="Eliminar"><i class="fa-solid fa-trash-can"></i></button>
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
        
        // Hide OCR preview
        document.getElementById('ocr-preview-container').style.display = 'none';
        document.getElementById('ocr-preview-img').src = '';
        document.getElementById('ocr-results-alert').style.display = 'none';
        document.getElementById('ocr-file-input').value = '';
        
        // Set date to today
        document.getElementById('fuel-date').value = new Date().toISOString().split('T')[0];
        
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
  document.getElementById('form-fuel-log').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const index = parseInt(document.getElementById('fuel-log-index').value);
    const date = document.getElementById('fuel-date').value;
    const odometer = parseInt(document.getElementById('fuel-odo').value);
    const liters = parseFloat(document.getElementById('fuel-liters').value);
    const cost = parseInt(document.getElementById('fuel-cost').value);
    const type = document.getElementById('fuel-type').value;
    const station = document.getElementById('fuel-station').value;
    const imageData = document.getElementById('fuel-image-data').value;
    
    // Validation
    const initialOdo = parseInt(state.settings.initialOdo) || 0;
    
    if (odometer < initialOdo) {
      alert(`El kilometraje no puede ser inferior al odómetro inicial establecido (${initialOdo.toLocaleString()} km).`);
      return;
    }
    
    const logData = { date, odometer, liters, cost, type, station, notes: '', image: imageData };
    
    if (index === -1) {
      state.fuelLogs.push(logData);
    } else {
      state.fuelLogs[index] = { ...state.fuelLogs[index], ...logData };
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
        
        // Hide OCR preview
        document.getElementById('ocr-maint-preview-container').style.display = 'none';
        document.getElementById('ocr-maint-preview-img').src = '';
        document.getElementById('ocr-maint-results-alert').style.display = 'none';
        document.getElementById('ocr-maint-file-input').value = '';
        
        document.getElementById('maint-date').value = new Date().toISOString().split('T')[0];
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
  document.getElementById('form-maint-log').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const index = parseInt(document.getElementById('maint-log-index').value);
    const type = document.getElementById('maint-type').value;
    const date = document.getElementById('maint-date').value;
    const odometer = parseInt(document.getElementById('maint-odo').value);
    const cost = document.getElementById('maint-cost').value ? parseInt(document.getElementById('maint-cost').value) : null;
    const notes = document.getElementById('maint-notes').value;
    const imageData = document.getElementById('maint-image-data').value;
    
    const initialOdo = parseInt(state.settings.initialOdo) || 0;
    if (odometer < initialOdo) {
      alert(`El kilometraje no puede ser inferior al odómetro inicial establecido (${initialOdo.toLocaleString()} km).`);
      return;
    }
    
    const maintData = { type, date, odometer, cost, notes, image: imageData };
    
    if (index === -1) {
      state.maintLogs.push(maintData);
    } else {
      state.maintLogs[index] = { ...state.maintLogs[index], ...maintData };
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
    
    saveData();
    updateUI();
    alert('Configuración de la moto guardada con éxito.');
  });
  
  // Export/Import JSON data
  document.getElementById('btn-export-data').addEventListener('click', () => {
    const dataStr = JSON.stringify(state, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `goldwing_gas_backup_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  });
  
  document.getElementById('input-import-data').addEventListener('change', (e) => {
    const fileReader = new FileReader();
    fileReader.onload = function(event) {
      try {
        const importedState = JSON.parse(event.target.result);
        if (importedState.fuelLogs && importedState.maintLogs && importedState.settings) {
          state = importedState;
          saveData();
          updateUI();
          alert('¡Datos respaldados cargados correctamente!');
        } else {
          alert('El formato del archivo JSON no coincide con el esquema requerido.');
        }
      } catch (err) {
        alert('Error al leer el archivo JSON: ' + err.message);
      }
    };
    if (e.target.files[0]) {
      fileReader.readAsText(e.target.files[0]);
    }
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
  
  // Clear/Reset Data
  document.getElementById('btn-reset-data').addEventListener('click', () => {
    if (confirm('¿Estás seguro de que deseas borrar por completo todo el historial? Esta acción no se puede deshacer.')) {
      localStorage.removeItem('goldwing_gas_state');
      seedState();
      updateUI();
      alert('Se han borrado todos los registros y se ha restaurado la demostración.');
    }
  });
}

// Global actions triggers (via window for inline HTML onclick attributes)
window.editFuelLog = function(index) {
  const log = state.fuelLogs[index];
  
  document.getElementById('fuel-log-index').value = index;
  document.getElementById('fuel-date').value = log.date;
  document.getElementById('fuel-odo').value = log.odometer;
  document.getElementById('fuel-liters').value = log.liters;
  document.getElementById('fuel-cost').value = log.cost;
  document.getElementById('fuel-type').value = log.type;
  document.getElementById('fuel-station').value = log.station || '';
  document.getElementById('fuel-image-data').value = log.image || '';
  
  // Pre-fill image view if edit contains ticket image
  const previewContainer = document.getElementById('ocr-preview-container');
  const previewImg = document.getElementById('ocr-preview-img');
  
  if (log.image) {
    previewContainer.style.display = 'block';
    previewImg.src = log.image;
    document.getElementById('scan-status').style.display = 'none';
    document.getElementById('scanner-laser').style.display = 'none';
  } else {
    previewContainer.style.display = 'none';
    previewImg.src = '';
  }
  
  document.getElementById('ocr-results-alert').style.display = 'none';
  document.getElementById('modal-fuel').classList.add('open');
};

window.deleteFuelLog = function(index) {
  if (confirm('¿Eliminar este registro de bencina?')) {
    state.fuelLogs.splice(index, 1);
    saveData();
    updateUI();
  }
};

window.editMaintLog = function(index) {
  const log = state.maintLogs[index];
  
  document.getElementById('maint-log-index').value = index;
  document.getElementById('maint-type').value = log.type;
  document.getElementById('maint-date').value = log.date;
  document.getElementById('maint-odo').value = log.odometer;
  document.getElementById('maint-cost').value = log.cost || '';
  document.getElementById('maint-notes').value = log.notes || '';
  document.getElementById('maint-image-data').value = log.image || '';
  
  // Pre-fill image view if edit contains ticket image
  const previewContainer = document.getElementById('ocr-maint-preview-container');
  const previewImg = document.getElementById('ocr-maint-preview-img');
  
  if (log.image) {
    previewContainer.style.display = 'block';
    previewImg.src = log.image;
    document.getElementById('scanner-maint-status').style.display = 'none';
    document.getElementById('scanner-maint-laser').style.display = 'none';
  } else {
    previewContainer.style.display = 'none';
    previewImg.src = '';
  }
  
  document.getElementById('ocr-maint-results-alert').style.display = 'none';
  document.getElementById('modal-maint').classList.add('open');
};

window.deleteMaintLog = function(index) {
  if (confirm('¿Eliminar este registro de mantenimiento?')) {
    state.maintLogs.splice(index, 1);
    saveData();
    updateUI();
  }
};

window.viewPhoto = function(index) {
  const log = state.fuelLogs[index];
  if (log && log.image) {
    const viewerModal = document.getElementById('modal-viewer');
    const viewerImg = document.getElementById('viewer-img');
    viewerImg.src = log.image;
    viewerModal.classList.add('open');
  }
};

window.viewMaintPhoto = function(index) {
  const log = state.maintLogs[index];
  if (log && log.image) {
    const viewerModal = document.getElementById('modal-viewer');
    const viewerImg = document.getElementById('viewer-img');
    viewerImg.src = log.image;
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
  reader.onload = function(e) {
    const base64Data = e.target.result;
    
    // Save image to hidden form input
    document.getElementById('fuel-image-data').value = base64Data;
    
    // Render UI loading/scanning animations
    const previewContainer = document.getElementById('ocr-preview-container');
    const previewImg = document.getElementById('ocr-preview-img');
    const laser = document.getElementById('scanner-laser');
    const statusOverlay = document.getElementById('scan-status');
    const alertResult = document.getElementById('ocr-results-alert');
    
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
  // Looking for floating numbers near word indicators L, LTS, LITROS, LTR
  // e.g. "15,20 L", "12.5 LTS", "14.80L"
  const litersRegex = /(\d+[\.,]\d{1,3})\s*(?:L|LTS|LIT|LITROS|LTR|VOLUMEN)\b/g;
  let literMatches = [...normalizedText.matchAll(litersRegex)];
  
  if (literMatches.length > 0) {
    // Convert comma to dot and parse
    const possibleLiters = parseFloat(literMatches[0][1].replace(',', '.'));
    // Make sure volume is reasonable for a motorcycle tank fill-up (typically 5 to 22 liters)
    if (possibleLiters >= 1 && possibleLiters <= 25) {
      detectedLiters = possibleLiters;
    }
  } else {
    // Fallback: search for any floating point numbers between 3.00 and 22.00
    const floatRegex = /\b(\d+[\.,]\d{1,2})\b/g;
    const floatMatches = normalizedText.match(floatRegex) || [];
    for (const matchStr of floatMatches) {
      const val = parseFloat(matchStr.replace(',', '.'));
      if (val >= 4.0 && val <= 20.0) {
        detectedLiters = val;
        break;
      }
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
  // Look for currency symbols or words like TOTAL, PAGO, COSTO, NETO
  const priceRegex = /(?:TOTAL|PAGO|NETO|\$|PESOS)\s*[:\.]?\s*(\d{3,6})\b/;
  const priceMatch = normalizedText.match(priceRegex);
  if (priceMatch) {
    detectedPrice = parseInt(priceMatch[1]);
  } else {
    // Find numbers between 1000 and 30000 that aren't the odometer
    const intRegex = /\b(\d{4,5})\b/g;
    const intMatches = [...normalizedText.matchAll(intRegex)];
    for (const match of intMatches) {
      const val = parseInt(match[1]);
      if (val >= 2000 && val <= 30000 && val !== detectedOdo) {
        detectedPrice = val;
        break;
      }
    }
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

// Parse and import CSV spreadsheet files from Excel
function parseAndImportCSV(text) {
  try {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 2) {
      alert("El archivo CSV está vacío o no contiene registros.");
      return;
    }
    
    // Detect separator: comma or semicolon
    const header = lines[0];
    let sep = ';';
    if (header.includes(',')) {
      if (header.includes(';')) {
        sep = ';';
      } else {
        sep = ',';
      }
    }
    
    const headers = header.split(sep).map(h => h.trim().toLowerCase().replace(/\"/g, ''));
    console.log("CSV Headers detected:", headers);
    
    // Map header indices
    let dateIdx = headers.findIndex(h => h.includes('fech') || h.includes('date'));
    let odoIdx = headers.findIndex(h => h.includes('kilomet') || h.includes('odo') || h.includes('km'));
    let litersIdx = headers.findIndex(h => h.includes('litr') || h.includes('cant') || h.includes('vol'));
    let costIdx = headers.findIndex(h => h.includes('cost') || h.includes('tot') || h.includes('prec') || h.includes('val'));
    let typeIdx = headers.findIndex(h => h.includes('tipo') || h.includes('modo') || h.includes('style'));
    let notesIdx = headers.findIndex(h => h.includes('not') || h.includes('coment') || h.includes('detall'));
    
    if (dateIdx === -1 || odoIdx === -1 || litersIdx === -1 || costIdx === -1) {
      alert("No pudimos encontrar todas las columnas requeridas (Fecha, Kilometraje, Litros, Costo). Verifica las cabeceras del CSV.");
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
      
      let parsedDate = '';
      if (rawDate) {
        const dateMatch = rawDate.match(/^(\d{4})[\-\/](\d{1,2})[\-\/](\d{1,2})/);
        if (dateMatch) {
          parsedDate = `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`;
        } else {
          const dateMatch2 = rawDate.match(/^(\d{1,2})[\-\/](\d{1,2})[\-\/](\d{2,4})/);
          if (dateMatch2) {
            let day = dateMatch2[1];
            let month = dateMatch2[2];
            let year = dateMatch2[3];
            if (year.length === 2) year = '20' + year;
            parsedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          }
        }
      }
      
      const odometer = parseInt(rawOdo);
      const liters = parseFloat(rawLiters.replace(',', '.'));
      const cost = parseInt(rawCost.replace(/[\$\s\.]/g, ''));
      
      if (!parsedDate || isNaN(odometer) || isNaN(liters) || isNaN(cost)) {
        errorCount++;
        continue;
      }
      
      if (existingOdos.has(odometer)) {
        duplicateCount++;
        continue;
      }
      
      const type = typeIdx !== -1 && row[typeIdx] ? row[typeIdx] : 'Turismo';
      const notes = notesIdx !== -1 && row[notesIdx] ? row[notesIdx] : '';
      
      state.fuelLogs.push({
        date: parsedDate,
        odometer: odometer,
        liters: liters,
        cost: cost,
        type: type,
        station: '',
        notes: notes,
        image: ''
      });
      
      existingOdos.add(odometer);
      importedCount++;
    }
    
    if (importedCount > 0) {
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
