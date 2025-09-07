/**
 * server.onefile.attach.multi.js
 * LIVE email with multi-attachments via SendGrid or SES. Falls back to DRY log.
 * Env:
 *   MAIL_PROVIDER=sendgrid|ses
 *   DRY_RUN_EMAIL=0|1
 *   MAIL_FROM_EMAIL, MAIL_FROM_NAME
 *   SENDGRID_API_KEY | (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION)
 */
import 'dotenv/config';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import multer from 'multer';

const app = express();
app.use(cors({ origin: true }));
app.options('*', cors({ origin: true }));
app.use(bodyParser.json({ limit: '50mb' })); // base64 attachments
const upload = multer({ limits: { fileSize: 40 * 1024 * 1024 } }); // per-file cap ~40MB

const DRY = String(process.env.DRY_RUN_EMAIL || '') === '1';
const provider = (process.env.MAIL_PROVIDER || '').toLowerCase();

const mailLog = [];
function recordMail(entry) {
  mailLog.unshift({ ts: new Date().toISOString(), ...entry });
  if (mailLog.length > 100) mailLog.pop();
}

async function sendMail({ to, subject, html, text, attachments }) {
  if (DRY || !provider) {
    recordMail({ mode: 'DRY', provider: provider || 'none', to, subject,
      attachments: (attachments||[]).map(a=>({ filename: a.filename, size: a._size || 0, type: a.type || 'application/octet-stream' })),
      htmlPreview: html?.slice(0, 500)
    });
    return { dryRun: true };
  }

  if (provider === 'sendgrid') {
    const sg = (await import('@sendgrid/mail')).default;
    sg.setApiKey(process.env.SENDGRID_API_KEY);
    const msg = {
      to,
      from: { email: process.env.MAIL_FROM_EMAIL, name: process.env.MAIL_FROM_NAME || 'Mixtli' },
      subject, text, html,
      attachments: (attachments||[]).map(a => ({
        content: a.contentBase64 || (a.content ? Buffer.from(a.content).toString('base64') : ''),
        filename: a.filename,
        type: a.type || 'application/octet-stream',
        disposition: a.disposition || 'attachment',
        content_id: a.cid
      }))
    };
    const out = await sg.send(msg);
    recordMail({ mode: 'LIVE', provider: 'sendgrid', to, subject, count: out?.length || 1 });
    return { sent: true };
  }

  if (provider === 'ses') {
    const nodemailer = (await import('nodemailer')).default;
    const { SESv2Client } = await import('@aws-sdk/client-sesv2');
    const sesv2 = new SESv2Client({ region: process.env.AWS_REGION || 'us-east-1' });
    const transporter = nodemailer.createTransport({ SES: { sesv2, aws: {} } });
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

// Routes
app.get('/', (_req, res) => res.json({
  status: 'ok', mode: DRY ? 'DRY' : 'LIVE', provider: provider || 'none', time: new Date().toISOString()
}));

app.post('/events/send', async (req, res) => {
  try {
    const { to, subject, html, text, attachments } = req.body || {};
    if (!to || !subject) return res.status(400).json({ error: 'to y subject son requeridos' });
    // annotate size if base64 present
    for (const a of (attachments || [])) {
      if (a?.contentBase64) a._size = Math.floor(a.contentBase64.length * 0.75);
    }
    const result = await sendMail({ to, subject, html, text, attachments });
    res.json({ ok: true, ...result });
  } catch (e) {
    console.error('send error', e);
    res.status(500).json({ error: 'send_failed', detail: String(e?.message || e) });
  }
});

// single-file backward compatible
app.post('/events/send-multipart', upload.single('attachment'), async (req, res) => {
  try {
    const { to, subject, text, html } = req.body || {};
    if (!to || !subject) return res.status(400).json({ error: 'to y subject son requeridos' });
    const atts = [];
    if (req.file) {
      atts.push({
        filename: req.file.originalname,
        contentBase64: Buffer.from(req.file.buffer).toString('base64'),
        type: req.file.mimetype,
        disposition: 'attachment',
        _size: req.file.size
      });
    }
    const result = await sendMail({ to, subject, html, text, attachments: atts });
    res.json({ ok: true, ...result, attached: atts.map(a => ({ name: a.filename, size: a._size })) });
  } catch (e) {
    console.error('multipart send error', e);
    res.status(500).json({ error: 'send_failed', detail: String(e?.message || e) });
  }
});

// multi-files
app.post('/events/send-multipart-multi', upload.array('attachments', 10), async (req, res) => {
  try {
    const { to, subject, text, html } = req.body || {};
    if (!to || !subject) return res.status(400).json({ error: 'to y subject son requeridos' });
    const atts = (req.files || []).map(f => ({
      filename: f.originalname,
      contentBase64: Buffer.from(f.buffer).toString('base64'),
      type: f.mimetype,
      disposition: 'attachment',
      _size: f.size
    }));
    const result = await sendMail({ to, subject, html, text, attachments: atts });
    res.json({ ok: true, ...result, attached: atts.map(a => ({ name: a.filename, size: a._size })) });
  } catch (e) {
    console.error('multipart multi send error', e);
    res.status(500).json({ error: 'send_failed', detail: String(e?.message || e) });
  }
});

app.get('/debug/mail-log', (_req, res) => res.json({ items: mailLog }));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`✉️  Attach server (multi) on ${port} mode=${DRY?'DRY':'LIVE'} provider=${provider||'none'}`));
