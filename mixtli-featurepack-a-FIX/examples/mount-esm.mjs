// examples/mount-esm.mjs (ejemplo de montaje ESM)
import express from "express";
import { S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import featurePackFactory from "../routes/mixtli-featurepack-a.js";

const app = express();
const s3 = new S3Client({ region: process.env.S3_REGION || "auto", forcePathStyle: true, endpoint: process.env.S3_ENDPOINT });
const bucket = process.env.S3_BUCKET;

const featurePack = featurePackFactory(s3, bucket, getSignedUrl);
app.use(featurePack);
app.get("/salud", (req,res)=>res.json({ ok:true, time: new Date().toISOString()}));

app.listen(10000, ()=> console.log("ESM example on :10000"));
