# Mixtli CORS Patch — ALLOWED_ORIGINS robusto (ESM + CJS)

Este parche evita el crash `SyntaxError: ... is not valid JSON` cuando `ALLOWED_ORIGINS`
está mal formateada en Render. Incluye un **parser robusto** y un **middleware CORS** listo.

## Archivos
- `cors-safe.js`  → ESM (`import {...} from './cors-safe.js'`)
- `cors-safe.cjs` → CommonJS (`const {...} = require('./cors-safe.cjs')`)

## Cómo usar (elige ESM o CJS según tu proyecto)

### Si tu proyecto es ESM (package.json con `"type":"module"`)
En tu `server.js`:
```js
import express from 'express';
import { getAllowedOrigins, corsMiddleware } from './cors-safe.js';

const app = express();
const ALLOWED = getAllowedOrigins(); // lee y corrige ALLOWED_ORIGINS del entorno
app.use(corsMiddleware(ALLOWED, {
  methods: 'GET,POST,PUT,OPTIONS',
  headers: 'Content-Type,x-mixtli-token'
}));
```

### Si tu proyecto es CommonJS
```js
const express = require('express');
const { getAllowedOrigins, corsMiddleware } = require('./cors-safe.cjs');

const app = express();
const ALLOWED = getAllowedOrigins();
app.use(corsMiddleware(ALLOWED, {
  methods: 'GET,POST,PUT,OPTIONS',
  headers: 'Content-Type,x-mixtli-token'
}));
```

## Valor correcto en Render
En **Render → Environment**, el valor debe ser JSON **válido** (sin el nombre delante):
```
["https://lovely-bienenstitch-6344a1.netlify.app","https://meek-alfajores-1c364d.netlify.app"]
```
> Si alguien lo pone así por error:
> `ALLOWED_ORIGINS=["https://...","https://..."]`,
> este parche **no se cae**: lo corregirá y seguirá funcionando.

## Paso final
- Subir estos archivos al root del backend (junto a `server.js`).
- **Manual Deploy → Clear build cache & deploy** en Render.
- Probar `GET /salud` y tu flujo Postman.
