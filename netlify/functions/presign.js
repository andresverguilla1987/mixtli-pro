import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET;
const R2_PUBLIC_BASE = process.env.R2_PUBLIC_BASE;
const R2_EXPIRES = Number(process.env.R2_EXPIRES || 3600);

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY }
});

function safeFilename(name="file.bin"){
  return String(name).replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function handler(event) {
  try{
    const method = event.httpMethod || "GET";
    let filename = "file.bin";
    let contentType = "application/octet-stream";
    if(method === "GET"){
      const params = new URLSearchParams(event.rawQuery || event.rawQueryString || "");
      filename = params.get("filename") || filename;
      contentType = params.get("contentType") || contentType;
    }else if(method === "POST"){
      const body = event.body ? JSON.parse(event.body) : {};
      filename = body.filename || filename;
      contentType = body.contentType || contentType;
    }
    const key = `${Date.now()}-${Math.random().toString(16).slice(2,8)}-${safeFilename(filename)}`;
    const put = new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, ContentType: contentType });
    const url = await getSignedUrl(s3, put, { expiresIn: R2_EXPIRES });
    const publicUrl = R2_PUBLIC_BASE ? `${R2_PUBLIC_BASE.replace(/\/$/,"")}/${key}` : null;
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({ key, url, method: "PUT", headers: { "Content-Type": contentType }, publicUrl, expiresIn: R2_EXPIRES })
    };
  }catch(err){
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "presign_failed", message: String(err) })
    };
  }
}
