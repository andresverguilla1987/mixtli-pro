const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const REGION = process.env.S3_REGION;
const BUCKET = process.env.S3_BUCKET;
const ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;

if (!REGION || !BUCKET || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY) {
  console.warn("[S3] Faltan variables de entorno. Requeridas: S3_REGION, S3_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY");
}

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: ACCESS_KEY_ID || "",
    secretAccessKey: SECRET_ACCESS_KEY || "",
  },
});

async function putObject({ key, body, contentType }) {
  const input = {
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
    ACL: "public-read", // Haz el objeto público. Quita esta línea si tu bucket es privado.
  };
  await s3.send(new PutObjectCommand(input));
  const location = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${encodeURIComponent(key)}`;
  return { key, location };
}

module.exports = { putObject };
