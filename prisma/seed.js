
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Crea un usuario de ejemplo si no existe
  await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      email: 'demo@example.com',
      name: 'Demo User'
    }
  });

  console.log('✅ Seed completado');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
