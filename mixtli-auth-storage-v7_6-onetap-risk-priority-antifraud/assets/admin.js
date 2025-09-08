(() => {
  const $ = (q) => document.querySelector(q);
  const cfg = window.MIXTLI_CFG;

  function fillTable(id, rows) {
    const tb = document.querySelector(id + ' tbody');
    tb.innerHTML = rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]||''}</td><td>${r[4]||''}</td></tr>`).join('');
  }

  // Demo data
  fillTable('#tbl-dep', [
    ['dep_101','alex@mixtli.com','stripe','$199','captured'],
    ['dep_102','sam@mixtli.com','mp','$49','pending'],
    ['dep_103','vale@mixtli.com','crypto','$349','settled'],
  ]);
  fillTable('#tbl-kyc', [
    ['alex@mixtli.com','INE','aprobado','2025-09-06'],
    ['sam@mixtli.com','Pasaporte','pendiente','—'],
  ]);
  document.getElementById('rev-today').textContent = '$ 1,245';
  document.getElementById('mrr').textContent = '$ 18,420';
  document.getElementById('churn').textContent = '2.3%';
  document.getElementById('fraud7').textContent = '1 alerta';

  fillTable('#tbl-tenants', [
    ['cinepolis','pro','420','16'],
    ['insper','team','812','48'],
    ['mixetles','free','35','3'],
  ]);
  fillTable('#tbl-fraud', [
    ['txn_8901','mismatch país/IP','alto','revisar'],
    ['txn_8902','múltiples BIN','medio','bloquear'],
  ]);
})();