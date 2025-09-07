# Postgres Gestionado (RDS / Cloud SQL) + migraciones

## 1) Crea la base (Terraform)
- **AWS RDS**: `deploy/terraform/aws/rds.tf` (ajusta VPC/Subnets).
- **GCP Cloud SQL**: `deploy/terraform/gcp/sql.tf` (autoriza IP de la VM si conectas desde fuera).

Guarda el endpoint y arma `DATABASE_URL`:
```
postgresql://mixtli:MI_PASSWORD@<endpoint>:5432/mixtli?schema=public
```

## 2) Exporta `DATABASE_URL` donde corras la app
- **Compose managed**: usa `docker-compose.prod.managed-db.yml`
- **Render/Fly/Railway**: coloca `DATABASE_URL` en variables de entorno del servicio.

## 3) Migraciones Prisma
El contenedor **api** corre `npx prisma migrate deploy` al iniciar.
Para forzar manualmente después de cambios de schema:
```bash
# Dentro del contenedor o VM
docker exec -it mixtli_api sh -lc "npx prisma migrate deploy"
```

## 4) Conexiones seguras
- **RDS**: considera parámetros para SSL `?sslmode=require` según tu política.
- **Cloud SQL**: ideal con Cloud SQL Auth Proxy. (se puede integrar en systemd si lo necesitas)
