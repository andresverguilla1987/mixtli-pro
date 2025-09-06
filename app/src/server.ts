import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { prisma } from './prisma.js';

const app = express();
// Confía en encabezados del proxy para X-Forwarded-For / req.ips
if ((process.env.TRUST_PROXY || 'true') === 'true') {
  app.set('trust proxy', true);
}

// Utilidades IP (IPv4)
function ipv4ToInt(ip: string): number | null {
  const m = ip.match(/^([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})$/);
  if (!m) return null;
  const parts = m.slice(1).map(n => parseInt(n, 10));
  if (parts.some(n => n < 0 || n > 255)) return null;
  return (parts[0]<<24) + (parts[1]<<16) + (parts[2]<<8) + parts[3];
}
function ipInCidr(ip: string, cidr: string): boolean {
  const [range, bitsStr] = cidr.split('/');
  const bits = parseInt(bitsStr || '32', 10);
  const ipInt = ipv4ToInt(ip);
  const rangeInt = ipv4ToInt(range);
  if (ipInt === null || rangeInt === null || bits < 0 || bits > 32) return false;
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (ipInt & mask) === (rangeInt & mask);
}
function ipMatches(ip: string, list: string[]): boolean {
  for (const entry of list) {
    if (entry.includes('/')) { if (ipInCidr(ip, entry)) return true; }
    else if (ip === entry) return true;
  }
  return false;
}
function csv(str?: string): string[] {
  return (str || '').split(',').map(s => s.trim()).filter(Boolean);
}
function clientIp(req: any): string {
  // Con trust proxy, Express llena req.ips (cadena), si no, usa req.ip
  const xff = (req.headers['x-forwarded-for'] || '') as string;
  const first = xff.split(',')[0]?.trim();
  return (req.ips && req.ips[0]) || first || req.ip || req.socket?.remoteAddress || '';
}

// Global allow/deny lists
const ALLOW = csv(process.env.IP_ALLOWLIST);
const DENY  = csv(process.env.IP_DENYLIST);

// Middleware global
app.use((req, res, next) => {
  const ip = clientIp(req);
  // Si está en deny => fuera
  if (ip && ipMatches(ip, DENY)) {
    return res.status(403).json({ message: 'Forbidden (denylist)', code: 'IP_BLOCKED' });
  }
  // Si hay allowlist y no está incluido => fuera
  if (ALLOW.length > 0 && ip && !ipMatches(ip, ALLOW)) {
    return res.status(403).json({ message: 'Forbidden (allowlist)', code: 'IP_NOT_ALLOWED' });
  }
  return next();
});


import rateLimit from 'express-rate-limit';
import morgan from 'morgan';

// Rate limiting (100 req/15min por IP)
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use(limiter);

// Rate limit más estricto para /api/auth/*
// Burst corto: 10 req/min + 50 req/15min
const authMinuteLimiter = rateLimit({ windowMs: 60 * 1000, max: Number(process.env.RATE_LIMIT_AUTH_PER_MIN || 10), standardHeaders: true, legacyHeaders: false });
const authWindowLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: Number(process.env.RATE_LIMIT_AUTH_MAX || 50), standardHeaders: true, legacyHeaders: false });
app.use('/api/auth', authMinuteLimiter, authWindowLimiter);

// Logs en JSON
app.use(morgan('combined'));

app.use(express.json());

// CORS
const origins = (process.env.CORS_ORIGINS || '').split(',').filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // non-browser or same-origin
    if (origins.includes(origin)) return cb(null, true);
    return cb(new Error('CORS blocked'), false);
  },
  credentials: true
}));
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const ACCESS_TTL = 60 * 60; // 1h
const REFRESH_TTL = 60 * 60 * 24 * 7; // 7d

function signTokens(payload: any) {
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TTL });
  const refreshToken = jwt.sign({ sub: payload.sub, type: 'refresh' }, JWT_SECRET, { expiresIn: REFRESH_TTL });
  return { accessToken, refreshToken, tokenType: 'Bearer', expiresIn: ACCESS_TTL };
}

const RegisterSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});


// Allowlist/denylist específico para /api/auth/*
const ALLOW_AUTH = csv(process.env.IP_ALLOWLIST_AUTH);
const DENY_AUTH  = csv(process.env.IP_DENYLIST_AUTH);
app.use('/api/auth', (req, res, next) => {
  const ip = clientIp(req);
  if (ip && ipMatches(ip, DENY_AUTH)) {
    return res.status(403).json({ message: 'Forbidden (denylist-auth)', code: 'IP_BLOCKED_AUTH' });
  }
  if (ALLOW_AUTH.length > 0 && ip && !ipMatches(ip, ALLOW_AUTH)) {
    return res.status(403).json({ message: 'Forbidden (allowlist-auth)', code: 'IP_NOT_ALLOWED_AUTH' });
  }
  return next();
});

app.post('/api/auth/register', async (req, res) => {
  const parse = RegisterSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ message: 'Datos inválidos', code: 'BAD_INPUT' });

  const { name, email, password } = parse.data;
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return res.status(409).json({ message: 'Email ya registrado', code: 'EMAIL_TAKEN' });

  const hash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { name, email, password: hash, role: 'USER' }
  });

  const tokens = signTokens({ sub: user.id, email: user.email, role: user.role });
  return res.status(201).json({ ...tokens, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

app.post('/api/auth/login', async (req, res) => {
  const parse = LoginSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ message: 'Datos inválidos', code: 'BAD_INPUT' });

  const { email, password } = parse.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ message: 'Credenciales inválidas', code: 'BAD_CREDENTIALS' });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ message: 'Credenciales inválidas', code: 'BAD_CREDENTIALS' });

  const tokens = signTokens({ sub: user.id, email: user.email, role: user.role });
  return res.json({ ...tokens, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

app.post('/api/auth/refresh', async (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) return res.status(400).json({ message: 'Falta refreshToken', code: 'BAD_INPUT' });

  try {
    const decoded: any = jwt.verify(refreshToken, JWT_SECRET);
    if (decoded.type !== 'refresh') throw new Error('Tipo inválido');
    const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
    if (!user) return res.status(401).json({ message: 'Refresh inválido', code: 'BAD_REFRESH' });
    const tokens = signTokens({ sub: user.id, email: user.email, role: user.role });
    return res.json({ ...tokens, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (e) {
    return res.status(401).json({ message: 'Refresh token inválido o expirado', code: 'BAD_REFRESH' });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

app.post('/api/echo', (req, res) => {
  res.json(req.body || {});
});

const PORT = Number(process.env.PORT || 10000);
app.listen(PORT, () => {
  console.log('🚀 API en puerto', PORT);
});


app.get('/live', (_req, res) => res.status(200).send('OK'));
app.get('/ready', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).send('READY');
  } catch {
    res.status(500).send('NOT_READY');
  }
});
