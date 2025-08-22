const express = require("express");
const app = express();

// Ruta de prueba
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Servidor funcionando 🔥" });
});

// Puerto desde variables de entorno o 10000
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
