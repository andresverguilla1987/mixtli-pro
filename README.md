# Mixtli — ZIP todo-en-uno (R2 presign)
Root Directory (Render): backend
Build: npm ci --omit=dev
Start: node server.js

Env vars (Render):
- R2_BUCKET=mixtli
- R2_ACCOUNT_ID=TU_ACCOUNT_ID
- R2_ACCESS_KEY_ID=TU_ACCESS_KEY
- R2_SECRET_ACCESS_KEY=TU_SECRET_KEY
- PUBLIC_BASE_URL=https://pub-XXXX.r2.dev/mixtli
- ALLOWED_ORIGINS=http://localhost:5173,https://TU-SITIO.netlify.app
