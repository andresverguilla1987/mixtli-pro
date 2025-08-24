-- sql/seed.sql
INSERT INTO "Usuario" (nombre, email, "createdAt") VALUES
('Juan Pérez', 'juan@example.com', NOW()),
('María García', 'maria@example.com', NOW()),
('Carlos López', 'carlos@example.com', NOW())
ON CONFLICT (email) DO NOTHING;
