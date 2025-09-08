// apps/api/routes/preview-gallery-demo.js
const { Router } = require('express');
module.exports = function previewGalleryDemo({ basePath = '' } = {}) {
  const router = Router();
  const items = Array.from({length:6}).map((_,i)=> ({
    title: `Shot ${i+1}`,
    desc: 'Captura de producto',
    url: `/preview/gallery/shot${i+1}.svg`
  }));
  router.get(`${basePath}/gallery/list`, (_req,res) => res.json(items));
  return router;
};

// USO:
// const previewGalleryDemo = require('./apps/api/routes/preview-gallery-demo');
// app.use(previewGalleryDemo({ basePath: '' }));
