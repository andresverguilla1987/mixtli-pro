const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

function s3Client() {
  const endpoint = process.env.S3_ENDPOINT || undefined; // útil para Backblaze/MinIO
  const region = process.env.S3_REGION || 'us-east-1';
  const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === 'true'; // para MinIO
  return new S3Client({
    region,
    endpoint,
    forcePathStyle,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
    }
  });
}

async function presignPut({ Bucket, Key, ContentType, expiresInSec = 900 }) {
  const client = s3Client();
  const cmd = new PutObjectCommand({ Bucket, Key, ContentType });
  const url = await getSignedUrl(client, cmd, { expiresIn: expiresInSec });
  return url;
}

async function presignGet({ Bucket, Key, expiresInSec = 900 }) {
  const client = s3Client();
  const cmd = new GetObjectCommand({ Bucket, Key });
  const url = await getSignedUrl(client, cmd, { expiresIn: expiresInSec });
  return url;
}

module.exports = { presignPut, presignGet };
