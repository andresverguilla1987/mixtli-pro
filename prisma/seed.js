// prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function run() {
  const email = `demo_${Date.now()}@example.com`;
  const passwordHash = await bcrypt.hash('demo123', 10);
  const user = await prisma.usuario.create({
    data: { name: 'Usuario Demo', email, passwordHash },
    select: { id: true, name: true, email: true, createdAt: true, updatedAt: true }
  });
  console.log('[SEED] Usuario creado:', user);
}

module.exports = { run };

if (require.main === module) {
  run().finally(() => prisma.$disconnect());
}
