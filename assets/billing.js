/* Billing UI — LATAM multipasarela (Stripe / Mercado Pago / PayPal) + DEMO */
(() => {
  const cfg = window.CONFIG || { mode: "demo" };
  let sb = null;
  if (cfg.mode === "supabase" && cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase) {
    sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  }
  const plans = document.getElementById("plans");
  const purchaseList = document.getElementById("purchaseList");
  const countrySel = document.getElementById("countrySel");
  const btnStripe = document.getElementById("methodStripe");
  const btnMP = document.getElementById("methodMP");
  const btnPP = document.getElementById("methodPP");

  let method = "stripe";
  btnStripe.classList.add("bg-white/20");

  function setMethod(m){
    method = m;
    btnStripe.classList.toggle("bg-white/20", m==="stripe");
    btnMP.classList.toggle("bg-white/20", m==="mercadopago");
    btnPP.classList.toggle("bg-white/20", m==="paypal");
    renderCards();
  }
  btnStripe.onclick = ()=>setMethod("stripe");
  btnMP.onclick = ()=>setMethod("mercadopago");
  btnPP.onclick = ()=>setMethod("paypal");

  // Try guess country from locale
  try {
    const loc = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    if (loc.includes("Mexico")) countrySel.value = "MX";
    else if (loc.includes("Argentina")) countrySel.value = "AR";
    else if (loc.includes("Sao_Paulo") || loc.includes("Argentina")) countrySel.value = "BR";
  } catch(e){}
  countrySel.onchange = renderCards;

  const cards = [
    { key: "topup10" }, { key: "topup50" }, { key: "topup100" }, { key: "proMonthly" }
  ];

  function currencyForCountry(c){
    return (cfg.billing.currencies && cfg.billing.currencies[c]) || "USD";
  }

  function linkFor(country, methodKey, prodKey){
    const map = (((cfg.billing || {}).links || {})[methodKey] || {})[country] || {};
    return map[prodKey] || "";
  }

  function renderCards(){
    plans.innerHTML = "";
    const c = countrySel.value;
    const cur = currencyForCountry(c);
    cards.forEach(card => {
      const p = (cfg.billing.products || {})[card.key] || { gb: 0, label: card.key };
      const href = linkFor(c, method, card.key);
      const el = document.createElement("div");
      el.className = "rounded-xl border border-white/10 bg-white/5 p-4 flex flex-col gap-3";
      el.innerHTML = `<div class="font-semibold">${p.label} — ${p.gb} GB</div>
        <div class="text-xs text-slate-400">País: ${c} • Moneda: ${cur} • Método: ${method}</div>
        <div class="mt-2 flex items-center gap-2">
          <a ${href?`href="${href}" target="_blank"`:""} class="px-4 py-2 rounded-md bg-brand-500 hover:bg-brand-600 text-white">${href?'Comprar':'Configurar link'}</a>
          ${cfg.mode==='demo' ? '<button class="sim-btn px-3 py-2 rounded-md bg-white/10 hover:bg-white/20">Simular compra</button>' : ''}
        </div>`;
      const sim = el.querySelector(".sim-btn");
      if (sim){
        sim.addEventListener("click", ()=>{
          const prof = JSON.parse(localStorage.getItem("mx_profile") || '{"quota_gb":2,"bonus_gb":0,"used_bytes":0}');
          prof.bonus_gb = (prof.bonus_gb||0) + (p.gb||0);
          localStorage.setItem("mx_profile", JSON.stringify(prof));
          alert(`✅ Recarga DEMO aplicada: +${p.gb} GB (${method.toUpperCase()} • ${c})`);
        });
      }
      plans.appendChild(el);
    });
  }

  // Historial
  (async function loadPurchases(){
    if (sb){
      const { data } = await sb.from("purchases").select("*").order("created_at",{ascending:false}).limit(20);
      (data||[]).forEach(r=>{
        const li = document.createElement("li");
        li.className = "rounded-md border border-white/10 bg-white/5 px-3 py-2 flex justify-between";
        li.textContent = `${r.created_at} • ${r.gb} GB • ${(r.currency||'mxn').toUpperCase()} ${(r.amount_cents||0)/100} • ${r.provider}`;
        purchaseList.appendChild(li);
      });
    } else {
      const li = document.createElement("li");
      li.className = "text-slate-400 text-sm";
      li.textContent = "En DEMO no hay historial real. Usa los botones 'Simular compra'.";
      purchaseList.appendChild(li);
    }
  })();

  renderCards();
})();