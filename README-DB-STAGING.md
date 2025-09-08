# Mixtli DB Staging Restore Kit

Esto te permite **restaurar STAGING** desde los backups en S3 con un workflow manual o con un script local.

## 1) Secrets requeridos en GitHub Actions

En el repo: **Settings → Secrets and variables → Actions**

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `S3_BUCKET`
- `S3_PREFIX` (opcional, default `mixtli/backups`)
- `DATABASE_URL_STAGING` (cadena de conexión a la base de STAGING)

## 2) Workflow manual

- Archivo: `.github/workflows/db-restore-to-staging.yml`
- Ve a **Actions → DB Restore to Staging (Manual) → Run workflow**
- Inputs:
  - `s3_key` (opcional): key exacta del backup, ej. `mixtli/backups/backup-20250907-091500.sql`.
  - `confirm`: escribe EXACTO `RESTAURAR_STAGING` para proceder.
  - `drop_schema`: true/false (por defecto true).

Si `s3_key` va vacío, el workflow toma el **más reciente** del prefijo `S3_PREFIX`.

## 3) Script local (opcional)

```bash
export AWS_ACCESS_KEY_ID=... 
export AWS_SECRET_ACCESS_KEY=...
export AWS_REGION=...
export S3_BUCKET=...
export S3_PREFIX=mixtli/backups   # opcional
export DATABASE_URL_STAGING="postgres://..."
# opcional: export S3_KEY="mixtli/backups/backup-YYYYmmdd-HHMMSS.sql"
# opcional: export DROP_SCHEMA=true

bash db/restore-to-staging-from-s3.sh
```

## 4) Notas
- Se asume que los backups son **SQL plano** (`.sql`) generados con `pg_dump`.
- Si tienes seeds demo, ponlos en `db/seed.sql` para que el workflow los aplique al final (opcional).
- NO corre en PROD, sólo usa `DATABASE_URL_STAGING`.
