/**
 * prisma/seed.js
 * Crea o actualiza un usuario ADMIN por defecto usando variables de entorno.
 * - ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD (recomendado definirlos en Render → Environment)
 * - Si no están, usa valores de fallback (solo para desarrollo).
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const name = process.env.ADMIN_NAME || 'Admin Mixtli';
  const email = process.env.ADMIN_EMAIL || 'admin@mixtli.local';
  const password = process.env.ADMIN_PASSWORD || 'mixtli123';

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.usuario.upsert({
    where: { email },
    update: { nombre: name, passwordHash },
    create: { nombre: name, email, passwordHash }
  });

  console.log('✅ Admin listo:');
  console.log({ id: user.id, nombre: user.nombre, email: user.email });
  if (!process.env.ADMIN_PASSWORD) {
    console.warn('⚠️ Usando password por defecto. Configura ADMIN_PASSWORD en producción.');
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    return prisma.$disconnect().finally(() => process.exit(1));
  });
