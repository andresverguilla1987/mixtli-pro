# PR: Config dominio + Cloudflare (proxied)

Este PR ajusta el proyecto para usar el dominio especificado y Cloudflare:
- Actualiza `deploy/ansible/group_vars/all.yml` con `domain` y `tls_provider`.
- Refresca ejemplos (TLS HTTP-01/DNS-01, Cloudflare Tunnel) con tu dominio.
- Añade Terraform opcional para crear el **CNAME proxied** en Cloudflare.
- Documento `RENDER_CUSTOM_DOMAIN.md` para linkear tu dominio al servicio de Render.

> Revisa los placeholders marcados como `TODO` (token de Cloudflare, zone_id, etc.).
