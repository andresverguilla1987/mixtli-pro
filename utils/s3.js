// utils/s3.js
// Node 18+ / 22, AWS SDK v3
import { S3Client, ListObjectsV2Command, HeadBucketCommand, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Build a configured S3 client for AWS S3, Cloudflare R2 or MinIO.
 * Env:
 *  - S3_REGION
 *  - S3_ENDPOINT (empty for AWS S3; URL for R2/MinIO)
 *  - S3_ACCESS_KEY_ID
 *  - S3_SECRET_ACCESS_KEY
 *  - S3_FORCE_PATH_STYLE ("true"|"false")
 */
export function buildS3() {
  const forcePath = String(process.env.S3_FORCE_PATH_STYLE || "false").toLowerCase() === "true";
  const endpointRaw = process.env.S3_ENDPOINT?.trim();
  const endpoint = endpointRaw ? new URL(endpointRaw).toString() : undefined;

  const cfg = {
    region: process.env.S3_REGION || "us-east-1",
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
    },
    forcePathStyle: forcePath,
  };
  if (endpoint) cfg["endpoint"] = endpoint;

  return new S3Client(cfg);
}

const s3 = buildS3();
const BUCKET = process.env.S3_BUCKET;

/** Safe head-bucket for health checks */
export async function headBucketSafe() {
  try {
    const out = await s3.send(new HeadBucketCommand({ Bucket: BUCKET }));
    return { ok: true, statusCode: out["$metadata"]?.httpStatusCode || 200 };
  } catch (err) {
    return {
      ok: false,
      name: err?.name,
      message: err?.message,
      statusCode: err?.$metadata?.httpStatusCode || 500,
    };
  }
}

/** List all objects (optionally prefix + limit) */
export async function listAll({ prefix = "", limit = 1000 } = {}) {
  let isTruncated = true;
  let ContinuationToken = undefined;
  const items = [];
  while (isTruncated && items.length < limit) {
    const out = await s3.send(new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: prefix || undefined,
      ContinuationToken,
      MaxKeys: Math.min(1000, limit - items.length),
    }));
    (out.Contents || []).forEach(obj => {
      items.push({
        key: obj.Key,
        size: obj.Size,
        lastModified: obj.LastModified,
        etag: obj.ETag,
      });
    });
    isTruncated = !!out.IsTruncated;
    ContinuationToken = out.NextContinuationToken;
  }
  return items;
}

/**
 * Presign a PUT for uploads.
 * Accepts: key (required), contentType (optional)
 */
export async function presignUpload({ key, contentType, expiresSeconds = 900 } = {}) {
  if (!key) throw new Error("key required");
  const cmd = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType || "application/octet-stream",
  });
  const url = await getSignedUrl(s3, cmd, { expiresIn: expiresSeconds });
  return { url, bucket: BUCKET, key };
}

/** Presign a GET for downloads */
export async function presignGet({ key, expiresSeconds = 900 } = {}) {
  if (!key) throw new Error("key required");
  const cmd = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });
  const url = await getSignedUrl(s3, cmd, { expiresIn: expiresSeconds });
  return { url, bucket: BUCKET, key };
}

export default {
  buildS3,
  listAll,
  presignUpload,
  presignGet,
  headBucketSafe,
};