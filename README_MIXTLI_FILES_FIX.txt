# Mixtli Files Fix

## Qué hace
- Nueva ruta `/api/files` para listar, firmar descargas y borrar archivos del bucket S3.
- Nueva página `public/files.html` con tabla interactiva.

## Pasos
1. Copia el contenido de este ZIP en tu proyecto (respeta las carpetas).
2. En `server.js` agrega:
   ```js
   const filesRouter = require('./src/rutas/files');
   app.use('/api/files', filesRouter);
   ```
3. Asegúrate de tener en Render tus variables:
   - AWS_ACCESS_KEY_ID
   - AWS_SECRET_ACCESS_KEY
   - AWS_REGION (o S3_REGION)
   - S3_BUCKET
4. Deploy en Render.
5. Abre `https://tu-app.onrender.com/files.html` para listar.

