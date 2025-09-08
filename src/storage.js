
import { env } from './env.js';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

function s3ClientFor(driver) {
  if (driver === 'S3') {
    return new S3Client({
      region: env.s3.region,
      credentials: {
        accessKeyId: env.s3.accessKeyId,
        secretAccessKey: env.s3.secretAccessKey
      }
    });
  }
  if (driver === 'R2') {
    const endpoint = `https://${env.r2.accountId}.r2.cloudflarestorage.com`;
    return new S3Client({
      region: 'auto',
      endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: env.r2.accessKeyId,
        secretAccessKey: env.r2.secretAccessKey
      }
    });
  }
  return null;
}

export const storage = {
  async presignPut({ key, contentType, contentLength }) {
    if (env.storageDriver === 'LOCAL') {
      // Local stub: not actually writing; return a fake URL
      const putUrl = `http://localhost:${env.port}/_local_upload/${encodeURIComponent(key)}`;
      const expiresAt = new Date(Date.now() + 15*60*1000);
      return { putUrl, expiresAt, bucket: 'local', driver: 'LOCAL' };
    }
    const client = s3ClientFor(env.storageDriver);
    const bucket = env.storageDriver === 'S3' ? env.s3.bucket : env.r2.bucket;
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
      ContentLength: contentLength
    });
    const putUrl = await getSignedUrl(client, command, { expiresIn: 15*60 }); // 15 min
    const expiresAt = new Date(Date.now() + 15*60*1000);
    return { putUrl, expiresAt, bucket, driver: env.storageDriver };
  },

  async presignGet({ key, expiresInSec = 3600 }) {
    if (env.storageDriver === 'LOCAL') {
      const url = `http://localhost:${env.port}/_local_download/${encodeURIComponent(key)}`;
      return { url, driver: 'LOCAL' };
    }
    // If R2 has a public base, return that (not signed). Use signed if not set.
    if (env.storageDriver === 'R2' && env.r2.publicBaseUrl) {
      const url = `${env.r2.publicBaseUrl.replace(/\/$/,'')}/${encodeURIComponent(key)}`;
      return { url, driver: 'R2' };
    }
    const client = s3ClientFor(env.storageDriver);
    const bucket = env.storageDriver === 'S3' ? env.s3.bucket : env.r2.bucket;
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    const url = await getSignedUrl(client, command, { expiresIn: expiresInSec });
    return { url, driver: env.storageDriver };
  },

  async deleteObject({ key }) {
    if (env.storageDriver === 'LOCAL') return true;
    const client = s3ClientFor(env.storageDriver);
    const bucket = env.storageDriver === 'S3' ? env.s3.bucket : env.r2.bucket;
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  },

  async headObject({ key }) {
    if (env.storageDriver === 'LOCAL') return { ContentLength: 0 };
    const client = s3ClientFor(env.storageDriver);
    const bucket = env.storageDriver === 'S3' ? env.s3.bucket : env.r2.bucket;
    const res = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return res;
  }
};
