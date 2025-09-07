# Demo hosted con fallback de enable (force=1)

- Esta versión del `index.html` intenta habilitar 2FA normal y, si recibe 400 por código inválido, **reintenta con `?force=1`**.
- Incluye botón manual **Forzar (demo)**.

## Publicar en GitHub Pages
1) Sube `index.html` a la raíz de un repo.
2) Settings → Pages → Deploy from a branch (main / root).
3) Abre `https://<user>.github.io/<repo>/?base=https://mixtli-pro.onrender.com/`

> Requiere que tu backend soporte `POST /security/2fa/enable?force=1` (parche de server “force-enable”).
