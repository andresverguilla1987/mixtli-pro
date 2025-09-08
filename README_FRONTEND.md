# Mixtli Presigned — Frontend estático

Frontend puro (HTML+JS/CSS) para probar el backend de presigned uploads.

## Uso

1. Sirve estas 3 piezas como estático (Netlify, Vercel, Nginx, etc.) o abre `index.html` directo en el navegador.
2. En la parte de **Configuración**, pon la `Base URL` del backend (por defecto `http://localhost:10000`) y pulsa **Guardar**.
3. **Registro** → **Login** → se guarda el token.
4. **Subir**: selecciona archivo → **Generar URL de subida** → **Hacer PUT al bucket** → **Marcar como completo** → **Obtener link**.
5. **Enviar por email**: coloca `Upload ID` (se autollenará tras presign) + destinatario.

> Nota: algunos navegadores restringen abrir `file://index.html` con `fetch`. Lo ideal es servir estático (Netlify es perfecto).
