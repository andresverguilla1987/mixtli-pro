
import sgMail from '@sendgrid/mail';
import { env } from '../env.js';
import { prisma } from '../auth.js';
import { storage } from '../storage.js';

export function registerEmailRoutes(app) {
  app.post('/email/send', async (req, res) => {
    const user = req.user;
    const { uploadId, to, message } = req.body || {};
    if (!to) return res.status(400).json({ error: 'to required' });
    const upload = await prisma.upload.findUnique({ where: { id: uploadId } });
    if (!upload || upload.userId !== user.id) return res.status(404).json({ error: 'upload not found' });
    if (new Date(upload.expiresAt) < new Date()) return res.status(410).json({ error: 'upload expired' });
    if (upload.scanStatus === 'FAILED' || upload.status === 'BLOCKED') return res.status(423).json({ error: 'blocked by antivirus' });

    const { url } = await storage.presignGet({ key: upload.key, expiresInSec: 60*60*24 }); // 24h link
    const text = `Hola,
    
${message || 'Te compartieron un archivo.'}

Descarga aquí (expira en 24h):
${url}

— Mixtli
`;

    if (!env.sendgrid.apiKey) return res.status(500).json({ error: 'SENDGRID_API_KEY not set' });
    sgMail.setApiKey(env.sendgrid.apiKey);
    const mail = {
      to,
      from: env.sendgrid.from,
      subject: 'Te compartieron un archivo (Mixtli)',
      text
    };
    await sgMail.send(mail);
    return res.json({ ok: true });
  });
}
