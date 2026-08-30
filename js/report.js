/* GoldwingGas — HTML/PDF bitácora summary (local, print-to-PDF) */

function buildReportHtml() {
  const stats = typeof calculateStats === 'function' ? calculateStats() : {};
  const loc = typeof getDateLocale === 'function' ? getDateLocale() : 'es-ES';
  const currency = (state.settings && state.settings.currency) || '$';
  const year = (state.settings && state.settings.modelYear) || '';
  const fmtDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString(loc, { timeZone: 'UTC' });
  };
  const fuelRows = [...(state.fuelLogs || [])]
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .map((l) => `<tr>
      <td>${fmtDate(l.date)}</td>
      <td>${(l.odometer || 0).toLocaleString()} km</td>
      <td>${Number(l.liters || 0).toFixed(2)} L</td>
      <td>${currency}${(l.cost || 0).toLocaleString()}</td>
      <td>${l.efficiency ? l.efficiency.toFixed(2) + ' km/L' : '—'}</td>
      <td>${escapeHtml(l.station || l.type || '')}</td>
    </tr>`).join('');
  const maintRows = [...(state.maintLogs || [])]
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .map((l) => `<tr>
      <td>${fmtDate(l.date)}</td>
      <td>${escapeHtml(l.type || '')}</td>
      <td>${(l.odometer || 0).toLocaleString()} km</td>
      <td>${l.cost ? currency + Number(l.cost).toLocaleString() : '—'}</td>
      <td>${escapeHtml(l.notes || '')}</td>
    </tr>`).join('');
  const rideRows = [...(state.rides || [])]
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .map((r) => `<tr>
      <td>${fmtDate(r.date)}</td>
      <td>${escapeHtml(r.name || '')}</td>
      <td>${(r.distanceKm || 0).toFixed(1)} km</td>
      <td>${r.durationMin ? r.durationMin + ' min' : '—'}</td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html lang="es"><head>
<meta charset="UTF-8">
<title>GoldwingGas — resumen GL-1000</title>
<style>
  body { font-family: Georgia, serif; color: #1a1a1a; max-width: 900px; margin: 24px auto; padding: 0 16px; }
  h1 { font-size: 1.6rem; margin-bottom: 4px; }
  h2 { font-size: 1.15rem; border-bottom: 2px solid #c9a227; padding-bottom: 4px; margin-top: 28px; }
  .muted { color: #555; font-size: 0.9rem; }
  .stats { display: flex; flex-wrap: wrap; gap: 16px; margin: 16px 0; }
  .stat { background: #f6f1e4; padding: 10px 14px; border-radius: 8px; min-width: 140px; }
  .stat strong { display: block; font-size: 1.2rem; }
  table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
  th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
  th { background: #222; color: #f4e4b0; }
  @media print { .no-print { display: none; } body { margin: 0; } }
</style>
</head><body>
  <p class="no-print muted"><button onclick="window.print()">Imprimir / Guardar PDF</button></p>
  <h1>GoldwingGas — Honda GL-1000 ${escapeHtml(year)}</h1>
  <p class="muted">Resumen generado el ${new Date().toLocaleString(loc)}. Datos locales, sin fotos.</p>
  <div class="stats">
    <div class="stat"><span>Odómetro</span><strong>${(stats.currentOdo || 0).toLocaleString()} km</strong></div>
    <div class="stat"><span>Km recorridos</span><strong>${(stats.totalDist || 0).toLocaleString()}</strong></div>
    <div class="stat"><span>Litros</span><strong>${(stats.totalFuel || 0).toFixed(1)} L</strong></div>
    <div class="stat"><span>Bencina</span><strong>${currency}${(stats.totalCost || 0).toLocaleString()}</strong></div>
    <div class="stat"><span>Promedio</span><strong>${stats.avgConsumption ? stats.avgConsumption.toFixed(2) : '—'} L/100km</strong></div>
  </div>
  <h2>Bencina</h2>
  <table><thead><tr><th>Fecha</th><th>Odómetro</th><th>Litros</th><th>Costo</th><th>Consumo</th><th>Estación / tipo</th></tr></thead>
  <tbody>${fuelRows || '<tr><td colspan="6">Sin cargas</td></tr>'}</tbody></table>
  <h2>Mantenimiento</h2>
  <table><thead><tr><th>Fecha</th><th>Servicio</th><th>Km</th><th>Costo</th><th>Notas</th></tr></thead>
  <tbody>${maintRows || '<tr><td colspan="5">Sin servicios</td></tr>'}</tbody></table>
  <h2>Viajes Beeline</h2>
  <table><thead><tr><th>Fecha</th><th>Nombre</th><th>GPS km</th><th>Duración</th></tr></thead>
  <tbody>${rideRows || '<tr><td colspan="4">Sin GPX</td></tr>'}</tbody></table>
  <p class="muted">Dedicado a Victor Kleinkopf (Z.L.)</p>
</body></html>`;
}

function exportHtmlReport() {
  const html = buildReportHtml();
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const name = `goldwing_gas_resumen_${new Date().toISOString().split('T')[0]}.html`;
  if (typeof downloadBlob === 'function') {
    downloadBlob(blob, name);
  } else {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
  }
  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}
