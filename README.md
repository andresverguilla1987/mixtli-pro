# Mixtli — ZIP Corrector (CORS & Diagnóstico)

Este paquete te ayuda a **arreglar “no envía”** mostrando exactamente qué está mal y dándote los textos para copiar/pegar en Render y R2.

## Contenido
- `diagnostics.html` — Lee `/diagnostics` y te muestra:
  - `publicBase`, `bucket`, `corsAllowList`
  - Genera una **sugerencia de ALLOWED_ORIGINS** incluyendo tu origen actual
  - Botón para **copiar** la lista
- `r2-cors.json` — Plantilla CORS para el bucket R2 (incluye localhost + Netlify)
- `upload-check.html` — Prueba de subida punta a punta con **logs** (presign y PUT)

## Cómo usar
1) Sirve este folder por HTTP (no `file://`):
   ```bash
   npx http-server -p 8080
   # o
   python -m http.server 8080
   ```
   Abre `http://127.0.0.1:8080/diagnostics.html`

2) En `diagnostics.html`:
   - Pon la URL de tu API (ej. `https://mixtli-pro.onrender.com`) y pulsa **Cargar**.
   - Si tu origen actual no está en la lista sugerida, el corrector lo añade automáticamente.
   - Copia la cadena de **ALLOWED_ORIGINS** y pégala en Render → Environment.
   - Descarga `r2-cors.json` y súbelo en la configuración CORS del bucket R2.

3) Verifica con `upload-check.html`:
   - Pone status/cuerpo del `/presign`
   - Muestra el status del PUT a R2
   - Si todo ok, te da el enlace público

## Tips
- Después de cambiar variables en Render, usa **Manual Deploy → Clear build cache & deploy**.
- En R2, si ya tenías CORS, **reemplázalo** con el JSON del paquete.
- Si sigues viendo errores 415/413, ajusta en el backend:
  - `ALLOWED_MIME_PREFIXES` (ej. `image/,application/pdf,video/`)
  - `MAX_UPLOAD_MB` (ej. `100`)
