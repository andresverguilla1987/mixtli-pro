import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const client = new S3Client({
  region: process.env.S3_REGION,
  endpoint: process.env.S3_ENDPOINT || undefined,
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  },
});

export async function presignUpload({ Bucket, Key, ContentType }) {
  const expires = 60 * (process.env.LINK_TTL_MIN || 15);
  const cmd = new PutObjectCommand({ Bucket, Key, ContentType });
  return await getSignedUrl(client, cmd, { expiresIn: expires });
}

export async function presignDownload({ Bucket, Key }) {
  const expires = 60 * (process.env.LINK_TTL_MIN || 15);
  const cmd = new GetObjectCommand({ Bucket, Key });
  return await getSignedUrl(client, cmd, { expiresIn: expires });
}
