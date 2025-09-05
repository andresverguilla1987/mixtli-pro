import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { prisma } from "../server.js";

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

function signTokens(user) {
  const payload = { uid: user.id, email: user.email, name: user.name || null };
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: "30m" });
  const refreshToken = jwt.sign({ uid: user.id }, JWT_SECRET, { expiresIn: "14d" });
  return { accessToken, refreshToken };
}

// ---- REGISTER ----
router.post("/register", async (req, res) => {
  try {
    const { email, password, name } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "email y password requeridos" });
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(409).json({ error: "email ya registrado" });

    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hash, name: name || null },
    });
    const tokens = signTokens(user);
    return res.status(201).json({ user: { id: user.id, email: user.email, name: user.name }, ...tokens });
  } catch (e) {
    console.error("register error:", e);
    return res.status(500).json({ error: "internal_error", detail: (e && e.message) || String(e) });
  }
});

// Internal helper to get password hash regardless of field naming
function extractHash(user) {
  return user?.password ?? user?.passwordHash ?? user?.hash ?? null;
}

// ---- LOGIN ----
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "email y password requeridos" });
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: "credenciales invalidas" });

    const hash = extractHash(user);
    if (!hash) {
      return res.status(500).json({ error: "password_no_disponible", hint: "Revisa el nombre del campo en tu prisma (password / passwordHash / hash)" });
    }

    const ok = await bcrypt.compare(password, hash);
    if (!ok) return res.status(401).json({ error: "credenciales invalidas" });

    const tokens = signTokens(user);
    return res.json({ user: { id: user.id, email: user.email, name: user.name }, ...tokens });
  } catch (e) {
    console.error("login error:", e);
    return res.status(500).json({ error: "internal_error", detail: (e && e.message) || String(e) });
  }
});

// ---- REFRESH ----
router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken) return res.status(400).json({ error: "refreshToken requerido" });
    const decoded = jwt.verify(refreshToken, JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.uid } });
    if (!user) return res.status(401).json({ error: "usuario no encontrado" });
    const tokens = signTokens(user);
    return res.json(tokens);
  } catch (e) {
    console.error("refresh error:", e);
    return res.status(401).json({ error: "refresh_invalido", detail: (e && e.message) || String(e) });
  }
});

// ---- ME (token check) ----
router.get("/me", async (req, res) => {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: "token_requerido" });
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.uid }, select: { id: true, email: true, name: true } });
    if (!user) return res.status(404).json({ error: "usuario_no_encontrado" });
    res.json({ user });
  } catch (e) {
    return res.status(401).json({ error: "token_invalido", detail: (e && e.message) || String(e) });
  }
});

// ---- DEBUG: muestra info limitada del usuario (sin exponer hash) ----
router.get("/__debug_user", async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: "email query requerido" });
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: "no_existe" });
    const hash = extractHash(user);
    res.json({
      id: user.id,
      email: user.email,
      name: user.name || null,
      passwordFieldDetected: hash ? (user.password ? "password" : (user.passwordHash ? "passwordHash" : (user.hash ? "hash" : "unknown"))) : null,
      hashLength: hash ? String(hash).length : null,
      createdAt: user.createdAt || null
    });
  } catch (e) {
    res.status(500).json({ error: "debug_error", detail: (e && e.message) || String(e) });
  }
});

export default router;
