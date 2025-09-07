/**
 * server.onefile.attach.js
 * Demo server (with real sends + attachments) — choose provider by env:
 *   MAIL_PROVIDER=sendgrid  (requires SENDGRID_API_KEY, MAIL_FROM_*)
 *   MAIL_PROVIDER=ses       (requires AWS creds + region, MAIL_FROM_*)
 * If not configured, falls back to DRY log.
 *
 * Endpoints:
 *  GET  /                      -> health
 *  POST /events/send           -> JSON { to, subject, html?, text?, attachments?: [{filename, contentBase64, type?, disposition?, cid?}] }
 *  POST /events/send-multipart -> multipart/form-data (fields: to, subject, text/html optional, file field: attachment)
 *  GET  /debug/mail-log        -> { items: [...] }
 */
import 'dotenv/config';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import multer from 'multer';

const app = express();
app.use(cors({ origin: true }));
app.options('*', cors({ origin: true }));
app.use(bodyParser.json({ limit: '20mb' })); // permite adjuntos en base64

const upload = multer({ limits: { fileSize: 35 * 1024 * 1024 } }); // 35MB por seguridad

// --- Mail transport (SendGrid | SES | DRY) ---
const DRY = String(process.env.DRY_RUN_EMAIL || '') === '1';
const provider = (process.env.MAIL_PROVIDER || '').toLowerCase();

async function sendMail({ to, subject, html, text, attachments }) {
  if (DRY || !provider) {
    recordMail({ mode: 'DRY', provider: provider || 'none', to, subject, attachments: (attachments||[]).map(a=>({filename:a.filename, size: (a.contentBase64? (a.contentBase64.length*0.75|0) : a.content?.length||0)})), htmlPreview: html?.slice(0,500) });
    return { dryRun: true };
  }

  if (provider === 'sendgrid') {
    const sg = (await import('@sendgrid/mail')).default;
    sg.setApiKey(process.env.SENDGRID_API_KEY);
    const msg = {
      to,
      from: { email: process.env.MAIL_FROM_EMAIL, name: process.env.MAIL_FROM_NAME || 'Mixtli' },
      subject,
      text,
      html,
      attachments: (attachments||[]).map(a => ({
        content: a.contentBase64 || (a.content ? Buffer.from(a.content).toString('base64') : ''),
        filename: a.filename,
        type: a.type || 'application/octet-stream',
        disposition: a.disposition || 'attachment',
        content_id: a.cid
      }))
    };
    const out = await sg.send(msg);
    recordMail({ mode: 'LIVE', provider: 'sendgrid', to, subject, count: out?.length||1 });
    return { sent: true };
  }

  if (provider === 'ses') {
    // Use Nodemailer with SESv2 (supports attachments easily)
    const nodemailer = (await import('nodemailer')).default;
    const { SESv2Client } = await import('@aws-sdk/client-sesv2');
    const sesv2 = new SESv2Client({ region: process.env.AWS_REGION || 'us-east-1' });
    const transporter = nodemailer.createTransport({ SES: { sesv2, aws: {}}});
    const info = await transporter.sendMail({
      from: `"${process.env.MAIL_FROM_NAME || 'Mixtli'}" <${process.env.MAIL_FROM_EMAIL}>`,
      to, subject, text, html,
      attachments: (attachments||[]).map(a => ({
        filename: a.filename,
        content: a.contentBase64 ? Buffer.from(a.contentBase64, 'base64') : a.content,
        contentType: a.type || 'application/octet-stream',
        cid: a.cid,
        contentDisposition: a.disposition || 'attachment'
      }))
    });
    recordMail({ mode: 'LIVE', provider: 'ses', to, subject, messageId: info?.messageId });
    return { sent: true };
  }

  recordMail({ mode: 'DRY', provider: 'unknown', to, subject });
  return { dryRun: true };
}

// --- In‑memory mail log for demo ---
const mailLog = [];
function recordMail(entry) {
  mailLog.unshift({ ts: new Date().toISOString(), ...entry });
  if (mailLog.length > 50) mailLog.pop();
}

// --- Routes ---
app.get('/', (_req, res) => res.json({ status: 'ok', mode: DRY?'DRY':'LIVE', provider: provider || 'none', maxHint: provider==='sendgrid'?'~30MB total':'up to 40MB (SES v2)', time: new Date().toISOString() }));

app.post('/events/send', async (req, res) => {
  try {
    const { to, subject, html, text, attachments } = req.body || {};
    if (!to || !subject) return res.status(400).json({ error: 'to y subject son requeridos' });
    const result = await sendMail({ to, subject, html, text, attachments });
    return res.json({ ok: true, ...result });
  } catch (e) {
    console.error('send error', e);
    res.status(500).json({ error: 'send_failed', detail: String(e?.message||e) });
  }
});

app.post('/events/send-multipart', upload.single('attachment'), async (req, res) => {
  try {
    const to = req.body.to;
    const subject = req.body.subject;
    const text = req.body.text;
    const html = req.body.html;
    if (!to || !subject) return res.status(400).json({ error: 'to y subject son requeridos' });

    const file = req.file;
    const attachments = [];
    if (file) {
      attachments.push({
        filename: file.originalname,
        contentBase64: Buffer.from(file.buffer).toString('base64'),
        type: file.mimetype,
        disposition: 'attachment'
      });
    }
    const result = await sendMail({ to, subject, html, text, attachments });
    res.json({ ok: true, ...result, attached: file? { name: file.originalname, size: file.size } : null });
  } catch (e) {
    console.error('multipart send error', e);
    res.status(500).json({ error: 'send_failed', detail: String(e?.message||e) });
  }
});

app.get('/debug/mail-log', (_req, res) => res.json({ items: mailLog }));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`✉️  Attach server ready on ${port} (provider:${provider||'none'} ${DRY?'DRY':'LIVE'})`));
