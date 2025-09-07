# Cloudflare Tunnel (sin puertos abiertos)

Expone tu API detrás de Cloudflare **sin abrir 80/443** en tu servidor.
Requisitos:
- Dominio en Cloudflare.
- `cloudflared` instalado y autenticado.

## 1) Instalar y login
```bash
# Ubuntu/Debian
wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb

sudo cloudflared tunnel login   # abre navegador para autorizar
```

## 2) Crear túnel y credenciales
```bash
sudo cloudflared tunnel create mixtli
# Guarda el ID (TUNNEL_ID). Esto genera un cert y un JSON de credenciales.
```

## 3) Configurar ingress
Crea `/etc/cloudflared/config.yml` así (ajusta dominio y puerto destino):
```yaml
tunnel: <TUNNEL_ID>
credentials-file: /root/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: api.tu-dominio.com
    service: http://127.0.0.1:8080   # Nginx host o API directa
  - service: http_status:404
```
> Si usas Nginx en host (recomendado), deja el proxy a `127.0.0.1:8080` como aquí.

## 4) DNS → CNAME a tu túnel
```bash
sudo cloudflared tunnel route dns mixtli api.tu-dominio.com
```

## 5) Service systemd
```bash
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
sudo systemctl status cloudflared
```

Listo. Tu API queda accesible en `https://api.tu-dominio.com` por el túnel.
