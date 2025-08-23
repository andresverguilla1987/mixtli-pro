const express = require("express");
const { PrismaClient } = require("@prisma/client");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const app = express();
const prisma = new PrismaClient();
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

// Endpoint de salud
app.get("/salud", (req, res) => {
  res.json({ status: "ok", mensaje: "Servidor funcionando 🟢" });
});

// Listar usuarios
app.get("/api/users", async (req, res) => {
  try {
    const users = await prisma.usuario.findMany();
    res.json({ ok: true, data: users });
  } catch (err) {
    res.status(500).json({ error: "Error listando usuarios" });
  }
});

// Crear usuario
app.post("/api/users", async (req, res) => {
  try {
    const { nombre, email, password } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.usuario.create({
      data: { nombre, email, password: hashed }
    });
    res.status(201).json({ ok: true, data: user });
  } catch (err) {
    res.status(500).json({ error: "Error creando usuario" });
  }
});

// Login con JWT
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.usuario.findUnique({ where: { email } });

  if (!user) return res.status(401).json({ error: "Credenciales inválidas" });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: "Credenciales inválidas" });

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "1h" });
  res.json({ ok: true, token });
});

// Middleware para proteger rutas
function authMiddleware(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Token requerido" });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: "Token inválido" });
    req.userId = decoded.userId;
    next();
  });
}

// Ruta protegida
app.get("/api/profile", authMiddleware, async (req, res) => {
  const user = await prisma.usuario.findUnique({ where: { id: req.userId } });
  res.json({ ok: true, data: user });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));