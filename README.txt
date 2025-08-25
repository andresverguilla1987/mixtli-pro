
# MIXTLI package.json + package-lock.json

Incluye:
- package.json (con jsonwebtoken, bcryptjs, express, cors, @prisma/client)
- package-lock.json (para fijar versiones exactas)

## Cómo usar
1. Sube ambos archivos (`package.json`, `package-lock.json`) a la raíz del repo.
2. Commit en `main`.
3. En Render: Manual Deploy → Clear build cache & Deploy.

Esto asegura que Render instale exactamente esas versiones y evite errores.
