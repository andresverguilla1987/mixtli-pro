
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const crypto = require("crypto");
const path = require("path");

const REGION = process.env.S3_REGION;
const BUCKET = process.env.S3_BUCKET;
const ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY;
const ENDPOINT = process.env.S3_ENDPOINT || undefined; // normalmente undefined para AWS

if (!REGION || !BUCKET || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY) {
  console.warn("[S3] Falta configurar variables de entorno S3. Revisa S3_REGION, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY");
}

const client = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  },
  endpoint: ENDPOINT, // si es AWS puro, se ignora
  forcePathStyle: !!ENDPOINT, // útil para endpoints compatibles
});

function randomKey(originalName = "file") {
  const ext = path.extname(originalName) || "";
  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).zfill ? String(now.getUTCMonth() + 1).zfill(2) : ("0" + (now.getUTCMonth() + 1)).slice(-2);
  const dd = String(now.getUTCDate()).zfill ? String(now.getUTCDate()).zfill(2) : ("0" + now.getUTCDate()).slice(-2);
  const id = crypto.randomUUID();
  return `${yyyy}/${mm}/${dd}/${id}${ext}`;
}

async function uploadBuffer(file) {
  if (!file || !file.buffer) {
    throw new Error("Archivo inválido (faltó 'file.buffer')");
  }
  const Key = randomKey(file.originalname);
  const cmd = new PutObjectCommand({
    Bucket: BUCKET,
    Key,
    Body: file.buffer,
    ContentType: file.mimetype || "application/octet-stream",
    ACL: "private",
  });
  await client.send(cmd);

  // URL pública si tu bucket permite lectura pública; si no, devuelve path lógico
  const publicUrl = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${Key}`;
  return { Key, Location: publicUrl };
}

async function createPresignedUrl(filename, contentType) {
  const Key = randomKey(filename);
  const cmd = new PutObjectCommand({
    Bucket: BUCKET,
    Key,
    ContentType: contentType || "application/octet-stream",
    ACL: "private",
  });
  const url = await getSignedUrl(client, cmd, { expiresIn: 60 }); // 60s
  return { url, Key };
}

module.exports = {
  uploadBuffer,
  createPresignedUrl,
};
