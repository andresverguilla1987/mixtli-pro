#!/usr/bin/env node
import fs from 'fs'; import path from 'path';
const projectRoot=process.cwd();
const candidates=['apps/api/server.ts','apps/api/src/server.ts','apps/api/server.js','apps/api/src/server.js'].map(p=>path.join(projectRoot,p));
const server=candidates.find(p=>fs.existsSync(p)); if(!server){console.error('No encontré server.(ts|js) en apps/api'); process.exit(1);}
let code=fs.readFileSync(server,'utf8');
if(!code.includes("express.json(")){ code = code.replace(/app\.use\([^)]*express\.static[^)]*\);\s*/m, (m)=> m + "\napp.use(require('express').json());\n"); }
const imports=`
// --- MIXTLI FUSION PREVIEW ---
const path = require('path');
const { securityHeaders, makeLimiter, auditLogger } = require('./apps/api/middleware/security-bundle');
const usersPrisma = require('./apps/api/routes/users-prisma');
const uploadLocal = require('./apps/api/routes/upload-local');
const dashProxy = require('./apps/api/proxy/dash-proxy');
`;
const mounts=`
app.use(securityHeaders());
app.use(makeLimiter());
app.use(auditLogger());
app.use('/preview', require('express').static(path.join(__dirname, 'public/preview'), { maxAge: '60s' }));
app.use(usersPrisma({ basePath: '' }));
dashProxy(app);
app.use('/preview/uploads', require('express').static(path.join(__dirname, 'public/uploads'), { maxAge: '7d' }));
app.use(uploadLocal({ basePath: '' }));
`;
if(!code.includes('MIXTLI FUSION PREVIEW')){
  code = code.replace(/(const app\s*=\s*express\(\);)/m, (m)=> m + imports + "\n") + "\n" + mounts + "\n";
  fs.writeFileSync(server, code, 'utf8'); console.log('Cableado listo:', server);
} else { console.log('Ya estaba cableado.'); }