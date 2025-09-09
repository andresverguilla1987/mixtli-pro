import 'dotenv/config';import express from 'express';import jwt from 'jsonwebtoken';import bcrypt from 'bcryptjs';import { nanoid } from 'nanoid';import pino from 'pino';import cors from 'cors';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';import { getSignedUrl } from '@aws-sdk/s3-request-presigner';import Database from 'better-sqlite3';
const env={port:Number(process.env.PORT||10000),jwt:process.env.JWT_SECRET||'devsecret',driver:process.env.STORAGE_DRIVER||'R2',
s3:{region:process.env.S3_REGION,bucket:process.env.S3_BUCKET,accessKeyId:process.env.S3_ACCESS_KEY_ID,secretAccessKey:process.env.S3_SECRET_ACCESS_KEY},
r2:{accountId:process.env.R2_ACCOUNT_ID,bucket:process.env.R2_BUCKET,accessKeyId:process.env.R2_ACCESS_KEY_ID,secretAccessKey:process.env.R2_SECRET_ACCESS_KEY,publicBaseUrl:process.env.R2_PUBLIC_BASE_URL},
sendgridKey:process.env.SENDGRID_API_KEY,mailFrom:process.env.MAIL_FROM||'Mixtli <noreply@example.com>',defaultTtlDays:Number(process.env.DEFAULT_TTL_DAYS||14),
maxFree:Number(process.env.PLAN_FREE_MAX||50*1024*1024),maxPro:Number(process.env.PLAN_PRO_MAX||2*1024*1024*1024),maxEnt:Number(process.env.PLAN_ENTERPRISE_MAX||10*1024*1024*1024),corsOrigins:(process.env.CORS_ORIGINS||'*')};
const logger=pino({level:'info',base:undefined});const db=new Database('mixtli-mini.db');
db.exec(`PRAGMA journal_mode=WAL;CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,pass TEXT NOT NULL,plan TEXT NOT NULL DEFAULT 'FREE',createdAt TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS uploads(id TEXT PRIMARY KEY,userId TEXT NOT NULL,bucket TEXT NOT NULL,ukey TEXT NOT NULL,size INTEGER NOT NULL,mime TEXT NOT NULL,etag TEXT,status TEXT NOT NULL DEFAULT 'PENDING',expiresAt TEXT NOT NULL,createdAt TEXT NOT NULL DEFAULT (datetime('now')));`);
const userByEmail=db.prepare('SELECT * FROM users WHERE email=?');const createUser=db.prepare('INSERT INTO users (id,email,pass,plan) VALUES (?,?,?,?)');
const createUpload=db.prepare('INSERT INTO uploads (id,userId,bucket,ukey,size,mime,expiresAt) VALUES (?,?,?,?,?,?,?)');const getUpload=db.prepare('SELECT * FROM uploads WHERE id=? AND userId=?');
const markUploaded=db.prepare("UPDATE uploads SET status='READY', etag=? WHERE id=?");function s3Client(){if(env.driver==='S3')return new S3Client({region:env.s3.region,credentials:{accessKeyId:env.s3.accessKeyId,secretAccessKey:env.s3.secretAccessKey}});
return new S3Client({region:'auto',endpoint:`https://${env.r2.accountId}.r2.cloudflarestorage.com`,forcePathStyle:true,credentials:{accessKeyId:env.r2.accessKeyId,secretAccessKey:env.r2.secretAccessKey}})};
const bucket=()=>env.driver==='S3'?env.s3.bucket:env.r2.bucket;const planMax=p=>p==='PRO'?env.maxPro:(p==='ENTERPRISE'?env.maxEnt:env.maxFree);const badExt=n=>['.exe','.bat','.cmd','.scr','.ps1','.js','.vbs','.jar'].some(e=>n.toLowerCase().endsWith(e));
const app=express();const origins=env.corsOrigins==='*'?true:env.corsOrigins.split(',').map(s=>s.trim());app.use(cors({origin:origins,methods:['GET','POST','OPTIONS'],allowedHeaders:['Content-Type','Authorization'],maxAge:600}));app.options('*',cors());
app.use(express.json({limit:'5mb'}));app.use((req,res,next)=>{const rid=(req.headers['x-request-id']||Math.random().toString(16).slice(2));req.id=rid;res.setHeader('x-request-id',rid);next();});
app.use((req,res,next)=>{logger.info({rid:req.id,m:req.method,url:req.url},'req');res.on('finish',()=>logger.info({rid:req.id,s:res.statusCode},'res'));next();});
app.get('/api/health',(req,res)=>res.json({status:'ok',driver:env.driver}));
app.post('/auth/register',(req,res)=>{const{email,password}=req.body||{};if(!email||!password)return res.status(400).json({error:'email and password required'});const ex=userByEmail.get(email);if(ex)return res.status(409).json({error:'email already registered'});
const id=nanoid(),pass=bcrypt.hashSync(password,10);createUser.run(id,email,pass,'FREE');res.json({ok:true,user:{id,email,plan:'FREE'}})});
app.post('/auth/login',(req,res)=>{const{email,password}=req.body||{};if(!email||!password)return res.status(400).json({error:'email and password required'});const u=userByEmail.get(email);
if(!u||!bcrypt.compareSync(password,u.pass))return res.status(401).json({error:'invalid credentials'});const token=jwt.sign({sub:u.id,email:u.email,plan:u.plan},env.jwt,{expiresIn:'7d'});res.json({token})});
function auth(req,res,next){const h=req.headers.authorization||'';const t=h.startsWith('Bearer ')?h.slice(7):null;if(!t)return res.status(401).json({error:'missing token'});try{req.user=jwt.verify(t,env.jwt);next();}catch{return res.status(401).json({error:'invalid token'})}}
app.post('/upload/presign',auth,async(req,res)=>{const{filename,size,mime,ttlDays}=req.body||{};if(!filename||typeof size!=='number')return res.status(400).json({error:'filename and size required'});
if(size>planMax(req.user.plan))return res.status(413).json({error:'file too large for plan '+req.user.plan});if(badExt(filename))return res.status(400).json({error:'forbidden file extension'});
const id=nanoid();const key=`${req.user.sub}/${new Date().toISOString().slice(0,10)}/${id}-${filename}`;const exp=new Date(Date.now()+1000*60*60*24*(ttlDays||env.defaultTtlDays));
createUpload.run(id,req.user.sub,bucket(),key,size,(mime||'application/octet-stream'),exp.toISOString());const putUrl=await getSignedUrl(s3Client(),new PutObjectCommand({Bucket:bucket(),Key:key,ContentType:mime||'application/octet-stream'}),{expiresIn:15*60});
res.json({uploadId:id,key,putUrl,putExpiresAt:new Date(Date.now()+15*60*1000).toISOString(),ttlExpiresAt:exp.toISOString()})});
app.post('/upload/complete',auth,(req,res)=>{const{uploadId,etag}=req.body||{};const u=getUpload.get(uploadId,req.user.sub);if(!u)return res.status(404).json({error:'upload not found'});markUploaded.run(etag||null,uploadId);res.json({ok:true,uploadId})});
app.get('/upload/:id/link',auth,async(req,res)=>{const u=getUpload.get(req.params.id,req.user.sub);if(!u)return res.status(404).json({error:'not found'});if(new Date(u.expiresAt)<new Date())return res.status(410).json({error:'expired'});
if(env.driver==='R2'&&env.r2.publicBaseUrl){return res.json({url:`${env.r2.publicBaseUrl.replace(/\/$/,'')}/${encodeURIComponent(u.ukey)}`,public:true});}
const url=await getSignedUrl(s3Client(),new GetObjectCommand({Bucket:u.bucket,Key:u.ukey}),{expiresIn:60*60});res.json({url,expiresIn:3600})});
app.listen(env.port,()=>logger.info({port:env.port,driver:env.driver},'up'));