# Mixtli Hotfix PR Kit

Este paquete trae:
- Archivos corregidos listos para copiar/pegar.
- Un parche `mixtli-hotfix.patch` para aplicar con `git apply`.
- Pasos claros para abrir un Pull Request en tu repo.

## Opción A — Copiar archivos (seguro y rápido)
En la raíz de tu repo, reemplaza/crea estos archivos:
- `server.js`
- `prisma/schema.prisma`  (solo si quieres alinear el modelo; no borra datos)
- `src/rutas/users.js`
- `src/rutas/uploads.js`  (expuestos; responden 501 si S3 no está configurado)

Luego:
```bash
npm install
npx prisma generate
npx prisma db push
git checkout -b hotfix/prisma-select-root-uploads
git add server.js prisma/schema.prisma src/rutas/users.js src/rutas/uploads.js
git commit -m "hotfix: prisma select, ruta / y endpoints uploads (501 si sin S3)"
git push -u origin hotfix/prisma-select-root-uploads
# Abre PR en GitHub
```

## Opción B — Aplicar parche
1) Copia `mixtli-hotfix.patch` a la raíz de tu repo y ejecuta:
```bash
git checkout -b hotfix/prisma-select-root-uploads
git apply --whitespace=fix mixtli-hotfix.patch
npm install
npx prisma generate
npx prisma db push
git add -A
git commit -m "hotfix: prisma select, ruta / y endpoints uploads (501 si sin S3)"
git push -u origin hotfix/prisma-select-root-uploads
```
2) Abre el Pull Request desde GitHub: compara la rama `hotfix/prisma-select-root-uploads` contra `main`.

## Post-deploy checklist (Render)
- Variables mínimas: `DATABASE_URL`, `PORT=10000`, `NODE_ENV=production`, `JWT_SECRET`.
- (Opcional) `S3_*` para habilitar uploads reales, si no verás 501 (no 404).
- Pruebas:
  - `GET /` → 200 con objeto informativo.
  - `GET /salud` → 200 `{ ok: true }`
  - `POST /api/users` → 201 con `{ id, correo }`
  - `GET /api/users` → 200
  - `POST /api/uploads/multipart/init` → 501 claro si no hay S3

## Nota
Si tu modelo de `Usuario` ya tenía otros campos, este hotfix no los toca. El `schema.prisma` incluido no elimina datos; al hacer `prisma db push` no se borran columnas existentes en la base.
