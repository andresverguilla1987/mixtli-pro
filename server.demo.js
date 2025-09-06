import 'dotenv/config';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';

import securityRoutes from './notifications/src/routes/security.js';
import eventRoutes from './notifications/src/routes/events.js';
import debugRoutes from './notifications/src/routes/debug.js';
import { getOrCreateUser } from './notifications/src/lib/store.js';

const app = express();
app.use(cors({ origin: true }));
app.options('*', cors({ origin: true }));
app.use(bodyParser.json({ limit: '1mb' }));

// Attach demo user using store (no DB requerido)
app.use(async (req, res, next) => {
  const email = req.header('X-User-Email') || 'admin@mixtli.test';
  req.user = await getOrCreateUser(email, 'Admin Demo');
  next();
});

app.get('/', (req, res) => res.json({ status: 'ok', app: process.env.APP_NAME || 'Mixtli Pro', time: new Date().toISOString() }));

app.use('/security', securityRoutes);
app.use('/events', eventRoutes);
app.use('/debug', debugRoutes);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`✅ Root server (no‑DB demo) on ${port}`));
