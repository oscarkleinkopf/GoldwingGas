# Desarrollo — GoldwingGas

## Requisitos

- Navegador moderno (Chrome, Firefox, Safari, Edge).
- Editor cualquiera; no hay toolchain obligatorio.
- Opcional: Python 3 o Node para servir estáticos (recomendado para OCR/cámara).

## Arranque local

```bash
git clone https://github.com/oscarkleinkopf/GoldwingGas.git
cd GoldwingGas
python -m http.server 8080
# → http://localhost:8080
```

Abre DevTools → Application → Local Storage (`goldwing_gas_state`) e IndexedDB (`goldwing_gas_photos`).

### Borrar estado de prueba

Consola:

```js
localStorage.removeItem('goldwing_gas_state');
indexedDB.deleteDatabase('goldwing_gas_photos');
location.reload();
```

O usa **Ajustes → borrar historial** (deja logs vacíos, borra fotos, no re-seed).

## Convenciones de código

- **Idioma UI:** español (Chile / LATAM): “bencina”, “odómetro”, “panas”.
- **JS:** funciones por nombre + un `state` global; sin módulos ES ni TypeScript por ahora.
- **IDs HTML:** kebab-case (`fuel-odo`, `btn-export-data`). Mantén sincronía con `getElementById` en `app.js`.
- **CSS:** preferir variables de `:root`; clases semánticas existentes (`.card`, `.btn-primary`, …).
- **Comentarios:** solo donde la intención no sea obvia (parsers OCR, CSV edge cases).

### Orden recomendado al editar una feature

1. Markup en `index.html` (sección del tab o modal).
2. Estilos en `style.css` si hace falta.
3. Lógica / listeners en `app.js`.
4. Persistencia: ¿entra en `state`? → actualizar `DATA_MODEL.md` + fallback en `loadData`.
5. Probar: seed → CRUD → export → import → reload.

## Cómo agregar una pestaña nueva

1. Botón en `<nav class="app-nav">` con `data-tab="tab-xxx"` e `id="tab-btn-xxx"`.
2. `<section id="tab-xxx" class="tab-pane">…</section>`.
3. Si necesita init, llámalo desde `DOMContentLoaded`.
4. Si debe refrescar al mostrarse, engancha en el click de `initTabs` (como el chart de bencina).

## Cómo agregar un campo al estado

```js
// 1. Default al declarar state / seedState
state.settings.nuevoCampo = valorDefault;

// 2. loadData — migración
if (state.settings.nuevoCampo === undefined) {
  state.settings.nuevoCampo = valorDefault;
}

// 3. UI: leer/escribir en updateUI + form listener
// 4. Documentar en docs/DATA_MODEL.md
```

## Cómo extender el OCR

1. Reproduce el caso con una imagen real (boleta chilena, odómetro, etc.).
2. Ajusta regex en `extractFuelOcrProperties` / `parseOcrResults` (o mantención).
3. No asumas un solo layout de boleta; prioriza patrones tolerantes.
4. Deja el resultado pre-rellenado pero editable.

## Cómo tocar el import CSV

- Lógica central: `parseAndImportCSV` / `parseAndMergeCSVData`.
- Fechas: `parseExcelDate`.
- Tras cambios, prueba: `;`, `,`, TSV, fechas verbales, odómetro 0, duplicados.
- Actualiza la plantilla del botón `btn-download-csv-template` si cambian columnas.

## GPX Beeline (complemento de bencina)

- Parser: `parseGpxText` / `importParsedRide`. No guardar la polilínea.
- Probar un GPX `ridden` real: km > 0, fecha, ligue a carga del mismo día, duplicado al reimportar.
- En la tabla de bencina debe aparecer `GPS xx km · yy km/L` si está ligado.

## Debugging útil

| Problema | Dónde mirar |
|----------|-------------|
| Luces siempre verdes/rojas | `updateMaintenanceStatus`, tipos exactos de `maintLogs` |
| Chart vacío | Tab Bencina activo + `renderFuelChart`; datos con ≥2 puntos útiles |
| OCR no rellena | Consola + texto crudo de Tesseract; regex en parsers |
| Import “columnas no encontradas” | Headers detectados (`console.log` en CSV) |
| Odómetro raro | `initialOdo`, logs con `odometer: 0`, `calculateStats` |

## Sin tests automatizados (aún)

Validación manual mínima antes de merge:

1. Carga inicial con seed.
2. Alta / edición / borrado de bencina y mantención.
3. Cambio de settings y reload (persistencia).
4. Export JSON (incluye `photos`) → borrar LS+IDB → import JSON → fotos siguen viéndose.
5. Import CSV plantilla.
6. (Si tocaste OCR) una foto de prueba; comprobar que `localStorage` no contiene data URLs enormes.
7. Banner de respaldo: sin `lastBackupAt` aparece; tras descargar JSON, desaparece.

Cuando se añadan tests, documentar el comando aquí (ver ROADMAP). Checklist manual: [QA.md](QA.md).

## PWA / service worker

Tras cambiar `index.html`, `app.js`, `style.css` o assets del shell, sube `CACHE_VERSION` en `sw.js` (p. ej. `goldwinggas-v4`) para forzar recacheo en clientes ya instalados.

Probar instalación: Chrome → DevTools → Application → Manifest / Service Workers. En Android real, abre la URL de Pages por HTTPS. En iOS, Safari → Compartir → Añadir a pantalla de inicio. El tablero muestra un banner de instalación (posponible por sesión) cuando la app no está instalada.

## Deploy

Push a `main` → GitHub Pages regenera el sitio. No hay secrets ni variables de entorno.
