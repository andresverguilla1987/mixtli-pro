const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fetch = require('node-fetch');
require('dotenv').config();
const app = express(); app.use(cors()); app.use(express.json({limit:'2mb'})); app.use(morgan('dev'));
const PORT = process.env.PORT || 7003;
const DATA_DIR = path.join(__dirname, 'data'); const FILE = path.join(DATA_DIR, 'rules.json');
const AUDIT_URL = process.env.AUDIT_URL || 'http://localhost:7004/audit/append';
fs.ensureDirSync(DATA_DIR); if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, JSON.stringify({rulesets:[], versions:[], approvals:[]}, null, 2));
function readDb(){ return JSON.parse(fs.readFileSync(FILE,'utf-8')); }
function writeDb(db){ fs.writeFileSync(FILE, JSON.stringify(db, null, 2)); }
async function audit(entry){ try{ await fetch(AUDIT_URL,{method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(entry)}) }catch(e){ console.error('audit failed', e.message); } }
app.get('/health', (req,res)=> res.json({status:'ok', service:'rules-service'}));
app.get('/rulesets', (req,res)=>{ const db = readDb(); res.json(db.rulesets); });
app.post('/rulesets', async (req,res)=>{ const db = readDb(); const id = uuidv4(); const ruleset = { id, name: req.body.name, description: req.body.description || '', created_at: new Date().toISOString() }; db.rulesets.push(ruleset); writeDb(db); await audit({actor_id:'system', entity_type:'RULESET', entity_id:id, action:'CREATE', before:null, after:ruleset}); res.status(201).json(ruleset); });
app.get('/rulesets/:id/versions', (req,res)=>{ const db = readDb(); res.json(db.versions.filter(v=>v.ruleset_id===req.params.id)); });
app.post('/rulesets/:id/versions', async (req,res)=>{ const db = readDb(); const id = uuidv4(); const versionsForSet = db.versions.filter(v=>v.ruleset_id===req.params.id); const version = (versionsForSet.reduce((m,v)=>Math.max(m,v.version),0) || 0) + 1; const content = req.body.content || {}; const created_by = req.body.created_by || 'system'; const ver = { id, ruleset_id: req.params.id, version, content, created_by, created_at: new Date().toISOString(), is_active: false }; db.versions.push(ver); writeDb(db); await audit({actor_id:created_by, entity_type:'RULE_VERSION', entity_id:id, action:'CREATE', before:null, after:ver}); res.status(201).json(ver); });
app.post('/rules/versions/:id/approve', async (req,res)=>{ const db = readDb(); const ver = db.versions.find(v=>v.id===req.params.id); if(!ver) return res.status(404).json({error:'version not found'}); const approval = { id: uuidv4(), rule_version_id: ver.id, approver_id: req.body.approver_id || 'approver', status: req.body.status || 'APPROVED', note: req.body.note || null, acted_at: new Date().toISOString() }; db.approvals.push(approval); if (approval.status==='APPROVED'){ db.versions.forEach(v=>{ if(v.ruleset_id===ver.ruleset_id) v.is_active=false; }); ver.is_active = true; } writeDb(db); await audit({actor_id:approval.approver_id, entity_type:'RULE_VERSION', entity_id:ver.id, action:approval.status, before:null, after:ver}); res.json({ok:true, approval, version: ver}); });
app.listen(PORT, ()=> console.log(`Rules service on ${PORT}`));
