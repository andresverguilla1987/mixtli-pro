
Pega/integra estos archivos sobre tu repo:

- `src/lib/s3.js`           (añade list() y remove())
- `src/rutas/files.js`      (nuevas rutas listar y eliminar)
- `public/files.html`       (UI con previews, totales y eliminar)

Luego en tu `server.js` agrega, si no existe ya:

```js
const filesRouter = require('./src/rutas/files');
app.use('/api/files', filesRouter);

// (Opcional) Si quieres servir proxy/descarga simple desde backend:
app.get('/api/files/download/:key', async (req, res) => {
  const key = decodeURIComponent(req.params.key);
  const { BUCKET, REGION } = require('./src/lib/s3');
  // Redirección a URL pública si tu bucket permite público por objeto; si no, cámbialo por un presign.
  return res.redirect(`https://${BUCKET}.s3.${REGION}.amazonaws.com/${encodeURIComponent(key)}`);
});
app.get('/api/files/proxy/:key', async (req, res) => {
  const key = decodeURIComponent(req.params.key);
  const { BUCKET, REGION } = require('./src/lib/s3');
  return res.redirect(`https://${BUCKET}.s3.${REGION}.amazonaws.com/${encodeURIComponent(key)}`);
});
```

Variables de entorno (ya las tienes, confirmar):
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION` (o `S3_REGION`)
- `S3_BUCKET`
