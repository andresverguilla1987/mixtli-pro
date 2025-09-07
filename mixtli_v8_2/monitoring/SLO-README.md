# SLOs (99.9% disponibilidad)

- **SLI**: 1 - (5xx / total) basado en `http_requests_total`.
- **SLO**: 99.9% mensual.
- **Burn rate**:
  - Fast burn: ventana 5m, umbral `(1 - SLO) * 14.4` → alerta crítica rápida.
  - Slow burn: ventana 1h, umbral `(1 - SLO) * 6` → alerta sostenida.

Ajusta los coeficientes según tus prácticas (Google SRE multi-windows).
