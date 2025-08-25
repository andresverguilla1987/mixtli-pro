const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const REGION = process.env.S3_REGION;
const BUCKET = process.env.S3_BUCKET;

if (!REGION || !BUCKET || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
  console.warn("[S3] Faltan variables de entorno. Requeridas: S3_REGION, S3_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY");
}

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ""
  }
});

async function subirArchivo({ buffer, mimetype, key }) {
  const cmd = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: mimetype,
    ACL: "public-read"
  });
  await s3.send(cmd);
  // URL pública (formato estándar)
  const url = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${encodeURIComponent(key)}`;
  return url;
}

module.exports = { subirArchivo };
