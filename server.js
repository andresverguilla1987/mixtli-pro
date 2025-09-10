import express from "express";
import cors from "cors";

const app = express();
app.use(express.json());

// Middleware CORS abierto para pruebas (ajusta a tus dominios)
app.use((req, res, next) => {
  const origin = req.headers.origin || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.post("/presign", (req, res) => {
  // Simulación de presign (reemplaza con tu lógica de R2/S3)
  const { filename } = req.body;
  res.json({
    url: "https://bucket.r2.cloud/" + filename,
    method: "PUT",
    headers: { "Content-Type": "application/octet-stream" }
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("API en puerto " + port));