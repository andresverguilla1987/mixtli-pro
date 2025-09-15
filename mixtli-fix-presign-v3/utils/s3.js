import { S3Client, PutObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function boolEnv(name, def=false) {
  const v = process.env[name];
  if (v == null) return def;
  return String(v).toLowerCase() in { "1":1, "true":1, "yes":1, "on":1 };
}

export function makeS3() {
  const region = process.env.S3_REGION || process.env.AWS_REGION || "us-east-1";
  const endpoint = process.env.S3_ENDPOINT || undefined;
  const forcePathStyle = boolEnv("S3_FORCE_PATH_STYLE", false);

  const accessKeyId = process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error("S3 credentials missing: set S3_ACCESS_KEY_ID/S3_SECRET_ACCESS_KEY (o AWS_*)");
  }

  const client = new S3Client({
    region,
    endpoint,
    forcePathStyle,
    credentials: { accessKeyId, secretAccessKey }
  });

  return client;
}

function guessMime(key) {
  const k = String(key).toLowerCase();
  if (k.endsWith(".jpg") || k.endsWith(".jpeg")) return "image/jpeg";
  if (k.endsWith(".png")) return "image/png";
  if (k.endsWith(".gif")) return "image/gif";
  if (k.endsWith(".webp")) return "image/webp";
  if (k.endsWith(".mp4")) return "video/mp4";
  if (k.endsWith(".mov")) return "video/quicktime";
  if (k.endsWith(".mp3")) return "audio/mpeg";
  if (k.endsWith(".wav")) return "audio/wav";
  return "application/octet-stream";
}

export async function presignPut({ bucket, key, contentType, expires=900 }) {
  if (!bucket) throw new Error("bucket required");
  if (!key) throw new Error("key required");
  const ct = contentType || guessMime(key);

  const s3 = makeS3();
  const cmd = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: ct });
  const url = await getSignedUrl(s3, cmd, { expiresIn: expires });
  return { bucket, key, url, expiresIn: expires };
}

export async function listAll({ bucket, prefix="", max=1000 }) {
  if (!bucket) throw new Error("bucket required");
  const s3 = makeS3();
  const out = [];
  let token = undefined;
  do {
    const resp = await s3.send(new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix || undefined,
      ContinuationToken: token,
      MaxKeys: Math.min(max, 1000)
    }));
    (resp.Contents || []).forEach(obj => {
      out.push({
        key: obj.Key,
        size: obj.Size,
        lastModified: obj.LastModified?.toISOString?.() || null,
        type: guessMime(obj.Key)
      });
    });
    token = resp.IsTruncated ? resp.NextContinuationToken : undefined;
  } while (token && out.length < max);
  return out;
}