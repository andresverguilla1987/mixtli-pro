# Mixtli – DB Safety Kit (Backups + Restore + Seed)

Este kit te da lo **indispensable** para demo y operación básica:
- **Backups nocturnos** con GitHub Actions (artefacto descargable).
- **Snapshot manual** con `pg_dump` y **restore** con `psql`.
- **Seed de demo** (plantilla) para dejar la BD “lista para pitch” en 1 comando.
- **Alertas opcionales a Slack** cuando el backup corre.

> Requisitos:
> - Variable secreta en GitHub: `DATABASE_URL` (Postgres de Render).
> - (Opcional) `SLACK_WEBHOOK_URL` si quieres notificaciones del backup.
> - Runners de GitHub ya traen `pg_dump`/`psql` preinstalados.

## 1) Instalar
Copia el contenido de este ZIP a la raíz del repo y haz commit/push.
Luego en GitHub ve a **Settings → Secrets and variables → Actions** y crea:

- `DATABASE_URL` → tu cadena completa de conexión Postgres.
- (Opcional) `SLACK_WEBHOOK_URL` → webhook de Slack para alertas.

## 2) Backups nocturnos (automático)
El workflow `db-nightly-backup.yml` corre **todos los días a las 03:15 America/Mexico_City**.
Guarda el `.sql` como artefacto del run.

Para lanzarlo manual: Actions → *DB Nightly Backup* → **Run workflow**.

## 3) Snapshot/Restore manual (local o en Render Shell)
```bash
# Snapshot
bash db/snapshot.sh

# Restore desde archivo
bash db/restore.sh snapshots/2025-09-08-0315.sql
```

> Si quieres snapshot de “estado-de-demo” y poder restaurarlo rápido durante la demo:
> 1) Deja tu app con los datos como quieres mostrarlos.
> 2) `bash db/snapshot.sh` → se crea `snapshots/YYYYmmdd-HHMM.sql`
> 3) Si algo se altera, ejecuta `bash db/restore.sh <archivo.sql>` y listo.

## 4) Seed de Demo
Edita `db/seed.sql` con inserts mínimos para tu pitch. Luego:
```bash
bash db/restore.sh db/seed.sql
```
Tip: Puedes generar `seed.sql` a partir de un snapshot y **sanitizar** datos sensibles (borra PII, cambia correos por `demo+<id>@example.com`, etc.).

## 5) Alertas de backup (opcional)
Si defines `SLACK_WEBHOOK_URL`, el workflow postea al terminar (ok/error).

---

### Notas
- **No** borra artefactos viejos automáticamente. Ajusta retention en GitHub si lo necesitas.
- Para S3/GCS, agrega un paso adicional al workflow (aws s3 cp / gsutil cp) con credenciales.
- Los scripts utilizan `DATABASE_URL` del entorno; en local usa un `.env` y `export $(cat .env | xargs)`.
