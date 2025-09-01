// src/lib/s3.js (CommonJS)
const { S3Client, GetBucketCorsCommand, PutBucketCorsCommand } = require('@aws-sdk/client-s3');

const {
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  AWS_REGION = 'us-east-1',
  S3_BUCKET,
  S3_ENDPOINT,
  S3_FORCE_PATH_STYLE,
  ALLOWED_ORIGINS
} = process.env;

if (!S3_BUCKET) {
  console.warn('[uploads] S3_BUCKET no definido. Los endpoints responderán 501.');
}

const s3 = new S3Client({
  region: AWS_REGION,
  endpoint: S3_ENDPOINT || undefined,
  forcePathStyle: S3_FORCE_PATH_STYLE === 'true',
  credentials: (AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY) ? {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY
  } : undefined
});

async function ensureBucketCors(origin) {
  try {
    await s3.send(new GetBucketCorsCommand({ Bucket: S3_BUCKET }));
    return true;
  } catch (_err) {
    const allowed = origin || ALLOWED_ORIGINS || '*';
    const rules = [{
      AllowedMethods: ['PUT', 'GET', 'HEAD'],
      AllowedOrigins: allowed.split(','),
      AllowedHeaders: ['*'],
      ExposeHeaders: ['ETag'],
      MaxAgeSeconds: 3000
    }];
    try {
      await s3.send(new PutBucketCorsCommand({ Bucket: S3_BUCKET, CORSConfiguration: { CORSRules: rules } }));
      return true;
    } catch (e) {
      console.warn('[uploads] No se pudo configurar CORS automáticamente:', e?.message || e);
      return false;
    }
  }
}

function partSizeFor(size) {
  const min = 5 * 1024 * 1024; // 5MB
  if (!size || size < min) return min;
  return Math.max(min, 10 * 1024 * 1024); // default 10MB
}

module.exports = { s3, ensureBucketCors, partSizeFor };
