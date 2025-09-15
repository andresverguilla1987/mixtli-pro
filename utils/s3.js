import { S3Client, ListObjectsV2Command, HeadBucketCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const reqBool = (v) => typeof v === "string" && v.trim() !== "";
const parseJson = (s, fallback) => { try { return JSON.parse(s); } catch { return fallback; } };

export function buildS3() {
  const bucket = process.env.S3_BUCKET || "";
  const endpoint = process.env.S3_ENDPOINT || undefined;
  const region = process.env.AWS_REGION || (endpoint ? "auto" : "us-east-1");
  const forcePathStyle = String(process.env.S3_FORCE_PATH_STYLE || "").toLowerCase() === "true";
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID || "";
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || "";
  const creds =
    (reqBool(accessKeyId) && reqBool(secretAccessKey))
      ? { accessKeyId, secretAccessKey }
      : undefined; // let SDK try default chain, but on Render you'll want envs

  const client = new S3Client({ region, endpoint, forcePathStyle, credentials: creds });
  return { client, bucket, region, endpoint, forcePathStyle };
}

export async function headBucketSafe(client, bucket) {
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.name || "HeadBucketError", message: err?.message };
  }
}

export async function listAll({ client, bucket, prefix = "", maxKeys = 160 }) {
  const out = [];
  let ContinuationToken;
  do {
    const res = await client.send(new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      MaxKeys: Math.min(maxKeys, 1000),
      ContinuationToken
    }));
    (res.Contents || []).forEach(obj => {
      out.push({
        key: obj.Key,
        size: obj.Size,
        lastModified: obj.LastModified?.toISOString?.() || obj.LastModified,
        type: guessType(obj.Key)
      });
    });
    ContinuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (ContinuationToken && out.length < maxKeys);
  return out;
}

function guessType(key) {
  const k = key.toLowerCase();
  if (k.endsWith(".jpg") || k.endsWith(".jpeg")) return "image/jpeg";
  if (k.endsWith(".png")) return "image/png";
  if (k.endsWith(".gif")) return "image/gif";
  if (k.endsWith(".webp")) return "image/webp";
  if (k.endsWith(".mp4")) return "video/mp4";
  if (k.endsWith(".mov")) return "video/quicktime";
  return "application/octet-stream";
}

export async function presignUpload({ client, bucket, key, maxMb = 500 }) {
  const fields = {};
  const conditions = [
    ["content-length-range", 0, maxMb * 1024 * 1024],
  ];
  return await createPresignedPost(client, {
    Bucket: bucket,
    Key: key,
    Expires: 3600,
    Fields: fields,
    Conditions: conditions,
  });
}

export async function presignGet({ client, bucket, key, expires = 3600 }) {
  const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
  const url = await getSignedUrl(client, cmd, { expiresIn: expires });
  return url;
}