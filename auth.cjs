// src/rutas/auth.cjs — FIX for required `passwordHash`
const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const router = express.Router();

const User = prisma.usuario; // tu modelo real

const JWT_SECRET = process.env.JWT_SECRET || "";
if (!JWT_SECRET) console.warn("[WARN] JWT_SECRET vacío. Configúralo en Render > Environment.");

function signTokens(user) {
  if (!JWT_SECRET) throw new Error("JWT_SECRET_missing");
  const payload = { uid: user.id, email: user.email, name: user.name || null };
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: "30m" });
  const refreshToken = jwt.sign({ uid: user.id }, JWT_SECRET, { expiresIn: "14d" });
  return { accessToken, refreshToken };
}

// devuelve el hash cualquiera que sea el campo
function getHash(u) {
  return u?.passwordHash ?? u?.password ?? u?.hash ?? null;
}

// ---- REGISTER: guarda en passwordHash (requerido en tu schema) ----
router.post("/register", async (req, res) => {
  try {
    const { email, password, name } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "email y password requeridos" });

    const exists = await User.findUnique({ where: { email } });
    if (exists) return res.status(409).json({ error: "email ya registrado" });

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ data: { email, passwordHash: hash, name: name || null } }); // <-- clave
    const tokens = signTokens(user);
    res.status(201).json({ user: { id: user.id, email: user.email, name: user.name }, ...tokens });
  } catch (e) {
    const msg = String(e?.message || e);
    if (msg.includes("JWT_SECRET_missing")) return res.status(500).json({ error: "config_faltante", detail: "Define JWT_SECRET en Render > Environment" });
    res.status(500).json({ error: "internal_error", detail: msg });
  }
});

// ---- LOGIN: compara contra passwordHash si existe ----
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "email y password requeridos" });

    const user = await User.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: "credenciales invalidas" });

    const hash = getHash(user);
    if (!hash) return res.status(500).json({ error: "password_no_disponible" });

    const ok = await bcrypt.compare(password, hash);
    if (!ok) return res.status(401).json({ error: "credenciales invalidas" });

    const tokens = signTokens(user);
    res.json({ user: { id: user.id, email: user.email, name: user.name }, ...tokens });
  } catch (e) {
    const msg = String(e?.message || e);
    if (msg.includes("JWT_SECRET_missing") || msg.includes("secretOrPrivateKey must have a value"))
      return res.status(500).json({ error: "config_faltante", detail: "Define JWT_SECRET en Render > Environment" });
    res.status(500).json({ error: "internal_error", detail: msg });
  }
});

// ---- REFRESH ----
router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken) return res.status(400).json({ error: "refreshToken requerido" });
    if (!JWT_SECRET) throw new Error("JWT_SECRET_missing");

    const decoded = jwt.verify(refreshToken, JWT_SECRET);
    const user = await User.findUnique({ where: { id: decoded.uid } });
    if (!user) return res.status(401).json({ error: "usuario no encontrado" });

    const tokens = signTokens(user);
    res.json(tokens);
  } catch (e) {
    const msg = String(e?.message || e);
    if (msg.includes("JWT_SECRET_missing") || msg.includes("secretOrPrivateKey must have a value"))
      return res.status(500).json({ error: "config_faltante", detail: "Define JWT_SECRET en Render > Environment" });
    res.status(401).json({ error: "refresh_invalido", detail: msg });
  }
});

// ---- ME ----
router.get("/me", async (req, res) => {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: "token_requerido" });
    if (!JWT_SECRET) throw new Error("JWT_SECRET_missing");

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findUnique({ where: { id: decoded.uid }, select: { id: true, email: true, name: true } });
    if (!user) return res.status(404).json({ error: "usuario_no_encontrado" });

    res.json({ user });
  } catch (e) {
    const msg = String(e?.message || e);
    if (msg.includes("JWT_SECRET_missing"))
      return res.status(500).json({ error: "config_faltante", detail: "Define JWT_SECRET en Render > Environment" });
    res.status(401).json({ error: "token_invalido", detail: msg });
  }
});

module.exports = router;
