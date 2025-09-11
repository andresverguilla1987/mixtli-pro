# Mixtli — Frontend FIX (con fallback de Firebase)
Este build arregla el problema de botones “muertos” cuando abres el HTML sin configurar Firebase.

## Qué cambia
- `main.js` inicializa Firebase y si no hay llaves válidas, activa un **fallback** que muestra un alert claro en los modales.
- Ya no se queda congelado: te guía para configurar.

## Cómo usar
1) **Configura Firebase** (recomendado)
   - Crea proyecto → Authentication → habilita Email/Password.
   - Copia `apiKey`, `authDomain`, `projectId`, `appId` y ponlos en `main.js`.
   - (Opcional) agrega tu dominio a Authorized Domains en Firebase.
2) **Sirve el sitio por HTTP**
   - Local: `npx http-server -p 8080` y abre `http://127.0.0.1:8080/`
   - Netlify: sube estos 3 archivos tal cual.
3) **API**
   - Por defecto usa `https://mixtli-pro.onrender.com`.
   - Puedes pasar otra con `?api=https://tu-api.com`

Si todavía no pones llaves, podrás abrir el modal y verás un mensaje explicando qué falta en vez de que no pase nada.
