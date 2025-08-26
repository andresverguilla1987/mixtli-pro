const { Router } = require('express');
const multer = require('multer');
const AWS = require('aws-sdk');

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const s3 = new AWS.S3({
  accessKeyId: process.env.S3_ACCESS_KEY_ID,
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  region: process.env.S3_REGION,
});

router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const params = {
      Bucket: process.env.S3_BUCKET,
      Key: Date.now() + "-" + req.file.originalname,
      Body: req.file.buffer,
      ContentType: req.file.mimetype
    };

    const data = await s3.upload(params).promise();
    res.json({ ok: true, url: data.Location });
  } catch (err) {
    console.error('Error uploading file:', err);
    res.status(500).json({ error: 'Error uploading file' });
  }
});

module.exports = router;
