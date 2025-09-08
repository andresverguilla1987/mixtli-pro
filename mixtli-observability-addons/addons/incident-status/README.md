# Incident Response & Status Page

Incluye:
- **Alertmanager** con rutas, inhibiciones y receptores de ejemplo (Slack/webhook).
- **Status Page** estática (HTML/JS) con `incidents.json`.
- Plantillas de **incidente** y **postmortem**.

## Uso
1) Copia `alertmanager/escalation.yml` como base para tus receptores reales (Slack/Telegram/email).
2) Publica `status-page/` como sitio estático (Netlify/GitHub Pages/tu dominio). Actualiza `incidents/incidents.json` durante incidentes.
3) Usa las plantillas en `docs/` para estandarizar la respuesta a incidentes.
