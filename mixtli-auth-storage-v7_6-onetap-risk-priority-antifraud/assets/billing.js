(() => {
  const $ = (q) => document.querySelector(q);
  const cfg = window.MIXTLI_CFG;
  const plansEl = $('#plans'); const countrySel = $('#country'); const cryptoEl = $('#crypto-quote');

  // Render cards
  function render() {
    plansEl.innerHTML = '';
    cfg.products.forEach(p => {
      const price = p.price[countrySel.value] || '?';
      const el = document.createElement('div');
      el.className = 'card';
      el.innerHTML = `<div class="title">${p.title}</div>
        <div class="meta">País: ${cfg.country} • Moneda: ${countrySel.value} • Método: <span id="method-${p.id}">stripe</span></div>
        <hr class="sep"/>
        <div class="row">
          <button class="btn ghost" data-act="link" data-id="${p.id}">Configurar link</button>
          <button class="btn secondary" data-act="sim" data-id="${p.id}">Simular compra</button>
          <button class="btn" data-act="wallet" data-id="${p.id}">Pagar con saldo</button>
        </div>
        <div class="meta" id="out-${p.id}" style="margin-top:8px">Precio: ${countrySel.value} $${price}</div>`;
      plansEl.appendChild(el);
    });
  }

  // Method buttons
  document.querySelectorAll('button[data-method]').forEach(b => {
    b.onclick = () => { document.querySelectorAll('button[data-method]').forEach(x=>x.classList.remove('secondary')); b.classList.add('secondary'); document.querySelectorAll('[id^="method-"]').forEach(x=>x.textContent=b.dataset.method); };
  });

  // Actions
  plansEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-act]'); if (!btn) return;
    const id = btn.dataset.id; const p = cfg.products.find(x=>x.id===id);
    const price = p.price[countrySel.value];
    const out = document.getElementById('out-'+id);
    if (btn.dataset.act === 'link') {
      const url = `https://pay.mixtli.com/checkout?pid=${id}&cur=${countrySel.value}&amt=${price}`;
      out.textContent = 'Link configurado: ' + url;
      cryptoEl.textContent = `≈ ${(price/cfg.cryptoRates.BTC).toFixed(6)} BTC • ${(price/cfg.cryptoRates.ETH).toFixed(5)} ETH • ${(price/cfg.cryptoRates.USDC).toFixed(2)} USDC`;
    } else if (btn.dataset.act === 'sim') {
      out.textContent = 'Compra simulada ✔ Recibiste ' + p.gb + ' GB.';
    } else if (btn.dataset.act === 'wallet') {
      out.textContent = 'Saldo insuficiente (demo). Usa Simular compra.';
    }
  });

  countrySel.onchange = render;
  render();
  document.getElementById('modeLabel').textContent = cfg.mode.toUpperCase();
})();