window.CONFIG = {
  mode: "demo", // "demo" o "supabase"
  supabaseUrl: "",
  supabaseAnonKey: "",
  storageBucket: "files",
  billing: {
    stripeLinks: { topup10: "", topup50: "", topup100: "", proMonthly: "" },
    priceIds: { topup10: "price_123", topup50: "price_456", topup100: "price_789", proMonthly: "price_abc" },
    products: {
      topup10: { gb: 10, label: "Recarga 10 GB" },
      topup50: { gb: 50, label: "Recarga 50 GB" },
      topup100: { gb: 100, label: "Recarga 100 GB" },
      proMonthly: { gb: 200, label: "Plan Pro (200 GB/mes)" }
    }
  }
};