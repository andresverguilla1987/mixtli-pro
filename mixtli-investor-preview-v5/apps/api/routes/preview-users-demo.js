// apps/api/routes/preview-users-demo.js
// Rutas de DEMO para stats de usuarios (en memoria). Útil para enseñar el avance sin DB.
const { Router } = require('express');

function seedData(days = 180) {
  const today = new Date(); today.setHours(0,0,0,0);
  const out = []; let total = 0;
  for (let i=days-1;i>=0;i--) {
    const d = new Date(today.getTime() - i*86400000);
    const base = 8 + Math.round(6*Math.sin(i/9) + 4*Math.cos(i/5));
    const cnt = Math.max(0, base + Math.floor(Math.random()*6) - 2);
    out.push({ date: d.toISOString().slice(0,10), count: cnt });
    total += cnt;
  }
  return { signupsByDay: out, total };
}

const NAMES = ["Alex","Sam","Pat","Dee","Dani","Chris","Ari","Kai","Max","Joss","Vale"];
const LAST = ["Lopez","Gomez","Diaz","Perez","Ramirez","Silva","Mendez","Cruz","Torres","Castro","Navarro"];
const PLANS = ["free","pro","team"];

function recentFromSignups(signups) {
  const list = [];
  signups.forEach(s => {
    for (let i=0;i<s.count;i++) {
      if (Math.random() < 0.12) {
        const name = `${NAMES[Math.floor(Math.random()*NAMES.length)]} ${LAST[Math.floor(Math.random()*LAST.length)]}`;
        const email = `${name.split(' ')[0].toLowerCase()}.${name.split(' ')[1].toLowerCase()}${Math.floor(Math.random()*1000)}@example.com`;
        list.push({ name, email, signupAt: `${s.date}T12:00:00.000Z`, plan: PLANS[Math.floor(Math.random()*PLANS.length)] });
      }
    }
  });
  return list.sort((a,b)=> (a.signupAt < b.signupAt?1:-1)).slice(0,50);
}

module.exports = function previewUsersDemo({ basePath = '' } = {}) {
  const router = Router();
  const seeded = seedData(180);
  const recent = recentFromSignups(seeded.signupsByDay);

  router.get(`${basePath}/users/stats`, (_req, res) => {
    const totalUsers = seeded.total;
    const dailyActive = Math.round(totalUsers * 0.12);
    const weeklyActive = Math.round(totalUsers * 0.32);
    const monthlyActive = Math.round(totalUsers * 0.55);
    res.json({ totalUsers, dailyActive, weeklyActive, monthlyActive, signupsByDay: seeded.signupsByDay });
  });

  router.get(`${basePath}/users/recent`, (_req, res) => {
    res.json(recent);
  });

  return router;
};

// USO en server.js:
// const previewUsersDemo = require('./apps/api/routes/preview-users-demo');
// app.use(previewUsersDemo({ basePath: '' })); // expone /users/stats y /users/recent
