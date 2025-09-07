# Render: Custom Domain + Cloudflare (proxied)

1) En Render, en el servicio **mixtli-api** agrega tu **Custom Domain** (ej. `api.TU-DOMINIO.com`). Render te mostrará su **Target** (CNAME a `*.onrender.com`).

2) En Cloudflare:
   - Crea un **CNAME** `api` -> `<target>.onrender.com` con **Proxied = ON** (naranja).
   - O usa el Terraform incluido en `cloudflare_dns/` (completa variables).

3) Espera propagación DNS y prueba:
```
curl -s https://api.TU-DOMINIO.com/health
```
