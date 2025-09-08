Render scripts

1) Descomprime en la raíz de tu repo (debe quedar la carpeta `render/` con estos 2 archivos):
   - render/build.sh
   - render/start.sh

2) En Render → Settings → Build & Deploy:
   - Build Command: bash -lc "bash render/build.sh"
   - Start Command: bash -lc "bash render/start.sh"

Notas:
- Compila con esbuild (formato ESM) y genera Prisma Client.
- Elimina llamadas a Sentry.Handlers v7 en el JS compilado si aparecen.
- Si NO hay REDIS_URL, inyecta stubs para evitar ECONNREFUSED 127.0.0.1:6379.
