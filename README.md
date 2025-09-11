# Mixtli — Debug Build
Este build muestra logs detallados de cada paso (presign y PUT).

## Uso
1. Sirve con `npx http-server` o Netlify (no uses file://).
2. Sube un archivo.
3. En el panel **Debug** verás:
   - Status de presign (200/403/etc).
   - Cuerpo de respuesta.
   - URL de PUT y su status.

Así puedes ver exactamente en qué parte falla (presign o PUT).