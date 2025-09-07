# Patch: Deshabilitar Redis (sin tocar el resto de la app)

Este parche reemplaza `apps/api/src/lib/redis.ts` por una versión **opcional/no-op**.
Si `REDIS_URL` **no** está definido, **no** se abre ninguna conexión y todas las utilidades de Redis
se convierten en no-op seguros.

## Cómo aplicar

1) Copia el archivo incluido en este zip a:
```
apps/api/src/lib/redis.ts
```

2) Asegúrate de **no** definir `REDIS_URL` en Render (borra la env var si existe).

3) Build/Start sugeridos en Render:
- Build:
```
bash -lc "node -e "const fs=require('fs');const p='apps/api/tsconfig.json';let j=JSON.parse(fs.readFileSync(p,'utf8'));j.compilerOptions=j.compilerOptions||{};j.compilerOptions.rootDir='src';j.include=['src'];j.exclude=['scripts','**/*.test.ts','**/*.spec.ts'];fs.writeFileSync(p,JSON.stringify(j,null,2));" && cd apps/api && if [ -f package-lock.json ]; then npm ci; else npm i; fi && npx prisma generate && npx --yes esbuild 'src/**/*.ts' --outbase=src --outdir=dist --platform=node --format=esm --sourcemap --tsconfig=tsconfig.json --log-level=info"
```

- Start:
```
bash -lc "cd apps/api && npx prisma migrate deploy && node dist/server.js"
```

> Si tu proyecto ya usa `tsc` en vez de `esbuild`, simplemente usa tus comandos normales.
> El punto clave es que **sin `REDIS_URL`** ya no habrá intentos a `127.0.0.1:6379`.

## Notas
- Mantiene compatibilidad con funciones que algunos módulos esperan (`getRedisUrl`, `tryRedisPing`, etc.).
- Usa `import('redis')` dinámico para que el paquete no sea obligatorio.
- Si en el futuro quieres reactivar Redis, solo agrega `REDIS_URL` y (opcionalmente) instala `redis`.
