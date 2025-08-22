const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.user.createMany({
    data: [
      { name: "Admin", email: "admin@example.com", password: "123456" },
      { name: "User", email: "user@example.com", password: "abcdef" }
    ],
    skipDuplicates: true
  });
}

main()
  .then(() => console.log("🌱 Database seeded"))
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());