window.CONFIG = {
  mode: "demo", // "demo" o "supabase"
  supabaseUrl: "",
  supabaseAnonKey: "",
  storageBucket: "files",
  billing: {
    // Precios por país (fiat) — ajusta a tu estrategia
    prices: {
      MX: { topup10: 49, topup50: 199, topup100: 349, proMonthly: 199 },
      AR: { topup10: 4990, topup50: 19900, topup100: 34900, proMonthly: 19900 },
      BR: { topup10: 29, topup50: 119, topup100: 199, proMonthly: 99 },
      CL: { topup10: 2500, topup50: 9900, topup100: 16900, proMonthly: 9900 },
      CO: { topup10: 19900, topup50: 69900, topup100: 119900, proMonthly: 69900 },
      PE: { topup10: 15, topup50: 59, topup100: 99, proMonthly: 59 },
      INT:{ topup10: 5, topup50: 19, topup100: 35, proMonthly: 19 }
    },

    currencies: { MX: "MXN", AR: "ARS", BR: "BRL", CL: "CLP", CO: "COP", PE: "PEN", INT: "USD" },
    products: {
      topup10: { gb: 10, label: "Recarga 10 GB" },
      topup50: { gb: 50, label: "Recarga 50 GB" },
      topup100: { gb: 100, label: "Recarga 100 GB" },
      proMonthly: { gb: 200, label: "Plan Pro (200 GB/mes)" }
    },
    // Links por país y pasarela (rellena con tus Payment Links / Botones)
    links: {
      crypto: {
        coinbase: {
          MX: { topup10: "", topup50: "", topup100: "", proMonthly: "" },
          AR: { topup10: "", topup50: "", topup100: "", proMonthly: "" },
          BR: { topup10: "", topup50: "", topup100: "", proMonthly: "" },
          CL: { topup10: "", topup50: "", topup100: "", proMonthly: "" },
          CO: { topup10: "", topup50: "", topup100: "", proMonthly: "" },
          PE: { topup10: "", topup50: "", topup100: "", proMonthly: "" },
          INT:{ topup10: "", topup50: "", topup100: "", proMonthly: "" }
        },
        nowpayments: {
          MX: { topup10: "", topup50: "", topup100: "", proMonthly: "" },
          AR: { topup10: "", topup50: "", topup100: "", proMonthly: "" },
          BR: { topup10: "", topup50: "", topup100: "", proMonthly: "" },
          CL: { topup10: "", topup50: "", topup100: "", proMonthly: "" },
          CO: { topup10: "", topup50: "", topup100: "", proMonthly: "" },
          PE: { topup10: "", topup50: "", topup100: "", proMonthly: "" },
          INT:{ topup10: "", topup50: "", topup100: "", proMonthly: "" }
        },
        btcpay: {
          MX: { topup10: "", topup50: "", topup100: "", proMonthly: "" },
          AR: { topup10: "", topup50: "", topup100: "", proMonthly: "" },
          BR: { topup10: "", topup50: "", topup100: "", proMonthly: "" },
          CL: { topup10: "", topup50: "", topup100: "", proMonthly: "" },
          CO: { topup10: "", topup50: "", topup100: "", proMonthly: "" },
          PE: { topup10: "", topup50: "", topup100: "", proMonthly: "" },
          INT:{ topup10: "", topup50: "", topup100: "", proMonthly: "" }
        }
      },
      stripe: {
        MX: { topup10: "", topup50: "", topup100: "", proMonthly: "" },
        AR: { topup10: "", topup50: "", topup100: "", proMonthly: "" },
        BR: { topup10: "", topup50: "", topup100: "", proMonthly: "" },
        CL: { topup10: "", topup50: "", topup100: "", proMonthly: "" },
        CO: { topup10: "", topup50: "", topup100: "", proMonthly: "" },
        PE: { topup10: "", topup50: "", topup100: "", proMonthly: "" },
        INT:{ topup10: "", topup50: "", topup100: "", proMonthly: "" }
      },
      mercadopago: {
        MX: { topup10: "", topup50: "", topup100: "", proMonthly: "" },
        AR: { topup10: "", topup50: "", topup100: "", proMonthly: "" },
        BR: { topup10: "", topup50: "", topup100: "", proMonthly: "" },
        CL: { topup10: "", topup50: "", topup100: "", proMonthly: "" },
        CO: { topup10: "", topup50: "", topup100: "", proMonthly: "" },
        PE: { topup10: "", topup50: "", topup100: "", proMonthly: "" },
        INT:{ topup10: "", topup50: "", topup100: "", proMonthly: "" }
      },
      paypal: {
        MX: { topup10: "", topup50: "", topup100: "", proMonthly: "" },
        AR: { topup10: "", topup50: "", topup100: "", proMonthly: "" },
        BR: { topup10: "", topup50: "", topup100: "", proMonthly: "" },
        CL: { topup10: "", topup50: "", topup100: "", proMonthly: "" },
        CO: { topup10: "", topup50: "", topup100: "", proMonthly: "" },
        PE: { topup10: "", topup50: "", topup100: "", proMonthly: "" },
        INT:{ topup10: "", topup50: "", topup100: "", proMonthly: "" }
      }
    }
  }
};