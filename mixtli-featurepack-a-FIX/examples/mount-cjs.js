// examples/mount-cjs.js (ejemplo de montaje CommonJS)
const express = require("express");
const { S3Client } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const app = express();
const s3 = new S3Client({ region: process.env.S3_REGION || "auto", forcePathStyle: true, endpoint: process.env.S3_ENDPOINT });
const bucket = process.env.S3_BUCKET;

// MONTA FeaturePack A – FIX
const featurePack = require("../routes/mixtli-featurepack-a")(s3, bucket, getSignedUrl);
app.use(featurePack);
app.get("/salud", (req,res)=>res.json({ ok:true, time: new Date().toISOString()}));

app.listen(10000, ()=> console.log("CJS example on :10000"));
