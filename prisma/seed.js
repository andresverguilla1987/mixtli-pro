const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const timestamp = Date.now();
  const demoPass = await bcrypt.hash('Demo1234', 10);

  await prisma.usuario.createMany({
    data: [
      { name: 'Demo', email: `demo_${timestamp}@mixtli.app`, passwordHash: demoPass },
      { name: 'Admin', email: `admin_${timestamp}@mixtli.app`, passwordHash: demoPass }
    ],
    skipDuplicates: true
  });
  console.log('Usuarios de prueba insertados');
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
