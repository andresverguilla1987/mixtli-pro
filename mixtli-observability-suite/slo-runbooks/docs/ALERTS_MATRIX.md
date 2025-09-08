# Matriz de Alertas

| Alerta                      | Severidad | Acciones clave                                 |
|----------------------------|-----------|-----------------------------------------------|
| APIHighErrorRate           | warning   | Inspeccionar logs + rutas con 5xx              |
| HighLatency95p             | warning   | Revisar DB/IO/red; optimizar consultas         |
| InstanceDown               | critical  | Ver healthcheck, escalamiento, red             |
| SLOErrorBudgetBurnFast     | critical  | Rollback/feature flag, comunicación incidente  |
| SLOErrorBudgetBurnMedium   | warning   | Optimización y seguimiento                     |
| HighLatencyP95Sustained    | warning   | Perf tuning, caching, revisar dependencias     |
