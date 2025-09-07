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
  const btnCR = document.getElementById("methodCR");
  const cryptoProviders = document.getElementById("cryptoProviders");

  let method = "stripe";
  btnStripe.classList.add("bg-white/20");

  let cryptoProv = "coinbase";
  function setMethod(m){
    method = m;
    btnStripe.classList.toggle("bg-white/20", m==="stripe");
    btnMP.classList.toggle("bg-white/20", m==="mercadopago");
    btnPP.classList.toggle("bg-white/20", m==="paypal");
    btnCR.classList.toggle("bg-white/20", m==="crypto");
    cryptoProviders.classList.toggle("hidden", m!=="crypto");
    renderCards();
  }
  btnStripe.onclick = ()=>setMethod("stripe");
  btnMP.onclick = ()=>setMethod("mercadopago");
  btnPP.onclick = ()=>setMethod("paypal");
  btnCR.onclick = ()=>setMethod("crypto");
  // crypto provider toggle
  cryptoProviders.querySelectorAll("button").forEach(b=>{
    b.addEventListener("click", ()=>{ cryptoProv = b.dataset.prov; cryptoProviders.querySelectorAll("button").forEach(x=>x.classList.remove("bg-white/20")); b.classList.add("bg-white/20"); renderCards(); });
  });

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
    if (methodKey === "crypto"){
      const map = ((((cfg.billing || {}).links || {}).crypto || {})[cryptoProv] || {})[country] || {};
      return map[prodKey] || "";
    }
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

// --- Wallet UI (saldo) ---
(() => {
  const cfg = window.CONFIG || { mode: "demo" };
  let sb = null;
  if (cfg.mode === "supabase" && cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase) {
    sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  }

  const main = document.querySelector("main");
  const walletCard = document.createElement("div");
  walletCard.className = "mt-8 rounded-2xl border border-white/10 bg-white/5 p-5";
  walletCard.innerHTML = `
    <div class="flex items-center justify-between">
      <div>
        <h2 class="font-semibold">Saldo (Wallet)</h2>
        <p id="walletCur" class="text-xs text-slate-400">-</p>
      </div>
      <div class="text-right">
        <div id="walletBal" class="text-2xl font-extrabold">--</div>
        <div class="text-xs text-slate-400">Disponible</div>
      </div>
    </div>
    <div class="mt-4 flex flex-wrap gap-2">
      <button id="walletDeposit" class="px-3 py-2 rounded-md bg-brand-500 hover:bg-brand-600 text-white">Depositar</button>
      <button id="walletBank" class="px-3 py-2 rounded-md bg-white/10 hover:bg-white/20">Transferencia bancaria</button>
    </div>
    <ul id="walletLog" class="mt-4 space-y-2 text-sm"></ul>
  `;
  main.appendChild(walletCard);

  function fmt(amountCents, cur="MXN"){
    const v = (amountCents||0)/100;
    try { return new Intl.NumberFormat('es-MX', { style:'currency', currency:cur }).format(v); } catch { return v.toFixed(2) + ' ' + cur; }
  }

  async function getUser(){
    if (sb){ const { data } = await sb.auth.getUser(); return data?.user || null; }
    const s = JSON.parse(localStorage.getItem("mx_session")||"null"); return s? { id:"demo-user", email:s.email } : null;
  }

  async function loadWallet(){
    const user = await getUser(); if (!user) return;
    if (sb){
      const { data: w } = await sb.from("wallets").select("*").eq("user_id", user.id).maybeSingle();
      const { data: logs } = await sb.from("wallet_ledger").select("*").eq("user_id", user.id).order("created_at",{ascending:false}).limit(15);
      const cur = w?.currency?.toUpperCase() || "MXN";
      document.getElementById("walletCur").textContent = cur;
      document.getElementById("walletBal").textContent = fmt(w?.balance_cents||0, cur);
      const ul = document.getElementById("walletLog"); ul.innerHTML="";
      (logs||[]).forEach(r=>{
        const li=document.createElement("li"); li.className="rounded-md border border-white/10 bg-white/5 px-3 py-2 flex justify-between";
        li.textContent = `${r.created_at} • ${r.type} • ${fmt(r.amount_cents, r.currency?.toUpperCase()||'MXN')}`;
        ul.appendChild(li);
      });
    } else {
      const cur = "MXN";
      const bal = Number(localStorage.getItem("mx_wallet_cents")||"0");
      document.getElementById("walletCur").textContent = cur;
      document.getElementById("walletBal").textContent = fmt(bal, cur);
      const ul = document.getElementById("walletLog"); ul.innerHTML="";
      const log = JSON.parse(localStorage.getItem("mx_wallet_log")||"[]");
      log.slice(-15).reverse().forEach(r=>{
        const li=document.createElement("li"); li.className="rounded-md border border-white/10 bg-white/5 px-3 py-2 flex justify-between";
        li.textContent = `${r.created_at} • ${r.type} • ${fmt(r.cents, cur)}`;
        ul.appendChild(li);
      });
    }
  }

  // Depositar (elige método actual del selector de arriba y país)
  document.getElementById("walletDeposit").addEventListener("click", ()=>{
    // Reusar el primer card de productos para tomar href activo
    const anyBtn = document.querySelector("#plans a[href]");
    if (anyBtn && anyBtn.getAttribute("href")){
      location.href = anyBtn.getAttribute("href");
    } else {
      alert("Configura primero tus links por país y método en config.js o usa Simular compra en DEMO.");
    }
  });

  // Transferencia bancaria (flujo manual con referencia)
  document.getElementById("walletBank").addEventListener("click", async ()=>{
    const amount = prompt("¿Cuánto quieres depositar? (MXN)");
    if (!amount) return;
    const cents = Math.round(Number(amount) * 100);
    const ref = Math.random().toString().slice(2,10) + "-" + Math.random().toString(36).slice(2,6).toUpperCase();
    alert("Referencia generada: " + ref + "\\nUsa esta referencia en tu transferencia. Al confirmar, el saldo se acreditará.");
    // DEMO: registramos pendiente en localStorage
    if (!sb){
      const pend = JSON.parse(localStorage.getItem("mx_bank_pend")||"[]");
      pend.push({ ref, cents, created_at: new Date().toISOString() });
      localStorage.setItem("mx_bank_pend", JSON.stringify(pend));
    }
  });

  // Hook para "Simular compra" también como depósito a wallet si el método actual es 'deposit only'
  // (dejamos el comportamiento por defecto de sumar GB en productos)

  // Añade botones "Pagar con saldo" a las cards
  setTimeout(()=>{
    document.querySelectorAll("#plans .rounded-xl").forEach((card, idx)=>{
      const btn = document.createElement("button");
      btn.className = "px-3 py-2 rounded-md bg-white/10 hover:bg-white/20";
      btn.textContent = "Pagar con saldo";
      btn.addEventListener("click", async ()=>{
        // Obtener GB de la tarjeta
        const title = card.querySelector(".font-semibold")?.textContent || "";
        const gbMatch = title.match(/(\\d+)\\s*GB/);
        const gb = gbMatch ? Number(gbMatch[1]) : 0;
        if (!gb) { alert("No se pudo leer los GB"); return; }

        if (sb){
          const { data: u } = await sb.auth.getUser();
          if (!u?.user){ location.href="auth.html"; return; }
          const { error } = await sb.rpc("buy_gb_with_wallet", { p_user: u.user.id, p_gb: gb });
          if (error){ alert("Saldo insuficiente o error: " + error.message); return; }
          alert("✅ Compra con saldo realizada: +" + gb + " GB");
        } else {
          // DEMO
          const pricePerGB = 1000; // $10.00 por GB en centavos (ajusta)
          const need = gb * pricePerGB;
          let bal = Number(localStorage.getItem("mx_wallet_cents")||"0");
          if (bal < need){ alert("Saldo insuficiente"); return; }
          bal -= need;
          localStorage.setItem("mx_wallet_cents", String(bal));
          const log = JSON.parse(localStorage.getItem("mx_wallet_log")||"[]");
          log.push({ type:"debit", cents:-need, created_at:new Date().toISOString() });
          localStorage.setItem("mx_wallet_log", JSON.stringify(log));
          // Acreditar GB
          const prof = JSON.parse(localStorage.getItem("mx_profile") || '{"quota_gb":2,"bonus_gb":0,"used_bytes":0}');
          prof.bonus_gb = (prof.bonus_gb||0) + gb;
          localStorage.setItem("mx_profile", JSON.stringify(prof));
          alert("✅ Compra con saldo realizada: +" + gb + " GB (DEMO)");
        }
        // refrescar saldo
        loadWallet();
      });
      card.querySelector(".mt-2").appendChild(btn);
    });
  }, 100);

  loadWallet();
})();