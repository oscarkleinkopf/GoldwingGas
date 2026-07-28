# GoldwingGas

Aplicación web (SPA) para dueños de la **Honda Goldwing GL-1000 (1975–1979)**: bitácora de bencina, mantenimiento preventivo y herramientas de taller, con estética vintage inspirada en el instrumental original.

**Demo:** [https://oscarkleinkopf.github.io/GoldwingGas/](https://oscarkleinkopf.github.io/GoldwingGas/)

---

## Características

| Área | Qué hace |
|------|----------|
| **Tablero** | Diales de eficiencia y autonomía, odómetro mecánico, luces de servicio |
| **Bencina** | Cargas manuales o por OCR de boleta, gráfico Chart.js, calculadora de aditivos |
| **Mantenimiento** | Historial, intervalos GL-1000, guía del depósito falso (shelter), OCR de notas |
| **Guía de panas** | Problemas clásicos del boxer + diagnóstico de bujías + ajuste por altitud |
| **Ajustes** | Año/odómetro/moneda, export-import JSON, CSV/TSV, importación masiva por carpeta |

Datos **100 % locales** (`localStorage`). El OCR corre en el navegador con Tesseract.js; no se envían fotos a un servidor.

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
├── index.html          # UI: tabs, modales, formularios
├── app.js              # Estado, cálculos, OCR, importadores, herramientas
├── style.css           # Tema vintage (variables CSS)
├── .nojekyll           # GitHub Pages sin Jekyll
├── .gitignore
├── README.md
├── CONTRIBUTING.md
└── docs/
    ├── ARCHITECTURE.md # Arquitectura y mapa de módulos
    ├── DEVELOPMENT.md  # Flujo de trabajo y convenciones
    ├── DATA_MODEL.md   # Esquema de datos y formatos de importación
    └── ROADMAP.md      # Ideas para continuar el desarrollo
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

## Deploy (GitHub Pages)

Ya está configurado desde la rama `main`, carpeta `/ (root)`.

URL: `https://oscarkleinkopf.github.io/GoldwingGas/`

Tras un push a `main`, Pages reconstruye automáticamente. El archivo `.nojekyll` evita que Jekyll ignore assets.

---

## Dedicatoria

Dedicado a Victor Kleinkopf (Z.L.).

---

## Licencia

Uso personal / comunitario del proyecto. Si publicas un fork, mantén la atribución al repositorio original y a la dedicatoria.
