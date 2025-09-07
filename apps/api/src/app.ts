import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

// Simple Express app with health endpoints.
const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Health & root routes so Render health checks don't 404.
app.get('/', (_req, res) => res.status(200).send('ok'));
app.get(['/health', '/salud', '/status', '/ready', '/live'], (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Export for server.ts
export const PORT: number = parseInt(process.env.PORT || '10000', 10);
export default app;
