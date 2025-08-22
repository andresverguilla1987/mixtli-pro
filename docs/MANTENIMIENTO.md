
# 🛠️ Checklist de Mantenimiento – Mixtli API

## 🔐 Seguridad
- **JWT_SECRET**
  - Debe ser largo (mínimo 32 caracteres) y único.
  - Rotar cada 6 meses aprox. → cuando cambies el secreto, todos los tokens activos dejan de servir (obligar a relogin).
- **Passwords en DB**
  - Se guardan encriptados con bcrypt.
  - Nunca guardar contraseñas en texto plano.

## 💾 Base de datos
- **Backups**
  - Render Postgres (plan Starter+) permite backups automáticos.
  - En Free haz dumps manuales: `pg_dump $DATABASE_URL > backup.sql`
- **Monitorear tamaño**
  - Plan Free tiene límite de espacio. Si crece mucho, pasar a Starter.

## 📊 Logs
- Revisar logs en Render cada semana para detectar errores.
- Configurar **Health Check** en Render (`/salud`) para reinicios automáticos.

## ⚡ Performance
- Free plan de Render puede "dormirse".
- Plan Starter ($7/mes) mantiene el servicio más estable y rápido.

## 📦 Dependencias
- Cada 1–2 meses:
  ```bash
  npm outdated
  npm update
  ```
- Mantener librerías seguras y actualizadas.

## 👥 Usuarios y roles
- Mantener solo 1 usuario ADMIN real.
- Crear todos los demás como USER.
- Revisar con `/api/users` que no haya admins de más.

## 🚨 Emergencias
1. Revisar logs en Render.
2. Verificar `DATABASE_URL`, `JWT_SECRET`, `PORT`.
3. Correr `npm run seed` si falta el usuario admin.
