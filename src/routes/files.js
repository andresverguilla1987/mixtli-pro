const express = require('express');
const router = express.Router();
const { authRequired } = require('../middlewares/auth'); // usa tu middleware existente
const files = require('../controllers/filesController');

// Todas requieren auth
router.post('/presign', authRequired, files.createPresignedUpload);
router.get('/', authRequired, files.listMyFiles);
router.get('/:key/download', authRequired, files.createDownloadLink);

module.exports = router;
