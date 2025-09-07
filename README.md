# Mixtli – Hotfix ZIP (Root OK + Safe Redis)

Este ZIP agrega:
1. **`apps/api/src/health.ts`** – Rutas `/` (GET/HEAD) y `/health` que devuelven 200.
2. **`apps/api/src/lib/redis.ts`** – Implementación *safe* que funciona aunque `REDIS_URL` no exista o rechace conexión.
3. **`apps/api/src/types/shims.d.ts`** – Shims simples de tipos para evitar ruidos en compilación.

## Cómo integrarlo (sin tocar tus comandos de build/start)

1. **Descomprime** en la raíz del repo (se fusiona con `apps/api/src/...`).  
   Si el sistema te pregunta, acepta **reemplazar** `apps/api/src/lib/redis.ts`.

2. **Abre** `apps/api/src/app.ts` y agrega estas dos líneas (arriba y luego después de crear `app`):
   ```ts
   import rootHealth from './health';
   // ...luego de `const app = express()` y middlewares:
   app.use('/', rootHealth);
   ```

   > No rompe nada de tus rutas existentes; solo devuelve `200 ok` en `/` y `/health`.

3. **Variables en Render:**
   - Si no usas Redis ahora, **elimina `REDIS_URL`** o déjala vacía. Con este archivo igual **no falla** si existe.
   - (Opcional) Configura el Health Check Path en Render a **`/health`**.

4. **Deploy** como siempre (no cambies tus comandos).

## Verificación rápida
```bash
curl -i https://TU-DOMINIO/       # Debe responder 200 ok
curl -i https://TU-DOMINIO/health # Debe responder {"status":"ok"}
```

---
Si quieres que el ZIP inserte automáticamente `app.use('/', rootHealth)`, dímelo y te preparo una variante con un pequeño script de parcheo que corre en `postinstall`.
