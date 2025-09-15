// utils/s3.js
// Drop-in S3/R2 helper compatible with AWS S3 and Cloudflare R2.
// Reads env in both "S3_*" and "AWS_*" formats and supports forcePathStyle.

import { S3Client, ListObjectsV2Command, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const env = (k, d=undefined) => (process.env[k] ?? d);

const BUCKET = env("S3_BUCKET");
const REGION = env("S3_REGION", "us-east-1");
const ENDPOINT = env("S3_ENDPOINT"); // e.g. https://<accountid>.r2.cloudflarestorage.com
const FORCE_PATH_STYLE = String(env("S3_FORCE_PATH_STYLE", "false")).toLowerCase() === "true";

const ACCESS_KEY_ID = env("S3_ACCESS_KEY_ID") || env("AWS_ACCESS_KEY_ID");
const SECRET_ACCESS_KEY = env("S3_SECRET_ACCESS_KEY") || env("AWS_SECRET_ACCESS_KEY");

function assertEnv() {
  if (!BUCKET) {
    throw new Error("[s3] Missing S3_BUCKET env");
  }
  // creds are usually required (R2 & S3); fail friendly if incomplete
  const hasAccess = !!ACCESS_KEY_ID;
  const hasSecret = !!SECRET_ACCESS_KEY;
  if (hasAccess !== hasSecret) {
    throw new Error("[s3] Incomplete credentials: provide both S3_ACCESS_KEY_ID/AWS_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY/AWS_SECRET_ACCESS_KEY");
  }
  if (!hasAccess) {
    throw new Error("[s3] Missing credentials. Set S3_ACCESS_KEY_ID/S3_SECRET_ACCESS_KEY (or AWS_* variants).");
  }
}
assertEnv();

const client = new S3Client({
  region: REGION,
  endpoint: ENDPOINT || undefined,
  forcePathStyle: FORCE_PATH_STYLE, // true for R2, false for AWS S3 virtual-host style
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  },
});

function extToMime(key) {
  const m = (key || "").toLowerCase();
  if (m.endsWith(".jpg") || m.endsWith(".jpeg")) return "image/jpeg";
  if (m.endsWith(".png")) return "image/png";
  if (m.endsWith(".gif")) return "image/gif";
  if (m.endsWith(".webp")) return "image/webp";
  if (m.endsWith(".mp4")) return "video/mp4";
  if (m.endsWith(".mov")) return "video/quicktime";
  if (m.endsWith(".mkv")) return "video/x-matroska";
  if (m.endsWith(".zip")) return "application/zip";
  return "application/octet-stream";
}

export async function listAll({ prefix = "", limit = 1000 } = {}) {
  let ContinuationToken = undefined;
  const out = [];
  do {
    const res = await client.send(new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: prefix || undefined,
      ContinuationToken,
      MaxKeys: Math.min(1000, limit),
    }));
    const items = (res.Contents || []).map(o => ({
      key: o.Key,
      size: Number(o.Size || 0),
      lastModified: o.LastModified ? new Date(o.LastModified).toISOString() : null,
      type: extToMime(o.Key || ""),
    }));
    out.push(...items);
    ContinuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (ContinuationToken && out.length < limit);
  return out.slice(0, limit);
}

export async function head(key) {
  const res = await client.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
  return {
    key,
    size: Number(res.ContentLength || 0),
    type: res.ContentType || extToMime(key),
    lastModified: res.LastModified ? new Date(res.LastModified).toISOString() : null,
    metadata: res.Metadata || {},
  };
}

export async function presignPut({ key, contentType, expiresIn = 900 /* 15 min */ }) {
  if (!key) throw new Error("presignPut: key is required");
  const cmd = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType || extToMime(key),
  });
  const url = await getSignedUrl(client, cmd, { expiresIn });
  return { url, key };
}

export async function presignGet({ key, expiresIn = 900 }) {
  if (!key) throw new Error("presignGet: key is required");
  const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  const url = await getSignedUrl(client, cmd, { expiresIn });
  return { url, key };
}

export async function remove(key) {
  await client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  return { ok: true, key };
}

export async function put({ key, body, contentType }) {
  await client.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType || extToMime(key),
  }));
  return { ok: true, key };
}

export const bucketInfo = {
  bucket: BUCKET,
  endpoint: ENDPOINT || "(aws s3 default)",
  region: REGION,
  forcePathStyle: FORCE_PATH_STYLE,
};

console.log("[s3] bucketInfo =", bucketInfo);
