const express = require('express');
const router = express.Router();
const { listAll, head } = require('../utils/s3');

let prisma = null;
if (process.env.USE_PRISMA === 'true') {
  try { prisma = new (require('@prisma/client').PrismaClient)(); } catch {}
}

function parseDateYM(s) {
  // '2025-09' -> Date range for month
  if (!s) return {};
  const [y, m] = s.split('-').map(Number);
  if (!y || !m) return {};
  const from = new Date(Date.UTC(y, m - 1, 1));
  const to = new Date(Date.UTC(m === 12 ? y+1 : y, m === 12 ? 0 : m, 1));
  return { from, to };
}

router.get('/search', async (req, res) => {
  const { q = '', type = 'all', albumId, from, to, page = 1, pageSize = 50 } = req.query;
  const mimeStarts = type === 'image' ? 'image/' :
                     type === 'video' ? 'video/' :
                     type === 'doc'   ? 'application/' : null;
  const skip = (Number(page) - 1) * Number(pageSize);
  const take = Number(pageSize);

  if (prisma) {
    const where = {
      ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
      ...(albumId ? { albumId } : {}),
      ...(mimeStarts ? { mimeType: { startsWith: mimeStarts } } : {}),
      ...((from || to) ? { createdAt: {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lt: new Date(to) } : {}),
      }} : {}),
    };
    const [items, total] = await prisma.$transaction([
      prisma.file.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
      prisma.file.count({ where }),
    ]);
    return res.json({ items, total, page: Number(page), pageSize: take });
  }

  // Fallback: R2 listing (basic)
  const all = await listAll(process.env.R2_BUCKET, '');
  let items = all.map(o => ({
    id: o.Key,
    name: o.Key.split('/').pop(),
    key: o.Key,
    createdAt: o.LastModified,
    size: o.Size,
    mimeType: undefined,
    albumId: undefined,
    thumbnailUrl: undefined,
    url: undefined,
  }));

  if (q) items = items.filter(x => x.name && x.name.toLowerCase().includes(String(q).toLowerCase()));
  if (mimeStarts) {
    // try to filter by extension as approximation
    const exts = mimeStarts === 'image/' ? ['.jpg','.jpeg','.png','.webp','.gif'] :
                 mimeStarts === 'video/' ? ['.mp4','.mov','.mkv','.webm'] :
                 ['.pdf','.doc','.docx','.xls','.xlsx','.ppt','.pptx'];
    items = items.filter(x => exts.some(e => x.name?.toLowerCase().endsWith(e)));
  }
  if (albumId) items = items.filter(x => x.key.startsWith(`${albumId}/`) || x.key.includes(`/${albumId}/`));

  if (from || to) {
    const range = parseDateYM(from) || {};
    const range2 = parseDateYM(to) || {};
    const fromD = range.from || (from ? new Date(from) : null);
    const toD = range2.to || (to ? new Date(to) : null);
    items = items.filter(x => {
      const t = new Date(x.createdAt).getTime();
      if (fromD && t < fromD.getTime()) return false;
      if (toD && t >= toD.getTime()) return false;
      return true;
    });
  }

  const total = items.length;
  items.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  items = items.slice(skip, skip + take);
  res.json({ items, total, page: Number(page), pageSize: take });
});

module.exports = router;
