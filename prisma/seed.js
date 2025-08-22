import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.usuario.count();
  if (count > 0) {
    console.log(`Usuarios existentes: ${count}. No se hace seed.`);
    return;
  }
  await prisma.usuario.createMany({
    data: [
      { nombre: "Ana", email: "ana@example.com" },
      { nombre: "Luis", email: "luis@example.com" },
      { nombre: "María", email: "maria@example.com" }
    ]
  });
  const total = await prisma.usuario.count();
  console.log(`Seed completado. Usuarios totales: ${total}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
