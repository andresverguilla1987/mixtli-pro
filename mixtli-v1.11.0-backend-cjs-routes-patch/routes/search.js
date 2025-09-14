const express = require('express');
const router = express.Router();
const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: { accessKeyId: process.env.R2_KEY, secretAccessKey: process.env.R2_SECRET }
});

router.get('/search', async (req, res) => {
  try {
    const { q = '', type = 'all', page = 1, pageSize = 50 } = req.query;
    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Number(pageSize);

    let items = [];
    let token = undefined;
    do {
      const out = await s3.send(new ListObjectsV2Command({
        Bucket: process.env.R2_BUCKET,
        ContinuationToken: token
      }));
      (out.Contents || []).forEach(o => {
        items.push({
          id: o.Key,
          key: o.Key,
          name: o.Key.split('/').pop(),
          size: o.Size,
          createdAt: o.LastModified
        });
      });
      token = out.IsTruncated ? out.NextContinuationToken : undefined;
      if (items.length >= 2000) break; // guard
    } while (token);

    let filtered = items;
    if (q) filtered = filtered.filter(x => (x.name || '').toLowerCase().includes(String(q).toLowerCase()));
    if (type && type !== 'all') {
      const exts = type === 'image' ? ['.jpg','.jpeg','.png','.webp','.gif'] :
                   type === 'video' ? ['.mp4','.mov','.mkv','.webm'] :
                   ['.pdf','.doc','.docx','.xls','.xlsx','.ppt','.pptx'];
      filtered = filtered.filter(x => exts.some(e => (x.name || '').toLowerCase().endsWith(e)));
    }

    filtered.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    const total = filtered.length;
    const pageItems = filtered.slice(skip, skip + take);
    res.json({ items: pageItems, total, page: Number(page), pageSize: take });
  } catch (e) {
    console.error('search error', e);
    res.status(500).json({ error: 'search failed', detail: String(e?.message || e) });
  }
});

module.exports = router;
