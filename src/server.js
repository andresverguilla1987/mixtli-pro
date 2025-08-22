const express = require("express");
const { PrismaClient } = require("@prisma/client");

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 10000;

app.use(express.json());

// Ruta raíz para evitar el "Cannot GET /"
app.get("/", (req, res) => {
  res.json({
    mensaje: "🚀 Bienvenido a la API de Mixtli",
    endpoints: {
      salud: "/salud",
      usuarios: "/api/users"
    }
  });
});

// Ruta de salud
app.get("/salud", (req, res) => {
  res.json({ status: "Servidor funcionando 🔥", version: "1.0.0" });
});

// Ruta de usuarios (ejemplo básico)
app.get("/api/users", async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener usuarios" });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});
