import 'dotenv/config';import express from 'express';import jwt from 'jsonwebtoken';import bcrypt from 'bcryptjs';import { nanoid } from 'nanoid';import pino from 'pino';import cors from 'cors';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { load, save } from './db.js';
const env={port:Number(process.env.PORT||10000),jwt:process.env.JWT_SECRET||'devsecret',driver:process.env.STORAGE_DRIVER||'R2',
s3:{region:process.env.S3_REGION,bucket:process.env.S3_BUCKET,accessKeyId:process.env.S3_ACCESS_KEY_ID,secretAccessKey:process.env.S3_SECRET_ACCESS_KEY},
r2:{accountId:process.env.R2_ACCOUNT_ID,bucket:process.env.R2_BUCKET,accessKeyId:process.env.R2_ACCESS_KEY_ID,secretAccessKey:process.env.R2_SECRET_ACCESS_KEY,publicBaseUrl:process.env.R2_PUBLIC_BASE_URL},
sendgridKey:process.env.SENDGRID_API_KEY,mailFrom:process.env.MAIL_FROM||'Mixtli <noreply@example.com>',defaultTtlDays:Number(process.env.DEFAULT_TTL_DAYS||14),
maxFree:Number(process.env.PLAN_FREE_MAX||50*1024*1024),maxPro:Number(process.env.PLAN_PRO_MAX||2*1024*1024*1024),maxEnt:Number(process.env.PLAN_ENTERPRISE_MAX||10*1024*1024*1024),corsOrigins:(process.env.CORS_ORIGINS||'*')};
const logger=pino({level:'info',base:undefined});
function s3Client(){if(env.driver==='S3')return new S3Client({region:env.s3.region,credentials:{accessKeyId:env.s3.accessKeyId,secretAccessKey:env.s3.secretAccessKey}});
return new S3Client({region:'auto',endpoint:`https://${env.r2.accountId}.r2.cloudflarestorage.com`,forcePathStyle:true,credentials:{accessKeyId:env.r2.accessKeyId,secretAccessKey:env.r2.secretAccessKey}})};
const bucket=()=>env.driver==='S3'?env.s3.bucket:env.r2.bucket;const planMax=p=>p==='PRO'?env.maxPro:(p==='ENTERPRISE'?env.maxEnt:env.maxFree);const badExt=n=>['.exe','.bat','.cmd','.scr','.ps1','.js','.vbs','.jar'].some(e=>n.toLowerCase().endsWith(e));
const app=express();const origins=env.corsOrigins==='*'?true:env.corsOrigins.split(',').map(s=>s.trim());app.use(cors({origin:origins,methods:['GET','POST','OPTIONS'],allowedHeaders:['Content-Type','Authorization'],maxAge:600}));app.options('*',cors());
app.use(express.json({limit:'5mb'}));app.use((req,res,next)=>{const rid=(req.headers['x-request-id']||Math.random().toString(16).slice(2));req.id=rid;res.setHeader('x-request-id',rid);next();});
app.use((req,res,next)=>{logger.info({rid:req.id,m:req.method,url:req.url},'req');res.on('finish',()=>logger.info({rid:req.id,s:res.statusCode},'res'));next();});

app.get('/api/health',(req,res)=>res.json({status:'ok',driver:env.driver}));

app.post('/auth/register',async(req,res)=>{const{email,password}=req.body||{};if(!email||!password)return res.status(400).json({error:'email and password required'});
const db=await load();if(db.users.find(u=>u.email===email))return res.status(409).json({error:'email already registered'});
const user={id:nanoid(),email,pass:bcrypt.hashSync(password,10),plan:'FREE',createdAt:new Date().toISOString()};db.users.push(user);await save(db);res.json({ok:true,user:{id:user.id,email:user.email,plan:user.plan}})});

app.post('/auth/login',async(req,res)=>{const{email,password}=req.body||{};if(!email||!password)return res.status(400).json({error:'email and password required'});
const db=await load();const u=db.users.find(x=>x.email===email);if(!u||!bcrypt.compareSync(password,u.pass))return res.status(401).json({error:'invalid credentials'});
const token=jwt.sign({sub:u.id,email:u.email,plan:u.plan},env.jwt,{expiresIn:'7d'});res.json({token})});

function auth(req,res,next){const h=req.headers.authorization||'';const t=h.startsWith('Bearer ')?h.slice(7):null;if(!t)return res.status(401).json({error:'missing token'});try{req.user=jwt.verify(t,env.jwt);next();}catch{return res.status(401).json({error:'invalid token'})}}

app.post('/upload/presign',auth,async(req,res)=>{const{filename,size,mime,ttlDays}=req.body||{};if(!filename||typeof size!=='number')return res.status(400).json({error:'filename and size required'});
if(size>planMax(req.user.plan))return res.status(413).json({error:'file too large for plan '+req.user.plan});if(badExt(filename))return res.status(400).json({error:'forbidden file extension'});
const id=nanoid();const key=`${req.user.sub}/${new Date().toISOString().slice(0,10)}/${id}-${filename}`;const exp=new Date(Date.now()+1000*60*60*24*(ttlDays||env.defaultTtlDays));
const db=await load();db.uploads.push({id,userId:req.user.sub,bucket:bucket(),ukey:key,size,mime:mime||'application/octet-stream',status:'PENDING',expiresAt:exp.toISOString(),createdAt:new Date().toISOString()});await save(db);
const putUrl=await getSignedUrl(s3Client(),new PutObjectCommand({Bucket:bucket(),Key:key,ContentType:mime||'application/octet-stream'}),{expiresIn:15*60});
res.json({uploadId:id,key,putUrl,putExpiresAt:new Date(Date.now()+15*60*1000).toISOString(),ttlExpiresAt:exp.toISOString()})});

app.post('/upload/complete',auth,async(req,res)=>{const{uploadId,etag}=req.body||{};const db=await load();const u=db.uploads.find(x=>x.id===uploadId&&x.userId===req.user.sub);if(!u)return res.status(404).json({error:'upload not found'});
u.status='READY';u.etag=etag||null;await save(db);res.json({ok:true,uploadId})});

app.get('/upload/:id/link',auth,async(req,res)=>{const db=await load();const u=db.uploads.find(x=>x.id===req.params.id&&x.userId===req.user.sub);if(!u)return res.status(404).json({error:'not found'});
if(new Date(u.expiresAt)<new Date())return res.status(410).json({error:'expired'});if(env.driver==='R2'&&env.r2.publicBaseUrl){return res.json({url:`${env.r2.publicBaseUrl.replace(/\/$/,'')}/${encodeURIComponent(u.ukey)}`,public:true});}
const url=await getSignedUrl(s3Client(),new GetObjectCommand({Bucket:u.bucket,Key:u.ukey}),{expiresIn:60*60});res.json({url,expiresIn:3600})});

app.listen(env.port,()=>logger.info({port:env.port,driver:env.driver},'up'));