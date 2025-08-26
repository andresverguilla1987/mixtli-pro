
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Rutas
const usersRouter = require("./src/rutas/users");
const uploadRouter = require("./src/rutas/upload");

app.get("/", (_req, res) => {
  res.json({
    ok: true,
    name: "Mixtli API",
    endpoints: ["/salud", "/api/users", "/api/upload", "/api/upload/presign", "/api/debug/env-s3"]
  });
});

app.get("/salud", (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

app.use("/api/users", usersRouter);   // GET/POST sobre /api/users
app.use("/api", uploadRouter);        // POST /api/upload, GET /api/upload/presign, GET /api/debug/env-s3

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Mixtli API en puerto ${PORT}`));
