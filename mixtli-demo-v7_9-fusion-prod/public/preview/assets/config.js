window.MIXTLI_CFG = {
  apiBase: '',      // mismo host de la API (evita CORS)
  usersApi: '',     // alias si difiere
  grafana: '/dash/grafana',
  prometheus: '/dash/prom',
  currency: 'MXN',
  country: 'MX',
  cryptoRates: { BTC: 900000, ETH: 30000, USDC: 17 },
  products: [
    { id:'topup_10',  title:'Recarga 10 GB — 10 GB',  gb:10,  price:{MXN:49, USD:4, COP:16000} },
    { id:'topup_50',  title:'Recarga 50 GB — 50 GB',  gb:50,  price:{MXN:199, USD:14, COP:64000} },
    { id:'topup_100', title:'Recarga 100 GB — 100 GB',gb:100, price:{MXN:349, USD:24, COP:104000} },
    { id:'plan_pro',  title:'Plan Pro (200 GB/mes) — 200 GB', gb:200, price:{MXN:199, USD:14, COP:64000}, subscription:true }
  ]

  ,
  unitTopup: {
    minGB: 10,
    maxGB: 2000,
    tiers: [
      { upTo: 49,  price: { MXN: 6.0,  USD: 0.45, COP: 1800 } },   // 10–49 GB
      { upTo: 99,  price: { MXN: 5.0,  USD: 0.40, COP: 1600 } },   // 50–99 GB
      { upTo: 499, price: { MXN: 4.0,  USD: 0.32, COP: 1280 } },   // 100–499 GB
      { upTo: null, price:{ MXN: 3.5,  USD: 0.28, COP: 1120 } }    // 500+ GB
    ]
  }

};