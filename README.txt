# Mixtli — Landing con **Prueba Gratis** (Netlify Forms)
Generado: 2025-09-07 02:50

Esta versión viene con:
- Botón **“Probar gratis”** enlazado a `/trial.html`
- Formulario **Netlify Forms** que captura leads (nombre, email, uso previsto)
- Redirección automática a `/gracias.html` tras enviar
- Protección `honeypot` anti‑spam
- `netlify.toml` listo (no requiere build)

## Publicar
1) Entra a app.netlify.com → **Add new site** → **Deploy manually**.
2) Arrastra **`mixtli-landing-trial-netlify.zip`** (o extrae y arrastra la carpeta).
3) Ve a **Forms** en Netlify para ver envíos. Activa notificaciones por email/Slack si quieres.

## Webhooks / Automatización
- En Netlify → **Forms** → `trial` → **Notifications** → **Outgoing webhooks**.
- Ahí pones tu URL (ej. Zapier/Make) para crear cuentas de prueba automáticamente.

## Personalizar
- Cambia links en `index.html` (objeto `links`).
- Textos del form en `trial.html`.
