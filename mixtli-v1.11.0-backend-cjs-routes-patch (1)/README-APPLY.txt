Mixtli — Backend CJS Routes Patch
1) Copia routes/search.js y routes/upload.js.
2) En server.js añade:
   const searchRoute = require('./routes/search');
   const uploadRoute = require('./routes/upload');
   app.use('/api', searchRoute);
   app.use('/api', uploadRoute);
3) npm i @aws-sdk/client-s3 multer
