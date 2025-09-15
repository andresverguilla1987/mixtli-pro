// utils/s3.js
import { S3Client, ListObjectsV2Command, HeadBucketCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function boolFromEnv(v, def=false) {
  if (v === undefined || v === null || v === "") return def;
  const s = String(v).trim().toLowerCase();
  if (["1","true","yes","y","on"].includes(s)) return true;
  if (["0","false","no","n","off"].includes(s)) return false;
  return def;
}

export function buildS3() {
  const endpoint = process.env.S3_ENDPOINT || undefined;
  const region = process.env.S3_REGION || "us-east-1";
  const forcePathStyle = boolFromEnv(process.env.S3_FORCE_PATH_STYLE, !!endpoint);

  const accessKeyId = process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;

  const credentials = (accessKeyId && secretAccessKey) ? { accessKeyId, secretAccessKey } : undefined;

  const cfg = { region, forcePathStyle };
  if (endpoint) cfg.endpoint = endpoint;
  if (credentials) cfg.credentials = credentials;

  const client = new S3Client(cfg);
  return { client, cfg };
}

export async function headBucketSafe({ client, bucket }) {
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    return { ok: true };
  } catch (err) {
    return { ok: false, code: err?.name || err?.Code || "HeadBucketError", detail: String(err) };
  }
}

export async function listAll({ client, bucket, prefix="", limit=200 }) {
  let items = [];
  let ContinuationToken = undefined;
  try {
    while (items.length < limit) {
      const resp = await client.send(new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix || undefined,
        ContinuationToken,
        MaxKeys: Math.min(1000, limit - items.length)
      }));
      const contents = resp?.Contents || [];
      for (const c of contents) {
        items.push({
          key: c.Key,
          size: Number(c.Size || 0),
          lastModified: c.LastModified ? new Date(c.LastModified).toISOString() : null,
          type: null
        });
        if (items.length >= limit) break;
      }
      if (!resp.IsTruncated) break;
      ContinuationToken = resp.NextContinuationToken;
    }
    return { ok: true, items };
  } catch (err) {
    return { ok: false, code: err?.name || err?.Code || "ListObjectsError", detail: String(err) };
  }
}

export async function presignUpload({ client, bucket, key, contentType, expiresSeconds=900 }) {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType || "application/octet-stream"
  });
  const url = await getSignedUrl(client, command, { expiresIn: expiresSeconds });
  return { url, method: "PUT", headers: { "Content-Type": contentType || "application/octet-stream" } };
}

export async function presignGet({ client, bucket, key, expiresSeconds=3600 }) {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  const url = await getSignedUrl(client, command, { expiresIn: expiresSeconds });
  return { url };
}