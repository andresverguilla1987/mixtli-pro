/**
 * Root server with CORS enabled (Render hotfix).
 */
import 'dotenv/config';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';

let securityRoutes, eventRoutes, debugRoutes, prisma;
try { ({ default: securityRoutes } = await import('./notifications/src/routes/security.js')); } catch {}
try { ({ default: eventRoutes } = await import('./notifications/src/routes/events.js')); } catch {}
try { ({ default: debugRoutes } = await import('./notifications/src/routes/debug.js')); } catch {}
try { ({ prisma } = await import('./notifications/src/lib/prisma.js')); } catch {}

const app = express();

// 🔓 CORS para demo hosted (GitHub Pages)
app.use(cors({ origin: true }));
app.options('*', cors({ origin: true }));

app.use(bodyParser.json({ limit: '1mb' }));

app.use(async (req, res, next) => {
  try {
    if (prisma) {
      const email = req.header('X-User-Email') || 'admin@mixtli.test';
      let user = await prisma.user.findUnique({ where: { email } });
      if (!user) user = await prisma.user.create({ data: { email, name: 'Admin Demo' } });
      req.user = user;
    }
  } catch (e) {
    console.warn('[demo-auth] prisma no disponible o error:', e?.message);
  }
  next();
});

app.get('/', (req, res) => res.json({ status: 'ok', app: process.env.APP_NAME || 'Mixtli Pro', time: new Date().toISOString() }));

if (securityRoutes) app.use('/security', securityRoutes);
if (eventRoutes) app.use('/events', eventRoutes);
if (debugRoutes) app.use('/debug', debugRoutes);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`✅ Root+CORS server ready on ${port}`));
