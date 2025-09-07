# Deploy en Render (Blueprint)

## 1) Conecta el repo
Sube este bundle a un repo GitHub y en Render selecciona **New → Blueprint** y apunta a `render.yaml`.

## 2) Variables **secretas** en Render
En **Environment** de cada servicio agrega:
- `JWT_SECRET` (string largo aleatorio)
- `SENDGRID_API_KEY` (si usarás correos)

`DATABASE_URL` y `REDIS_URL` se inyectan automáticamente desde los recursos administrados del blueprint.

## 3) Auto-migraciones y seed
El Dockerfile del API corre `prisma migrate deploy` al arrancar.
Para seed opcional:
```
render shell mixtli-api
pnpm seed
```

## 4) Healthcheck
Render verifica `/health`. Si falla, revisa logs del servicio.
