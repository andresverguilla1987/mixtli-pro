
# Mixtli OAuth CLI (Node)

Cliente CLI de ejemplo que ejecuta **Auth Code + PKCE** contra tu API.

## Requisitos
- Node 18+
- API arriba (`make all`) y un `OAuthClient` semilla (`make seed`)

## Uso
```bash
cd cli-client-node
cp .env.sample .env
# Ajusta EMAIL/PASSWORD si quieres usar otro usuario
npm i
npm start
```

El script:
1. Hace login del usuario (demo) para obtener un Bearer.
2. Genera **PKCE**.
3. Llama a `POST /oauth/authorize` (con Bearer) para obtener **code**.
4. Intercambia en `POST /oauth/token`.
5. Intenta consumir `/api/admin/audit/events?limit=5` (requiere `audit:read`).

> Para un cliente completamente externo con UI de navegador, usa el **GET /oauth/authorize** (redirect) y completa login/consent en el navegador. Este CLI usa el flujo **POST** por practicidad y porque ya tienes login JSON en el API.
