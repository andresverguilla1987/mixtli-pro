import { S3Client, HeadBucketCommand, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { Readable } from "node:stream";

function parseAllowedOrigins(str) {
  if (!str) return [];
  try {
    const parsed = JSON.parse(str);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  return String(str).split(",").map(s => s.trim()).filter(Boolean);
}

export const cfg = {
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || "",
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || "",
  AWS_REGION: process.env.AWS_REGION || "auto",
  S3_ENDPOINT: process.env.S3_ENDPOINT || "",
  S3_BUCKET: process.env.S3_BUCKET || "",
  S3_FORCE_PATH_STYLE: (process.env.S3_FORCE_PATH_STYLE || "false").toLowerCase() === "true",
  ALLOWED_ORIGINS: parseAllowedOrigins(process.env.ALLOWED_ORIGINS || ""),
};

if (!cfg.S3_BUCKET) {
  console.warn("[WARN] S3_BUCKET vacío, define la variable de entorno.");
}

export const bucket = cfg.S3_BUCKET;

const clientConfig = {
  region: cfg.AWS_REGION,
  forcePathStyle: cfg.S3_FORCE_PATH_STYLE,
  credentials: {
    accessKeyId: cfg.AWS_ACCESS_KEY_ID,
    secretAccessKey: cfg.AWS_SECRET_ACCESS_KEY,
  },
};

if (cfg.S3_ENDPOINT) {
  clientConfig.endpoint = cfg.S3_ENDPOINT;
}

export const s3Client = new S3Client(clientConfig);

export async function ensureBucketAccess() {
  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: bucket }));
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e?.message || String(e) };
  }
}

export async function listKeys(prefix = "", limit = 100) {
  const resp = await s3Client.send(new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: prefix,
    MaxKeys: limit
  }));
  const contents = resp.Contents || [];
  return contents.map(o => ({
    key: o.Key,
    size: o.Size,
    lastModified: o.LastModified,
    etag: o.ETag,
  }));
}

export async function streamGetObject({ key, res }) {
  const obj = await s3Client.send(new GetObjectCommand({
    Bucket: bucket,
    Key: key
  }));
  if (obj.ContentType) res.setHeader("Content-Type", obj.ContentType);
  if (obj.ContentLength) res.setHeader("Content-Length", String(obj.ContentLength));
  const body = obj.Body;
  if (body instanceof Readable) {
    body.pipe(res);
  } else {
    const arr = await obj.Body?.transformToByteArray?.();
    if (arr) res.send(Buffer.from(arr));
    else res.status(500).json({ error: "stream_failed" });
  }
}

export async function presignPost({ key, contentType, size }) {
  const Expires = 1800;
  const Conditions = [
    ["content-length-range", 0, Math.max(size, 1) + 5 * 1024 * 1024],
    ["starts-with", "$Content-Type", contentType.split(";")[0]],
  ];
  const Fields = { "Content-Type": contentType };

  const { url, fields } = await createPresignedPost(s3Client, {
    Bucket: bucket,
    Key: key,
    Conditions,
    Fields,
    Expires,
  });
  return { url, fields, bucket, key, expiresIn: Expires };
}
