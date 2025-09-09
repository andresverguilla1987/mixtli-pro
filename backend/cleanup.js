import 'dotenv/config';
import Database from 'better-sqlite3';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

const env = {
  driver: process.env.STORAGE_DRIVER || 'R2',
  s3: { region: process.env.S3_REGION, bucket: process.env.S3_BUCKET, accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY },
  r2: { accountId: process.env.R2_ACCOUNT_ID, bucket: process.env.R2_BUCKET, accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY }
};
function s3Client(){ return env.driver==='S3' ? new S3Client({ region: env.s3.region, credentials:{ accessKeyId: env.s3.accessKeyId, secretAccessKey: env.s3.secretAccessKey } }) : new S3Client({ region:'auto', endpoint:`https://${env.r2.accountId}.r2.cloudflarestorage.com`, forcePathStyle:true, credentials:{ accessKeyId: env.r2.accessKeyId, secretAccessKey: env.r2.secretAccessKey } }); }
const bucket = () => env.driver==='S3' ? env.s3.bucket : env.r2.bucket;

const db = new Database('mixtli-mini.db');
const expired = db.prepare("SELECT id, ukey FROM uploads WHERE datetime(expiresAt) < datetime('now')").all();
const delStmt = db.prepare("DELETE FROM uploads WHERE id = ?");
const client = s3Client();
(async ()=>{
  for (const row of expired) {
    try { await client.send(new DeleteObjectCommand({ Bucket: bucket(), Key: row.ukey })); } catch {}
    delStmt.run(row.id);
  }
  console.log('cleanup done', expired.length);
  process.exit(0);
})();
