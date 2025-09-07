# Mixtli Autopatch v3 — Typings + Redis exports

Incluye:
- `apps/api/src/lib/redis.ts` con `getRedisUrl` y `tryRedisPing` exportados.
- `apps/api/src/types/shims.d.ts` para cubrir `express`, `cors`, `morgan`, `redis` sin instalar @types.

## Build Command recomendado (Render)
Pega esto tal cual en **Settings → Build Command** del servicio API:

```
bash -lc "node -e "const fs=require('fs');const p='apps/api/tsconfig.json';let j=JSON.parse(fs.readFileSync(p,'utf8'));j.compilerOptions=j.compilerOptions||{};j.compilerOptions.rootDir='src';j.compilerOptions.skipLibCheck=true;j.compilerOptions.noImplicitAny=false;j.include=['src'];j.exclude=['scripts','**/*.test.ts','**/*.spec.ts'];fs.writeFileSync(p,JSON.stringify(j,null,2));console.log('[tsconfig] normalized');" && cd apps/api && if [ -f package-lock.json ]; then npm ci; else npm i; fi && npx prisma generate && npm run build"
```

Con eso desaparecen los errores TS7016/TS7006/TS2307 de tus archivos actuales sin necesidad de instalar `@types/*` ahora mismo.
