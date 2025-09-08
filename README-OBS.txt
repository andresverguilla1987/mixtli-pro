Mixtli Observability Kit (métricas + smoke CI + backup DB)
=========================================================

Qué incluye
- apps/api/src/metrics.ts  -> /metrics y latencias con prom-client
- scripts/apply-metrics.sh -> Parchea apps/api/src/app.ts automáticamente
- .github/workflows/smoke.yml -> Ejecuta colección Postman cada push y cada hora
- .github/workflows/backup-db.yml -> pg_dump diario 06:00 UTC (usa secret DATABASE_URL)
- postman/mixtli-demo.postman_collection.json -> Ejemplo base_url + /salud + /metrics

Cómo usar rápido (local o en CI)
1) Descomprime en el root del monorepo (donde está la carpeta apps/)
2) Ejecuta el script de aplicación:
   REPO_ROOT=. bash scripts/apply-metrics.sh
3) Haz commit de los cambios (incluyendo workflows y metrics.ts)
4) Deploy a Render. Prueba:
   curl https://tu-url.onrender.com/metrics

Notas
- El script intenta no duplicar imports ni rutas.
- Si tu app de Express no se llama "app" o no usas "const app = express();",
  se usa un fallback que añade el middleware al final del archivo.
- Para los backups, define en GitHub Secrets: DATABASE_URL con tu cadena de Render.
