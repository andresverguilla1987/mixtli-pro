// prisma/seed.js - seed idempotente
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@mixtli.local';
  const nombre = process.env.ADMIN_NAME || 'Admin';
  await prisma.usuario.upsert({
    where: { email },
    update: { nombre },
    create: { nombre, email }
  });
  console.log('Seed OK');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
