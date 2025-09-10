import express from "express";
import cors from "cors";

const app = express();

// CORS seguro (ajusta dominios permitidos)
const allowed = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://TU-DOMINIO.netlify.app"
];
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // permitir herramientas tipo curl
    if (allowed.includes(origin)) return cb(null, true);
    return cb(null, true); // para pruebas: permitir todo; cámbialo luego
  },
  methods: ["GET","POST","PUT","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization"]
}));

app.use(express.json({limit:"10mb"}));

// Responder al preflight explícitamente
app.options("*", (req, res) => res.sendStatus(204));

app.get("/health", (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// Endpoint presign de ejemplo (REEMPLAZA con tu R2 real)
app.post("/presign", (req, res) => {
  const { filename, contentType } = req.body || {};
  if (!filename) return res.status(400).json({ error: "filename requerido" });
  // Demo: URL ficticia; en tu real arma el signed URL hacia R2/S3
  const url = "https://r2-demo.invalid/upload/" + encodeURIComponent(filename);
  return res.json({ url, method: "PUT", headers: { "Content-Type": contentType || "application/octet-stream" } });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("Diag API en puerto " + port));
