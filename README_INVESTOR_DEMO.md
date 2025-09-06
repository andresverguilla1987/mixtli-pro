# Investor Demo – 7 minutos

## 1) Arranca el API (con DRY_RUN_EMAIL=1)
```bash
cd notifications
cp .env.example .env   # si no lo tienes ya
# (asegúrate de tener CRYPTO_KEY y DATABASE_URL)
pnpm i
pnpm prisma:gen
pnpm prisma:migrate --name init
pnpm run seed
pnpm run dev
```

## 2) Abre el panel de demo
Abre `investor_demo/demo.html` en tu navegador (doble click está bien).

- Base URL: `http://localhost:3000`
- User: `admin@mixtli.test`

## 3) Flujo que vas a mostrar
1. **Ping** → se ve el servicio arriba.
2. **2FA Setup** → aparece el QR; saca el cel y escanéalo en Authenticator.
3. **2FA Enable** → mete el código de 6 dígitos; se muestran los backup codes (primeros 3 obfuscados).
4. **Enviar “Nuevo login”** → con DRY activo, no se manda correo real, pero verás el evento en **Mail Log** (y en consola del server).
5. (Opcional) **PDF** desde Postman: `POST /security/2fa/backup/pdf` con los `plainCodes` devueltos por Enable.

## 4) ¿Listo para producción?
- Quita `DRY_RUN_EMAIL` o ponlo en `0` y configura SendGrid/SES.
- Sube a Render (si no lo tienes), monta Disk en `/data`.
