/* GoldwingGas — i18n (ES / EN) */
const I18N_MESSAGES = {
  es: {
    'nav.dashboard': 'Tablero',
    'nav.fuel': 'Bencina',
    'nav.maintenance': 'Mantenimiento',
    'nav.panas': 'Guía de Panas',
    'nav.settings': 'Ajustes',
    'header.odometer': 'ODÓMETRO TOTAL',
    'settings.bikeConfig': 'Configuración de la Motocicleta',
    'settings.modelYear': 'Año de Fabricación (GL-1000)',
    'settings.initialOdo': 'Odómetro Inicial al comenzar a usar la App (km)',
    'settings.currency': 'Símbolo de Moneda',
    'settings.language': 'Idioma de la interfaz',
    'settings.save': 'Guardar Configuración',
    'settings.saved': 'Configuración de la moto guardada con éxito.',
    'settings.backup': 'Respaldo y Datos',
    'settings.lang.es': 'Español',
    'settings.lang.en': 'English',
    'backup.pendingTitle': 'Respaldo pendiente',
    'backup.pendingText': 'Los datos viven en este navegador. Descarga un JSON y guárdalo fuera del teléfono.',
    'backup.download': 'Descargar respaldo',
    'backup.later': 'Más tarde',
    'backup.last': 'Último respaldo',
    'backup.never': 'Nunca',
    'backup.storage': 'Almacenamiento usado',
    'table.fuel.date': 'Fecha',
    'table.fuel.odometer': 'Odómetro (km)',
    'table.fuel.liters': 'Carga (L)',
    'table.fuel.cost': 'Total ($)',
    'table.fuel.consumption': 'Consumo',
    'table.fuel.receipt': 'Boleta/Foto',
    'table.fuel.notes': 'Notas',
    'table.fuel.actions': 'Acciones',
    'table.fuel.empty': 'No hay registros de bencina cargados.',
    'table.fuel.viewReceipt': 'Ver boleta',
    'table.fuel.initialLoad': 'N/A (Carga inicial)',
    'table.maint.date': 'Fecha',
    'table.maint.service': 'Servicio / Tarea',
    'table.maint.odometer': 'Kilometraje (km)',
    'table.maint.cost': 'Costo ($)',
    'table.maint.details': 'Detalles / Repuestos',
    'table.maint.photo': 'Foto/Nota',
    'table.maint.actions': 'Acciones',
    'table.maint.empty': 'No hay mantenimientos registrados.',
    'table.maint.viewNote': 'Ver nota',
    'common.edit': 'Editar',
    'common.delete': 'Eliminar',
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar',
    'validation.dateRequired': 'La fecha es obligatoria.',
    'validation.futureDate': 'La fecha es posterior a hoy. ¿Es correcto?',
    'validation.odometerRequired': 'El odómetro es obligatorio.',
    'validation.odometerBelowInitial': 'El kilometraje no puede ser inferior al odómetro inicial ({km} km).',
    'validation.odometerBelowPrevious': 'El odómetro ({km} km) es menor al último registro. ¿Continuar igual?',
    'validation.litersPositive': 'Los litros deben ser mayores que 0.',
    'validation.costPositive': 'El costo debe ser mayor que 0.',
    'validation.costInvalid': 'El costo no puede ser negativo.',
    'validation.warningsTitle': 'Revisa estos avisos:',
    'validation.continueAnyway': '¿Deseas guardar de todos modos?'
  },
  en: {
    'nav.dashboard': 'Dashboard',
    'nav.fuel': 'Fuel',
    'nav.maintenance': 'Maintenance',
    'nav.panas': 'Troubleshooting',
    'nav.settings': 'Settings',
    'header.odometer': 'TOTAL ODOMETER',
    'settings.bikeConfig': 'Motorcycle Settings',
    'settings.modelYear': 'Model Year (GL-1000)',
    'settings.initialOdo': 'Initial Odometer when starting the app (km)',
    'settings.currency': 'Currency Symbol',
    'settings.language': 'Interface language',
    'settings.save': 'Save Settings',
    'settings.saved': 'Motorcycle settings saved successfully.',
    'settings.backup': 'Backup & Data',
    'settings.lang.es': 'Español',
    'settings.lang.en': 'English',
    'backup.pendingTitle': 'Backup pending',
    'backup.pendingText': 'Your data lives in this browser. Download a JSON file and store it elsewhere.',
    'backup.download': 'Download backup',
    'backup.later': 'Later',
    'backup.last': 'Last backup',
    'backup.never': 'Never',
    'backup.storage': 'Storage used',
    'table.fuel.date': 'Date',
    'table.fuel.odometer': 'Odometer (km)',
    'table.fuel.liters': 'Fuel (L)',
    'table.fuel.cost': 'Total ($)',
    'table.fuel.consumption': 'Consumption',
    'table.fuel.receipt': 'Receipt/Photo',
    'table.fuel.notes': 'Notes',
    'table.fuel.actions': 'Actions',
    'table.fuel.empty': 'No fuel logs yet.',
    'table.fuel.viewReceipt': 'View receipt',
    'table.fuel.initialLoad': 'N/A (Initial fill-up)',
    'table.maint.date': 'Date',
    'table.maint.service': 'Service / Task',
    'table.maint.odometer': 'Mileage (km)',
    'table.maint.cost': 'Cost ($)',
    'table.maint.details': 'Details / Parts',
    'table.maint.photo': 'Photo/Note',
    'table.maint.actions': 'Actions',
    'table.maint.empty': 'No maintenance records yet.',
    'table.maint.viewNote': 'View note',
    'common.edit': 'Edit',
    'common.delete': 'Delete',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'validation.dateRequired': 'Date is required.',
    'validation.futureDate': 'The date is in the future. Is that correct?',
    'validation.odometerRequired': 'Odometer is required.',
    'validation.odometerBelowInitial': 'Mileage cannot be below the initial odometer ({km} km).',
    'validation.odometerBelowPrevious': 'Odometer ({km} km) is lower than the last log. Continue anyway?',
    'validation.litersPositive': 'Liters must be greater than 0.',
    'validation.costPositive': 'Cost must be greater than 0.',
    'validation.costInvalid': 'Cost cannot be negative.',
    'validation.warningsTitle': 'Please review:',
    'validation.continueAnyway': 'Save anyway?'
  }
};

function getLang() {
  if (typeof state !== 'undefined' && state.settings && state.settings.lang) {
    return state.settings.lang === 'en' ? 'en' : 'es';
  }
  return 'es';
}

function getDateLocale() {
  return getLang() === 'en' ? 'en-US' : 'es-ES';
}

function t(key, vars) {
  const lang = getLang();
  let text = (I18N_MESSAGES[lang] && I18N_MESSAGES[lang][key])
    || (I18N_MESSAGES.es && I18N_MESSAGES.es[key])
    || key;
  if (vars) {
    Object.keys(vars).forEach((k) => {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), vars[k]);
    });
  }
  return text;
}

function applyI18n() {
  document.documentElement.lang = getLang();
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (!key) return;
    el.textContent = t(key);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
  });
  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    el.title = t(el.getAttribute('data-i18n-title'));
  });
}
