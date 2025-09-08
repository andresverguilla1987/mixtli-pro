# Mixtli Front (API)

UI bonita, mínima, conectada al backend `mixtli-mini` (presigned R2/S3).

## Archivos
- `index.html` — UI.
- `assets/styles.css` — estilos.
- `assets/config.js` — API_BASE y toggles (ocultar registro).
- `assets/adapter.js` — llamadas al backend (login, presign, PUT, complete, link, email).
- `assets/app.js` — lógica de la interfaz.

## Uso
1) Edita `assets/config.js` → `API_BASE` (por defecto `http://localhost:10000`).
2) Sirve la carpeta estática (Netlify, nginx) o abre `index.html`.
3) Login → “Subir y generar enlace”. Opcional: introduce correo para enviar link.
