
# MIXTLI package.json drop-in

Este ZIP trae un `package.json` listo para Render.

## Qué hace
- Define `start`: `node server.js`
- Fija dependencias clave: express, cors, bcryptjs, @prisma/client
- Incluye `postinstall: prisma generate` (si tienes Prisma)

## Cómo usar
1. Sube **package.json** a la **raíz** del repo (junto a `server.js`).
2. Confirma el cambio en `main`.
3. En Render → botón **Manual Deploy** para redeploy.

Si el build fallara por conflictos de versiones, borra `package-lock.json` del repo para que Render instale fresco.
