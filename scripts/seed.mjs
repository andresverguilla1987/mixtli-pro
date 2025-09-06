import 'dotenv/config';
import { prisma } from '../src/lib/prisma.js';

const email = process.env.SEED_ADMIN_EMAIL || 'admin@mixtli.test';

(async () => {
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: { email, name: 'Admin Seed', notificationPrefs: { login: true, twofa: true, reset: true } }
    });
    console.log('Admin creado:', user.email);
  } else {
    console.log('Admin ya existía:', user.email);
  }
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
