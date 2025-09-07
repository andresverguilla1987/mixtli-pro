
# Demo con adjuntos (2FA + notificaciones + envío de archivos)

Este `index.html` añade UI para mandar un **adjunto** en máxima calidad usando el endpoint
`POST /events/send-multipart` del servidor `server.onefile.attach.js`.

## Uso
1) Publica el HTML en GitHub Pages o ábrelo local.
2) Base URL: `https://mixtli-pro.onrender.com/` (o tu ngrok HTTPS).
3) Pica en orden: Ping → QR → Enable → Enviar login → **Enviar adjunto** → Mail Log.

## Requisitos backend
- Servir CORS.
- Endpoints activos:
  - `/events/send-multipart` (multipart/form-data, campo `attachment`).
  - `/debug/mail-log` para visualizar lo enviado.
- Para ENVÍO REAL: configura `MAIL_PROVIDER` (sendgrid|ses) y credenciales.
