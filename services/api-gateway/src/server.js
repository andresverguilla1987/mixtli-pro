const express = require('express');
const morgan = require('morgan');
const fetch = require('node-fetch');
const cors = require('cors');
require('dotenv').config();
const app = express();
app.use(cors()); app.use(express.json({limit:'2mb'})); app.use(morgan('dev'));
const PORT = process.env.PORT || 7000;
const WFM_URL = process.env.WFM_URL || 'http://localhost:7001';
const SCORING_URL = process.env.SCORING_URL || 'http://localhost:7002';
const RULES_URL = process.env.RULES_URL || 'http://localhost:7003';
const AUDIT_URL = process.env.AUDIT_URL || 'http://localhost:7004';
app.get('/health', (req,res)=> res.json({status:'ok', service:'api-gateway'}));
async function proxyJson(targetUrl, method, body) {
  const r = await fetch(targetUrl, { method, headers:{'content-type':'application/json'}, body: body?JSON.stringify(body):undefined });
  const t = await r.text(); try { return {status:r.status, body: JSON.parse(t)} } catch { return {status:r.status, body:{raw:t}}}
}
app.post('/wfm/optimize', async (req,res)=>{ const {status,body}=await proxyJson(`${WFM_URL}/optimize`,'POST',req.body); res.status(status).json(body); });
app.get('/fraud/models', async (req,res)=>{ const {status,body}=await proxyJson(`${SCORING_URL}/models`,'GET'); res.status(status).json(body); });
app.post('/fraud/events', async (req,res)=>{ const {status,body}=await proxyJson(`${SCORING_URL}/events`,'POST',req.body); res.status(status).json(body); });
app.get('/fraud/events', async (req,res)=>{ const {status,body}=await proxyJson(`${SCORING_URL}/events`,'GET'); res.status(status).json(body); });
app.post('/fraud/feedback', async (req,res)=>{ const {status,body}=await proxyJson(`${SCORING_URL}/feedback`,'POST',req.body); res.status(status).json(body); });
app.post('/fraud/train', async (req,res)=>{ const {status,body}=await proxyJson(`${SCORING_URL}/train`,'POST',{}); res.status(status).json(body); });
app.get('/rulesets', async (req,res)=>{ const {status,body}=await proxyJson(`${RULES_URL}/rulesets`,'GET'); res.status(status).json(body); });
app.post('/rulesets', async (req,res)=>{ const {status,body}=await proxyJson(`${RULES_URL}/rulesets`,'POST',req.body); res.status(status).json(body); });
app.get('/rulesets/:id/versions', async (req,res)=>{ const {status,body}=await proxyJson(`${RULES_URL}/rulesets/${req.params.id}/versions`,'GET'); res.status(status).json(body); });
app.post('/rulesets/:id/versions', async (req,res)=>{ const {status,body}=await proxyJson(`${RULES_URL}/rulesets/${req.params.id}/versions`,'POST',req.body); res.status(status).json(body); });
app.post('/rules/versions/:id/approve', async (req,res)=>{ const {status,body}=await proxyJson(`${RULES_URL}/rules/versions/${req.params.id}/approve`,'POST',req.body); res.status(status).json(body); });
app.get('/audit', async (req,res)=>{ const {status,body}=await proxyJson(`${AUDIT_URL}/audit`,'GET'); res.status(status).json(body); });
app.listen(PORT, ()=> console.log(`API Gateway on ${PORT}`));
