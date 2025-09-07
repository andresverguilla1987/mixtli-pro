# MX PRO — ONE‑CLICK: Detecta tu IP y abre DB/Redis

Generado: 2025-09-07T02:34:23

Este add‑on **detecta automáticamente tu IP pública** y abre los puertos que indiques (por defecto: **5432** Postgres y **6379** Redis) usando **UFW**.
También trae la versión para **Ansible** que detecta la IP desde tu máquina de control.

## Uso (script one‑click en el servidor)
```bash
# Abrir Postgres 5432 y Redis 6379 a TU IP (auto):
sudo bash allow_from_my_ip.sh

# Ver reglas:
sudo ufw status numbered

# Revertir reglas añadidas por este script:
sudo bash revoke_my_ip_rules.sh
```

### Personalizar puertos
Edita `ports.conf` y deja una lista separada por espacios, p.ej.:
```
5432 6379 3306
```

## Uso (Ansible desde tu laptop/WSL/VM)
```bash
cd ansible_oneclick
ansible-playbook -i inventory.ini db_redis_allow_my_ip.yml --ask-become-pass
```
- Detecta tu IP con `curl` y la usa en el servidor objetivo.
- Cambia `inventory.ini` con tu IP/usuario del servidor.

## Nota
- Evita exponer DB/Redis si puedes usar **túneles SSH** (más seguro). Esta herramienta es para casos controlados.
