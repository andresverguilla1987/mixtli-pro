// Mixtli hotfix: ensure /api/upload-direct exists + alias /api/upload, verbose logs
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import multer from "multer";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const app = express();
app.use((req,res,next)=>{ console.log(`[HF-404] ${req.method} ${req.url}`); next(); });
app.use(bodyParser.json({limit:"50mb"}));

const parseOrigins = s => (s||"").split(",").map(x=>x.trim()).filter(Boolean);
const ALLOWED_ORIGINS = parseOrigins(process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGIN);
const ADMIN_PIN = process.env.ADMIN_PIN || "";
const ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ENDPOINT = process.env.R2_ENDPOINT || `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`;
const R2_BUCKET = process.env.R2_BUCKET;
const ACCESS_KEY = process.env.R2_ACCESS_KEY_ID;
const SECRET_KEY = process.env.R2_SECRET_ACCESS_KEY;

app.use(cors({
  origin: (origin,cb)=>{
    if(!origin) return cb(null,true);
    if(ALLOWED_ORIGINS.includes(origin)) return cb(null,true);
    console.log("[HF-404][CORS] blocked", origin, "allowed=", ALLOWED_ORIGINS);
    cb(new Error("CORS not allowed: "+origin));
  },
  methods:["GET","POST","PUT","DELETE","OPTIONS"],
  allowedHeaders:["Content-Type","x-mixtli-pin","x-requested-with","authorization","accept","x-amz-*"],
  credentials:true
}));
app.options("*", cors(), (req,res)=>res.status(204).end());

app.get("/api/health", (req,res)=>res.json({ok:true, t:Date.now()}));
app.all("/api/diag", (req,res)=>{
  const headers = {};
  for (const [k,v] of Object.entries(req.headers)) headers[k]=v;
  res.json({ method:req.method, url:req.url, headers });
});

const mem = multer({ storage: multer.memoryStorage(), limits:{ fileSize: 50*1024*1024 } });
function s3(){ return new S3Client({ region:"auto", endpoint:R2_ENDPOINT, credentials:{ accessKeyId:ACCESS_KEY, secretAccessKey:SECRET_KEY } }); }
function needPin(req){
  if(!ADMIN_PIN) return false;
  const pin = req.header("x-mixtli-pin") || req.query.pin;
  return pin !== ADMIN_PIN;
}

async function handleUpload(req,res){
  if(!R2_BUCKET) return res.status(500).json({error:"R2_BUCKET missing"});
  if(needPin(req)) return res.status(401).json({error:"PIN requerido"});
  if(!req.file) return res.status(400).json({error:"file missing"});
  const prefix = (req.query.prefix || req.body?.prefix || "public/").toString();
  const cleanName = (req.file.originalname||"file").replace(/[^\w\-.]+/g,"_");
  const key = `${prefix}${cleanName}`;
  try{
    await s3().send(new PutObjectCommand({
      Bucket:R2_BUCKET,
      Key:key,
      Body:req.file.buffer,
      ContentType: req.file.mimetype || "application/octet-stream"
    }));
    res.json({ok:true, key});
  }catch(err){
    console.error("[HF-404] upload error:", err?.message || err);
    res.status(500).json({error:String(err?.message||err)});
  }
}

// Primary hotfix endpoints
app.post("/api/upload-direct", mem.single("file"), handleUpload);
app.post("/api/upload", mem.single("file"), handleUpload); // alias

// Fallback 404 handler to help debugging
app.use((req,res)=>{
  res.status(404).json({error:"Not found", hint:"Check that /api/upload-direct exists and method is POST"});
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, ()=>{
  console.log("[HF-404] Ready on port", PORT);
  console.log("[HF-404] ALLOWED_ORIGINS =", ALLOWED_ORIGINS);
});
