// server.onefile.js (TOTP con tolerancia ±30s)
import 'dotenv/config';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { authenticator } from 'otplib';
import qrcode from 'qrcode';
import PDFDocument from 'pdfkit';

// ✅ tolerancia de reloj: acepta códigos del paso anterior/siguiente (±30s)
authenticator.options = { window: 1 };

// ---- In‑memory store (demo) ----
const users = new Map();
const mailLog = [];
function getUser(email, name='Admin Demo') {
  let u = users.get(email);
  if (!u) {
    u = { id: 'mem-' + Math.random().toString(36).slice(2), email, name, twoFactorEnabled: false };
    users.set(email, u);
  }
  return u;
}
function genCodes(n=10) {
  const rnd = () => Math.random().toString(36).slice(2,6);
  return Array.from({length:n}, () => `${rnd()}-${rnd()}-${rnd()}`);
}
function logMail(entry) {
  mailLog.unshift({ ts: new Date().toISOString(), ...entry });
  if (mailLog.length > 50) mailLog.pop();
}

const app = express();
app.use(cors({ origin: true }));
app.options('*', cors({ origin: true }));
app.use(bodyParser.json({ limit: '1mb' }));

app.use((req, _res, next) => {
  const email = req.header('X-User-Email') || 'admin@mixtli.test';
  req.user = getUser(email);
  next();
});

app.get('/', (_req, res) => res.json({ status: 'ok', app: process.env.APP_NAME || 'Mixtli Pro', time: new Date().toISOString() }));

app.post('/security/2fa/setup', async (req, res) => {
  const user = req.user;
  const secret = authenticator.generateSecret();
  user.twoFactorSecret = secret;
  const otpauth = authenticator.keyuri(user.email, process.env.TOTP_ISSUER || 'Mixtli', secret);
  const qrDataUrl = await qrcode.toDataURL(otpauth);
  res.json({ otpauth, qrDataUrl });
});

app.post('/security/2fa/enable', (req, res) => {
  const user = req.user;
  if (!user.twoFactorSecret) return res.status(400).json({ error: 'No hay secreto pendiente' });
  const { code } = req.body || {};
  const ok = authenticator.check(code || '', user.twoFactorSecret);
  if (!ok) return res.status(400).json({ error: 'Código inválido' });
  user.twoFactorEnabled = true;
  user.recoveryCodes = genCodes(10);
  res.json({ enabled: true, recoveryCodes: user.recoveryCodes });
});

app.post('/events/login', (req, res) => {
  const user = req.user;
  const subject = 'Nuevo inicio de sesión';
  const htmlPreview = `<p>Login detectado para ${user.email} en ${new Date().toLocaleString('es-MX')}</p>`;
  logMail({ mode: 'DRY', to: user.email, subject, htmlPreview, provider: 'demo' });
  res.json({ sent: true, dryRun: true });
});

app.get('/debug/mail-log', (_req, res) => {
  res.json({ items: mailLog });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🧪 One‑file demo server (window=1) on ${port}`));
