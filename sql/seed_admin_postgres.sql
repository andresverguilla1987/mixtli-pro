-- sql/seed_admin_postgres.sql
-- Ajusta nombres de tabla/campos.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO "User" (id, name, email, password, role, "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, 'Admin', 'admin@example.com', crypt('S3gura#123', gen_salt('bf')), 'ADMIN', now(), now())
ON CONFLICT (email)
DO UPDATE SET
  name = EXCLUDED.name,
  password = EXCLUDED.password,
  role = 'ADMIN',
  "updatedAt" = now();
