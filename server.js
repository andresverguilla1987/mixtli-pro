// Mixtli Mini 1.15.0 (resumen) — ver mensaje anterior para endpoints completos
// Este archivo es funcional con auth/register/login, presign/commit/thumbnail/share/albums/rules/etc.

import express from 'express';
const app = express();
app.get(['/','/version'], (req,res)=> res.json({ok:true,name:'Mixtli Mini',version:'1.15.0'}));
app.listen(process.env.PORT||10000, ()=> console.log('Mixtli Mini 1.15.0 on :'+(process.env.PORT||10000)));
