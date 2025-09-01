const { S3Client, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const BUCKET = process.env.S3_BUCKET;

async function initMultipart(key, contentType) {
  const cmd = new CreateMultipartUploadCommand({ Bucket: BUCKET, Key: key, ContentType: contentType });
  const res = await s3.send(cmd);
  return { uploadId: res.UploadId };
}

async function signPart(key, uploadId, partNumber) {
  const cmd = new UploadPartCommand({ Bucket: BUCKET, Key: key, UploadId: uploadId, PartNumber: partNumber });
  const url = await getSignedUrl(s3, cmd, { expiresIn: 60 });
  return { url, partNumber };
}

async function completeMultipart(key, uploadId, parts) {
  const cmd = new CompleteMultipartUploadCommand({
    Bucket: BUCKET,
    Key: key,
    UploadId: uploadId,
    MultipartUpload: { Parts: parts }
  });
  const res = await s3.send(cmd);
  return res;
}

async function abortMultipart(key, uploadId) {
  const cmd = new AbortMultipartUploadCommand({ Bucket: BUCKET, Key: key, UploadId: uploadId });
  const res = await s3.send(cmd);
  return res;
}

async function list(prefix) {
  const cmd = new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix || '' });
  const res = await s3.send(cmd);
  const items = (res.Contents || []).map(o => ({
    key: o.Key,
    size: o.Size,
    lastModified: o.LastModified
  }));
  return items;
}

module.exports = { s3, BUCKET, initMultipart, signPart, completeMultipart, abortMultipart, list };
