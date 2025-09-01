const { S3Client, ListObjectsV2Command, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const s3 = new S3Client({
  region: process.env.AWS_REGION || process.env.S3_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const bucket = process.env.S3_BUCKET;

async function listFiles(prefix = "uploads/") {
  const command = new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix });
  const response = await s3.send(command);
  return response.Contents || [];
}

async function getDownloadUrl(key) {
  const command = new (require("@aws-sdk/client-s3").GetObjectCommand)({
    Bucket: bucket,
    Key: key,
  });
  return await getSignedUrl(s3, command, { expiresIn: 3600 });
}

async function deleteFile(key) {
  const command = new DeleteObjectCommand({ Bucket: bucket, Key: key });
  return await s3.send(command);
}

module.exports = { listFiles, getDownloadUrl, deleteFile };
