(() => {
  // KPIs
  setTimeout(()=>{
    const map = { rev:'$ 1,245', mrr:'$ 18,420', churn:'2.3%', fraud:'1 alerta' };
    document.querySelectorAll('#kpis .box').forEach(b=>{ const k=b.dataset.k; b.classList.remove('skeleton'); b.innerHTML = (k==='rev'?'Ingresos hoy':k.toUpperCase()) + `<h2>${map[k]}</h2>`; });
  }, 350);

  function fill(id, rows){ const tb=document.querySelector(id+' tbody'); tb.innerHTML = rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join(''); }
  fill('#tbl-dep', [['dep_101','alex@mixtli.com','stripe','$199','captured'],['dep_102','sam@mixtli.com','mp','$49','pending'],['dep_103','vale@mixtli.com','crypto','$349','settled']]);
  fill('#tbl-kyc', [['alex@mixtli.com','INE','aprobado','2025-09-06'],['sam@mixtli.com','Pasaporte','pendiente','—']]);
  fill('#tbl-tenants', [['cinepolis','pro','420','16'],['insper','team','812','48'],['mixetles','free','35','3']]);
  fill('#tbl-fraud', [['txn_8901','mismatch país/IP','alto','revisar'],['txn_8902','múltiples BIN','medio','bloquear']]);
})();