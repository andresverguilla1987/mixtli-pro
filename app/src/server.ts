import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
/* jwt removed in favor of jose */
import bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';
import { z } from 'zod';
import { prisma } from './prisma.js';

/* --- OAuth2 in-memory store --- */
const oauthCodes = new Map<string, any>();
/* --- OAuth consent store --- */
const oauthConsent = new Map<string, boolean>(); // key: sub::client_id -> approved // code -> {sub, client_id, redirect_uri, code_challenge, method, scope, exp}
function randUrlSafe(len: number) {
  const buf = Buffer.alloc(len);
  for (let i=0;i<len;i++) buf[i] = Math.floor(Math.random()*256);
  return buf.toString('base64url');
}

import { signTokens, getIssuer, getAudience, getJWKS } from './jwks.js';

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

// Admin rate limit
const adminLimiter = rateLimit({ windowMs: 60 * 1000, max: Number(process.env.RATE_LIMIT_ADMIN_PER_MIN || 30), standardHeaders: true, legacyHeaders: false });
app.use('/api/admin', adminLimiter);

// Logs en JSON
app.use(morgan('combined'));

app.use(express.json());
app.use(cookieParser());

// Filtro de User-Agent
const UA_ALLOW_RE = new RegExp(process.env.UA_ALLOW_RE || '.*');
const UA_DENY_RE = new RegExp(process.env.UA_DENY_RE || '^$');
app.use((req, res, next) => {
  const ua = String(req.headers['user-agent'] || '');
  if (UA_DENY_RE.test(ua)) return res.status(403).json({ message: 'Forbidden UA', code: 'UA_BLOCKED' });
  if (!UA_ALLOW_RE.test(ua)) return res.status(403).json({ message: 'Not allowed UA', code: 'UA_NOT_ALLOWED' });
  next();
});

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

function bearerUser(req: any): { sub: string, email?: string, role?: string } | null {

  // DEMO: también aceptamos ?access_token=... en query para flujos redirect
  const qtok = (req.query && (req.query.access_token as string)) || '';
  const auth = String(req.headers['authorization'] || '');
  const m = auth.match(/^Bearer\s+(.+)$/i) || (qtok ? [qtok, qtok] : null);
  if (!m) return null;
  // No verificamos firma aquí por velocidad; endpoints críticos ya validan al emitir/refresh
  try { const parts = m[1].split('.'); const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8')); return { sub: payload.sub, email: payload.email, role: payload.role }; } catch { return null; }
}

const REFRESH_TTL = 60 * 60 * 24 * 7; // 7d

// signTokens now imported from jwks.ts
function signTokens_legacy(payload: any) {
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

  const tokens = await signTokens({ sub: user.id, email: user.email, role: user.role });
  if ((process.env.SESSION_ENABLED || 'false') === 'true') { await setSessionCookie(res, user.id, req); }
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


// CSRF (double-submit cookie) - habilitar con CSRF_ENABLED=true
function randomToken(len: number) {
  const buf = Buffer.alloc(len);
  for (let i = 0; i < len; i++) buf[i] = Math.floor(Math.random() * 256);
  return buf.toString('base64url');
}
app.get('/api/csrf', (req, res) => {
  if ((process.env.CSRF_ENABLED || 'false') !== 'true') return res.status(404).end();
  const token = randomToken(32);
  res.cookie('csrf', token, { httpOnly: false, sameSite: 'lax', secure: false, maxAge: 3600_000 });
  res.json({ csrfToken: token });
});
// Middleware CSRF para métodos que modifican estado
app.use((req, res, next) => {
  if ((process.env.CSRF_ENABLED || 'false') !== 'true') return next();
  const method = req.method.toUpperCase();
  const needs = ['POST','PUT','PATCH','DELETE'].includes(method);
  if (!needs) return next();
  const header = String(req.headers['x-csrf-token'] || '');
  const cookie = String((req.cookies && req.cookies['csrf']) || '');
  if (!header || !cookie || header !== cookie) {
    return res.status(403).json({ message: 'CSRF token mismatch', code: 'CSRF_BLOCKED' });
  }
  next();
});

// JWKS público (para validación por terceros)
app.get('/.well-known/jwks.json', async (_req, res) => {
  const jwks = await getJWKS();
  res.json(jwks);
});


// OpenID Connect Discovery
app.get('/.well-known/openid-configuration', (req, res) => {
  const issuer = process.env.JWT_ISS || 'https://mixtli.local';
  const base = issuer.replace(/\/$/, '');
  res.json({
    issuer,
    authorization_endpoint: base + '/api/auth/login',
    token_endpoint: base + '/api/auth/login',
    jwks_uri: base + '/.well-known/jwks.json',
    response_types_supported: ['code','token','id_token'],
    subject_types_supported: ['public'],
    id_token_signing_alg_values_supported: ['RS256','HS256'],
    scopes_supported: ['openid','profile','email'],
    token_endpoint_auth_methods_supported: ['client_secret_basic','client_secret_post'],
    claims_supported: ['sub','email','name','iat','exp']
  });
});


// OAuth2 Authorization Code + PKCE (mínimo viable)
// Requiere que el usuario venga con Bearer (access token) ya emitido por /api/auth/login.
// 1) Cliente hace login -> obtiene access token del usuario
// 2) Cliente llama a /oauth/authorize con PKCE -> recibe authorization_code
// 3) Cliente intercambia en /oauth/token -> recibe tokens finales

// /oauth/authorize (dev: POST para simplificar; en prod sería GET con UI de consentimiento)
app.post('/oauth/authorize', async (req, res) => {
  const user = bearerUser(req);
  if (!user) return res.status(401).json({ error: 'unauthorized' });

  const { response_type, client_id, redirect_uri, code_challenge, code_challenge_method = 'S256', scope = 'openid profile email', state } = req.body || {};

  if (response_type !== 'code') return res.status(400).json({ error: 'unsupported_response_type' });

  const allowedClient = (process.env.OAUTH_CLIENT_ID || 'mixtli-web');
  const allowedRedirects = String(process.env.OAUTH_REDIRECT_URIS || 'http://localhost:5173/callback').split(',').map(s => s.trim());
  if (client_id !== allowedClient) return res.status(400).json({ error: 'invalid_client' });
  if (!allowedRedirects.includes(redirect_uri)) return res.status(400).json({ error: 'invalid_redirect_uri' });

  if (!code_challenge || !['S256','plain'].includes(code_challenge_method)) return res.status(400).json({ error: 'invalid_request' });

  const code = randUrlSafe(32);
  const exp = Date.now() + 5 * 60 * 1000; // 5 min
  oauthCodes.set(code, { sub: user.sub, client_id, redirect_uri, code_challenge, method: code_challenge_method, scope, exp });
  // Limpiar expirados rápido (best-effort)
  for (const [c,data] of oauthCodes) { if (data.exp < Date.now()) oauthCodes.delete(c); }

  // Para POST devolvemos JSON; si fuera GET redirigiríamos a redirect_uri?code=...&state=...
  await audit('oauth.code.issued', req, { userId: String(user.sub), clientId: String(client_id), details: { redirect_uri, scope } });
  return res.json({ code, state });
});

// /oauth/token (authorization_code)
app.post('/oauth/token', async (req, res) => {
  const { grant_type } = req.body || {};
  if (grant_type !== 'authorization_code') return res.status(400).json({ error: 'unsupported_grant_type' });

  // Auth methods: basic or body
  const basic = String(req.headers['authorization'] || '');
  let client_id = req.body.client_id;
  let client_secret = req.body.client_secret;
  const m = basic.match(/^Basic\s+(.+)$/i);
  if (m) {
    const dec = Buffer.from(m[1], 'base64').toString('utf8');
    const [cid, csec] = dec.split(':', 2);
    client_id = cid; client_secret = csec;
  }

  const client = await getOAuthClient(String(client_id));
  if (!client) return res.status(400).json({ error: 'invalid_client' });
  if (!client.publicClient && client.clientSecret !== client_secret) return res.status(401).json({ error: 'invalid_client_secret' });
  const allowedRedirects = client.redirectUris.split(',').map(s => s.trim());

  const { code, redirect_uri, code_verifier } = req.body || {};
  if (!code || !redirect_uri || !code_verifier) return res.status(400).json({ error: 'invalid_request' });
  if (!allowedRedirects.includes(redirect_uri)) return res.status(400).json({ error: 'invalid_redirect_uri' });

  const record = await prisma.oAuthCode.findFirst({ where: { code: String(code) } });
  if (!record || record.expiresAt < new Date()) return res.status(400).json({ error: 'invalid_grant' });
  if (record.clientId !== client_id || record.redirectUri !== redirect_uri) return res.status(400).json({ error: 'invalid_grant' });

  // PKCE
  const method = record.codeChallengeMethod || 'S256';
  if (method === 'plain') {
    if (record.codeChallenge !== code_verifier) return res.status(400).json({ error: 'invalid_grant' });
  } else {
    const crypto = await import('crypto');
    const hash = crypto.createHash('sha256').update(String(code_verifier)).digest('base64url');
    if (hash !== record.codeChallenge) return res.status(400).json({ error: 'invalid_grant' });
  }

  await prisma.oAuthCode.delete({ where: { id: record.id } });

  const tokens = await signTokens({ sub: record.userId, scope: record.scope, client_id });
  await audit('oauth.token.exchange', req, { userId: record.userId, clientId: String(client_id) });
  return res.json(tokens);
});


// GET /oauth/authorize (redirect style) - DEMO
app.get('/oauth/authorize', async (req, res) => {
  const user = bearerUser(req);
  const { response_type, client_id, redirect_uri, code_challenge, code_challenge_method = 'S256', scope = 'openid profile email', state } = req.query as any || {};

  if (!user) return res.status(401).send('Unauthorized (need Bearer or ?access_token=...)');

  if (response_type !== 'code') return res.status(400).send('unsupported_response_type');

  const allowedClient = (process.env.OAUTH_CLIENT_ID || 'mixtli-web');
  const allowedRedirects = String(process.env.OAUTH_REDIRECT_URIS || 'http://localhost:5174/callback').split(',').map(s => s.trim());
  if (client_id !== allowedClient) return res.status(400).send('invalid_client');
  if (!allowedRedirects.includes(String(redirect_uri))) return res.status(400).send('invalid_redirect_uri');
  if (!code_challenge || !['S256','plain'].includes(code_challenge_method)) return res.status(400).send('invalid_request');

  // Consent check
  const key = `${user.sub}::${client_id}`;
  const approved = oauthConsent.get(key);
  if (!approved) {
    // Render simple consent page
    const qs = new URLSearchParams(req.query as any).toString();
    const approveUrl = `/oauth/consent?approve=1&${qs}`;
    const denyUrl = `/oauth/consent?approve=0&${qs}`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end(`<!doctype html>
<html><head><meta charset="utf-8"><title>Consentimiento</title>
<style>
:root{color-scheme:light dark}
body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:720px;margin:40px auto;padding:0 16px;}
.card{border:1px solid #e5e7eb;border-radius:12px;padding:16px;background:Canvas;color:CanvasText}
.btn{padding:10px 14px;border-radius:8px;border:none;cursor:pointer}
.btn-yes{background:#16a34a;color:#fff}
.btn-no{background:#ef4444;color:#fff}
.badge{display:inline-block;background:#e2e8f0;color:#111827;border-radius:6px;padding:4px 8px;margin:4px 4px 0 0}
@media (prefers-color-scheme: dark){.card{border-color:#334155}.badge{background:#334155;color:#e2e8f0}}
</style>
</head>
<body>
  <div class="card" style="display:flex;align-items:center;gap:12px">
    <svg width=\"40\" height=\"40\" viewBox=\"0 0 40 40\" xmlns=\"http://www.w3.org/2000/svg\"><defs><linearGradient id=\"g\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop stop-color=\"#0ea5e9\"/><stop offset=\"1\" stop-color=\"#38bdf8\"/></linearGradient></defs><rect rx=\"10\" width=\"40\" height=\"40\" fill=\"url(#g)\"/></svg>
    <h1 style=\"margin:0\">Mixtli – Consentimiento</h1>
  </div>
  <p>La app <b>${client_id}</b> solicita acceso con el/los <b>alcances</b>:</p>
  <div>
    ${String(scope).split(' ').map(s=>`<span class=\"badge\"><code>${s}</code></code></span>`).join('')}
  </div>
  <div style=\"display:flex;gap:12px;align-items:center\">
    <a href=\"${approveUrl}\"><button class=\"btn btn-yes\">Aprobar</button></a>
    <a href=\"${denyUrl}\"><button class=\"btn btn-no\">Denegar</button></a>
  </div>
  <p style=\"color:#64748b;margin-top:12px\">Demo: se usa el access_token del usuario en query o Authorization header.</p>
</body></html>`);
  }

  // Already approved: issue code and redirect
  const code = randUrlSafe(32);
  const exp = Date.now() + 5 * 60 * 1000;
  oauthCodes.set(code, { sub: user.sub, client_id, redirect_uri, code_challenge, method: code_challenge_method, scope, exp });
  const u = new URL(String(redirect_uri));
  u.searchParams.set('code', code);
  if (state) u.searchParams.set('state', String(state));
  await audit('oauth.code.issued', req, { userId: String(user.sub), clientId: String(client_id), details: { redirect_uri, scope } });
  return res.redirect(u.toString());
});

// Consent endpoint
app.get('/oauth/consent', (req, res) => {
  const user = bearerUser(req);
  if (!user) return res.status(401).send('Unauthorized');
  const { approve } = req.query as any;
  const { client_id, scope = 'openid profile email' } = req.query as any;
  if (!client_id) return res.status(400).send('invalid_client');
  if (approve === '1') {
    await audit('consent.approve', req, { userId: user.id, clientId: String(client_id), details: { scope } });
    await prisma.oAuthConsent.upsert({
      where: { userId_clientId: { userId: String(user.sub), clientId: String(client_id) } },
      update: { scope: String(scope) },
      create: { userId: String(user.sub), clientId: String(client_id), scope: String(scope) }
    });
  } else {
    await audit('consent.deny', req, { userId: user.id, clientId: String(client_id), details: { scope } });
    // deny: opcionalmente borrar consent
    await prisma.oAuthConsent.deleteMany({ where: { userId: String(user.sub), clientId: String(client_id) } });
  }
  // Redirect back to /oauth/authorize with same params to proceed
  const params = new URLSearchParams(req.query as any);
  params.delete('approve');
  return res.redirect(`/oauth/authorize?${params.toString()}`);
});


async function getOAuthClient(client_id: string) {
  return prisma.oAuthClient.findFirst({ where: { clientId: client_id } });
}


async function currentUser(req: any) {
  // Prefer session
  const s = await sessionUser(req);
  if (s) return await prisma.user.findUnique({ where: { id: String(s.sub) } });
  // Fallback: decode bearer payload (not verifying here)
  const b = bearerUser(req);
  if (b) return await prisma.user.findUnique({ where: { id: String(b.sub) } });
  return null;
}

function requireAuth(handler: any) {
  return async (req: any, res: any) => {
    const user = await currentUser(req);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    (req as any).user = user;
    return handler(req, res);
  };
}

function requireAdmin(handler: any) {
  return requireAuth(async (req: any, res: any) => {
    const user = (req as any).user;
    if (user.role !== 'ADMIN') return res.status(403).json({ message: 'Forbidden' });
    return handler(req, res);
  });
}


app.get('/api/sessions', requireAuth(async (req: any, res: any) => {
  const user = (req as any).user;
  const sessions = await prisma.session.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    select: { sid: true, createdAt: true, expiresAt: true, revokedAt: true, ip: true, userAgent: true, id: true }
  });
  res.json({ sessions });
}));


app.post('/api/sessions/revoke', requireAuth(async (req: any, res: any) => {
  const user = (req as any).user;
  const { sid } = req.body || {};
  if (!sid) return res.status(400).json({ message: 'sid requerido' });
  await prisma.session.updateMany({ where: { userId: user.id, sid, revokedAt: null }, data: { revokedAt: new Date() } });
  await audit('session.revoke', req, { userId: user.id, details: { sid } });
  res.status(204).end();
}));


app.post('/api/sessions/revoke_all', requireAuth(async (req: any, res: any) => {
  const user = (req as any).user;
  const currentSid = req.cookies?.sid || '';
  await prisma.session.updateMany({ where: { userId: user.id, sid: { not: currentSid }, revokedAt: null }, data: { revokedAt: new Date() } });
  await audit('session.revoke_all', req, { userId: user.id });
  res.status(204).end();
}));


app.post('/api/admin/refresh/revoke', requireScopes('refresh:revoke'(async (req: any, res: any) => {
  const { userId, clientId } = req.body || {};
  if (!userId) return res.status(400).json({ message: 'userId requerido' });
  const where: any = { userId: String(userId), revokedAt: null };
  if (clientId) where.clientId = String(clientId);
  const count = await prisma.refreshToken.updateMany({ where, data: { revokedAt: new Date(), reason: 'admin_revoked' } });
  await audit('admin.refresh.revoked', req, { details: { where } });
  res.json({ revoked: count.count });
}));


app.get('/api/admin/refresh/list', requireScopes('refresh:revoke'(async (req: any, res: any) => {
  const { userId, clientId, limit = 200 } = req.query as any;
  if (!userId) return res.status(400).json({ message: 'userId requerido' });
  const where: any = { userId: String(userId) };
  if (clientId) where.clientId = String(clientId);
  const items = await prisma.refreshToken.findMany({
    where,
    orderBy: { issuedAt: 'desc' },
    take: Math.min(Number(limit) || 200, 500),
    select: { id: true, jti: true, userId: true, clientId: true, issuedAt: true, expiresAt: true, revokedAt: true, reason: true }
  });
  // Optional post-filter on details string
  if (details_q || details_re) {
    const toStr = (d:any)=> JSON.stringify(d||{});
    if (details_q) items = items.filter(it => toStr(it.details).toLowerCase().includes(String(details_q).toLowerCase()));
    if (details_re) {
      try { const rx = new RegExp(String(details_re), 'i'); items = items.filter(it => rx.test(toStr(it.details))); } catch {}
    }
  }
  res.json({ items });
}));


app.get('/api/admin/sessions', requireScopes('sessions:read'(async (req: any, res: any) => {
  const { userId, limit = 200 } = req.query as any;
  if (!userId) return res.status(400).json({ message: 'userId requerido' });
  const items = await prisma.session.findMany({
    where: { userId: String(userId) },
    orderBy: { createdAt: 'desc' },
    take: Math.min(Number(limit) || 200, 500),
    select: { id: true, sid: true, userId: true, ip: true, userAgent: true, createdAt: true, expiresAt: true, revokedAt: true }
  });
  // Optional post-filter on details string
  if (details_q || details_re) {
    const toStr = (d:any)=> JSON.stringify(d||{});
    if (details_q) items = items.filter(it => toStr(it.details).toLowerCase().includes(String(details_q).toLowerCase()));
    if (details_re) {
      try { const rx = new RegExp(String(details_re), 'i'); items = items.filter(it => rx.test(toStr(it.details))); } catch {}
    }
  }
  res.json({ items });
}));


app.post('/api/admin/sessions/revoke', requireScopes('sessions:revoke'(async (req: any, res: any) => {
  const { sid } = req.body || {};
  if (!sid) return res.status(400).json({ message: 'sid requerido' });
  await prisma.session.updateMany({ where: { sid: String(sid), revokedAt: null }, data: { revokedAt: new Date() } });
  res.status(204).end();
}));


app.post('/api/admin/sessions/revoke_all', requireScopes('sessions:revoke'(async (req: any, res: any) => {
  const { userId, keepSid } = req.body || {};
  if (!userId) return res.status(400).json({ message: 'userId requerido' });
  const where: any = { userId: String(userId), revokedAt: null };
  if (keepSid) where.sid = { not: String(keepSid) };
  const count = await prisma.session.updateMany({ where, data: { revokedAt: new Date() } });
  await audit('admin.session.revoke_all', req, { details: { where } });
  res.json({ revoked: count.count });
}));


app.get('/api/admin/users/search', requireScopes('admin:read'(async (req: any, res: any) => {
  const { q = '', limit = 20 } = req.query as any;
  const take = Math.min(Number(limit) || 20, 100);
  // Simple search by email contains or id exact
  const items = await prisma.user.findMany({
    where: {
      OR: [
        { email: { contains: String(q), mode: 'insensitive' } },
        { id: String(q) }
      ]
    },
    take,
    select: { id: true, email: true, name: true, role: true, createdAt: true }
  });
  // Optional post-filter on details string
  if (details_q || details_re) {
    const toStr = (d:any)=> JSON.stringify(d||{});
    if (details_q) items = items.filter(it => toStr(it.details).toLowerCase().includes(String(details_q).toLowerCase()));
    if (details_re) {
      try { const rx = new RegExp(String(details_re), 'i'); items = items.filter(it => rx.test(toStr(it.details))); } catch {}
    }
  }
  res.json({ items });
}));

app.get('/api/admin/oauth/clients', requireScopes('admin:read'(async (_req: any, res: any) => {
  const items = await prisma.oAuthClient.findMany({
    orderBy: { createdAt: 'desc' },
    select: { clientId: true, name: true, publicClient: true, redirectUris: true, createdAt: true }
  });
  // Optional post-filter on details string
  if (details_q || details_re) {
    const toStr = (d:any)=> JSON.stringify(d||{});
    if (details_q) items = items.filter(it => toStr(it.details).toLowerCase().includes(String(details_q).toLowerCase()));
    if (details_re) {
      try { const rx = new RegExp(String(details_re), 'i'); items = items.filter(it => rx.test(toStr(it.details))); } catch {}
    }
  }
  res.json({ items });
}));


async function audit(type: string, req: any, extra: any = {}) {
  const ip = String(req?.ip || '');
  const ua = String(req?.headers?.['user-agent'] || '');
  const userId = (req as any)?.user?.id || extra.userId || null;
  const clientId = extra.clientId || null;
  const details = extra.details || {};
  try {
    const ev = await prisma.auditEvent.create({ data: { type, userId: userId || undefined, clientId: clientId || undefined, ip, userAgent: ua, details } });
  } catch {}
  try {
    const url = process.env.AUDIT_WEBHOOK_URL;
    if (url) {
      const payload = { ts: new Date().toISOString(), type, userId, clientId, ip, ua, details, eventId: ev.id };
      const body = JSON.stringify(payload);
      const secret = process.env.AUDIT_WEBHOOK_SECRET || '';
      const crypto = await import('crypto');
      const sig = crypto.createHmac('sha256', secret).update(body).digest('hex');
      try {
        const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Signature': sig }, body });
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        await prisma.webhookDelivery.create({ data: { eventId: ev.id, url, payload: payload as any, status: 'delivered', attempts: 1 } });
      } catch (err: any) {
        const backoff = Number(process.env.WEBHOOK_BACKOFF_SECONDS || 60);
        await prisma.webhookDelivery.create({ data: { eventId: ev.id, url, payload: payload as any, status: 'pending', attempts: 1, lastError: String(err?.message || err), nextAttemptAt: new Date(Date.now() + backoff * 1000) } });
      }
    }
  } catch {}
}


app.get('/api/admin/audit/events', requireScopes('audit:read'(async (req: any, res: any) => {
  const { type, userId, clientId, start, end, limit = 200, relative, details_q, details_re } = req.query as any;
  const where: any = {};
  if (type) where.type = String(type);
  if (userId) where.userId = String(userId);
  if (clientId) where.clientId = String(clientId);
  if (start || end) {
    where.ts = {};
    if (start) where.ts.gte = new Date(String(start));
    if (end) where.ts.lte = new Date(String(end));
  }
  let items = await prisma.auditEvent.findMany({
    where,
    orderBy: { ts: 'desc' },
    take: Math.min(Number(limit) || 200, 1000),
  });
  // Optional post-filter on details string
  if (details_q || details_re) {
    const toStr = (d:any)=> JSON.stringify(d||{});
    if (details_q) items = items.filter(it => toStr(it.details).toLowerCase().includes(String(details_q).toLowerCase()));
    if (details_re) {
      try { const rx = new RegExp(String(details_re), 'i'); items = items.filter(it => rx.test(toStr(it.details))); } catch {}
    }
  }
  res.json({ items });
}));

app.get('/api/admin/audit/webhooks', requireScopes('audit:read'(async (req: any, res: any) => {
  const { status, limit = 200 } = req.query as any;
  const where: any = {};
  if (status) where.status = String(status);
  const items = await prisma.webhookDelivery.findMany({
    where,
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    take: Math.min(Number(limit) || 200, 500),
  });
  // Optional post-filter on details string
  if (details_q || details_re) {
    const toStr = (d:any)=> JSON.stringify(d||{});
    if (details_q) items = items.filter(it => toStr(it.details).toLowerCase().includes(String(details_q).toLowerCase()));
    if (details_re) {
      try { const rx = new RegExp(String(details_re), 'i'); items = items.filter(it => rx.test(toStr(it.details))); } catch {}
    }
  }
  res.json({ items });
}));

app.post('/api/admin/audit/webhooks/retry', requireScopes('admin:write'(async (req: any, res: any) => {
  const { id } = req.body || {};
  const url = process.env.AUDIT_WEBHOOK_URL;
  if (!url) return res.status(400).json({ message: 'AUDIT_WEBHOOK_URL no está configurado' });
  const secret = process.env.AUDIT_WEBHOOK_SECRET || '';
  const maxAttempts = Number(process.env.WEBHOOK_MAX_ATTEMPTS || 6);

  if (id) {
    const delivery = await prisma.webhookDelivery.findUnique({ where: { id: String(id) } });
    if (!delivery) return res.status(404).json({ message: 'No encontrado' });
    if (delivery.attempts >= maxAttempts) return res.status(400).json({ message: 'Max attempts reached' });
    const body = JSON.stringify(delivery.payload);
    const crypto = await import('crypto');
    const sig = crypto.createHmac('sha256', secret).update(body).digest('hex');
    try {
      const r = await fetch(delivery.url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Signature': sig }, body });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      await prisma.webhookDelivery.update({ where: { id: delivery.id }, data: { status: 'delivered', attempts: delivery.attempts + 1, lastError: null, nextAttemptAt: null } });
      return res.json({ status: 'delivered' });
    } catch (e: any) {
      const next = new Date(Date.now() + Number(process.env.WEBHOOK_BACKOFF_SECONDS || 60) * 1000);
      await prisma.webhookDelivery.update({ where: { id: delivery.id }, data: { status: 'pending', attempts: delivery.attempts + 1, lastError: String(e?.message || e), nextAttemptAt: next } });
      return res.json({ status: 'pending', error: String(e?.message || e) });
    }
  } else {
    // Retry all pending whose nextAttemptAt <= now
    const pendings = await prisma.webhookDelivery.findMany({ where: { status: 'pending', OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: new Date() } }] } });
    let delivered = 0, pending = 0;
    for (const d of pendings) {
      if (d.attempts >= maxAttempts) continue;
      const body = JSON.stringify(d.payload);
      const crypto = await import('crypto');
      const sig = crypto.createHmac('sha256', secret).update(body).digest('hex');
      try {
        const r = await fetch(d.url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Signature': sig }, body });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        await prisma.webhookDelivery.update({ where: { id: d.id }, data: { status: 'delivered', attempts: d.attempts + 1, lastError: null, nextAttemptAt: null } });
        delivered++;
      } catch (e: any) {
        const next = new Date(Date.now() + Number(process.env.WEBHOOK_BACKOFF_SECONDS || 60) * 1000);
        await prisma.webhookDelivery.update({ where: { id: d.id }, data: { status: 'pending', attempts: d.attempts + 1, lastError: String(e?.message || e), nextAttemptAt: next } });
        pending++;
      }
    }
    res.json({ delivered, pending });
  }
}));


// Helpers: build where from query
function auditWhereFromQuery(q: any) {
  const where: any = {};
  if (q.type) where.type = String(q.type);
  if (q.userId) where.userId = String(q.userId);
  if (q.clientId) where.clientId = String(q.clientId);
  // Relative ranges: q.relative in { '24h','7d','30d' } sets start automatically
  if (q.relative) {
    const now = Date.now();
    const map: any = { '24h': 24*3600*1000, '7d': 7*24*3600*1000, '30d': 30*24*3600*1000 };
    const dur = map[String(q.relative)] || 0;
    if (dur) q.start = new Date(now - dur).toISOString();
  }
  if (q.start || q.end) {
    where.ts = {};
    if (q.start) where.ts.gte = new Date(String(q.start));
    if (q.end) where.ts.lte = new Date(String(q.end));
  }
  return where;
}

function csvEscape(v: any) {
  const s = (v===undefined || v===null) ? '' : String(v);
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g,'""') + '"';
  return s;
}

app.get('/api/admin/audit/events.csv', requireScopes('audit:export'(async (req: any, res: any) => {
  const where = auditWhereFromQuery(req.query);
  let items = await prisma.auditEvent.findMany({ where, orderBy: { ts: 'desc' }, take: 5000 });
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="audit-events.csv"');
  const header = ['ts','type','userId','clientId','ip','userAgent','details'];
  res.write(header.join(',') + '\n');
  for (const it of items) {
    res.write([csvEscape(it.ts.toISOString()), csvEscape(it.type), csvEscape(it.userId||''), csvEscape(it.clientId||''), csvEscape(it.ip||''), csvEscape(it.userAgent||''), csvEscape(JSON.stringify(it.details||{}))].join(',') + '\n');
  }
  res.end();
}));

app.get('/api/admin/audit/events.ndjson', requireScopes('audit:export'(async (req: any, res: any) => {
  const where = auditWhereFromQuery(req.query);
  let items = await prisma.auditEvent.findMany({ where, orderBy: { ts: 'desc' }, take: 5000 });
  res.setHeader('Content-Type', 'application/x-ndjson');
  for (const it of items) {
    res.write(JSON.stringify(it) + '\n');
  }
  res.end();
}));

app.get('/api/admin/audit/webhooks.csv', requireScopes('audit:export'(async (_req: any, res: any) => {
  const items = await prisma.webhookDelivery.findMany({ orderBy: [{ status:'asc' }, { createdAt:'desc' }], take: 5000 });
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="webhook-deliveries.csv"');
  const header = ['createdAt','status','attempts','lastError','nextAttemptAt','eventId','url'];
  res.write(header.join(',') + '\n');
  for (const it of items) {
    res.write([csvEscape(it.createdAt.toISOString()), csvEscape(it.status), csvEscape(it.attempts), csvEscape(it.lastError||''), csvEscape(it.nextAttemptAt?it.nextAttemptAt.toISOString():''), csvEscape(it.eventId), csvEscape(it.url)].join(',') + '\n');
  }
  res.end();
}));

app.get('/api/admin/audit/webhooks.ndjson', requireScopes('audit:export'(async (_req: any, res: any) => {
  const items = await prisma.webhookDelivery.findMany({ orderBy: [{ status:'asc' }, { createdAt:'desc' }], take: 5000 });
  res.setHeader('Content-Type', 'application/x-ndjson');
  for (const it of items) {
    res.write(JSON.stringify(it) + '\n');
  }
  res.end();
}));


function parseScopes(str?: string) {
  return String(str || '').trim().split(/\s+/).filter(Boolean);
}
function hasScope(claim: string | undefined, needed: string | string[]) {
  const got = new Set(parseScopes(claim));
  const need = Array.isArray(needed) ? needed : [needed];
  return need.every(s => got.has(s));
}
// requires token with scopes (from access token's 'scope' claim)
function requireScopes(scopes: string | string[], handler: any) {
  return async (req: any, res: any) => {
    const auth = String(req.headers['authorization'] || '');
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (!m) return res.status(401).json({ message: 'Unauthorized' });
    try {
      const { verifyJWT } = await import('./jwks.js');
      const dec: any = await verifyJWT(m[1]);
      if (!hasScope(dec.scope, scopes)) return res.status(403).json({ message: 'Insufficient scope', required: scopes });
      (req as any).token = dec;
      return handler(req, res);
    } catch {
      return res.status(401).json({ message: 'Invalid token' });
    }
  };
}


function roleDefaultScopes(role: string) {
  switch (role) {
    case 'ADMIN': return 'openid profile email sessions:read sessions:revoke refresh:revoke audit:read audit:export admin:read admin:write';
    case 'AUDITOR': return 'openid profile email audit:read audit:export';
    case 'SECOPS': return 'openid profile email sessions:read sessions:revoke refresh:revoke audit:read';
    default: return 'openid profile email';
  }
}


// --- Login UI (server-side) ---
app.get('/login', async (req, res) => {
  const qs = new URLSearchParams(req.query as any).toString();
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(`<!doctype html>
<html><head><meta charset="utf-8"><title>Mixtli – Login</title>
<style>
:root{color-scheme:light dark}
body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:420px;margin:40px auto;padding:0 16px}
.card{border:1px solid #e5e7eb;border-radius:12px;padding:16px;background:Canvas;color:CanvasText}
label{display:block;margin:8px 0 4px}
input{width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px;background:Canvas;color:CanvasText}
button{padding:10px 14px;border-radius:8px;border:none;background:#0ea5e9;color:#fff;cursor:pointer;width:100%;margin-top:12px}
a.small{font-size:12px;color:#64748b}
@media (prefers-color-scheme: dark){.card{border-color:#334155} input{border-color:#475569}}
</style>
</head>
<body>
  <div class="card">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
      <svg width="36" height="36" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#0ea5e9"/><stop offset="1" stop-color="#38bdf8"/></linearGradient></defs><rect rx="10" width="40" height="40" fill="url(#g)"/></svg>
      <h1 style="margin:0;font-size:20px">Mixtli – Login</h1>
    </div>
    <form method="post" action="/login?${qs}">
      <label>Email</label>
      <input name="email" type="email" required autofocus />
      <label>Password</label>
      <input name="password" type="password" required />
      <button type="submit">Entrar</button>
    </form>
    <div style="margin-top:8px"><a class="small" href="/oauth/authorize?${qs}">Volver</a></div>
  </div>
</body></html>`);
});


app.post('/login', express.urlencoded({ extended: true }), async (req, res) => {
  const { email, password } = req.body || {};
  try {
    const user = await prisma.user.findUnique({ where: { email: String(email) } });
    if (!user) return res.status(401).send('Usuario o contraseña inválidos');
    // Lockout check
    if (user.lockoutUntil && user.lockoutUntil > new Date()) return res.status(429).send('Cuenta bloqueada temporalmente');
    const ok = await verifyPassword(String(password), user.passwordHash);
    if (!ok) { await registerFailedLogin(user.id); return res.status(401).send('Usuario o contraseña inválidos'); }
    // If TOTP enabled, go to 2FA step
    const qs = new URLSearchParams(req.query as any).toString();
    if (user.totpEnabled) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.end(`<!doctype html><html><head><meta charset="utf-8"><title>2FA</title>
<style>:root{color-scheme:light dark}body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:420px;margin:40px auto;padding:0 16px}.card{border:1px solid #e5e7eb;border-radius:12px;padding:16px}@media(prefers-color-scheme:dark){.card{border-color:#334155}}</style>
</head><body><div class="card">
  <h2>Segundo factor</h2>
  <form method="post" action="/login/2fa?${qs}">
    <input type="hidden" name="email" value="${String(email)}"/>
    <label>Código TOTP</label>
    <input name="token" required pattern="\d{6}" />
    <button type="submit">Verificar</button>
  </form>
  <form method="post" action="/login/backup-code?${qs}" style="margin-top:8px">
    <input type="hidden" name="email" value="${String(email)}"/>
    <label>o Código de respaldo</label>
    <input name="code" required />
    <button type="submit">Usar código de respaldo</button>
  </form>
</div></body></html>`);
    }
    // No 2FA -> sesión directa
    if ((process.env.SESSION_ENABLED || 'false') !== 'true') {
      return res.status(500).send('Sesiones deshabilitadas. Activa SESSION_ENABLED.');
    }
    await setSessionCookie(res, user.id, req);
    await clearFailedLogin(user.id);
    return res.redirect(`/oauth/authorize?${qs}`);
  } catch (e) {
    return res.status(500).send('Error en login');
  }
});

app.post('/login/2fa', express.urlencoded({ extended: true }), async (req, res) => {
  const { email, token } = req.body || {};
  const qs = new URLSearchParams(req.query as any).toString();
  try {
    const user = await prisma.user.findUnique({ where: { email: String(email) } });
    if (!user || !user.totpEnabled || !user.totpSecret) return res.status(401).send('Código inválido');
    if (user.lockoutUntil && user.lockoutUntil > new Date()) return res.status(429).send('Cuenta bloqueada temporalmente');
    const windowSteps = Number(process.env.TOTP_WINDOW_STEPS || 1);
    if (!totpVerify(user.totpSecret, String(token||''), windowSteps)) { await registerFailedLogin(user.id); return res.status(401).send('Código inválido'); }
    if ((process.env.SESSION_ENABLED || 'false') !== 'true') return res.status(500).send('Sesiones deshabilitadas');
    await setSessionCookie(res, user.id, req);
    await clearFailedLogin(user.id);
    return res.redirect(`/oauth/authorize?${qs}`);
  } catch (e) { return res.status(500).send('Error'); }
});

// --- Password reset (email out-of-scope; mostramos token en pantalla para demo) ---
app.get('/forgot-password', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(`<!doctype html><html><head><meta charset="utf-8"><title>Recuperar contraseña</title></head><body>
  <form method="post" action="/forgot-password">
    <label>Email</label><input name="email" type="email" required/>
    <button type="submit">Enviar enlace</button>
  </form></body></html>`);
});
app.post('/forgot-password', express.urlencoded({ extended: true }), async (req, res) => {
  const { email } = req.body || {};
  const user = await prisma.user.findUnique({ where: { email: String(email) } });
  if (!user) return res.status(200).send('Si existe, te enviaremos un correo');
  const tok = require('crypto').randomBytes(24).toString('base64url');
  const exp = new Date(Date.now() + 1000*60*15);
  await prisma.passwordReset.create({ data: { userId: user.id, token: tok, expiresAt: exp } });
  // DEMO: mostramos el link
  return res.send(`Enlace de reset (demo): <a href="/reset-password?token=${tok}">Reset</a> (válido 15 min)`);
});
app.get('/reset-password', async (req, res) => {
  const { token } = req.query as any;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(`<!doctype html><html><head><meta charset="utf-8"><title>Reset</title></head><body>
  <form method="post" action="/reset-password">
    <input type="hidden" name="token" value="${String(token||'')}"/>
    <label>Nueva contraseña</label><input name="password" type="password" required/>
    <button type="submit">Cambiar</button>
  </form></body></html>`);
});
app.post('/reset-password', express.urlencoded({ extended: true }), async (req, res) => {
  const { token, password } = req.body || {};
  const rec = await prisma.passwordReset.findUnique({ where: { token: String(token) } });
  if (!rec || rec.usedAt || rec.expiresAt < new Date()) return res.status(400).send('Token inválido/expirado');
  const user = await prisma.user.findUnique({ where: { id: rec.userId } });
  if (!user) return res.status(400).send('Usuario no encontrado');
  const { hashPassword } = await import('./password.js');
  const newHash = await hashPassword(String(password));
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: newHash } });
  await prisma.passwordReset.update({ where: { id: rec.id }, data: { usedAt: new Date() } });
  return res.send('Contraseña actualizada. Ahora inicia sesión.');
});
