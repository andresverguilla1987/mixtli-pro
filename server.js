const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Salud
app.get("/salud", (req, res) => {
  res.json({ ok: true, msg: "Mixtli API viva 🟢" });
});

// Rutas de upload
const uploadRoutes = require("./src/rutas/upload");
app.use("/api", uploadRoutes);

// Arranque
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Mixtli API corriendo en puerto ${PORT}`);
});
