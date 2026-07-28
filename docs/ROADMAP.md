# Roadmap — continuar el desarrollo

Prioridades sugeridas para evolucionar GoldwingGas sin abandonar el modelo SPA local. El orden es por impacto / riesgo técnico, no por calendario.

## Corto plazo (bajo riesgo)

- [ ] **Tests manuales documentados** — checklist reproducible en `docs/DEVELOPMENT.md` o un `docs/QA.md` con capturas de casos OCR/CSV.
- [ ] **Favicon y meta Open Graph** — mejor compartir el link de Pages.
- [ ] **PWA mínima** — `manifest.json` + service worker solo para cachear shell (HTML/CSS/JS/CDNs), sin sync remoto.
- [ ] **Validación de formularios** — odómetro no menor al anterior (aviso), litros/costo > 0, fechas futuras.
- [ ] **i18n opcional** — extraer strings ES a un diccionario; EN como segundo idioma (la comunidad GL-1000 es global).

## Mediano plazo (valor de producto)

- [ ] **Filtros y búsqueda** en tablas de bencina/mantención (por rango de fechas, tipo, estación).
- [ ] **Más tipos de mantención** configurables por el usuario (además del schedule fijo GL-1000).
- [ ] **Mejora OCR** — preprocesado de imagen (contraste/umbral) antes de Tesseract; más patrones de boletas (Copec, Shell, Petrobras, etc.).
- [ ] **Gráficos adicionales** — costo acumulado, histograma L/100km, km entre servicios.
- [ ] **Modo “solo lectura / compartir”** — exportar un resumen HTML/PDF de la bitácora.

## Estructura de código (cuando `app.js` pese demasiado)

Hoy `app.js` supera las ~2k líneas. Antes de un framework:

1. Separar en scripts sin bundler, p. ej.:
   - `js/state.js` — load/save/seed
   - `js/stats.js` — calculateStats, gauges
   - `js/ocr.js` — Tesseract + parsers
   - `js/import.js` — CSV/batch
   - `js/tools.js` — shelter, altitud, bujías, aditivos
   - `js/app.js` — init + wiring
2. Cargar en orden desde `index.html`.
3. Solo después evaluar módulos ES (`type="module"`) si el hosting lo permite bien en Pages.

## Ideas a discutir (más invasivas)

| Idea | Nota |
|------|------|
| Backend / cuenta de usuario | Choca con la promesa “100 % local y privado”. Preferible sync opcional (p. ej. archivo en disco / WebDAV) antes que login. |
| Netlify Functions + DB | Solo si se quiere multi-dispositivo con consentimiento explícito. |
| React/Vite | Útil si el equipo crece; implica build + cambiar docs de deploy. |
| Tests unitarios del parser CSV/OCR | Extraer parsers a funciones puras y cubrir con Vitest/Jest en Node. |

## Deuda conocida

- Sin CI ni linters.
- Parsers OCR frágiles ante layouts nuevos (esperado; mitigar con más fixtures).
- Enlaces absolutos locales antiguos en README ya reemplazados; revisar que no reaparezcan.
- `efficiency` a veces se serializa en el backup aunque es derivado.
- Inline `onclick` vía `window.*` mezcla paradigmas; migrar a event delegation cuando se toquen las tablas.

## Cómo proponer ítems

Abre un issue o PR `docs:` actualizando esta lista. Marca con `[x]` solo lo mergeado en `main`.
