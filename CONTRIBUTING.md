# Guía de contribución — GoldwingGas

Gracias por contribuir. El proyecto es una SPA vanilla pequeña: priorizamos cambios claros, compatibilidad con datos existentes y la estética GL-1000.

## Antes de empezar

1. Lee [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) y [docs/DATA_MODEL.md](docs/DATA_MODEL.md).
2. Abre la app en local (`python -m http.server 8080`) y verifica el flujo que vas a tocar.
3. Revisa [docs/ROADMAP.md](docs/ROADMAP.md) por si tu idea ya está listada.

## Flujo de trabajo

```bash
git checkout main
git pull origin main
git checkout -b feat/descripcion-corta   # o fix/, docs/, chore/
```

1. Implementa el cambio en los archivos mínimos (`index.html` / `app.js` / `style.css` / `docs/`).
2. Prueba a mano: carga seed, OCR (si aplica), import CSV, export JSON, reset.
3. Si tocas el esquema de estado, documenta la migración en `DATA_MODEL.md` y añade fallbacks en `loadData()`.
4. Commit con mensaje convencional (ver abajo) y abre un PR hacia `main`.

## Mensajes de commit

Usamos prefijos claros (como el historial actual):

| Prefijo | Uso |
|---------|-----|
| `feat:` | Nueva funcionalidad visible |
| `fix:` | Corrección de bug |
| `docs:` | Solo documentación |
| `style:` | CSS / presentación sin lógica |
| `chore:` | Mantenimiento (gitignore, Pages, etc.) |
| `refactor:` | Reorganización sin cambio de comportamiento |

Ejemplos:

```
feat: Add carb sync vacuum notes to panas guide
fix: Handle empty CSV rows without crashing import
docs: Document fuelLogs schema and CSV headers
```

## Checklist del PR

- [ ] La app carga sin errores en consola en Chrome/Firefox (y móvil si es UI).
- [ ] `localStorage` existente sigue funcionando (o hay migración).
- [ ] Export JSON e import CSV no se rompen.
- [ ] Textos de UI en español, coherentes con el tono del resto.
- [ ] Variables CSS existentes reutilizadas; no introducir paletas nuevas sin motivo.
- [ ] Docs actualizados si cambió arquitectura, datos o flujo de desarrollo.

## Qué evitar

- Añadir un framework o bundler sin discutirlo primero (rompe el modelo “abrir `index.html`”).
- Guardar secretos o llamar APIs remotas con datos del usuario (OCR debe seguir siendo local).
- Renombrar claves del estado (`fuelLogs`, `maintLogs`, etc.) sin migración.
- Commits enormes mezclando UI + parser + docs sin relación.

## Dudas de diseño

Mantén el look vintage del instrumental (fondos oscuros, oro `#ffb300`, diales verdes). Variables en `:root` de `style.css`. Si agregas una sección nueva, sigue el patrón `card` + tipografía Montserrat/Orbitron.
