# Mixtli DB Safety Kit — PLUS (S3 + Restore Manual)

Este kit agrega **subida a S3** y un **workflow manual de restauración** a lo ya básico
(backups nocturnos, snapshot local, seed de demo). Úsalo para no sufrir en demo. 😅

## Contenido
- `.github/workflows/db-nightly-backup.yml` → Backup diario 03:15 MX (09:15 UTC), sube a **S3** y guarda **artifact**.
- `.github/workflows/db-restore-manual.yml` → Restauración manual desde **S3** (elige último o uno específico).
- `db/snapshot.sh` → Snapshot local con `pg_dump` (a `snapshots/`).
- `db/restore-from-s3.sh` → Restaura localmente desde un objeto S3.
- `db/seed.sql` → Plantilla para dejar la BD en estado “demo” en 1 comando.

## Secrets/Variables necesarios (GitHub → Settings → Secrets and variables → Actions)
**Obligatorio:**
- `DATABASE_URL` → cadena completa de conexión Postgres (Render).

**Para S3 (obligatorio si quieres subir/descargar de S3):**
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION` (ej. `us-east-1`)
- `S3_BUCKET` → **solo el nombre del bucket** (ej. `mixtli-prod-backups`)
- (opcional) `S3_PREFIX` → prefijo dentro del bucket (default: `mixtli/backups`)

**Opcional (Slack):**
- `SLACK_WEBHOOK_URL` → si quieres notificaciones.

## Instalar
1. Copia todo a la **raíz de tu repo** y haz commit.
2. Crea los `Secrets` anteriores en GitHub.
3. Verifica que tu runner tenga `psql` (el workflow lo instala).

## Uso
### Backup nocturno
Se ejecuta solo a las 03:15 **America/Mexico_City** (09:15 UTC).
También puedes dispararlo manualmente en **Actions → DB Nightly Backup → Run workflow**.

### Restauración manual (desde S3)
1. Ve a **Actions → DB Restore (Manual)** → **Run workflow**.
2. Si quieres la **más reciente**, deja `s3_key` vacío.
3. Si quieres una en particular, llena `s3_key` (ej. `mixtli/backups/backup-20250907-091500.sql`).

> **Nota:** El workflow de restore usa `psql` contra `DATABASE_URL`. Asegúrate que ese usuario tenga permisos.

## Local (opcional)
- Crear snapshot local:
```bash
bash db/snapshot.sh
```
- Restaurar local desde S3 (necesitas `awscli` y `psql`):
```bash
bash db/restore-from-s3.sh s3://$S3_BUCKET/$S3_PREFIX/backup-YYYYmmdd-HHMMSS.sql
```

---
Última actualización: 2025-09-08T01:32:56.364827Z
