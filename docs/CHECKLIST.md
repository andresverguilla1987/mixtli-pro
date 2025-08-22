
# ✅ Checklist de Verificación – Mixtli API (JWT + Roles)

## 1) Salud
**GET** `{{baseUrl}}/salud`  
**Esperado (200):**
```json
{ "ok": true }
```

## 2) Root
**GET** `{{baseUrl}}/`  
**Esperado (200):**
```json
{
  "mensaje": "🌮 Bienvenido a la API de Mixtli",
  "endpoints": {
    "salud": "/salud",
    "registro": "/api/auth/registro",
    "login": "/api/auth/login",
    "usuarios": "/api/users"
  }
}
```

## 3) Login admin (seed)
**POST** `{{baseUrl}}/api/auth/login`  
Body:
```json
{ "email": "admin@mixtli.local", "password": "Admin123*" }
```
**Esperado (200):**
```json
{
  "token": "eyJhbGciOi...",
  "user": { "id": 1, "email": "admin@mixtli.local", "name": "Administrador", "role": "ADMIN" }
}
```

## 4) Perfil propio
**GET** `{{baseUrl}}/api/users/me`  
Header: `Authorization: Bearer {{token}}`  
**Esperado (200):**
```json
{
  "id": 1,
  "email": "admin@mixtli.local",
  "name": "Administrador",
  "role": "ADMIN",
  "createdAt": "...",
  "updatedAt": "..."
}
```

## 5) Listar usuarios (ADMIN)
**GET** `{{baseUrl}}/api/users`  
Header: `Authorization: Bearer {{token}}`  
**Esperado (200):**
```json
[
  { "id": 1, "email": "admin@mixtli.local", "name": "Administrador", "role": "ADMIN" },
  { "id": 2, "email": "user@mixtli.local",  "name": "User One",      "role": "USER" }
]
```

## 6) Crear usuario (ADMIN)
**POST** `{{baseUrl}}/api/users`  
Header: `Authorization: Bearer {{token}}`  
Body:
```json
{ "name": "Juan Test", "email": "juan.test@mixtli.dev", "password": "Test123*" }
```
**Esperado (201):**
```json
{ "id": 3, "email": "juan.test@mixtli.dev", "name": "Juan Test", "role": "USER" }
```

## 7) Actualizar usuario (ADMIN)
**PUT** `{{baseUrl}}/api/users/{{userId}}`  
Header: `Authorization: Bearer {{token}}`  
Body:
```json
{ "name": "Juan Actualizado" }
```
**Esperado (200):**
```json
{ "id": 3, "email": "juan.test@mixtli.dev", "name": "Juan Actualizado", "role": "USER" }
```

## 8) Borrar usuario (ADMIN)
**DELETE** `{{baseUrl}}/api/users/{{userId}}`  
Header: `Authorization: Bearer {{token}}`  
**Esperado (200 ó 204):**
```json
{ "ok": true }
```

---

## ❌ Errores comunes
- 401 (sin token): `{ "error": "Token requerido" }`
- 401 (token inválido): `{ "error": "Token inválido" }`
- 403 (rol insuficiente): `{ "error": "No autorizado" }`
- 409 (email duplicado): `{ "error": "Email ya registrado" }`

---

## Tips Postman
- Variables de colección:
  - `baseUrl = https://<tu-app>.onrender.com`
  - `token` (se setea después de login)
  - `userId` (para update/delete)
- En Tests del request de Login:
```js
const data = pm.response.json();
if (data && data.token) { pm.collectionVariables.set("token", data.token); }
```
