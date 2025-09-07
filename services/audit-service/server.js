const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const app = express(); app.use(cors()); app.use(express.json({limit:'2mb'})); app.use(morgan('dev'));
const PORT = process.env.PORT || 7004;
const DATA_DIR = path.join(__dirname, 'data'); const LOG_FILE = path.join(DATA_DIR, 'audit_log.json');
fs.ensureDirSync(DATA_DIR); if (!fs.existsSync(LOG_FILE)) fs.writeFileSync(LOG_FILE, '[]', 'utf-8');
function readLog(){ return JSON.parse(fs.readFileSync(LOG_FILE,'utf-8')); }
function writeLog(arr){ fs.writeFileSync(LOG_FILE, JSON.stringify(arr, null, 2)); }
function computeHash(prev_hash, entry){
  const payload = JSON.stringify({actor_id:entry.actor_id, entity_type:entry.entity_type, entity_id:entry.entity_id, action:entry.action, before:entry.before||null, after:entry.after||null, reason:entry.reason||null, ticket:entry.ticket||null, ts:entry.created_at, prev_hash});
  return crypto.createHash('sha256').update(payload).digest('hex');
}
app.get('/health', (req,res)=> res.json({status:'ok', service:'audit-service'}));
app.post('/audit/append', (req,res)=>{ const entry=req.body||{}; entry.created_at = new Date().toISOString(); const all = readLog();
  const last = [...all].reverse().find(e=> e.entity_type===entry.entity_type && e.entity_id===entry.entity_id);
  const prev_hash = last ? last.hash : ''; const hash = computeHash(prev_hash, entry); const finalEntry = {...entry, prev_hash, hash};
  all.push(finalEntry); writeLog(all); res.json({status:'ok', entry: finalEntry}); });
app.get('/audit', (req,res)=> res.json({count: readLog().length, log: readLog()}));
app.listen(PORT, ()=> console.log(`Audit service on ${PORT}`));
