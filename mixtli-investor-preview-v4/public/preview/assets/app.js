(() => {
  const $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const cfg = Object.assign({
    apiBase: '', grafana: '', prometheus: '', status: './status/',
    downloadSuite: '', downloadAddons: '', otelEndpoint: 'http://localhost:4318', cacheBust: true, theme:'green'
  }, window.MIXTLI_CFG || {});
  // Overrides por query
  for (const k of ['apiBase','grafana','prometheus','status','downloadSuite','downloadAddons','theme']) {
    if (params.has(k)) cfg[k] = params.get(k);
  }

  // Theme
  function applyTheme() {
    const cls = 'theme-' + (cfg.theme || 'green');
    document.body.classList.remove('theme-green','theme-dark');
    document.body.classList.add(cls);
  }

  function setLinks() {
    if (cfg.downloadSuite) $('dl-suite').href = cfg.downloadSuite;
    if (cfg.downloadAddons) $('dl-addons').href = cfg.downloadAddons;
  }

  async function pingHealth() {
    const base = (cfg.apiBase || '');
    const url = base + '/salud' + (cfg.cacheBust ? ('?t=' + Date.now()) : '');
    const t0 = performance.now();
    let ok = false, rid = '—', ms = 0;
    try {
      const res = await fetch(url, { headers: { 'X-Request-Id': 'preview-' + Date.now() }});
      ms = Math.round(performance.now() - t0);
      ok = res.ok; rid = res.headers.get('x-request-id') || rid;
    } catch (e) { ms = Math.round(performance.now() - t0); ok = false; }
    $('api-status').className = 'dot ' + (ok ? 'green' : 'red');
    $('api-latency').textContent = ok ? `(${ms} ms)` : '(sin respuesta)';
    $('reqid').textContent = rid;
  }

  function setTech() {
    const text = `Render healthcheck: /salud
Prometheus: /metrics (histogramas y contadores)
OpenTelemetry: OTLP HTTP → ${cfg.otelEndpoint || 'http://collector:4318'}
Logs: Pino JSON → Promtail → Loki
Alertas: Prometheus + Alertmanager (5xx%, p95, InstanceDown)
SLO: 99.9% con burn-rate multiwindow (opcional)
Synthetic: Blackbox + k6 (opcional)
Theme: ${cfg.theme}
`; $('tech').textContent = text;
  }

  function themeInit() {
    const saved = localStorage.getItem('mixtli-theme'); if (saved) cfg.theme = saved;
    document.getElementById('mode').onclick = () => {
      cfg.theme = (cfg.theme === 'green') ? 'dark' : 'green';
      localStorage.setItem('mixtli-theme', cfg.theme); applyTheme();
    };
    applyTheme();
  }

  function tick() { pingHealth(); setTimeout(tick, 10000); }
  setLinks(); setTech(); themeInit(); $('year') && ($('year').textContent = new Date().getFullYear()); tick();
})();