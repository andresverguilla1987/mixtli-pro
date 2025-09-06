import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

type OAuthSeed = { clientId: string; clientSecret?: string; name: string; redirectUris: string; publicClient: boolean };


async function main() {
  const {
    ADMIN_EMAIL = "admin@example.com",
    ADMIN_PASSWORD = "S3gura#123",
    ADMIN_NAME = "Admin",
    OAUTH_CLIENT_ID = "mixtli-web",
    OAUTH_CLIENT_SECRET = "dev-secret",
    OAUTH_REDIRECT_URIS = "http://localhost:5173/callback,http://localhost:5174/callback",
    OAUTH_PUBLIC_CLIENT = "true",
  } = process.env;

  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error("Faltan ADMIN_EMAIL o ADMIN_PASSWORD en variables de entorno.");
  }

  const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  // seed OAuth client
  const oauthSeed: OAuthSeed = {
    clientId: OAUTH_CLIENT_ID,
    clientSecret: OAUTH_PUBLIC_CLIENT === 'true' ? undefined : OAUTH_CLIENT_SECRET,
    name: 'Mixtli Web',
    redirectUris: OAUTH_REDIRECT_URIS,
    publicClient: OAUTH_PUBLIC_CLIENT === 'true',
  };
  await prisma.oAuthClient.upsert({
    where: { clientId: oauthSeed.clientId },
    update: {
      clientSecret: oauthSeed.clientSecret,
      name: oauthSeed.name,
      redirectUris: oauthSeed.redirectUris,
      publicClient: oauthSeed.publicClient,
    },
    create: oauthSeed,
  });

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
