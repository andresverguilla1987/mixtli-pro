# Mixtli — Patch CORS + 50MB (Render)

Este paquete añade **CORS correcto con preflight** y **límite de archivo 50 MB** para tu backend en Render, sin reescribir tu proyecto.

## Archivos
- `cors-setup.js`: módulo con:
  - `applyCors(app)` → configura CORS robusto y JSON parser.
  - `createUploadMw()` → devuelve `multer` con límite de 50 MB.
  - `applyErrorHandler(app)` → maneja errores (incluye CORS).
- `.env.example`: ejemplo de `ALLOWED_ORIGINS`.

---

## Cómo integrar (paso a paso)
1. **Copiar** `cors-setup.js` a la raíz de tu repo (junto a `server.js`).
2. **Editar `server.js`** y añadir al comienzo:
   ```js
   import express from "express";
   import { applyCors, createUploadMw, applyErrorHandler } from "./cors-setup.js";

   const app = express();
   applyCors(app);
   ```

3. **Health (opcional pero recomendado)** en `server.js`:
   ```js
   app.get("/api/health", (req, res) => {
     res.json({
       ok: true,
       mode: "server-upload",
       version: "zip-50mb",
       time: new Date().toISOString(),
     });
   });
   ```

4. **Endpoint de subida**: usa el middleware de 50 MB en tus rutas que reciben archivos.
   ```js
   const upload = createUploadMw();

   app.post("/api/upload", upload.single("file"), async (req, res, next) => {
     try {
       // ... tu lógica existente (presign + subida a R2) ...
       res.json({ ok: true });
     } catch (err) {
       next(err);
     }
   });
   ```

5. **Manejo de errores** al final de `server.js` (después de tus rutas):
   ```js
   applyErrorHandler(app);
   ```

6. **Variables de entorno (Render → Settings → Environment → Add)**:
   ```
   ALLOWED_ORIGINS=https://lovely-bienenstitch-6344a1.netlify.app
   ```
   > Puedes poner varios dominios separados por coma. **Sin comillas ni slash final.**

7. **Redeploy manual** en Render. En los logs deberías ver:
   ```
   ALLOWED_ORIGINS = [ 'https://lovely-bienenstitch-6344a1.netlify.app' ]
   ```

8. **Pruebas**:
   ```bash
   curl -i https://mixtli-pro.onrender.com/api/health        -H "Origin: https://lovely-bienenstitch-6344a1.netlify.app"

   curl -i -X OPTIONS https://mixtli-pro.onrender.com/api/upload        -H "Origin: https://lovely-bienenstitch-6344a1.netlify.app"        -H "Access-Control-Request-Method: POST"        -H "Access-Control-Request-Headers: content-type,x-mixtli-token"
   ```

---

## Notas
- Con esto desaparece el error: **“CORS not allowed: …netlify.app”**.
- El tamaño máximo por archivo pasa a **50 MB** (ajústalo en `cors-setup.js` si quieres).
- Si sigues viendo “Failed to fetch”, revisa en la pestaña *Network* que el **preflight OPTIONS** responda `204` con los headers `Access-Control-Allow-*` correctos.
