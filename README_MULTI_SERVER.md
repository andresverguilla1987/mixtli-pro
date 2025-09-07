# Multi-attachments server (SendGrid/SES)

**Start (Render):**
- Build: `npm i --no-audit --no-fund`
- Start: `node server.onefile.attach.multi.js`

**Env:**
- MAIL_PROVIDER=sendgrid|ses
- DRY_RUN_EMAIL=0   (1 = demo sin enviar)
- MAIL_FROM_EMAIL, MAIL_FROM_NAME
- SENDGRID_API_KEY  (si SendGrid)
- AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY (si SES)

**Endpoints:**
- POST `/events/send-multipart-multi`  (form-data, campo `attachments` multi-file)
- POST `/events/send-multipart`        (retro-compat, campo `attachment` 1 archivo)
- POST `/events/send` (JSON con `attachments[].contentBase64`)
- GET  `/debug/mail-log`
- GET  `/` (muestra LIVE/DRY y provider)

**Nota:** Si `/` dice `mode: DRY` o `provider: none`, no va a enviar. Ajusta env y redeploy.
