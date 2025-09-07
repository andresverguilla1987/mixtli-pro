# Let's Encrypt con **DNS-01** (comodines) – Cloudflare y Route53

El desafío **DNS-01** te permite emitir certificados **wildcard** (`*.tu-dominio.com`).
Usaremos **certbot** con plugins:
- Cloudflare: `python3-certbot-dns-cloudflare` (o `certbot-dns-cloudflare` en algunas distros)
- Route53 (AWS): `python3-certbot-dns-route53`

> Requisito: usa **Nginx en el host** (no en contenedor) y el compose `docker-compose.prod.no-nginx.yml` para que 443 quede libre.

---

## Cloudflare

### 1) Crea un **API Token** con permiso de **DNS:Edit** en tu zona
Guarda el valor en el archivo de credenciales:
```
/etc/letsencrypt/cloudflare.ini
```
Contenido:
```
dns_cloudflare_api_token = <CLOUDFLARE_API_TOKEN>
```
Permisos: `chmod 600 /etc/letsencrypt/cloudflare.ini`

### 2) Instala plugin
Ubuntu/Debian:
```bash
apt-get install -y python3-certbot-dns-cloudflare
```

### 3) Emitir certificado
```bash
certbot certonly   --dns-cloudflare   --dns-cloudflare-credentials /etc/letsencrypt/cloudflare.ini   -m admin@tu-dominio.com --agree-tos -n   -d tu-dominio.com -d *.tu-dominio.com
```

### 4) Nginx
Apunta tus `ssl_certificate` y `ssl_certificate_key` a:
```
/etc/letsencrypt/live/tu-dominio.com/fullchain.pem
/etc/letsencrypt/live/tu-dominio.com/privkey.pem
```
Y recarga Nginx: `systemctl reload nginx`

### 5) Renovación
`certbot` agrega un timer/cron que renueva y puede recargar Nginx. Verifica con:
```bash
certbot renew --dry-run
```

---

## AWS Route53

### 1) Permisos (IAM)
Si corres en EC2, lo ideal es un **Instance Profile/Role** con esta política mínima:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "route53:ListHostedZones",
        "route53:ListResourceRecordSets",
        "route53:ChangeResourceRecordSets"
      ],
      "Resource": "*"
    }
  ]
}
```

### 2) Instala plugin
```bash
apt-get install -y python3-certbot-dns-route53
```

### 3) Emitir certificado
Si hay perfil de instancia (mejor), no necesitas credenciales locales:
```bash
certbot certonly   --dns-route53   -m admin@tu-dominio.com --agree-tos -n   -d tu-dominio.com -d *.tu-dominio.com
```

Si NO tienes perfil de instancia, configura `AWS_ACCESS_KEY_ID` y `AWS_SECRET_ACCESS_KEY` como variables de entorno antes de ejecutar `certbot`.

### 4) Nginx y renovación
Igual que en Cloudflare.
