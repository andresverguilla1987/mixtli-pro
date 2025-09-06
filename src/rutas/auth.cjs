// src/rutas/auth.cjs — PANIC KIT (verbose, prisma.usuario, passwordHash)
const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const router = express.Router();
const User = prisma.usuario;

const JWT_SECRET = process.env.JWT_SECRET || "";
if (!JWT_SECRET) console.warn("[WARN] JWT_SECRET vacío. Configúralo en Render > Environment.");

function signTokens(user) {
  if (!JWT_SECRET) throw new Error("JWT_SECRET_missing");
  const payload = { uid: user.id, email: user.email, name: user.name || null };
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: "30m" });
  const refreshToken = jwt.sign({ uid: user.id }, JWT_SECRET, { expiresIn: "14d" });
  return { accessToken, refreshToken };
}
function getHash(u) { return u?.passwordHash ?? u?.password ?? u?.hash ?? null; }

// ---- diagnostics
router.get("/__models", (_req, res) => {
  const keys = Object.keys(prisma).filter(k => prisma[k] && typeof prisma[k].findUnique === "function");
  res.json({ ok: true, delegates: keys, using: "usuario" });
});

router.get("/__dbcheck", async (_req, res) => {
  try {
    const c = await User.count();
    res.json({ ok: true, userCount: c });
  } catch (e) {
    console.error("[__dbcheck]", e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

router.post("/__create_test", async (_req, res) => {
  try {
    const rnd = Math.floor(Math.random() * 1e9);
    const email = `diag_${rnd}@mixtli.mx`;
    const hash = await bcrypt.hash("12345678", 10);
    const user = await User.create({ data: { email, passwordHash: hash, name: "Diag" } });
    res.json({ ok: true, created: { id: user.id, email: user.email } });
  } catch (e) {
    console.error("[__create_test]", e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// ---- register
router.post("/register", async (req, res) => {
  const start = Date.now();
  try {
    console.log("[REGISTER] body:", req.body);
    const { email, password, name } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "email y password requeridos" });

    const exists = await User.findUnique({ where: { email } });
    if (exists) return res.status(409).json({ error: "email ya registrado" });

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ data: { email, passwordHash: hash, name: name || null } });
    const tokens = signTokens(user);
    console.log("[REGISTER] ok in", Date.now() - start, "ms");
    res.status(201).json({ user: { id: user.id, email: user.email, name: user.name }, ...tokens });
  } catch (e) {
    console.error("[REGISTER] error:", e);
    const msg = String(e?.message || e);
    if (msg.includes("JWT_SECRET_missing")) return res.status(500).json({ error: "config_faltante", detail: "Define JWT_SECRET en Render > Environment" });
    res.status(500).json({ error: "internal_error", detail: msg });
  }
});

// ---- login
router.post("/login", async (req, res) => {
  const start = Date.now();
  try {
    console.log("[LOGIN] body:", req.body);
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "email y password requeridos" });

    const user = await User.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: "credenciales invalidas" });

    const hash = getHash(user);
    if (!hash) return res.status(500).json({ error: "password_no_disponible" });

    const ok = await bcrypt.compare(password, hash);
    if (!ok) return res.status(401).json({ error: "credenciales invalidas" });

    const tokens = signTokens(user);
    console.log("[LOGIN] ok in", Date.now() - start, "ms");
    res.json({ user: { id: user.id, email: user.email, name: user.name }, ...tokens });
  } catch (e) {
    console.error("[LOGIN] error:", e);
    const msg = String(e?.message || e);
    if (msg.includes("JWT_SECRET_missing") || msg.includes("secretOrPrivateKey must have a value"))
      return res.status(500).json({ error: "config_faltante", detail: "Define JWT_SECRET en Render > Environment" });
    res.status(500).json({ error: "internal_error", detail: msg });
  }
});

// ---- refresh
router.post("/refresh", async (req, res) => {
  try {
    console.log("[REFRESH] body:", req.body);
    const { refreshToken } = req.body || {};
    if (!refreshToken) return res.status(400).json({ error: "refreshToken requerido" });
    if (!JWT_SECRET) throw new Error("JWT_SECRET_missing");

    const decoded = jwt.verify(refreshToken, JWT_SECRET);
    const user = await User.findUnique({ where: { id: decoded.uid } });
    if (!user) return res.status(401).json({ error: "usuario no encontrado" });

    const tokens = signTokens(user);
    res.json(tokens);
  } catch (e) {
    console.error("[REFRESH] error:", e);
    const msg = String(e?.message || e);
    if (msg.includes("JWT_SECRET_missing") || msg.includes("secretOrPrivateKey must have a value"))
      return res.status(500).json({ error: "config_faltante", detail: "Define JWT_SECRET en Render > Environment" });
    res.status(401).json({ error: "refresh_invalido", detail: msg });
  }
});

// ---- me
router.get("/me", async (req, res) => {
  try {
    const auth = req.headers.authorization || "";
    console.log("[ME] Authorization:", auth);
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: "token_requerido" });
    if (!JWT_SECRET) throw new Error("JWT_SECRET_missing");

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findUnique({ where: { id: decoded.uid }, select: { id: true, email: true, name: true } });
    if (!user) return res.status(404).json({ error: "usuario_no_encontrado" });

    res.json({ user });
  } catch (e) {
    console.error("[ME] error:", e);
    const msg = String(e?.message || e);
    if (msg.includes("JWT_SECRET_missing"))
      return res.status(500).json({ error: "config_faltante", detail: "Define JWT_SECRET en Render > Environment" });
    res.status(401).json({ error: "token_invalido", detail: msg });
  }
});

// ---- selftest: hace register(login)->login->me en un tiro
router.post("/__selftest", async (_req, res) => {
  const rnd = Math.floor(Math.random()*1e9);
  const email = `self_${rnd}@mixtli.mx`;
  const password = "12345678";
  const result = { email };
  try {
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ data: { email, passwordHash: hash, name: "Self" } });
    result.register = { id: user.id };
    const tokens = signTokens(user);
    result.login = { ok: true, accessToken: tokens.accessToken.slice(0,30) + "...", refreshToken: tokens.refreshToken.slice(0,30) + "..." };
    const decoded = jwt.verify(tokens.accessToken, JWT_SECRET);
    const me = await User.findUnique({ where: { id: decoded.uid }, select: { id: true, email: true } });
    result.me = me;
    res.json({ ok: true, ...result });
  } catch (e) {
    console.error("[SELFTEST] error:", e);
    res.status(500).json({ ok: false, step: Object.keys(result), error: String(e), context: result });
  }
});

module.exports = router;
