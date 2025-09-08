// Config por defecto. Puedes sobrescribir con query params, ej:
// /preview/?apiBase=https://mixtli-pro.onrender.com&grafana=https://grafana.mixtli.com&prometheus=https://prom.mixtli.com
window.MIXTLI_CFG = {
  apiBase: 'https://mixtli-pro.onrender.com', // cambia por tu API si aplica
  grafana: '',        // pon tu URL pública de Grafana aquí (o usa grafana.html?url=...)
  prometheus: '',     // pon tu URL pública de Prometheus (o usa prom.html?url=...)
  status: './status/',
  downloadSuite: '',  // link al ZIP suite si lo publicas
  downloadAddons: '', // link al ZIP addons si lo publicas
  otelEndpoint: 'http://localhost:4318',
  cacheBust: true,
};