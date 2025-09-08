# Runbooks — Mixtli API

## SLOErrorBudgetBurnFast (critical)
**Contexto**: Error ratio muy por encima del SLO (picos).  
**Acciones** (en orden):
1. Ver Grafana dashboard "Mixtli API - HTTP Overview". Checa panel de "Tráfico por código" y rutas top 5xx.
2. Revisa despliegue reciente: cambios en dependencias, timeouts, conexión DB.
3. En logs (Loki), filtra por `level:error` y `requestId`. Busca patrones: `ECONNRESET`, `ETIMEDOUT`, `Prisma` errores.
4. Aplica **rollback** o **feature flag** si el cambio es reciente.
5. Si afecta a un solo endpoint, aplica rate limit temporal o desactiva features que lo gatillan.
6. Documenta el incidente (causa raíz preliminar) y comunica estado.

## SLOErrorBudgetBurnMedium (warning)
**Contexto**: Degradación sostenida, menos agresiva.  
**Acciones**:
1. Revisa latencias p95/p99 por ruta: ¿hay hotspots?
2. Checa **DB**: conexiones, locks, índices, queries pesadas.
3. Observa dependencia externas (webhooks, correos, S3).

## HighLatencyP95Sustained (warning)
**Contexto**: p95 > 500ms por más de 20m.  
**Acciones**:
1. Verifica uso de CPU/RAM en servidor y base de datos.
2. Aumenta límites de conexión o pool en Prisma si aplica.
3. Cachea respuestas o activa compresión si son payloads grandes.
