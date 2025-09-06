// Dentro de tu server.js principal
import express from 'express';
import bodyParser from 'body-parser';
import { prisma } from './notifications/src/lib/prisma.js';
import securityRoutes from './notifications/src/routes/security.js';
import eventRoutes from './notifications/src/routes/events.js';

// Middleware demo: reemplaza por tu auth real
const attachUser = async (req, res, next) => {
  const email = req.header('X-User-Email') || 'admin@mixtli.test';
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) user = await prisma.user.create({ data: { email, name: 'Admin Demo' } });
  req.user = user;
  next();
};

const app = express();
app.use(bodyParser.json());
app.use(attachUser);

app.use('/security', securityRoutes);
app.use('/events', eventRoutes);

// Tu resto de rutas...
