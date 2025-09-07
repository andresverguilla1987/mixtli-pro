window.CONFIG = {
  mode: "demo", // "demo" o "supabase"
  supabaseUrl: "",
  supabaseAnonKey: "",
  storageBucket: "files",
  billing: {
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