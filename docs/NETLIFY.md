# Publicar GoldwingGas en Netlify (sin depender de GitHub Pages)

El sitio es estático: no hay `npm install` ni build. `netlify.toml` publica la raíz del repo.

## Opción A — Netlify Drop (puedes cerrar GitHub)

No conecta el repositorio. Sirve para archivar o borrar el repo de GitHub después.

1. En el PC, descarga un ZIP del proyecto (o clona y comprime la carpeta).
2. Entra a [app.netlify.com/drop](https://app.netlify.com/drop) con tu cuenta Netlify (gratis).
3. Arrastra la carpeta del proyecto (debe verse `index.html`, `app.js`, `netlify.toml`).
4. Netlify asigna una URL tipo `https://algo.netlify.app`.
5. En **Site settings → Domain management** puedes poner un dominio propio.

Actualizaciones futuras: vuelve a arrastrar la carpeta en **Deploys → Drag and drop**.

## Opción B — Conectar GitHub (mientras el repo exista)

1. [app.netlify.com](https://app.netlify.com) → **Add new site → Import an existing project**.
2. Elige GitHub → `oscarkleinkopf/GoldwingGas`.
3. **Publish directory:** `.`  **Build command:** vacío o `true`.
4. Deploy. Cada push a `main` republica el sitio.

Cuando quieras **cerrar el repo**: cambia el sitio a **Stop auto publishing** y sigue con Drop (opción A), o exporta un ZIP y vuelve a subirlo.

## Opción C — CLI (sin abrir el panel)

```bash
npx netlify-cli login
npx netlify-cli deploy --dir . --prod
```

La primera vez pregunta si creas un sitio nuevo.

## PWA en Netlify

- El `manifest` usa rutas relativas (`./`) y `id: "/"`, válido en la raíz de `*.netlify.app`.
- `sw.js` se sirve con `Cache-Control: no-cache` para que las actualizaciones lleguen.
- Instalar: botón **Instalar app** en el encabezado (no hace falta el menú ⋮ de Chrome). Si el enlace abre a pantalla completa, ese botón abre Chrome con barra de direcciones.

## Datos locales

`localStorage` e IndexedDB son **por origen**. Al pasar de GitHub Pages (`…github.io/GoldwingGas/`) a Netlify (`…netlify.app`) es otro origen: exporta el JSON en Ajustes **antes** de cambiar de URL e impórtalo en el sitio nuevo.

## GitHub Pages

Puedes apagar Pages en el repo cuando Netlify esté en producción. No borres el repo hasta tener el JSON de respaldo y un deploy Drop o CLI funcionando.
