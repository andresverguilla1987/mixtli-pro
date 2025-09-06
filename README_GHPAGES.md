# Demo web en GitHub Pages (Mixtli)

Este sitio está listo para subirse a **GitHub Pages** y apuntar a tu backend **HTTPS** (ej. Render).

## Cómo publicarlo
1) Crea un repo nuevo en GitHub (o usa uno existente).
2) Agrega este archivo `index.html` en la raíz del repo y haz commit/push.
3) En GitHub: Settings → Pages → **Deploy from a branch** → Branch: `main` (ruta `/root`). Guardar.
4) Tu sitio quedará en: `https://<tu-usuario>.github.io/<tu-repo>/`

> ⚠️ GitHub Pages sirve por HTTPS. Si apuntas a `http://localhost:3000`, el navegador bloqueará (mixed content). Usa:
> - Tu URL de Render (HTTPS)
> - O un túnel HTTPS (ngrok, Cloudflare Tunnel)
> - O habilita HTTPS en tu entorno público

## Configurar el backend desde la URL
Puedes fijar el backend con query string:
```
https://<tu-usuario>.github.io/<tu-repo>/?base=https://mixtli-pro.onrender.com
```

También queda guardado en `localStorage` cuando presionas **Guardar** en la UI.

## Endpoints requeridos en el backend
- `GET /` → ping (JSON)
- `POST /security/2fa/setup` → retorna `{ otpauth, qrDataUrl }`
- `POST /security/2fa/enable` → body `{ code }`, retorna `{ enabled, recoveryCodes }`
- `POST /events/login` → dispara mail (DRY registra en log)
- `GET /debug/mail-log` → retorna `{ items: [...] }`

> Activa `DRY_RUN_EMAIL=1` para demo sin correos reales.
