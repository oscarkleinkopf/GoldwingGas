# GoldwingGas 🏍️⛽

**GoldwingGas** es una aplicación web responsiva (Single Page Application) diseñada especialmente para dueños de la legendaria motocicleta clásica **Honda Goldwing GL-1000 (1975-1979)**. Te permite realizar un seguimiento exhaustivo del consumo de bencina y del mantenimiento de tu máquina, utilizando el sistema métrico y con una estética vintage inspirada en los relojes analógicos verdes y cromados originales de la moto.

## Características Principales

*   **Estética Vintage GL-1000**: Panel de control con diales analógicos y cuentakilómetros con efecto mecánico tipo tambor que refleja tus estadísticas en tiempo real.
*   **Escáner OCR Local Inteligente**: Sube una foto de tu boleta de bencina colocada al costado del cuentakilómetros y la app extraerá automáticamente la **fecha**, los **litros cargados** y el **kilometraje** usando la librería `Tesseract.js` directamente en tu navegador (100% privado, no envía datos a internet).
*   **Bitácora de Bencina y Rendimiento**: Planilla interactiva que calcula el consumo en kilómetros por litro (km/L) y litros por 100 kilómetros (L/100km) con gráficos integrados.
*   **Bitácora Histórica de Mantenimiento**: Registro detallado con fecha y notas de todos los servicios preventivos y reparaciones que le hagas a la moto.
*   **Luz de Advertencia de Servicio Preventivo**: El tablero cuenta con luces de servicio dinámicas basadas en los kilómetros recorridos para recordarte tareas críticas del motor bóxer de 4 cilindros de la GL-1000:
    *   **Correas de Distribución (Timing Belts)**: Intervalo crítico de 24,000 km (para evitar colisión de válvulas).
    *   **Sincronización de Carburadores**: Cada 5,000 km (sincronizar los 4 Keihin).
    *   **Ajuste de Válvulas**: Cada 5,000 km.
    *   **Cambio de Aceite de Motor & Filtro**: Cada 5,000 km.
    *   **Aceite de Cardán (Transmisión Final)**: Cada 10,000 km.
    *   **Platinos y Bujías**: Cada 10,000 km.
*   **Respaldo de Datos**: Permite exportar e importar todo tu historial en un archivo JSON para que nunca pierdas tu información al cambiar de navegador o celular.

---

## Cómo Ejecutar y Probar en tu Computadora o Celular

1.  **Ejecución Local**:
    Puedes abrir el archivo `index.html` directamente en cualquier navegador web moderno. ¡Eso es todo! No requiere configuraciones de servidor ni base de datos, ya que todo se procesa de forma local y los datos se guardan en el `localStorage` de tu navegador.

2.  **Ver Funcionando Online con GitHub Pages**:
    Esta app ya está conectada al repositorio de GitHub. Para verlo funcionando en internet, sigue estos pasos rápidos:
    *   Entra a la configuración del repositorio en GitHub: **Settings** -> **Pages**.
    *   En la sección **Build and deployment**, bajo **Source**, selecciona `Deploy from a branch`.
    *   Bajo **Branch**, selecciona la rama `main` y la carpeta `/ (root)`.
    *   Haz clic en **Save**.
    *   En unos minutos, GitHub creará tu sitio web y estará disponible en:  
        `https://oscarkleinkopf.github.io/GoldwingGas/`

---

## Estructura del Proyecto

*   [index.html](file:///C:/Users/oscar/.gemini/antigravity/scratch/GoldwingGas/index.html) - La estructura HTML de la interfaz y carga de Tesseract.js/Chart.js.
*   [style.css](file:///C:/Users/oscar/.gemini/antigravity/scratch/GoldwingGas/style.css) - Estilos que definen la estética de instrumental clásico e indicadores luminosos.
*   [app.js](file:///C:/Users/oscar/.gemini/antigravity/scratch/GoldwingGas/app.js) - Lógica de cálculos, gráficos, alertas de mantenimiento y expresiones regulares para el OCR.