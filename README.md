# Netlify proxy para Mixtli

Evita CORS desde el front: cualquier request a `/api/*` se **proxy** a tu backend,
así el navegador cree que todo viene del mismo dominio de Netlify.

## Archivos
- `netlify.toml` — regla oficial de Netlify (recomendado)
- `_redirects` — alternativa equivalente (por si prefieres este formato)

## Uso
1. Copia `netlify.toml` (o `_redirects`) a la **raíz** de tu sitio estático (donde está tu `index.html`).
2. En tu front deja las llamadas como `/api/...` (sin dominio).
3. Despliega a Netlify.  
   - Netlify enviará `/api/*` → `https://mixtli-pro.onrender.com/api/:splat`

> Si tu API vive en otro dominio, **cambia** esa URL en ambos archivos.

## Verificación
- Abre DevTools → Network, haz una subida:  
  - Las llamadas a `/api/presign` deben responder 200 (servidas por Netlify, proxy a tu backend).  
  - No debe aparecer “Failed to fetch”.

## Tip
Si trabajas local con `netlify dev`, también respetará estas reglas de proxy y podrás probar sin CORS.
