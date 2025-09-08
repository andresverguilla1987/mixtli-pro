(() => {
  const $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const cfg = Object.assign({
    apiBase: '',
    grafana: '',
    prometheus: '',
    status: './status/',
    downloadSuite: '',
    downloadAddons: '',
    otelEndpoint: 'http://localhost:4318',
    cacheBust: true,
  }, window.MIXTLI_CFG || {});

  // Allow overrides via query params
  for (const k of ['apiBase','grafana','prometheus','status','downloadSuite','downloadAddons']) {
    if (params.has(k)) cfg[k] = params.get(k);
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
      ok = res.ok;
      rid = res.headers.get('x-request-id') || rid;
    } catch (e) {
      ms = Math.round(performance.now() - t0);
      ok = false;
    }
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
`;
    $('tech').textContent = text;
  }

  function themeInit() {
    const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    const saved = localStorage.getItem('mixtli-theme');
    if (saved === 'light' || (!saved && prefersLight)) document.body.classList.add('light');
    $('mode').onclick = () => {
      document.body.classList.toggle('light');
      localStorage.setItem('mixtli-theme', document.body.classList.contains('light') ? 'light' : 'dark');
    };
  }

  function tick() { pingHealth(); setTimeout(tick, 10000); }

  setLinks();
  setTech();
  themeInit();
  $('year') && ($('year').textContent = new Date().getFullYear());
  tick();
})();