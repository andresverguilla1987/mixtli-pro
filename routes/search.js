import { Router } from 'express';
import { listAll } from '../utils/s3.js';

const router = Router();

router.get('/search', async (req, res) => {
  const { q = '', type = 'all', albumId, from, to, page = 1, pageSize = 50 } = req.query;
  const mimeStarts = type === 'image' ? 'image/' : type === 'video' ? 'video/' : type === 'doc' ? 'application/' : null;
  const skip = (Number(page) - 1) * Number(pageSize);
  const take = Number(pageSize);

  // R2 listing fallback (no DB)
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
    const exts = mimeStarts === 'image/' ? ['.jpg','.jpeg','.png','.webp','.gif'] :
                 mimeStarts === 'video/' ? ['.mp4','.mov','.mkv','.webm'] :
                 ['.pdf','.doc','.docx','.xls','.xlsx','.ppt','.pptx'];
    items = items.filter(x => exts.some(e => x.name?.toLowerCase().endsWith(e)));
  }
  if (albumId) items = items.filter(x => x.key.startsWith(`${albumId}/`) || x.key.includes(`/${albumId}/`));

  const total = items.length;
  items.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  items = items.slice(skip, skip + take);
  res.json({ items, total, page: Number(page), pageSize: take });
});

export default router;
