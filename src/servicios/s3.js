// Servicio de S3 (AWS SDK v3)
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const REGION = process.env.S3_REGION;
const BUCKET = process.env.S3_BUCKET;
const ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY;

if (!REGION || !BUCKET || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY) {
  console.warn("[S3] Faltan variables de entorno. Requeridas: S3_REGION, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY");
}

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  },
});

async function uploadBufferToS3(file) {
  // file: objeto de multer (memoria), file.buffer, file.originalname, file.mimetype
  const key = `uploads/${Date.now()}-${(file.originalname || "archivo")}`;
  const cmd = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype || "application/octet-stream",
  });
  await s3.send(cmd);
  // URL pública si el bucket tiene acceso público; si no, al menos regresamos el key
  return {
    key,
    bucket: BUCKET,
    // URL "estándar" (puede no ser pública según políticas del bucket)
    url: `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`,
  };
}

module.exports = {
  uploadBufferToS3,
};
