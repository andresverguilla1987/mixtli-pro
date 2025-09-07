# Role: cloudflared (Cloudflare Tunnel)

Variables útiles en `group_vars/all.yml`:
```yaml
domain: "api.tu-dominio.com"
cloudflare_tunnel_id: "xxxxxx-xxxxx-xxxx"
```
Antes de correr el role la primera vez, ejecuta en el servidor:
```
cloudflared tunnel login
cloudflared tunnel create mixtli   # obtén el TUNNEL_ID y credencial JSON
```
Luego corre `make setup` para plantar `config.yml` y crear el servicio.
