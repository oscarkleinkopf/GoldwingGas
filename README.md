# GoldwingGas

Aplicación web (SPA) para dueños de la **Honda Goldwing GL-1000 (1975–1979)**: bitácora de bencina, mantenimiento preventivo y herramientas de taller, con estética vintage inspirada en el instrumental original.

**Demo:** [https://oscarkleinkopf.github.io/GoldwingGas/](https://oscarkleinkopf.github.io/GoldwingGas/)

---

## Características

| Área | Qué hace |
|------|----------|
| **Tablero** | Diales de eficiencia y autonomía, odómetro mecánico, luces de servicio |
| **Bencina** | Cargas, OCR, gráfico, aditivos; km GPS de Beeline (GPX) para contrastar el odómetro |
| **Mantenimiento** | Historial, intervalos GL-1000, guía del depósito falso (shelter), OCR de notas |
| **Guía de panas** | Problemas clásicos del boxer + diagnóstico de bujías + ajuste por altitud |
| **Ajustes** | Año/odómetro/moneda, backup JSON, CSV, **GPX Beeline**, importación masiva |

Datos **100 % locales**. Historial en `localStorage`; fotos de boletas en IndexedDB. El OCR corre en el navegador con Tesseract.js; no se envían fotos a un servidor. En **Ajustes** descarga un JSON de respaldo (incluye fotos) y guárdalo fuera del teléfono.

### Intervalos de servicio (km)

| Servicio | Intervalo |
|----------|-----------|
| Correas de distribución | 24 000 |
| Sincronización carburadores | 5 000 |
| Ajuste de válvulas | 5 000 |
| Aceite y filtro | 5 000 |
| Aceite de cardán | 10 000 |
| Platinos y bujías | 10 000 |

---

## Cómo usarla

1. Abre `index.html` en un navegador moderno, **o** visita la demo en GitHub Pages.
2. Si es la primera visita, verás datos de ejemplo (seed). En **Ajustes** puedes borrarlos e importar tu planilla.
3. En móvil, los botones de foto abren la cámara (`capture="environment"`).

### Instalar como app (PWA — sin tienda)

GoldwingGas es una **Progressive Web App**: se instala desde el navegador y queda como icono a pantalla completa.

| Plataforma | Cómo instalar |
|------------|---------------|
| **Android** | Chrome → menú ⋮ → **Instalar app**, o el botón en **Ajustes** / banner del tablero |
| **iPhone / iPad** | Safari → **Compartir** → **Añadir a pantalla de inicio** |
| **Escritorio** | Chrome / Edge → icono de instalación en la barra de direcciones |

Los datos siguen en el dispositivo (`localStorage` + IndexedDB). Descarga un respaldo JSON desde Ajustes.

Tras un deploy nuevo, la app instalada avisa cuando hay actualización y se recarga vía service worker.

> Para OCR y cámaras, preferible servir por HTTP(S) (GitHub Pages o un servidor local). Abrir el archivo como `file://` puede limitar algunas APIs del navegador.

### Servidor local rápido

```bash
# Python 3
python -m http.server 8080

# Node (npx)
npx --yes serve .
```

Luego abre `http://localhost:8080`.

---

## Estructura del repositorio

```
GoldwingGas/
├── index.html              # UI: tabs, modales, formularios
├── app.js                  # Estado, cálculos, OCR, importadores, PWA install
├── style.css               # Tema vintage (variables CSS)
├── manifest.webmanifest    # Metadatos PWA / icono de instalación
├── netlify.toml            # Hosting estático en Netlify (sin build)
├── sw.js                   # Service worker (cache del shell)
├── assets/
│   ├── goldwing-art.jpg    # Arte de dedicatoria (en la app)
│   ├── goldwing-art-card.jpg
│   └── icons/              # Favicon + iconos 192/512 (Android)
├── .nojekyll
├── .gitignore
├── README.md
├── CONTRIBUTING.md
├── AGENTS.md
└── docs/
    ├── ARCHITECTURE.md
    ├── DEVELOPMENT.md
    ├── DATA_MODEL.md
    ├── NETLIFY.md
    └── ROADMAP.md
```

No hay `package.json` ni bundler: es HTML/CSS/JS vanilla + CDNs.

### Dependencias externas (CDN)

| Librería | Uso |
|----------|-----|
| [Chart.js](https://www.chartjs.org/) | Gráficos de consumo / estilo de manejo |
| [Tesseract.js v5](https://tesseract.projectnaptha.com/) | OCR local |
| Font Awesome 6 | Iconos |
| Google Fonts (Montserrat, Orbitron, Share Tech Mono) | Tipografía |

---

## Documentación para desarrollar

| Documento | Cuándo leerlo |
|-----------|----------------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Entender capas, tabs y flujo de datos |
| [docs/DATA_MODEL.md](docs/DATA_MODEL.md) | Esquema `localStorage`, CSV y JSON de backup |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | Cómo agregar una feature sin romper el estado |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Prioridades sugeridas |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Estilo de commits y PRs |

---

## Deploy (Netlify — recomendado)

Sitio estático, sin build. Configuración en [`netlify.toml`](netlify.toml). Guía: [docs/NETLIFY.md](docs/NETLIFY.md).

| Método | Cuándo |
|--------|--------|
| **Netlify Drop** | Puedes archivar o cerrar el repo de GitHub. Arrastra la carpeta a [app.netlify.com/drop](https://app.netlify.com/drop). |
| **Importar repo** | Mientras GitHub exista: Import project → publish `.` |
| **CLI** | `npx netlify-cli deploy --dir . --prod` |

La URL queda `https://<nombre>.netlify.app`. Los datos de GitHub Pages **no se copian solos**: exporta JSON en Ajustes antes de cambiar de dominio.

### GitHub Pages (legado)

`https://oscarkleinkopf.github.io/GoldwingGas/` — se puede desactivar cuando Netlify esté en marcha.

---

## Dedicatoria

Dedicado a Victor Kleinkopf (Z.L.).

---

## Licencia

Uso personal / comunitario del proyecto. Si publicas un fork, mantén la atribución al repositorio original y a la dedicatoria.
