import 'dotenv/config';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';

import { prisma } from './src/lib/prisma.js';
import securityRoutes from './src/routes/security.js';
import eventRoutes from './src/routes/events.js';
import debugRoutes from './src/routes/debug.js';

const app = express();

// 🔓 CORS para demo hosted
app.use(cors({ origin: true }));
app.options('*', cors({ origin: true }));

app.use(bodyParser.json({ limit: '1mb' }));

app.use(async (req, res, next) => {
  const email = req.header('X-User-Email') || 'admin@mixtli.test';
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) user = await prisma.user.create({ data: { email, name: 'Admin Demo' } });
  req.user = user;
  next();
});

app.use('/security', securityRoutes);
app.use('/events', eventRoutes);
app.use('/debug', debugRoutes);

app.get('/', (req, res) => res.json({ status: 'ok', app: process.env.APP_NAME || 'Mixtli Pro' }));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 Notifications API (CORS) on http://localhost:${port}`));
