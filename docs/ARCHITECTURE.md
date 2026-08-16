# Arquitectura — GoldwingGas

## Vista general

GoldwingGas es una **Single Page Application** sin backend ni build step.

```
┌─────────────────────────────────────────────────────────┐
│  index.html                                             │
│  · Estructura de tabs, modales, formularios             │
│  · Carga CDNs (Chart.js, Tesseract.js, Font Awesome)    │
└────────────┬──────────────────────────────▲─────────────┘
             │ DOM / eventos                │ updateUI()
             ▼                              │
┌─────────────────────────────────────────────────────────┐
│  app.js                                                 │
│  · state ↔ localStorage (bitácora)                      │
│  · fotos ↔ IndexedDB goldwing_gas_photos                │
│  · Cálculos, OCR, CSV, backup, herramientas GL-1000     │
└─────────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│  style.css                                              │
│  · Tema vintage via :root CSS variables                 │
└─────────────────────────────────────────────────────────┘
```

Todo el estado vive en un objeto global `state` y se persiste bajo la clave `goldwing_gas_state`.

## Arranque

En `bootApp()` (`app.js`, al `DOMContentLoaded`):

1. `openPhotoDb()` — abre IndexedDB de fotos.
2. `loadData()` — lee `localStorage`, migra fotos embebidas, o aplica seed.
3. `initTabs()` — navegación por `data-tab`.
4. `initFormListeners()` — formularios, export/import, reset.
5. `initOcrEngine()` — dropzones OCR bencina/mantención.
6. `initBatchImporter()` — importación masiva.
7. Herramientas: `initShelterGuide`, `initFuelAdditiveCalc`, `initAltitudeCalc`, `initSparkPlugDiag`.
8. `initPwaInstall` / `initBackupUi`.
9. `updateUI()` — pinta tablero, tablas, luces y estado de respaldo.

## Tabs (UI)

| `data-tab` / `id` | Contenido principal |
|-------------------|---------------------|
| `tab-dashboard` | Gauges, luces de servicio, stats, accesos rápidos |
| `tab-fuel` | Chart, aditivos, tabla de cargas |
| `tab-maintenance` | Schedules, shelter guide, tabla de servicios |
| `tab-panas` | Guía de panas, altitud, bujías |
| `tab-settings` | Config moto, backup, CSV, batch import |

Los paneles usan `.tab-pane`; el activo tiene `.active`. Al entrar a Bencina se redibujan Chart.js (`renderFuelChart`, `updateEfficiencyStyleChart`).

## Mapa de módulos en `app.js`

Orden aproximado del archivo (útil para ubicar cambios):

| Zona | Responsabilidad |
|------|-----------------|
| Estado + `MAINTENANCE_SCHEDULES` + seed | Modelo y defaults |
| IndexedDB fotos + `loadData` / `saveData` | Persistencia (LS sin data URLs) |
| Backup JSON / aviso 14 días | `buildBackupPayload`, `initBackupUi` |
| `initTabs` / `updateUI` / gauges / luces | Shell de UI |
| `calculateStats` | km/L, L/100km, totales, odómetro actual |
| `renderFuelLogsTable` / `renderMaintLogsTable` / charts | Listados y gráficos |
| `initFormListeners` + CRUD modales | Altas/edición/borrado |
| OCR bencina + OCR mantención | `Tesseract.recognize` + parsers regex |
| CSV / fechas Excel | `parseExcelDate`, `parseAndImportCSV`, merge |
| Batch importer | Cola CSV + imágenes con clasificación |
| Shelter / aditivos / altitud / bujías | Herramientas de especialista |

Funciones expuestas en `window` (onclick en HTML generado): p. ej. `editFuelLog`, `deleteFuelLog`, y equivalentes de mantenimiento.

## Flujo de datos

```
Usuario (form / OCR / CSV / JSON)
        │
        ▼
  Mutación de state.*  +  putPhoto() → IndexedDB
        │
        ▼
     saveData()  ──►  localStorage['goldwing_gas_state']  (sin fotos)
        │
        ▼
     updateUI()  ──►  DOM (odómetro, tablas, luces, settings, banner backup)
```

`calculateStats()` ordena logs por fecha, calcula eficiencia por tramo (odómetro actual − anterior distinto de 0) y alimenta gauges y stats.

## OCR

- Motor: Tesseract.js 5 desde CDN.
- Idioma/pipeline: reconocimiento sobre imagen base64; progreso en overlay del modal.
- Parsers: `parseOcrResults` / `extractFuelOcrProperties` (fecha, litros, km) y equivalentes de mantención.
- Batch: `runTesseractOCR` + heurística que clasifica si el texto parece boleta de bencina o nota de servicio.

El OCR es best-effort: el usuario siempre puede corregir campos del formulario antes de guardar.

## Importadores

1. **JSON** — reemplazo completo del `state` (backup).
2. **CSV/TSV** — append de `fuelLogs` con dedupe por odómetro (> 0).
3. **GPX Beeline** — solo km, fecha y duración; se liga a una carga. Sin mapa.
4. **Batch** — CSV primero, luego GPX e imágenes.

Detalles de columnas y schema: [DATA_MODEL.md](DATA_MODEL.md).

## Estilos

- Variables en `:root` (`--accent-gold`, `--dial-bg`, etc.).
- Layout centrado `max-width: 1200px`, responsive vía media queries al final de `style.css`.
- Componentes recurrentes: `.card`, `.btn`, `.data-table`, `.vintage-gauge`, `.indicator-lamp`, `.modal`.

## PWA (instalación en Android)

| Archivo | Rol |
|---------|-----|
| `manifest.webmanifest` | `name`, `start_url`, `display: standalone`, iconos |
| `sw.js` | Cache del shell + Chart.js/FA/Tesseract; CDNs cache-first con revalidación |
| `assets/icons/*` | Iconos 192/512 + maskable + favicon |
| `initPwaInstall()` / `initConnectivityUi()` | Instalar app + banner sin conexión |
| `warmOcrCache()` | Precarga worker/WASM/`spa.traineddata` con red |

Rutas relativas (`./`) para que funcione bajo `https://…github.io/GoldwingGas/`.

## Deploy

Estático en GitHub Pages desde `main` + `.nojekyll`. No hay CI ni tests automatizados todavía (ver ROADMAP).
