import 'dotenv/config';
import express from 'express';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import securityRoutes from './src/routes/security.js';
import eventRoutes from './src/routes/events.js';

const app = express();
app.use(bodyParser.json({ limit: '1mb' }));

// Demo auth middleware: usa X-User-Email para cargar/crear usuario
import { prisma } from './src/lib/prisma.js';
app.use(async (req, res, next) => {
  const email = req.header('X-User-Email') || 'admin@mixtli.test';
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({ data: { email, name: 'Admin Demo' } });
  }
  req.user = user;
  next();
});

app.use('/security', securityRoutes);
app.use('/events', eventRoutes);

app.get('/', (req, res) => res.json({ status: 'ok', app: process.env.APP_NAME }));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 API on http://localhost:${port}`));
