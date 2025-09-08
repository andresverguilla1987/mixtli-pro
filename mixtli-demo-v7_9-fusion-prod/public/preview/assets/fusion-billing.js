(() => {
  const cfg = window.MIXTLI_CFG;
  const elGrid = document.getElementById('plans');
  const selCountry = document.getElementById('country');
  const elQuote = document.getElementById('crypto-quote');

  let period = 'm', method = 'stripe';

  function money(base, cur){ return (base || 0); }
  function priceOf(p){ const c = selCountry.value; let amt = p.price[c] || 0; if(period==='y'){ amt = Math.round(amt*12*0.85); } return amt; }

  function card(p, i){
    const price = priceOf(p);
    const c = selCountry.value;
    const div = document.createElement('div'); div.className='card'; div.style.animationDelay = (i*0.04)+'s';
    div.innerHTML = `
      <div class="title">${p.title}</div>
      <div class="meta">Moneda: ${c} • Método: <b>${method}</b> • ${period==='y'?'Anual (-15%)':'Mensual'}</div>
      <div class="actions" style="margin:8px 0">
        <span class="badge" style="background:linear-gradient(90deg,var(--accent),var(--accent2));color:#03121a;font-weight:800">$${price} ${c}</span>
        ${period==='y' ? '<span class="badge">ahorra 15%</span>' : ''}
      </div>
      <hr class="sep"/>
      <div class="actions">
        <button class="btn" data-act="link" data-id="${p.id}">Checkout</button>
        <button class="btn" data-act="sim" data-id="${p.id}">Simular</button>
        <button class="btn primary" data-act="wallet" data-id="${p.id}">Pagar con saldo</button>
      </div>
      <div class="meta" id="out-${p.id}" style="margin-top:8px">—</div>`;
    return div;
  }

  function render(){
    elGrid.innerHTML='';
    cfg.products.forEach((p,i)=> elGrid.appendChild(card(p,i)));
  }

  function quote(price){
    elQuote.textContent = `≈ ${(price/cfg.cryptoRates.BTC).toFixed(6)} BTC • ${(price/cfg.cryptoRates.ETH).toFixed(5)} ETH • ${(price/cfg.cryptoRates.USDC).toFixed(2)} USDC`;
  }

  elGrid.addEventListener('click', e => {
    const btn = e.target.closest('button[data-act]'); if(!btn) return;
    const p = cfg.products.find(x=>x.id===btn.dataset.id); const price = priceOf(p); const out = document.getElementById('out-'+p.id);
    if(btn.dataset.act==='link'){ out.textContent = 'Link: https://pay.mixtli.com/checkout?pid='+p.id+'&cur='+selCountry.value+'&amt='+price; quote(price); }
    else if(btn.dataset.act==='sim'){ out.textContent = '✔ Simulado: acreditados '+p.gb+' GB.'; }
    else if(btn.dataset.act==='wallet'){ out.textContent = 'Saldo insuficiente (demo).'; }
  });

  // toggles
  document.getElementById('periodTog').onclick = (e)=>{ const b=e.target.closest('button'); if(!b) return; period=b.dataset.p; [...e.currentTarget.children].forEach(x=>x.classList.toggle('active', x===b)); render(); };
  document.getElementById('methodTog').onclick = (e)=>{ const b=e.target.closest('button'); if(!b) return; method=b.dataset.m; [...e.currentTarget.children].forEach(x=>x.classList.toggle('active', x===b)); render(); };
  selCountry.onchange = render;

  render();
})();

// ===== UNIT_TOPUP =====
(function UnitTopUp(){
  const selCountry = document.getElementById('country');
  const grid = document.getElementById('plans');
  const cfg = window.MIXTLI_CFG;
  const Q = cfg.unitTopup || { minGB: 10, maxGB: 1000, tiers: [] };

  function perGb(qty, cur){
    const t = (Q.tiers||[]).find(t => t.upTo === null ? true : qty <= t.upTo) || Q.tiers[Q.tiers.length-1];
    return (t && t.price && t.price[cur]) ? t.price[cur] : 0;
  }
  function total(qty, cur){ return +(perGb(qty, cur) * qty).toFixed(cur==='COP' ? 0 : 2); }

  // Create card element
  const card = document.createElement('div');
  card.className = 'card';
  card.innerHTML = `
    <div class="title">Recarga por GB (min ${Q.minGB})</div>
    <div class="meta">Elige la cantidad exacta que necesitas. Precio por GB escala según volumen.</div>
    <div class="row" style="align-items:center">
      <input id="unitGB" type="number" min="${Q.minGB}" max="${Q.maxGB}" step="1" value="${Q.minGB}" style="max-width:140px"/>
      <input id="unitRange" type="range" min="${Q.minGB}" max="${Q.maxGB}" step="1" value="${Q.minGB}" style="flex:1"/>
      <span class="badge" id="perGbBadge">— / GB</span>
    </div>
    <hr class="sep"/>
    <div class="row" style="align-items:baseline">
      <button class="btn" id="unitCheckout">Checkout</button>
      <button class="btn" id="unitSim">Simular</button>
      <span class="badge" id="unitTotal">Total: —</span>
    </div>
    <div class="meta" id="unitOut" style="margin-top:8px">—</div>
  `;

  // Insert card BEFORE existing plan grid for visibilidad
  grid.parentElement.insertBefore(card, grid);

  const elQty = card.querySelector('#unitGB');
  const elRange = card.querySelector('#unitRange');
  const elPer = card.querySelector('#perGbBadge');
  const elTotal = card.querySelector('#unitTotal');
  const elOut = card.querySelector('#unitOut');
  const elCheckout = card.querySelector('#unitCheckout');
  const elSim = card.querySelector('#unitSim');
  const crypto = document.getElementById('crypto-quote');

  function update(){
    let q = parseInt(elQty.value||Q.minGB, 10);
    if(isNaN(q) || q < Q.minGB) q = Q.minGB;
    if(q > Q.maxGB) q = Q.maxGB;
    elQty.value = q; elRange.value = q;

    const cur = selCountry.value;
    const pgb = perGb(q, cur);
    const tot = total(q, cur);
    elPer.textContent = (cur === 'COP' ? '$' + pgb.toFixed(0) : '$' + pgb.toFixed(2)) + ' ' + cur + ' / GB';
    elTotal.textContent = 'Total: ' + (cur === 'COP' ? '$' + tot.toFixed(0) : '$' + tot.toFixed(2)) + ' ' + cur;
    elOut.textContent = '—';
  }

  elQty.addEventListener('input', update);
  elRange.addEventListener('input', (e)=>{ elQty.value = e.target.value; update(); });
  selCountry.addEventListener('change', update);

  elCheckout.onclick = ()=>{
    const q = parseInt(elQty.value, 10); const cur = selCountry.value;
    const amt = total(q, cur);
    const url = `https://pay.mixtli.com/checkout?pid=topup_unit&gb=${q}&cur=${cur}&amt=${amt}`;
    elOut.textContent = 'Link: ' + url;
    // crypto estimate
    const r = window.MIXTLI_CFG.cryptoRates || {BTC:900000,ETH:30000,USDC:17};
    const btc = (amt / r.BTC).toFixed(6), eth=(amt/r.ETH).toFixed(5), usdc=(amt/r.USDC).toFixed(2);
    if(crypto) crypto.textContent = `≈ ${btc} BTC • ${eth} ETH • ${usdc} USDC`;
  };

  elSim.onclick = ()=>{
    const q = parseInt(elQty.value, 10);
    elOut.textContent = '✔ Simulado: acreditados ' + q + ' GB a tu cuenta.';
  };

  update();
})();