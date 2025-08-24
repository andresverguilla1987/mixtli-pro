# 🔑 Secrets y Variables de MIXTLI

Este archivo explica dónde debes poner cada cosa.

## 🚀 En GitHub (Settings → Secrets and Variables → Actions)
- DATABASE_URL  → Copia la URL externa de tu base de datos en Render
- RENDER_API_KEY → Genera una API Key en Render (Settings → API Keys)
- RENDER_SERVICE_ID → Copia el Service ID de tu Web Service en Render
- JWT_SECRET → Una cadena alfanumérica fuerte para firmar tokens

## 💻 Local (tu computadora en desarrollo)
Crea un archivo `.env` con las mismas claves que están en `.env.example`.

Ejemplo:
```
DATABASE_URL=postgresql://user:pass@host:5432/db
JWT_SECRET=1234567890abcdef
PORT=3000
```

Así GitHub Actions y Render tendrán lo mismo y no habrá bronca con los despliegues.
