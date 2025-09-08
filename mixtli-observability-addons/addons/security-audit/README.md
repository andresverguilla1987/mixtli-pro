# Security & Audit Pack

Incluye middlewares para Express (JS/TS):
- **Helmet** con CSP, referrer policy, COOP/CORP.
- **Rate limit** con métrica `http_429_total` para Prometheus.
- **Audit logger** (POST/PUT/PATCH/DELETE) con etiquetas `userId`, `tenant`, `requestId` (ideal para Loki).

## Instalación
```bash
npm i helmet express-rate-limit prom-client
```
En tu servidor:
```js
const securityHeaders = require('./apps/api/security/js/middleware/helmet');
const makeLimiter = require('./apps/api/security/js/middleware/rateLimit');
const auditLogger = require('./apps/api/security/js/middleware/auditLogger');

app.use(securityHeaders());
app.use(makeLimiter());
app.use(auditLogger());
```
**Orden recomendado**: requestId → logger → securityHeaders → rateLimit → instrument(app) → rutas → auditLogger → Sentry handlers.
