# Attachments Enable Pack (SendGrid/SES)

Habilita envíos **reales** con adjuntos de **máxima calidad** desde tu demo.

## Archivos
- `server.onefile.attach.js` — servidor listo para adjuntos (SendGrid o SES).

## Variables de entorno
### Comunes
- `MAIL_FROM_EMAIL` — remitente (ej. no-reply@tu-dominio.com)
- `MAIL_FROM_NAME`  — nombre remitente (ej. Mixtli)

### SendGrid (recomendado para demo de adjuntos grandes)
- `MAIL_PROVIDER=sendgrid`
- `SENDGRID_API_KEY=SG.xxxxx`

> Límite total por mensaje (cuerpo+headers+adjuntos): **30MB**. Recomendado: adjuntos ≤ **10MB**. citeturn0search15turn0search3turn0search12

### Amazon SES (adjuntos grandes en producción)
- `MAIL_PROVIDER=ses`
- `AWS_REGION=us-east-1` (u otra)
- `AWS_ACCESS_KEY_ID` y `AWS_SECRET_ACCESS_KEY` (o roles)
- (opcional) `AWS_SESSION_TOKEN`

> SES v2 soporta hasta **40MB** por mensaje; ojo: MIME base64 agranda ~37% el adjunto. citeturn0search22turn0search7turn0search4

### Modo demo (sin enviar)
- `DRY_RUN_EMAIL=1` (muestra todo en `/debug/mail-log`)

## Start en Render
- **Build Command:** `npm i --no-audit --no-fund`
- **Start Command:** `node server.onefile.attach.js`

## Endpoints
- `POST /events/send` — JSON con adjuntos base64
- `POST /events/send-multipart` — **multipart/form-data** con campo `attachment` (ideal Postman)
- `GET /debug/mail-log` — ver lo enviado (o simulado)

## Postman (multipart)
- Método: POST
- URL: `https://<tu-app>.onrender.com/events/send-multipart`
- Body → `form-data`:
  - `to`: correo destino
  - `subject`: asunto
  - `text` (opcional)
  - `html` (opcional)
  - `attachment` (type `File`) → selecciona tu imagen/PDF **sin comprimir**

## Calidad “máxima” (tips)
- Adjunta el **archivo original** (PNG/TIFF/JPEG de alta), no incrustes como `<img>` si quieres conservar resolución.
- Define `Content-Type` correcto (ej. `image/png`, `application/pdf`).
- Para inline + adjunto: usa `cid` para `<img src="cid:logo@mixtli">` y además adjunta el original como *attachment*.
- Si el archivo supera límites, sube a S3 o Drive y manda **link firmado** en el correo.

## Notas técnicas
- SendGrid: `attachments[].content` en **base64**. citeturn0search15
- SES: usamos **Nodemailer + SESv2** para soportar adjuntos. citeturn0search20
