# Mixtli OpenAPI + Seed de Admin

Este paquete incluye:
- `openapi.yaml` (OpenAPI 3.0 de auth/system).
- `prisma/seed.ts` para crear/actualizar un usuario **ADMIN** (PostgreSQL/Prisma).
- Alternativas: `scripts/seed-admin.mjs` (Mongo/Mongoose) y `sql/seed_admin_postgres.sql` (SQL puro).
- `examples/schema.example.prisma` como referencia (no sobreescribe tu schema).

## Rápido inicio (Prisma + Postgres)

1) Variables de entorno (`.env`):
```
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DB
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=S3gura#123
ADMIN_NAME=Admin
```

2) Instala dependencias:
```bash
npm i
```

3) (Si modificaste el schema) aplica migraciones:
```bash
npx prisma migrate deploy   # (o 'migrate dev' en local)
```

4) Corre el seed:
```bash
npm run seed
```

## Alternativa Mongo/Mongoose
Variables:
```
MONGO_URL=mongodb+srv://...
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=S3gura#123
ADMIN_NAME=Admin
```
Ejecuta:
```bash
node scripts/seed-admin.mjs
```

## SQL puro (PostgreSQL)
Ejecuta el archivo `sql/seed_admin_postgres.sql` en tu DB.
> Requiere extensión `pgcrypto` y ajustar nombres de tabla/campos si difieren.

## OpenAPI
El `openapi.yaml` está listo para importar en Swagger UI / Postman / Insomnia.
Si tus rutas reales no llevan `/api` (p. ej. `/auth/*`), haz un buscar/reemplazar.

## Nota
- `examples/schema.example.prisma` es solo referencia; no reemplaza tu `prisma/schema.prisma` existente.
- Si tu tabla/enum de roles difiere, ajusta `role: "ADMIN"` en los seeds.


## Docker Compose (Postgres + App + Swagger UI)

1. Arranca los servicios:
```bash
docker-compose up --build
```

2. Servicios disponibles:
- API: http://localhost:10000
- Swagger UI: http://localhost:8080
- Postgres: localhost:5432 (usuario: mixtli, pass: mixtli, db: mixtli)

## Docker + Swagger UI (local)

1) Instala Docker y Docker Compose.
2) Copia `infra/.env.docker` y ajusta lo que necesites.
3) Levanta Postgres + Adminer + Swagger UI:
```bash
make up
# Adminer: http://localhost:8080  (server: db, user: mixtli, pass: mixtli)
# Swagger: http://localhost:9000  (lee ./openapi.yaml)
```

4) Ejecuta migraciones y seed del admin (Node 18 dentro de un contenedor):
```bash
make seed
```

5) Apagar todo:
```bash
make down
```

> El servicio `seed` corre `npm ci`, `prisma generate`, `prisma migrate deploy` y `npm run seed` contra `DATABASE_URL` de `infra/.env.docker`.

### Notas
- El `swagger` monta `openapi.yaml` en caliente; cualquier cambio en el archivo se refleja al refrescar la página.
- Si ya tienes tu propio `schema.prisma`, reemplaza el que viene en `prisma/schema.prisma` y vuelve a correr `make seed`.
- Si quieres agregar tu app como contenedor, crea un servicio extra en `infra/docker-compose.yml` y conéctalo a la red `mixtli`.


## App (API) + Web PWA
- `make all` levanta **DB + Adminer + Swagger + API + Web**.
- Web PWA: http://localhost:5173 (consulta la API en http://localhost:10000)

## Móvil (iOS / Android / Huawei) - Capacitor (esqueleto)
Este repo no compila apps nativas aquí, pero puedes envolver la PWA con **Capacitor**:
1) En tu proyecto móvil (carpeta aparte), instala:
```bash
npm i -D @capacitor/cli
npm i @capacitor/core @capacitor/android @capacitor/ios
```
2) `capacitor.config.ts` ejemplo (sirviendo la PWA ya desplegada):
```ts
import { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {
  appId: 'com.mixtli.app',
  appName: 'Mixtli',
  webDir: 'dist', // apunta a tu build de PWA
  server: {
    url: 'http://10.0.2.2:5173', // Android emulador (o tu dominio en prod)
    cleartext: true
  }
};
export default config;
```
3) Android:
```bash
npx cap add android
npx cap sync android
npx cap open android   # abre Android Studio
```
4) iOS (macOS):
```bash
npx cap add ios
npx cap sync ios
npx cap open ios       # abre Xcode
```
5) **Huawei (AppGallery / HMS)**: usa el mismo build Android. Si requieres HMS Core (push, login), integra plugins HMS (placeholders) o usa Cordova/HMS kits según necesidades.

> Nota: Para producción, construye la PWA con tu framework favorito (Vite/React/etc.), apunta `server.url` a tu dominio HTTPS y configura CORS/JWT en la API (ya preparado).



## Reverse Proxy + HTTPS (Caddy)

Ya viene un servicio **Caddy** listo para producción con HTTPS automático de Let's Encrypt.

1) Edita `infra/Caddyfile` y pon tus dominios reales:
```
api.tudominio.com   -> proxy a servicio app (API)
app.tudominio.com   -> proxy a web PWA
swagger.tudominio.com -> Swagger UI
db.tudominio.com    -> Adminer (opcional)
```

2) Configura los DNS de esos dominios apuntando a tu servidor (A/AAAA records).

3) Levanta todo con Caddy incluido:
```bash
make all
cd infra && docker compose up -d caddy
```

4) Caddy pedirá certificados SSL/TLS de Let's Encrypt automáticamente y servirá tus servicios en HTTPS.

> **Nota**: Asegúrate de abrir puertos 80 y 443 en tu servidor/VPS.


## Reverse Proxy HTTPS (Caddy)

1) Apunta tus DNS:
   - `A` / `AAAA` de **api.tu-dominio.com** -> tu servidor
   - `A` / `AAAA` de **app.tu-dominio.com** -> tu servidor
   - `A` / `AAAA` de **swagger.tu-dominio.com** -> tu servidor
   - `A` / `AAAA` de **db.tu-dominio.com** -> tu servidor

2) Edita `infra/.env.docker`:
```
ACME_EMAIL=you@example.com
DOMAIN_API=api.tu-dominio.com
DOMAIN_WEB=app.tu-dominio.com
DOMAIN_SWAGGER=swagger.tu-dominio.com
DOMAIN_ADMINER=db.tu-dominio.com

# (Opcional) Protege Adminer con Basic Auth
# ADMINER_USER=admin
# ADMINER_PASS_BCRYPT=$2a$14$hash-generado-con-caddy
```
Genera hash bcrypt:
```bash
docker run --rm caddy caddy hash-password --plaintext 'tuPass'
```

3) Levanta proxy:
```bash
make caddy
```

- Accesos:
  - API → https://${DOMAIN_API}/api/health
  - Web → https://${DOMAIN_WEB}
  - Swagger → https://${DOMAIN_SWAGGER}
  - Adminer → https://${DOMAIN_ADMINER}


## CI/CD (GitHub Actions)

- Workflow en `.github/workflows/ci-cd.yml`.
- Jobs:
  - **build**: instala deps, genera Prisma, compila y corre tests con Postgres de servicio.
  - **docker**: si pasa build, hace push de imágenes `mixtli-app` y `mixtli-web` a DockerHub.
- Configura secretos en tu repo:
  - `DOCKER_USER`
  - `DOCKER_PASS`
- Deployment server:
```bash
git pull
docker compose pull
docker compose up -d
```


## Observabilidad y seguridad
- **Logs JSON** con `pino` (API): listos para centralizar (Loki/ELK).
- **Rate limiting** (100 req / 15min por IP, ajustable con `RATE_LIMIT_MAX`).
- **Helmet** activo para headers de seguridad.
- **Healthchecks** (`/live`, `/ready`) conectados a Docker healthchecks.

## CI (GitHub Actions)
- Workflow `ci` build & push imágenes a **GHCR**:
  - `ghcr.io/<owner>/mixtli-app:latest`
  - `ghcr.io/<owner>/mixtli-web:latest`
  - `ghcr.io/<owner>/mixtli-caddy:latest`
- Necesitas GHCR habilitado (usa el `GITHUB_TOKEN` por defecto).

## Deploy (workflow manual)
1) Guarda en *Secrets* de tu repo:
   - `SSH_USER`, `SSH_KEY` (PEM), `SSH_PORT` (p. ej., 22)
2) Ejecuta workflow **Deploy** (`workflow_dispatch`) con:
   - `host`: `tu-usuario@tu-servidor`
   - `path`: `/opt/mixtli` (por ejemplo)
3) El job hace:
   - `scp` de `infra/.env.docker`, `infra/docker-compose.yml` y `infra/caddy/Caddyfile`
   - `docker compose pull && up -d` en el server

> Puedes versionar `infra/` y mantener `.env.docker` en secrets o en tu servidor.



## IP Allowlist (Caddy)

### Adminer (por defecto solo LAN/localhost)
En `infra/caddy/Caddyfile` ya está activo un **allowlist**:
```caddyfile
@adminer_not_allowed not remote_ip 127.0.0.1/32 10.0.0.0/8 172.16.0.0/12 192.168.0.0/16
respond @adminer_not_allowed 403
```
- Si quieres entrar desde **tu IP pública** agrega tu /32, por ejemplo:
  `203.0.113.25/32`
- También puedes proteger con **Basic Auth** activando las variables en `.env.docker` y descomentando el bloque `basicauth` del host de Adminer.

### API (opcional)
En el host de la **API** dejé un bloque comentado para restringir por IP:
```caddyfile
# @api_not_allowed not remote_ip 203.0.113.25/32  # agrega tus CIDRs
# respond @api_not_allowed 403
```
Descomenta y ajusta los CIDRs si quieres que la API solo responda a ciertas IPs/redes.
