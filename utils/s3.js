const { S3Client, GetObjectCommand, PutObjectCommand, ListObjectsV2Command, HeadObjectCommand, DeleteObjectsCommand } = require('@aws-sdk/client-s3');

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_KEY,
    secretAccessKey: process.env.R2_SECRET,
  }
});

async function getObjectBuffer(bucket, key) {
  const obj = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const arr = await obj.Body.transformToByteArray();
  return Buffer.from(arr);
}

async function putObject(bucket, key, body, contentType) {
  await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }));
}

async function listAll(bucket, prefix = '') {
  let token = undefined, out = [];
  do {
    const r = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: token }));
    out.push(...(r.Contents || []));
    token = r.IsTruncated ? r.NextContinuationToken : undefined;
  } while (token);
  return out;
}

async function head(bucket, key) {
  try {
    return await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
  } catch (e) {
    return null;
  }
}

async function deleteMany(bucket, keys) {
  if (keys.length === 0) return;
  await s3.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: keys.map(Key => ({ Key })) } }));
}

module.exports = { s3, getObjectBuffer, putObject, listAll, head, deleteMany };
