# TLS con Let's Encrypt (HTTP-01) + Nginx (host)

Este setup termina TLS en **Nginx del host** y hace proxy a `http://127.0.0.1:8080` (API del contenedor).
Usa el compose `docker-compose.prod.no-nginx.yml` (sin Nginx en contenedor).

## Requisitos
1. Un **dominio** (ej. `api.tu-dominio.com`).
2. Un registro **A** apuntando la IP pública de tu VM.
3. Un correo admin para Let's Encrypt (para renovaciones/avisos).

## Certificado
El cloud-init/startup-script instala `certbot` y corre:
```
certbot --nginx -n --agree-tos -m <admin_email> -d <domain>
```
Certbot modifica Nginx para 443 y configura auto-renovación.

## Renovación
`certbot` instala un timer en `systemd` (o `cron`), y recarga Nginx tras renovar.
