// src/lib/s3.js
// AWS SDK v3 S3 client configured from environment variables.
const { S3Client } = require("@aws-sdk/client-s3");

const REGION = process.env.AWS_REGION || process.env.S3_REGION || "us-east-1";

const s3 = new S3Client({
  region:   REGION,
  // If running on Render with env vars set, the default provider chain will pick them up.
  // We keep explicit credentials fallbacks for local dev.
  credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  } : undefined,
});

module.exports = { s3, REGION };