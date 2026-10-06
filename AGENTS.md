# Notas para agentes de código

Contexto rápido para seguir desarrollando GoldwingGas sin redescubrir el diseño.

## Qué es

SPA **vanilla** (HTML/CSS/JS) para tracking de combustible y mantenimiento de Honda Goldwing GL-1000. Sin `package.json`, sin bundler, sin backend. Persistencia: `localStorage` clave `goldwing_gas_state` + IndexedDB `goldwing_gas_photos` para boletas.

## Archivos que importan

| Archivo | Rol |
|---------|-----|
| `index.html` | UI y CDNs |
| `app.js` | Toda la lógica (+ PWA install) |
| `style.css` | Tema vintage (`:root`) |
| `manifest.webmanifest` / `sw.js` | App instalable (Android sin Play) |
| `assets/` | Arte de dedicatoria + iconos |
| `docs/*` | Arquitectura, datos, roadmap |
| `js/drive-backup.js` | Respaldo opcional Google Drive |

## Reglas al cambiar código

1. No introducir framework/build sin acuerdo explícito del usuario.
2. OCR y datos del usuario deben seguir siendo **locales**.
3. Si mutas el schema de `state`, añade fallback en `loadData()` / `ensureSettingsDefaults()` y actualiza `docs/DATA_MODEL.md`.
4. UI en español; reutiliza variables CSS existentes.
5. Tras cambios de parsers (CSV/OCR), prueba plantilla CSV, odómetro `0` y duplicados.
6. Las fotos no deben volver a `localStorage`; usa `attachPhotoToLog` / IndexedDB. El JSON de backup sí las incluye en `photos`.

## Docs canónicas

- Arquitectura → `docs/ARCHITECTURE.md`
- Schema / CSV / JSON → `docs/DATA_MODEL.md`
- Flujo local → `docs/DEVELOPMENT.md`
- Backlog → `docs/ROADMAP.md`
- PRs → `CONTRIBUTING.md`

## Verificación mínima

Servir con `python -m http.server 8080`, cargar app, CRUD bencina, export JSON, reload. Sin CI todavía.
