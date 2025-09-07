# Demo multi‑adjuntos (client)

- Selección múltiple de archivos y **barra de progreso** de subida.
- Intenta `/events/send-multipart-multi`; si no existe, cae a `/events/send-multipart` (1 archivo); y siempre puedes usar el endpoint JSON si lo prefieres.
- Muestra LIVE/DRY y provider en el Ping.

**Requisitos backend:**
Usa el servidor `server.onefile.attach.multi.js` del otro ZIP y configura las variables de entorno para LIVE.
