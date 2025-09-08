// apps/api/routes/preview-users-demo.js (same as v5, compact)
const { Router } = require('express');
function seed(days=180){ const t=new Date();t.setHours(0,0,0,0); const out=[]; let total=0;
  for(let i=days-1;i>=0;i--){ const d=new Date(t.getTime()-i*86400000); const base=8+Math.round(6*Math.sin(i/9)+4*Math.cos(i/5));
    const cnt=Math.max(0,base+Math.floor(Math.random()*6)-2); out.push({date:d.toISOString().slice(0,10),count:cnt}); total+=cnt; } return { signupsByDay:out,total};}
const N=["Alex","Sam","Pat","Dee","Dani","Chris","Ari","Kai","Max","Joss","Vale"], L=["Lopez","Gomez","Diaz","Perez","Ramirez","Silva","Mendez","Cruz","Torres","Castro","Navarro"], P=["free","pro","team"];
function recent(signups){const list=[];signups.forEach(s=>{for(let i=0;i<s.count;i++){ if(Math.random()<0.12){ const name=`${N[Math.floor(Math.random()*N.length)]} ${L[Math.floor(Math.random()*L.length)]}`; const email=`${name.split(' ')[0].toLowerCase()}.${name.split(' ')[1].toLowerCase()}${Math.floor(Math.random()*1000)}@example.com`; list.push({name,email,signupAt:`${s.date}T12:00:00.000Z`,plan:P[Math.floor(Math.random()*P.length)]});}}}); return list.sort((a,b)=>a.signupAt<b.signupAt?1:-1).slice(0,50);}
module.exports = function previewUsersDemo({ basePath = '' } = {}) {
  const router = Router(); const seeded=seed(180); const rec=recent(seeded.signupsByDay);
  router.get(`${basePath}/users/stats`, (_req,res)=>{ const total=seeded.total; res.json({ totalUsers:total, dailyActive:Math.round(total*0.12), weeklyActive:Math.round(total*0.32), monthlyActive:Math.round(total*0.55), signupsByDay:seeded.signupsByDay }); });
  router.get(`${basePath}/users/recent`, (_req,res)=>res.json(rec)); return router;
};
