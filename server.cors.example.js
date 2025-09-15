// server.cors.example.js (opcional) — mini demo
import express from 'express';
import { getAllowedOrigins, corsMiddleware } from './cors-safe.js';

const app = express();
const ALLOWED = getAllowedOrigins();
app.use(corsMiddleware(ALLOWED));

app.get('/salud', (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log('Demo CORS OK on :' + PORT));
