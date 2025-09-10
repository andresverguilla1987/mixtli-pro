Mixtli front fix
================

Archivos contenidos:
- front/app.js        → Lógica del UI (corregida): registro, login local, y flujo de subida
                         Presign → PUT → Complete con tolerancia a varias rutas.
- index.html          → Página de ejemplo con los IDs que el JS espera. Úsalo para validar.
- r2_cors.json        → Plantilla de CORS para Cloudflare R2 (ajusta tu dominio Netlify).

Uso rápido
----------
1) Copia `front/app.js` a tu proyecto (reemplaza el existente) y haz commit en `main`.
2) (Opcional) Abre `index.html` para verificar que tu HTML tenga los mismos IDs.
3) En el sitio (Netlify) pon en "API Base": https://mixtli-pro.onrender.com y guarda.
4) Regístrate (o da Entrar) y sube un archivo. Verás el log y/o la URL resultante.