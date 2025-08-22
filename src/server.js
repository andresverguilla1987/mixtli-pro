import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// Health route
app.get("/", (req, res) => {
  res.json({ status: "Servidor funcionando 🔥", version: "1.0.0" });
});

// Fake users
app.get("/usuarios", (req, res) => {
  res.json([
    { id: 1, nombre: "Juan", edad: 25 },
    { id: 2, nombre: "María", edad: 30 },
    { id: 3, nombre: "Pedro", edad: 20 }
  ]);
});

// Fake products
app.get("/productos", (req, res) => {
  res.json([
    { id: 1, producto: "Coca-Cola", precio: 20 },
    { id: 2, producto: "Sabritas", precio: 15 },
    { id: 3, producto: "Gansito", precio: 12 }
  ]);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
