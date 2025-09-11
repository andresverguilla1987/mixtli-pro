# Mixtli — Demo Presign PUT + Preview

Pequeña página estática para probar tu **presign PUT** a Cloudflare R2 y visualizar el **publicUrl**.

## ¿Qué incluye?
- `index.html`: UI minimal (dark) para pegar tu JSON de presign, elegir archivo y subir.
- `app.js`: Lógica con `XMLHttpRequest` para barra de progreso y manejo de headers de presign.
- `styles.css`: Estilos sencillos.
- **Sin backend**: 100% estático, ideal para Netlify.

## Uso
1. Despliega el contenido del ZIP en Netlify (o abre `index.html` localmente).
2. Pega en el textarea el JSON de `presign` que te entrega tu API, p. ej.:
   ```json
   {
     "key": "1757549600482-f48917-GP010345.JPG",
     "url": "https://...r2.cloudflarestorage.com/1757549600482-f48917-GP010345.JPG?...",
     "method": "PUT",
     "headers": { "Content-Type": "image/jpeg" },
     "publicUrl": "https://pub-xxxxxx.r2.dev/1757549600482-f48917-GP010345.JPG",
     "expiresIn": 3600
   }
   ```
3. Arrastra/elige un archivo y pulsa **Subir con PUT**.
4. Si el `presign` traía `publicUrl`, se llenará solo. Si no, pégalo manualmente para abrirlo/compartirlo.

## Notas
- Si falla con CORS, ajusta tu **CORS del bucket R2** para permitir `PUT` desde tu dominio (Origin de Netlify) y headers `Content-Type` + `x-amz-*` que tu presign incluya.
- Los botones **Abrir/Copiar** funcionan para cualquier tipo de archivo (si es imagen, verás preview).
