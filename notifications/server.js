import 'dotenv/config';
import express from 'express';
import bodyParser from 'body-parser';

import { prisma } from './src/lib/prisma.js';
import securityRoutes from './src/routes/security.js';
import eventRoutes from './src/routes/events.js';

const app = express();
app.use(bodyParser.json({ limit: '1mb' }));

// Demo auth based on header
app.use(async (req, res, next) => {
  const email = req.header('X-User-Email') || 'admin@mixtli.test';
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) user = await prisma.user.create({ data: { email, name: 'Admin Demo' } });
  req.user = user;
  next();
});

app.use('/security', securityRoutes);
app.use('/events', eventRoutes);

app.get('/', (req, res) => res.json({ status: 'ok', app: process.env.APP_NAME || 'Mixtli Pro' }));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 Notifications API on http://localhost:${port}`));
