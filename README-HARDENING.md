# API Hardening Pack (CORS, Helmet, Logging, Rate-Limit)

Este ZIP agrega **middlewares seguros y de observabilidad** a tu API sin romper deploys existentes.

## Contenido
- `apps/api/src/middleware/logging.ts` — request-id + logs con Pino
- `apps/api/src/bootstrap/hardening.ts` — función `applyHardening(app)` con CORS, Helmet, body-parser, rate limit y logging
- `apps/api/src/health.example.ts` — `/salud` con chequeo de DB (opcional)
- `scripts/install-hardening-deps.sh` — instala dependencias
- `scripts/inject-hardening.sh` — inyecta import y llamada en `app.ts` (idempotente)

## Cómo aplicarlo (2 pasos)
1) **Instalar deps**  
```bash
bash scripts/install-hardening-deps.sh
```

2) **Inyectar en `app.ts`**  
```bash
bash scripts/inject-hardening.sh
```
- Si tu archivo no es `apps/api/src/app.ts`, edítalo manualmente y agrega:
  ```ts
  import { applyHardening } from './bootstrap/hardening';
  // después de: const app = express();
  applyHardening(app);
  ```

## Vars de entorno (Render → Environment)
- `LOG_LEVEL=info`
- `CORS_ORIGINS=https://tu-frontend.com,https://otra-url.com`
- `RATE_LIMIT_WINDOW_MS=60000`
- `RATE_LIMIT_MAX=120`

> Los cambios se activan en el **próximo deploy**. No toco tu start/build actuales.

## Nota
`health.example.ts` es una guía por si quieres que `/salud` chequeé la DB vía Prisma.
