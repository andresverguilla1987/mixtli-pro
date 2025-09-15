// utils/s3.js - ESM
import { S3Client, ListObjectsV2Command, HeadBucketCommand, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const toBool = (v) => {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return v.trim().toLowerCase() === "true";
  return !!v;
};

export function buildS3() {
  const endpoint = process.env.S3_ENDPOINT || undefined; // e.g., https://<accountid>.r2.cloudflarestorage.com
  const region = process.env.S3_REGION || "us-east-1";
  const forcePathStyle = toBool(process.env.S3_FORCE_PATH_STYLE || "false"); // R2=true, AWS=false

  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  const credentials = (accessKeyId && secretAccessKey) ? { accessKeyId, secretAccessKey } : undefined;

  const client = new S3Client({
    region,
    endpoint,
    forcePathStyle,
    credentials,
  });
  return client;
}

export const s3 = buildS3();
const BUCKET = process.env.S3_BUCKET;

export async function headBucketSafe() {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: BUCKET }));
    return true;
  } catch (err) {
    console.error("[headBucketSafe] error:", err);
    return false;
  }
}

export async function listAll({ prefix = "", maxKeys = 160 } = {}) {
  const out = await s3.send(new ListObjectsV2Command({
    Bucket: BUCKET,
    Prefix: prefix,
    MaxKeys: maxKeys,
  }));
  const items = (out.Contents || []).map(obj => ({
    key: obj.Key,
    size: obj.Size,
    lastModified: obj.LastModified && (typeof obj.LastModified.toISOString === "function" ? obj.LastModified.toISOString() : obj.LastModified),
    etag: obj.ETag,
  }));
  return items;
}

export async function presignUpload({ key, contentType, expiresIn = 3600 }) {
  const cmd = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });
  const url = await getSignedUrl(s3, cmd, { expiresIn });
  return url;
}

export async function presignGet({ key, expiresIn = 3600 }) {
  const cmd = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });
  const url = await getSignedUrl(s3, cmd, { expiresIn });
  return url;
}
