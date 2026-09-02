# Respaldo en Google Drive

Opcional. Los datos siguen en el teléfono; Drive es una copia que evitas pasar a mano el JSON.

La app usa **OAuth 2.0 en el navegador** (Google Identity Services) y el alcance `drive.file`: solo ve archivos que **ella misma** crea (carpeta `GoldwingGas` / `goldwing_gas_backup.json`). No revisa el resto de tu Drive.

## Una sola vez: crear el Client ID (dueño del sitio)

Cualquier persona que use **tu** URL (Netlify / Pages) inicia sesión con **su** cuenta Google. Tú solo creas un Client ID público (no es un secreto de servidor).

1. En [Google Cloud Console](https://console.cloud.google.com/) crea un proyecto (p. ej. `GoldwingGas`).
2. **APIs y servicios → Biblioteca** → habilita **Google Drive API**.
3. **Pantalla de consentimiento OAuth**:
   - Tipo **Externo**.
   - Nombre: GoldwingGas.
   - Correo de soporte: el tuyo.
   - Ámbitos: `.../auth/drive.file` y `email` / `openid`.
   - Mientras esté en **Prueba**, añade como usuarios de prueba los Gmail que vayan a usarla. Para que cualquiera entre, publica la app (verificación de Google si se exige).
4. **Credenciales → Crear credenciales → ID de cliente de OAuth → Aplicación web**.
5. **Orígenes de JavaScript autorizados** (sin barra final):
   - `http://localhost:8080`
   - `https://TU-SITIO.netlify.app`
   - `https://oscarkleinkopf.github.io` (si sigues en Pages)
6. Copia el **ID de cliente** (`….apps.googleusercontent.com`).

Pégalo en **Ajustes → Google Drive → Client ID** y pulsa Guardar. O déjalo en `js/google-config.js` (`window.GOLDWING_GOOGLE_CLIENT_ID`) y vuelve a publicar.

## Uso (cualquier piloto)

1. Ajustes → **Entrar con Google**.
2. **Subir respaldo** — crea/actualiza el JSON en Drive (incluye fotos del backup).
3. En otro teléfono o Chrome: la misma URL → Entrar con **la misma cuenta** → **Restaurar desde Drive**.

El token dura la sesión del navegador (`sessionStorage`). Cerrar sesión no borra el archivo en Drive ni los datos locales.

## Privacidad

- Sin Client ID no hay llamadas a Google.
- No hay backend propio: el token viaja del navegador a `googleapis.com`.
- Al cambiar de dominio (Pages → Netlify) vuelve a autorizar orígenes en Cloud Console.
