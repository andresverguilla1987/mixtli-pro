
# 🗺️ ROADMAP – Mixtli

## Fase 0 — Estado actual (✅)
- API Node/Express + Prisma + PostgreSQL en Render
- Auth con JWT + roles (ADMIN/USER)
- CRUD de usuarios protegido
- Seeds + scripts de verificación (smoke test)
- Documentos: CHECKLIST y MANTENIMIENTO

## Fase 1 — Producto Mínimo Viable (2–3 semanas)
1) **Subida de archivos (backend)**
   - Endpoint `/files/upload` (tamaño máx. por env, ej. 2GB)
   - Almacenar metadatos (nombre, tamaño, tipo, ownerId, hash)
   - Guardar en almacenamiento externo (ej. S3/Backblaze)
2) **Descarga con link temporal**
   - Endpoint `/files/:id/download`
   - URLs firmadas con expiración (15 min – 24 h)
3) **Cuotas y límites**
   - Límite de tamaño por archivo y por usuario/mes
   - Contador y reset mensual (cron)
4) **Front simple (landing + upload)**
   - React/Vite/Next → form de subida, progreso, resultado con link
5) **Registro/Login en frontend**
   - Guardar token en memory/localStorage
   - Cerrar sesión; refrescar token (rotación simple)

## Fase 2 — Seguridad y calidad (2–4 semanas)
1) **Cifrado en reposo**
   - Lado servidor (KMS/clave por archivo) o client-side (opcional)
2) **Escaneo antivirus**
   - ClamAV/Lambda/Workers según proveedor de storage
3) **Logging y auditoría**
   - Accesos a descargas, intentos fallidos, métricas básicas
4) **Plan de pruebas**
   - Postman e2e + tests automáticos (Vitest/Jest)
5) **Observabilidad**
   - Health checks y alertas (uptime robot)
   - Dashboards simples (trafico, errores, tiempo de respuesta)

## Fase 3 — Monetización (2–3 semanas)
1) **Planes**
   - Free (2 GB, links 24h), Pro (20–50 GB, links 7 días), Team
2) **Pagos**
   - Stripe (suscripción mensual/anual), Webhooks, roles PRO
3) **Límites por plan**
   - Storage total, tamaño por archivo, expiración de links
4) **Facturación**
   - Recibos, historial de pagos, cancelación/upgrade

## Fase 4 — Experiencia tipo WeTransfer (3–6 semanas)
1) **Envío por correo con mensaje**
   - Generar link + enviar email al destinatario
2) **Carpetas / multiarchivo**
   - Zipeado server-side; reintentos
3) **Páginas de descarga personalizadas**
   - Branding, vista previa de imágenes/video
4) **Historial**
   - Mis archivos, enlaces activos, expirados, reenvío
5) **Borrado automático**
   - Retención por días (configurable por plan)

## Técnica (infra y devops)
- **Storage**: S3/Backblaze, URLs firmadas, política de expiración
- **Jobs**: limpieza de expirados, reset de cuotas, emails → usar cron/queues
- **Entorno**: separar `prod` y `staging`
- **Seguridad**: rotate JWT_SECRET, CORS restrictivo, headers seguros
- **Backups**: automáticos en DB y versionado de archivos críticos

## Hitos de aceptación
- MVP: subir/descargar con link temporal + límites básicos
- Seguridad: AV + logs + pruebas
- Monetización: planes y pagos con límites aplicados
- Experiencia: email + multiarchivo + historial
