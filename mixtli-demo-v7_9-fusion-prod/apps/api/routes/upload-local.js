const { Router } = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { customAlphabet } = require('nanoid');
const nanoid = customAlphabet('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz', 10);

function ensureDir(dir){ if(!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); }

module.exports = function uploadLocal({ basePath = '' } = {}) {
  const router = Router();
  const uploadsRoot = path.join(__dirname, '../../..', 'public', 'uploads');
  ensureDir(uploadsRoot);

  const storage = multer.diskStorage({
    destination: function(_req, _file, cb){ cb(null, uploadsRoot); },
    filename: function(_req, file, cb){
      const id = nanoid();
      const ext = (file.originalname||'').includes('.') ? '.'+file.originalname.split('.').pop() : '';
      cb(null, id + ext);
    }
  });

  const upload = multer({
    storage,
    limits: { fileSize: Number(process.env.UPLOAD_MAX_BYTES || 200*1024*1024) }, // 200MB demo
    fileFilter: (_req, file, cb)=>{
      // Basic allowlist example; customize as needed
      const bad = ['application/x-dosexec','application/x-msdownload'];
      if (bad.includes(file.mimetype)) return cb(new Error('file_type_not_allowed'));
      cb(null, true);
    }
  }).single('file');

  router.post(`${basePath}/upload`, (req, res) => {
    upload(req, res, (err) => {
      if (err) {
        const code = err.message === 'file_type_not_allowed' ? 400 : 413;
        return res.status(code).json({ ok: false, error: err.message });
      }
      if (!req.file) return res.status(400).json({ ok:false, error: 'no_file' });
      const fileUrl = `/preview/uploads/${req.file.filename}`;
      return res.json({ ok:true, file:{ name:req.file.originalname, size:req.file.size, url:fileUrl } });
    });
  });

  return router;
};
