
// src/lib/s3.js - CommonJS
const { S3Client, ListObjectsV2Command, DeleteObjectCommand } = require("@aws-sdk/client-s3");

const REGION = process.env.AWS_REGION || process.env.S3_REGION || "us-east-1";
const BUCKET = process.env.S3_BUCKET;

if (!BUCKET) {
  console.error("⚠️  FALTA la variable de entorno S3_BUCKET");
}

const s3 = new S3Client({
  region: REGION,
  // Las credenciales vienen del entorno: AWS_ACCESS_KEY_ID y AWS_SECRET_ACCESS_KEY
});

async function list(prefix = "uploads/") {
  const cmd = new ListObjectsV2Command({
    Bucket: BUCKET,
    Prefix: prefix
  });
  const res = await s3.send(cmd);
  const items = (res.Contents || []).map(obj => ({
    key: obj.Key,
    size: obj.Size,
    lastModified: obj.LastModified
  }));
  return items;
}

async function remove(key) {
  const cmd = new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: key
  });
  await s3.send(cmd);
  return { ok: true };
}

module.exports = {
  list,
  remove,
  BUCKET,
  REGION,
};
