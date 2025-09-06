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


## Allow/Deny a nivel API (Express)
- **TRUST_PROXY=true**: respeta `X-Forwarded-For` (requerido detrás de Caddy).
- **Global**:
  - `IP_ALLOWLIST`: CSV de IPs o CIDRs que **sí** pasan (si se define, los demás quedan fuera).
  - `IP_DENYLIST`: CSV de IPs o CIDRs **bloqueadas** (prioridad sobre allow).
- **Auth** (`/api/auth/*`):
  - `IP_ALLOWLIST_AUTH` y `IP_DENYLIST_AUTH` aplican **además** de los globales.

> Soporta IPv4 exacto (`203.0.113.25`) y CIDR (`203.0.113.0/24`). Para IPv6, se puede integrar luego con `ipaddr.js` o `cidr-matcher`.


## JWT con `iss`/`aud` y JWKS
- Firma con **KID** activo (`JWT_ACTIVE_KID`) y expositor **JWKS** en `/.well-known/jwks.json`.
- Reemplaza las llaves de `app/keys/*` por tus llaves reales:
  - `dev-rs256-k1.private.pem` (PKCS8) y su `public.pem`
  - Añade nuevos `KID`s y cambia `JWT_ACTIVE_KID` para **rotar**.
- Si no configuras llaves, usa fallback **HS256** con `JWT_SECRET` (no recomendado en prod).

## CSRF (doble cookie)
- Actívalo con `CSRF_ENABLED=true`.
- Obtén token en `GET /api/csrf` (setea cookie `csrf` y devuelve el valor).
- Envía el mismo token en header **`X-CSRF-Token`** en `POST/PUT/PATCH/DELETE`.

## Filtro de User-Agent
- Ajusta regex en `UA_ALLOW_RE` y `UA_DENY_RE`. Por ejemplo:
  - Bloquear curl: `UA_DENY_RE=^curl/.*`
  - Permitir sólo navegadores: `UA_ALLOW_RE=Mozilla|Chrome|Safari|Edg`


## Rotación de llaves (CLI + CI)
### CLI local
Genera un nuevo par RSA y actualiza `JWT_ACTIVE_KID` en `.env.example`:
```bash
cd app
npm i
npm run keygen                  # usa KID por timestamp y prefijo 'rs256'
# o personalizado:
KID_PREFIX=mykid KID=mykid-001 npm run keygen
```

Llaves en `app/keys/<KID>.private.pem` y `app/keys/<KID>.public.pem`.
El **manifest.json** mantiene un inventario de claves públicas expuestas en JWKS.

### GitHub Actions
Workflow `rotate-keys.yml`:
- **Schedule** mensual (`cron`) o **manual** via `workflow_dispatch`.
- Crea una rama `chore/rotate-keys-<run_id>` con llaves nuevas y abre **PR**.
- Tras merge a `main`, tu `/.well-known/jwks.json` expondrá el nuevo `KID` (no olvides desplegar).

> Nota: Los privados viven en el repo para demo. En producción, guarda **private.pem** en un **secret manager** (AWS KMS, GCP KMS, Vault) y solo versiona la parte pública/manifest.


## OpenID Connect Discovery
La API expone `/.well-known/openid-configuration` para clientes OIDC/OAuth2.

Ejemplo (si `JWT_ISS=https://idp.mixtli.com`):
```json
{
  "issuer": "https://idp.mixtli.com",
  "authorization_endpoint": "https://idp.mixtli.com/api/auth/login",
  "token_endpoint": "https://idp.mixtli.com/api/auth/login",
  "jwks_uri": "https://idp.mixtli.com/.well-known/jwks.json",
  "response_types_supported": ["code","token","id_token"],
  "subject_types_supported": ["public"],
  "id_token_signing_alg_values_supported": ["RS256","HS256"],
  "scopes_supported": ["openid","profile","email"],
  "token_endpoint_auth_methods_supported": ["client_secret_basic","client_secret_post"],
  "claims_supported": ["sub","email","name","iat","exp"]
}
```

Esto permite que clientes estándar (OAuth2/OIDC) se configuren automáticamente usando la URL del issuer.


## OAuth2 Authorization Code + PKCE (mínimo viable)
- Endpoints:
  - `POST /oauth/authorize` → devuelve `{ code }` (requiere Bearer token del usuario ya logueado)
  - `POST /oauth/token` con `grant_type=authorization_code`, `code_verifier`, `client_id`, `redirect_uri`
- Variables:
  - `OAUTH_CLIENT_ID`, `OAUTH_CLIENT_SECRET` (si `OAUTH_PUBLIC_CLIENT=false`), `OAUTH_REDIRECT_URIS` (CSV)
- Flujo:
  1. App hace `POST /api/auth/login` ⇒ obtiene **access token** de usuario
  2. App genera PKCE (`code_verifier`, `code_challenge` = SHA256 base64url)
  3. `POST /oauth/authorize` con `response_type=code`, `client_id`, `redirect_uri`, `code_challenge`, `code_challenge_method=S256` (Bearer en headers)
  4. `POST /oauth/token` con `grant_type=authorization_code`, `code`, `code_verifier`, `client_id`, `redirect_uri`  ⇒ tokens

> **Demo** guarda codes en memoria (5 min). Para producción, persistir en DB y agregar consentimiento/UI.


## Webclient (React + Vite) con PKCE
- Carpeta: `webclient/`
- Variables (`.env`):
  ```
  VITE_API_URL=http://localhost:10000
  VITE_CLIENT_ID=mixtli-web
  VITE_REDIRECT_URI=http://localhost:5174/callback
  ```
- Docker:
  ```bash
  make up && make app
  cd infra && docker compose --env-file ./.env.docker up --build -d webclient
  # Abrir: http://localhost:5174
  ```
- Asegúrate de incluir `http://localhost:5174/callback` en `OAUTH_REDIRECT_URIS` del API.


### Consentimiento + Redirect (demo)
- Se añadió `GET /oauth/authorize` con **página de consentimiento** simple.
- Para demo, el backend acepta `?access_token=` en la URL para identificar al usuario (ya logueado). **No usar así en producción**; en prod usar **sesión** (cookie HttpOnly) y UI de login/consent real.
- Tras aprobar, redirige a `redirect_uri?code=...&state=...`.


## OAuth con persistencia (Prisma + Postgres)
Ahora `/oauth/authorize` y `/oauth/token` usan tablas **Prisma**:
- `OAuthClient` (clientes, redirect URIs, público/privado)
- `OAuthConsent` (consentimientos por usuario/cliente)
- `OAuthCode` (authorization codes con PKCE y expiración)

### Migraciones
```bash
# local
npx prisma migrate dev -n "oauth_persistence"

# en Docker (servicio seed ya hace migrate deploy)
make seed
```

### Seed de cliente
El seed crea/actualiza un **client** con:
- `OAUTH_CLIENT_ID`, `OAUTH_CLIENT_SECRET` (si `publicClient=false`)
- `OAUTH_REDIRECT_URIS` (CSV)
- `OAUTH_PUBLIC_CLIENT` (true/false)
Ajusta estas variables en `infra/.env.docker` o `.env` antes de correr `make seed`.


## Gestión de sesiones y revocación
### Endpoints de usuario
- `GET /api/sessions` → lista sesiones (sid, IP, UA, created/expires, revoked)
- `POST /api/sessions/revoke` `{ sid }` → revoca una sesión propia
- `POST /api/sessions/revoke_all` → revoca todas menos la actual

### Endpoints admin
- `POST /api/admin/refresh/revoke` `{ userId, clientId? }` → revoca *todos* los refresh tokens de un usuario (opcionalmente sólo de `clientId`)

> Requiere `role=ADMIN` (el seed ya crea un admin).

### Migración
```bash
npx prisma migrate dev -n "sessions_ip_ua"
# o: make seed
```

### Consent UI
- UI con **tema claro/oscuro**, badges de scopes y botones estilizados.


## Admin Panel (webclient)
- En el `webclient`, pestaña **Admin**:
  - Pega un **access token de un usuario ADMIN** (usa el admin del seed).
  - Lista **Sesiones** por `userId` y **Refresh Tokens** por `userId`/`clientId`.
  - Botones para **revocar** sesiones y refresh tokens.
- Rate limit de admin: `RATE_LIMIT_ADMIN_PER_MIN` (default 30 req/min).


## Admin Panel: búsqueda y selección
- **Buscar usuario** por email o ID: usa `GET /api/admin/users/search?q=...` (requiere ADMIN).
- **Selector de clientes OAuth**: `GET /api/admin/oauth/clients` y el panel llena el dropdown; puedes filtrar refresh tokens por `clientId` con un clic.
