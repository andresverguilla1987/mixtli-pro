import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// CORS
const allowed = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowed.length === 0 || allowed.includes(origin)) return cb(null, true);
    return cb(new Error("CORS bloqueado para " + origin));
  }
}));
app.use(express.json());

// Healthcheck
app.get("/health", (req, res) => {
  res.json({ status: "ok", ts: Date.now() });
});

// Ping
app.get("/api/ping", (req, res) => res.json({ pong: true }));

// Home
app.get("/", (req, res) => {
  res.type("text").send(
`✨ Mixtli API corriendo
Endpoints:
  GET /health
  GET /api/ping
`);
});

const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => {
  console.log(`✅ Servidor escuchando en puerto ${PORT}`);
});
