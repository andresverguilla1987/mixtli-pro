
const express = require('express');
const path = require('path');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 10000;
const allowed = process.env.ALLOWED_ORIGINS || process.env.CORS_ORIGIN || '*';
const corsOptions = {origin:(o,cb)=>{if(!o||allowed==='*'||allowed.split(',').map(s=>s.trim()).includes(o))return cb(null,true);cb(new Error('Not allowed by CORS'));},credentials:true};
app.use(cors(corsOptions));
app.use(express.json({limit:'100mb'}));
app.use(express.urlencoded({extended:true,limit:'100mb'}));
app.get(['/salud','/health'],(req,res)=>res.status(200).json({ok:true,ts:new Date().toISOString()}));
const publicDir = path.join(__dirname,'public');
app.use(express.static(publicDir));
try{const usersRouter=require('./src/rutas/users.js');app.use('/api/users',usersRouter);}catch(e){console.log('Usuarios: no encontrado (ok si no lo usas).');}
try{const uploadsRouter=require('./src/rutas/uploads.js');app.use('/api/uploads',uploadsRouter);}catch(e){console.log('Uploads: router no encontrado, usando router pro por defecto.',e?.message);const router=require('./src/rutas/uploads_plus.js');app.use('/api/uploads',router);}
app.get('/',(_req,res)=>res.sendFile(path.join(publicDir,'uploader.html')));
app.listen(PORT,()=>console.log(`🚀 API en puerto ${PORT}`));
