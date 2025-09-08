window.MIXTLI_CFG = {
  // Si sirves esta página desde la MISMA API, deja apiBase vacío para usar el mismo host
  apiBase: '', // ej: 'https://mixtli-pro.onrender.com'
  grafana: 'http://localhost:3000',
  prometheus: 'http://localhost:9090',
  status: './status',

  // Links a zips (actualízalos al subirlos a tu hosting)
  downloadSuite: '#',
  downloadAddons: '#',

  otelEndpoint: 'http://localhost:4318',
  cacheBust: true,
};