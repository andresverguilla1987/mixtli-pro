# Demo sin BD (fallback) + CORS

## ¿Qué soluciona?
- Evita errores de Prisma/DB durante la demo.
- Activa CORS para que la página hosted pueda llamar a la API.
- Mantiene todas las funciones: QR, enable 2FA, backup codes, PDF y eventos (con DRY).

## Archivos del patch (ubicación en tu repo)
- `notifications/src/lib/store.js` (nuevo)
- `notifications/src/routes/security.js` (reemplazo, ahora usa store)
- `server.demo.js` (root opcional, listo con CORS + store)

## Cómo aplicarlo
1) Copia `notifications/src/lib/store.js` al proyecto.
2) Reemplaza `notifications/src/routes/security.js` por el de este patch.
3) (Opcional, recomendado en Render) Copia `server.demo.js` a la raíz y en Render usa:
   - **Start Command**: `node server.demo.js`
   - **Build Command**: deja el que ya tienes, no depende de Prisma.
4) Redeploy. Prueba:
   - `GET /` → JSON ok
   - Página hosted → Ping / QR / Enable / Login / Mail Log

## Notas
- Este modo usa almacenamiento **en memoria** para la demo. No persiste tras reiniciar.
- Para prod, vuelve al server normal y Prisma.
