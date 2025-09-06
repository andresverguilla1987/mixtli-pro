import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const {
    ADMIN_EMAIL = "admin@example.com",
    ADMIN_PASSWORD = "S3gura#123",
    ADMIN_NAME = "Admin",
  } = process.env;

  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error("Faltan ADMIN_EMAIL o ADMIN_PASSWORD en variables de entorno.");
  }

  const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  const user = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { name: ADMIN_NAME, password: hash, role: "ADMIN" },
    create: { name: ADMIN_NAME, email: ADMIN_EMAIL, password: hash, role: "ADMIN" },
  });

  console.log("Admin listo:", { id: user.id, email: user.email, role: user.role });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
