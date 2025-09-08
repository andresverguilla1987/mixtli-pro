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