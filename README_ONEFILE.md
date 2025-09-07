# One‑file Demo Server (sin BD)

## Para qué sirve
Si tu deploy en Render no está montando los routers o Prisma te da lata, usa este **server.onefile.js**. Tiene todo lo que la demo hosted necesita, sin BD.

## Cómo usar en Render (1 min)
1) Copia **server.onefile.js** y **package.json** a la **raíz** del repo.
2) En Render, en tu servicio:
   - Build Command: `npm install --no-audit --no-fund`
   - Start Command: `node server.onefile.js`
3) Redeploy y prueba `https://<tu-servicio>.onrender.com/`

## Endpoints
- `GET /` → `{ status: "ok" }`
- `POST /security/2fa/setup` → `{ otpauth, qrDataUrl }`
- `POST /security/2fa/enable` → `{ enabled: true, recoveryCodes: [...] }`
- `POST /events/login` → `{ sent: true, dryRun: true }`
- `GET /debug/mail-log` → `{ items: [...] }`

> Todo es **in‑memory** (se borra al reiniciar). Perfecto para demo.
