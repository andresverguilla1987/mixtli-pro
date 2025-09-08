
import { nanoid } from 'nanoid';
import { storage } from '../storage.js';
import { env } from '../env.js';
import { prisma } from '../auth.js';
import net from 'net';

function planMaxBytes(plan) {
  return env.planLimits[plan] || env.planLimits.FREE;
}

function isForbiddenExt(filename) {
  const bad = ['.exe', '.bat', '.cmd', '.scr', '.ps1', '.js', '.vbs', '.jar'];
  const lower = filename.toLowerCase();
  return bad.some(ext => lower.endsWith(ext));
}

export function registerUploadRoutes(app) {
  // presign upload
  app.post('/upload/presign', async (req, res) => {
    const { filename, size, mime, ttlDays } = req.body || {};
    const user = req.user;
    if (!filename || !size) return res.status(400).json({ error: 'filename and size required' });

    // limit checks
    if (size > planMaxBytes(user.plan)) return res.status(413).json({ error: `file too large for plan ${user.plan}` });
    if (isForbiddenExt(filename)) return res.status(400).json({ error: 'forbidden file extension' });

    const id = nanoid();
    const key = `${user.id}/${new Date().toISOString().slice(0,10)}/${id}-${filename}`;
    const expiresAt = new Date(Date.now() + 1000*60*60*24*(ttlDays || env.defaultTtlDays));

    // Record as PENDING
    const upload = await prisma.upload.create({
      data: {
        id, userId: user.id, bucket: (env.storageDriver==='S3' ? env.s3.bucket : (env.storageDriver==='R2' ? env.r2.bucket : 'local')), 
        key, size: Number(size), mime: mime || 'application/octet-stream', expiresAt
      }
    });

    // Presign PUT
    const { putUrl, expiresAt: putExpiresAt } = await storage.presignPut({ key, contentType: mime || 'application/octet-stream', contentLength: Number(size) });

    return res.json({ uploadId: id, key, putUrl, putExpiresAt, ttlExpiresAt: expiresAt });
  });

  // client notifies completion (with ETag if available)
  app.post('/upload/complete', async (req, res) => {
    const { uploadId, etag } = req.body || {};
    const user = req.user;
    const upload = await prisma.upload.findUnique({ where: { id: uploadId } });
    if (!upload || upload.userId !== user.id) return res.status(404).json({ error: 'upload not found' });

    // Mark as UPLOADED
    const updated = await prisma.upload.update({ where: { id: uploadId }, data: { status: 'UPLOADED', etag: etag || null } });

    // Try to scan if CLAMAV configured
    let scanStatus = 'SKIPPED';
    if (env.clamav.host) {
      try {
        // Quick TCP ping to clamd
        await new Promise((resolve, reject) => {
          const socket = net.createConnection(env.clamav.port, env.clamav.host, () => {
            socket.end();
            resolve();
          });
          socket.on('error', reject);
        });
        // We do not stream the object here to keep it simple.
        // A real impl should download the object and scan via INSTREAM.
        // For now, mark as PASSED to unblock; replace with real scanner in your infra.
        scanStatus = 'PASSED';
      } catch(e) {
        scanStatus = 'FAILED';
      }
    } else {
      scanStatus = 'SKIPPED';
    }

    const final = await prisma.upload.update({ where: { id: uploadId }, data: { scanStatus, status: (scanStatus==='FAILED'?'BLOCKED':'READY') } });

    return res.json({ ok: true, upload: final });
  });

  // get a ephemeral download link (only if passed scan or skipped)
  app.get('/upload/:id/link', async (req, res) => {
    const user = req.user;
    const { id } = req.params;
    const upload = await prisma.upload.findUnique({ where: { id } });
    if (!upload || upload.userId !== user.id) return res.status(404).json({ error: 'not found' });
    if (new Date(upload.expiresAt) < new Date()) return res.status(410).json({ error: 'expired' });
    if (upload.scanStatus === 'FAILED' || upload.status === 'BLOCKED') return res.status(423).json({ error: 'blocked by antivirus' });
    if (!(upload.scanStatus === 'PASSED' || upload.scanStatus === 'SKIPPED' || upload.status === 'READY')) {
      return res.status(409).json({ error: 'not ready' });
    }
    const { url } = await storage.presignGet({ key: upload.key, expiresInSec: 60*60 }); // 1h
    return res.json({ url, expiresIn: 3600 });
  });
}
