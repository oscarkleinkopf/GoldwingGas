// State Management
let state = {
  fuelLogs: [],
  maintLogs: [],
  shelterChecks: {
    airFilter: '',
    fuses: '',
    radiator: ''
  },
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
  initBatchImporter();
  
  // Advanced GL-1000 specialist tools
  initShelterGuide();
  initFuelAdditiveCalc();
  initAltitudeCalc();
  initSparkPlugDiag();
  initPwaInstall();
  
  updateUI();
});

// Load state from localStorage or seed
function loadData() {
  const savedState = localStorage.getItem('goldwing_gas_state');
  if (savedState) {
    try {
      state = JSON.parse(savedState);
      // Fallback for new properties
      if (!state.shelterChecks) {
        state.shelterChecks = { airFilter: '', fuses: '', radiator: '' };
      }
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
  state.shelterChecks = { airFilter: '', fuses: '', radiator: '' };
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
  
  // Update Shelter UI if initialized
  if (typeof selectedShelterComponent !== 'undefined' && document.getElementById('shelter-status-badge')) {
    showShelterComponentDetails(selectedShelterComponent);
  }
  
  // Update driving style chart if active tab is fuel
  const activeTab = document.querySelector('.nav-tab.active');
  if (activeTab && activeTab.dataset.tab === 'tab-fuel') {
    updateEfficiencyStyleChart();
  }
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
    if (confirm('¿Estás seguro de que deseas borrar por completo todo el historial? Esta acción vaciará la base de datos para que puedas importar tus propios datos.')) {
      state.fuelLogs = [];
      state.maintLogs = [];
      state.shelterChecks = { airFilter: '', fuses: '', radiator: '' };
      state.settings.initialOdo = 0;
      
      saveData();
      updateUI();
      alert('Se han borrado todos los registros. La base de datos está vacía y lista para importar tu planilla.');
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
        date: parsedDate,
        odometer: odometer,
        liters: liters,
        cost: cost,
        type: type,
        station: '',
        notes: notes,
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
          state.maintLogs.push({
            type: parsed.type,
            date: parsed.date,
            odometer: parsed.odometer,
            cost: parsed.cost,
            notes: ocrText.trim(),
            image: base64
          });
          
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
            state.fuelLogs.push({
              date: parsed.date || new Date().toISOString().split('T')[0],
              odometer: parsed.odometer || (state.fuelLogs.length > 0 ? Math.max(...state.fuelLogs.map(l => l.odometer)) : parseInt(state.settings.initialOdo)),
              liters: parsed.liters || 15.0,
              cost: parsed.cost || 16000,
              type: 'Turismo',
              station: parsed.station || 'Gasolinera Detectada',
              notes: 'Importado de foto antigua',
              image: base64
            });
            
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
      date: parsedDate,
      odometer: odometer,
      liters: liters,
      cost: cost,
      type: type,
      station: '',
      notes: notes,
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
  
  let liters = 0;
  const litersMatch = normalized.match(/(\d{1,2}[\.,]\d{1,2})\s*(?:L|LTS|LITROS|LTR|G|GLS)/);
  if (litersMatch) {
    liters = parseFloat(litersMatch[1].replace(',', '.'));
  }
  
  let cost = 0;
  const priceMatch = normalized.match(/(?:TOTAL|PAGO|NETO|\$|PESOS|VALOR|COSTO)\s*[:\.]?\s*(\d{3,6})\b/);
  if (priceMatch) {
    cost = parseInt(priceMatch[1]);
  }
  
  // Classify station
  let station = 'Gasolinera';
  if (/COPEC/i.test(normalized)) station = 'Copec';
  else if (/SHELL/i.test(normalized)) station = 'Shell';
  else if (/PETROBRAS/i.test(normalized)) station = 'Petrobras';
  else if (/TERPEL/i.test(normalized)) station = 'Terpel';
  
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
// PWA INSTALL (Android / Chrome — sin Play Store)
// ==========================================
function initPwaInstall() {
  const installBtn = document.getElementById('btn-install-pwa');
  const statusEl = document.getElementById('pwa-install-status');
  if (!installBtn) return;

  let deferredPrompt = null;

  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

  if (isStandalone && statusEl) {
    statusEl.textContent = 'GoldwingGas ya está instalada en este dispositivo.';
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.style.display = 'inline-flex';
    if (statusEl) {
      statusEl.textContent = 'Listo para instalar. Usa el botón o el menú de Chrome → Instalar app.';
    }
  });

  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
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
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    installBtn.style.display = 'none';
    if (statusEl) {
      statusEl.textContent = 'GoldwingGas quedó instalada. Ábrela desde el icono de la pantalla de inicio.';
    }
  });
}
