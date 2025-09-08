(() => {
  const $ = (id) => document.getElementById(id);
  function tech(){ return `Render healthcheck: /salud
Prometheus: /metrics — OTel → ${ (window.MIXTLI_CFG||{}).otelEndpoint || 'http://collector:4318' }
Logs: Pino JSON → Promtail → Loki
SLO: 99.9% (burn-rate) · Synthetic: blackbox + k6
Usuarios: /users/stats, /users/recent · Registro: /auth/register
`; }
  $('year') && ($('year').textContent = new Date().getFullYear());
  const out = document.getElementById('tech'); if (out) out.textContent = tech();
  // Health ping
  (async function tick() {
    const cfg = window.MIXTLI_CFG || {}; const url = (cfg.apiBase||'') + '/salud?t=' + Date.now(); let ok=false, rid='—', ms=0;
    const t0 = performance.now();
    try{ const r = await fetch(url); ms=Math.round(performance.now()-t0); ok=r.ok; rid=r.headers.get('x-request-id')||rid; }catch(e){ ms=Math.round(performance.now()-t0); }
    const dot = document.getElementById('api-status'); const lat = document.getElementById('api-latency'); const req = document.getElementById('reqid');
    if (dot) dot.className = 'dot ' + (ok?'green':'red'); if (lat) lat.textContent = ok?`(${ms} ms)`:'(sin respuesta)'; if (req) req.textContent = rid;
    setTimeout(tick, 10000);
  })();
})();