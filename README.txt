Mixtli — CORS + Presign DIAGNOSTIC

1) Servir el front (no usar file://):
   npx serve -p 5173
   Abrir http://localhost:5173

2) Probar tu API real:
   - En el input "API Base", pon tu URL (p.ej. https://mixtli-pro.onrender.com)
   - En "Ruta presign", pon /presign o /api/uploads/presign (la que exista)
   - Da clic en "Probar preflight (OPTIONS)".
     Debe mostrar Access-Control-Allow-Origin y Allow-Methods.
   - Si el preflight da 0 o vacío, el navegador lo bloqueó por CORS.

3) Validación por curl (preflight simulado):
   curl -i -X OPTIONS https://mixtli-pro.onrender.com/presign      -H "Origin: http://localhost:5173"      -H "Access-Control-Request-Method: POST"      -H "Access-Control-Request-Headers: content-type"

   Esperado: 204 y cabeceras Access-Control-Allow-*. Si no aparecen, ajusta CORS en el API.

4) Si con curl ves las cabeceras pero el front falla, revisa la consola -> pestaña Network -> OPTIONS y POST.

5) Si usas Cloudflare R2, pon una sola CORS policy en el bucket con PUT/GET/HEAD y AllowedOrigins = tu Netlify + http://localhost:5173

