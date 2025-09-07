# MX PRO — Acceso DB (Postgres 5432) + Redis 6379 por IP + Túneles SSH

Generado: 2025-09-07T02:31:33

Este add-on agrega **reglas por IP** para Postgres (5432) y Redis (6379), y ejemplos de **túnel SSH** para ambas.
Puedes usarlo de dos formas:
- **Scripts** (rápido) — `apply_db_redis_access.sh` abre ambos puertos para una IP.
- **Ansible** (idempotente) — `ansible/db_redis_access.yml` con `--extra-vars`.

> Recomendación: Mantener DB y Redis **solo en localhost** y usar **túneles SSH**. Abrir por IP solo si es necesario.

---

## 1) Scripts

### 1.1 Abrir ambos puertos a una IP
```bash
sudo bash apply_db_redis_access.sh 203.0.113.10
# Ver reglas:
sudo ufw status numbered
# Revertir:
sudo bash revoke_db_redis_access.sh 203.0.113.10
```

### 1.2 Abrir selectivamente (uno de los dos)
```bash
# Postgres solamente
sudo bash allow_db_access.sh 203.0.113.10 5432
# Redis solamente
sudo bash allow_db_access.sh 203.0.113.10 6379
# Quitar
sudo bash deny_db_access.sh 203.0.113.10 5432
sudo bash deny_db_access.sh 203.0.113.10 6379
```

---

## 2) Ansible
```bash
ansible-playbook -i ansible/inventory.ini ansible/db_redis_access.yml   --extra-vars "db_allow_ip=203.0.113.10 redis_allow_ip=203.0.113.10"   --ask-become-pass
```

Variables:
- `db_allow_ip` → IP para Postgres 5432
- `redis_allow_ip` → IP para Redis 6379

---

## 3) Túneles SSH (recomendado)

### 3.1 Postgres via túnel (local forward)
```bash
ssh -N -L 5432:127.0.0.1:5432 ubuntu@TU.IP -p 2222
psql -h 127.0.0.1 -p 5432 -U postgres
```

### 3.2 Redis via túnel (local forward)
```bash
ssh -N -L 6379:127.0.0.1:6379 ubuntu@TU.IP -p 2222
redis-cli -h 127.0.0.1 -p 6379
```

> Asegúrate de que **Postgres** y **Redis** escuchen en **localhost** en el servidor:
- Postgres `postgresql.conf`: `listen_addresses = 'localhost'`
- Redis `redis.conf`: `bind 127.0.0.1 ::1` y `protected-mode yes`

Luego:
```bash
sudo systemctl restart postgresql || true
sudo systemctl restart redis-server || true
```

---

## Archivos incluidos
- `apply_db_redis_access.sh` / `revoke_db_redis_access.sh`
- `allow_db_access.sh` / `deny_db_access.sh`
- `ansible/db_redis_access.yml` + `inventory.ini`
- `EXAMPLES.md`
