# DB Restore + Sanitización a STAGING

Este paquete agrega un workflow manual para **restaurar la base a STAGING desde S3** y (opcionalmente) **sanitizar PII** para que nadie toque datos reales.

## Archivos
- `.github/workflows/db-restore-and-sanitize-staging.yml` – Workflow manual
- `db/sanitize-staging.js` – Script Node.js (pattern-based) que enmascara correos, nombres, teléfonos, direcciones, tokens, IPs, etc.
- `db/sanitize-staging.sql` – SQL opcional con ejemplos específicos (ajústalo si aplica)
- `db/sanitize-local.sh` – Wrapper para correr sanitización local

## Secrets requeridos (GitHub → Settings → Secrets and variables → Actions)
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`
- `S3_BUCKET`
- `S3_PREFIX` (opcional; default `mixtli/backups`)
- `DATABASE_URL_STAGING` (cadena de conexión Postgres de STAGING)

## Inputs del workflow
- `s3_key` – S3 key del backup a restaurar (si lo dejas vacío, usa el **más reciente** del prefijo)
- `confirm` – Debe ser `RESTAURAR_STAGING`
- `drop_schema` – `true` por default; limpia schema `public` antes de restaurar
- `sanitize` – `true` por default; corre enmascarado masivo
- `safe_email_suffix` – por default `@mixtli.test`, cualquier email con este sufijo NO se toca
- `dry_run` – si `true`, imprime queries sin aplicar cambios (útil para revisar)

## Qué sanitiza (pattern-based)
- Columnas `email*` → `user_<id>@example.invalid` (si hay `id`) o random
- `first_name`/`last_name`/`name` → `"Test"`, `"User"` o `"Test User"`
- `phone|mobile|telefono` → `0000000000`
- `address|street|city|state|zip|postal|postcode` → `SANITIZED`
- `birth|dob` (date/timestamp) → `1990-01-01`
- `ssn|curp|rfc|dni|nss|tax|passport|national_id` → `NULL`
- `token|secret|api_key|apikey|access|refresh` → `NULL`
- `ip|device|fingerprint` → `0.0.0.0` (o texto `'0.0.0.0'`)

> Sólo aplica donde el **tipo de dato** lo permite (text/char/citext para strings, `date/timestamp` para fechas, `inet` para IPs).  
> Si existe columna `role`, omite filas con `role IN ('system','internal')`.

## Uso local
```bash
export DATABASE_URL_STAGING='postgres://...'
export SAFE_EMAIL_SUFFIX='@mixtli.test'   # opcional
export DRY_RUN=false                      # o true para simular
bash db/sanitize-local.sh
```

## Notas
- Si tienes tablas/columnas particulares, agrega reglas en `db/sanitize-staging.sql`.
- Si quieres **crear/forzar un usuario test** con contraseña conocida, dímelo y te agrego un paso seguro (sin exponer secretos).
