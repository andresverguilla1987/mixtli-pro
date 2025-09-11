# Mixtli — Design Lock v1 (presign automático)

Interfaz **estable** (dark) con pestañas *Bienvenido* / *Entrar-Registrarme* / *Subir-Compartir*, respetando tu **Design Lock v1**. En *Subir-Compartir* el flujo es **automático**:

1. Usuario elige o arrastra un archivo.
2. El frontend pide un **presign** a `/api/presign` (GET con query, y si no, POST con JSON).
3. Hace `PUT` directo a R2 con barra de progreso.
4. Muestra el `publicUrl` para copiar/abrir y preview si es imagen.

## Archivos
- `index.html` — UI fija (design lock).
- `styles.css` — dark look estable.
- `app.js` — lógica de presign automático + subida + compartir.
- `README.md` — esta guía.

## Endpoint esperado
El frontend intenta dos variantes (elige la que ya tengas en tu API):
- `GET /api/presign?filename=...&contentType=...`
- `POST /api/presign` con body JSON `{ filename, contentType }`

**Respuesta esperada:**

```json
{
  "key": "1757549600482-f48917-GP010345.JPG",
  "url": "https://...r2.cloudflarestorage.com/1757549600482-f48917-GP010345.JPG?...",
  "method": "PUT",
  "headers": { "Content-Type": "image/jpeg" },
  "publicUrl": "https://pub-xxxx.r2.dev/1757549600482-f48917-GP010345.JPG",
  "expiresIn": 3600
}
```

Si tu backend no incluye `publicUrl` pero sí `"publicBase"` y `"key"`, se arma como `publicBase + "/" + key`.

## CORS en R2
Permite desde tu dominio (Netlify/Pages):
- Métodos: `PUT, GET, HEAD, OPTIONS`
- Headers: `Content-Type` y los `x-amz-*` que uses

## Deploy
- **Netlify:** arrastra la carpeta o repo (no requiere build).
- **GitHub Pages:** Settings → Pages → Source (branch) → root `/`.

## Cambiar API base
Si tu API vive en otro dominio, edita en `index.html`:

```html
<script>window.API_BASE = "https://tu-api.onrender.com";</script>
```
