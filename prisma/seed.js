// prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const samples = [
    { name: 'Ada Lovelace',  email: 'ada@example.com',  password: 'secret1' },
    { name: 'Alan Turing',   email: 'alan@example.com', password: 'secret2' }
  ];
  for (const u of samples) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: u,
      create: u
    });
  }
  console.log('🌱 Seed completado');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => { console.error('Seed error:', e); await prisma.$disconnect(); process.exit(1); });
