// utils/s3.js
// Compatible with Node 18+ (ESM). Uses AWS SDK v3.
import { S3Client, HeadBucketCommand, ListObjectsV2Command, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// ---- env helpers -----------------------------------------------------------
function boolFromEnv(value, fallback=false) {
  if (value === undefined || value === null) return fallback;
  const v = String(value).trim().toLowerCase();
  return v in { "1":1, "true":1, "yes":1, "on":1 };
}

const CONFIG = {
  bucket: process.env.S3_BUCKET,
  region: process.env.S3_REGION || "us-east-1",
  endpoint: process.env.S3_ENDPOINT || null,
  accessKeyId: process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY,
  forcePathStyle: boolFromEnv(process.env.S3_FORCE_PATH_STYLE, false),
};

let _s3 = null;

/**
 * buildS3(): creates (or returns cached) S3Client and config.
 * Exported because some callers import it directly.
 */
export function buildS3() {
  if (_s3) return { s3: _s3, config: CONFIG };
  const clientConfig = {
    region: CONFIG.region,
    credentials: (CONFIG.accessKeyId && CONFIG.secretAccessKey) ? {
      accessKeyId: CONFIG.accessKeyId,
      secretAccessKey: CONFIG.secretAccessKey,
    } : undefined,
    forcePathStyle: CONFIG.forcePathStyle,
  };
  if (CONFIG.endpoint) {
    clientConfig.endpoint = CONFIG.endpoint;
  }
  _s3 = new S3Client(clientConfig);
  return { s3: _s3, config: CONFIG };
}

function getClient() {
  return buildS3().s3;
}

function getBucket() {
  const { config } = buildS3();
  if (!config.bucket) {
    throw new Error("S3_BUCKET is not set.");
  }
  return config.bucket;
}

// ---- helpers ---------------------------------------------------------------

export async function headBucketSafe() {
  const s3 = getClient();
  const Bucket = getBucket();
  try {
    await s3.send(new HeadBucketCommand({ Bucket }));
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.name || String(err), details: (err?.$metadata ? err.$metadata : undefined) };
  }
}

export async function listAll(prefix = "", maxKeys = 1000) {
  const s3 = getClient();
  const Bucket = getBucket();
  let ContinuationToken = undefined;
  const items = [];
  do {
    const out = await s3.send(new ListObjectsV2Command({ Bucket, Prefix: prefix || undefined, MaxKeys: maxKeys, ContinuationToken }));
    (out.Contents || []).forEach(obj => {
      items.push({
        key: obj.Key,
        size: obj.Size,
        lastModified: obj.LastModified,
        etag: obj.ETag,
      });
    });
    ContinuationToken = out.IsTruncated ? out.NextContinuationToken : undefined;
  } while (ContinuationToken);
  return items;
}

/**
 * Returns a presigned URL for PUT upload.
 * @param {Object} p
 * @param {string} p.key - object key
 * @param {string} p.contentType - mime type
 * @param {number} [p.expiresSeconds=900]
 */
export async function presignUpload({ key, contentType, expiresSeconds = 900 }) {
  if (!key) throw new Error("key is required");
  const s3 = getClient();
  const Bucket = getBucket();
  const Command = new PutObjectCommand({
    Bucket,
    Key: key,
    ContentType: contentType || "application/octet-stream",
  });
  const url = await getSignedUrl(s3, Command, { expiresIn: expiresSeconds });
  return {
    url,
    method: "PUT",
    key,
    bucket: Bucket,
    headers: { "Content-Type": contentType || "application/octet-stream" },
  };
}

/**
 * Returns a presigned URL for GET download.
 * @param {Object} p
 * @param {string} p.key
 * @param {number} [p.expiresSeconds=900]
 */
export async function presignGet({ key, expiresSeconds = 900 }) {
  if (!key) throw new Error("key is required");
  const s3 = getClient();
  const Bucket = getBucket();
  const Command = new GetObjectCommand({ Bucket, Key: key });
  const url = await getSignedUrl(s3, Command, { expiresIn: expiresSeconds });
  return { url, method: "GET", key, bucket: Bucket };
}

// default export (optional for consumers that prefer default import)
export default {
  buildS3,
  headBucketSafe,
  listAll,
  presignUpload,
  presignGet,
};
