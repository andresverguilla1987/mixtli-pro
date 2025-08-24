/**
 * Prisma seed script for Mixtli
 * Runs with: npx prisma db seed
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const demoUsers = [
    { nombre: 'Juan Pérez', email: 'juan@example.com' },
    { nombre: 'María García', email: 'maria@example.com' },
    { nombre: 'Carlos López', email: 'carlos@example.com' },
  ];

  for (const u of demoUsers) {
    await prisma.usuario.upsert({
      where: { email: u.email },
      update: { nombre: u.nombre },
      create: u,
    });
  }

  console.log('✅ Seed completado (usuarios demo listos)');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(0); // no romper deploy aunque falle
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
