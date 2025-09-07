/* Billing UI (Payment Links o DEMO) */
(() => {
  const cfg = window.CONFIG || { mode: "demo" };
  let sb = null;
  if (cfg.mode === "supabase" && cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase) {
    sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  }
  const plans = document.getElementById("plans");
  const purchaseList = document.getElementById("purchaseList");

  const cards = [
    { key: "topup10" }, { key: "topup50" }, { key: "topup100" }, { key: "proMonthly" }
  ];
  cards.forEach(c => {
    const p = cfg.billing.products[c.key];
    const link = cfg.billing.stripeLinks[c.key];
    const el = document.createElement("div");
    el.className = "rounded-xl border border-white/10 bg-white/5 p-4 flex flex-col gap-3";
    el.innerHTML = `<div class="font-semibold">${p.label}</div>
      <div class="text-sm text-slate-300">Acredita ${p.gb} GB ${c.key==='proMonthly'?'cada mes (suscripción)':'(prepago)'}</div>
      <div class="mt-2 flex items-center gap-2">
        <a ${link?`href="${link}" target="_blank"`:""} class="px-4 py-2 rounded-md bg-brand-500 hover:bg-brand-600 text-white">${link?'Comprar':'Configurar link'}</a>
        ${cfg.mode==='demo' ? '<button id="sim_'+c.key+'" class="px-3 py-2 rounded-md bg-white/10 hover:bg-white/20">Simular compra</button>' : ''}
      </div>`;
    plans.appendChild(el);
    if (cfg.mode==='demo') {
      el.querySelector("#sim_"+c.key).addEventListener("click", async ()=>{
        const prof = JSON.parse(localStorage.getItem("mx_profile") || '{"quota_gb":2,"bonus_gb":0,"used_bytes":0}');
        prof.bonus_gb = (prof.bonus_gb||0) + (p.gb||0);
        localStorage.setItem("mx_profile", JSON.stringify(prof));
        alert("✅ Recarga aplicada en DEMO: +" + p.gb + " GB");
      });
    }
  });

  (async function loadPurchases(){
    if (sb){
      const { data } = await sb.from("purchases").select("*").order("created_at",{ascending:false}).limit(20);
      (data||[]).forEach(r=>{
        const li = document.createElement("li");
        li.className = "rounded-md border border-white/10 bg-white/5 px-3 py-2 flex justify-between";
        li.textContent = `${r.created_at} • ${r.gb} GB • ${(r.currency||'mxn').toUpperCase()} ${(r.amount_cents||0)/100}`;
        purchaseList.appendChild(li);
      });
    } else {
      const li = document.createElement("li");
      li.className = "text-slate-400 text-sm";
      li.textContent = "En DEMO no hay historial real. Usa los botones 'Simular compra'.";
      purchaseList.appendChild(li);
    }
  })();
})();