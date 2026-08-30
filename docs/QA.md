# QA manual — GoldwingGas

Checklist reproducible antes de merge o deploy. Servir con `python3 -m http.server 8080` y abrir `http://localhost:8080` (o la URL de GitHub Pages).

## Arranque y persistencia

- [ ] Primera carga muestra datos seed (o vacío tras reset).
- [ ] Cambiar año/odómetro/moneda en **Ajustes** → Guardar → recargar página → valores persisten.
- [ ] Cambiar idioma ES ↔ EN → menú y tablas se actualizan → recargar → idioma persiste.

## Bencina (CRUD)

- [ ] Alta de carga con fecha, odómetro, litros, costo.
- [ ] Edición y borrado desde la tabla.
- [ ] Rechaza litros ≤ 0 o costo ≤ 0.
- [ ] Rechaza odómetro menor al inicial configurado.
- [ ] Avisa (confirm) si odómetro es menor al último registro.
- [ ] Avisa (confirm) si la fecha es futura.
- [ ] Odómetro `0` permitido (sin eficiencia en gráfico).

## Mantenimiento (CRUD)

- [ ] Alta, edición y borrado de servicio.
- [ ] Validación de odómetro y fecha (igual que bencina).
- [ ] Luces de servicio en tablero reflejan intervalos GL-1000.

## Respaldo

- [ ] Export JSON descarga archivo con `photos` si hay boletas.
- [ ] Borrar `localStorage` + IndexedDB → import JSON → fotos visibles de nuevo.
- [ ] Banner de respaldo aparece sin `lastBackupAt`; desaparece tras descargar JSON.

## CSV

- [ ] Descargar plantilla CSV.
- [ ] Importar plantilla (separador `;`) → cargas en tabla.
- [ ] Importar TSV (tabulador) funciona.
- [ ] Duplicados de odómetro (> 0) se omiten.
- [ ] Varios registros con odómetro `0` permitidos.

## GPX Beeline

- [ ] Importar `.gpx` con km y fecha desde **Bencina** y desde Ajustes.
- [ ] Si hay carga el mismo día (o día siguiente), se liga a la bencina.
- [ ] Duplicado (misma fecha + km) se omite.
- [ ] En Xiaomi: Beeline → Share/download → ridden → Compartir a GoldwingGas (PWA) o elegir archivo.

## Filtros y gráficos

- [ ] Filtrar cargas por texto, fechas y tipo; Limpiar restaura la tabla.
- [ ] Filtrar mantenimientos por texto, fechas y servicio.
- [ ] Tablero muestra costo acumulado, histograma L/100km y km entre servicios.

## Tipos de mantención propios

- [ ] Añadir tipo extra en Ajustes (nombre + intervalo km) → aparece en preventivo y en el formulario.
- [ ] Quitar tipo extra no borra logs históricos.

## Resumen HTML

- [ ] Ajustes → Resumen HTML / PDF abre ventana imprimible y descarga `.html`.

## OCR (si se tocó el parser)

- [ ] Foto de boleta rellena campos editables antes de guardar.
- [ ] Foto de nota de mantenimiento rellena tipo/fecha/km.
- [ ] `localStorage` no contiene data URLs enormes (fotos en IndexedDB).
- [ ] Boletas Copec/Shell/Petrobras rellenan estación si el texto lo trae.

## PWA / móvil

- [ ] Manifest válido (DevTools → Application).
- [ ] Service worker registrado.
- [ ] **Android / Xiaomi (Chrome):** ⋮ → Instalar o Añadir a pantalla de inicio.
- [ ] App instalada abre a pantalla completa (`display-mode: standalone`).
- [ ] Menú de 5 tabs alineado con header y contenido en ancho ~390px.

## Regresión rápida post-deploy

1. Abrir demo en HTTPS.
2. Una carga de bencina + export JSON.
3. Recargar instalada / en navegador.
