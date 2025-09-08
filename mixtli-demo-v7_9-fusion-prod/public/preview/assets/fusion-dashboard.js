(() => {
  // KPIs with skeleton -> fill
  setTimeout(()=>{
    const boxes = document.querySelectorAll('.kpi .box'); 
    const vals = [
      (120 + Math.floor(Math.random()*30)) + ' GB',
      (12000 + Math.floor(Math.random()*2000)).toLocaleString(),
      (12 + Math.floor(Math.random()*6)) + ' GB',
      'free'
    ];
    boxes.forEach((b,i)=>{ b.classList.remove('skeleton'); b.innerHTML = ['Almacenamiento','Objetos','Transferencia','Plan'][i] + `<h2>${vals[i]}</h2>`; });
  }, 400);

  const tbody = document.querySelector('#tbl-activity tbody');
  const rows = [
    {date:'2025-09-06 09:12', action:'Login', detail:'demo@mixtli.com'},
    {date:'2025-09-05 18:30', action:'Subió archivo', detail:'video.mp4 (1.2GB)'},
    {date:'2025-09-05 18:34', action:'Compartió link', detail:'/files/report.pdf'},
    {date:'2025-09-04 10:02', action:'Borró objeto', detail:'tmp.dat'},
  ];
  function render(rows){ tbody.innerHTML = rows.map(r=>`<tr><td>${r.date}</td><td>${r.action}</td><td>${r.detail}</td></tr>`).join(''); }
  render(rows);

  // filter
  document.getElementById('filter').oninput = (e)=>{
    const q = e.target.value.toLowerCase();
    render(rows.filter(r => Object.values(r).some(v=>String(v).toLowerCase().includes(q))));
  };
  // sorting
  document.querySelectorAll('#tbl-activity thead button').forEach(btn => btn.onclick = () => {
    const col = btn.dataset.col; const sorted = [...rows].sort((a,b)=> String(a[col]).localeCompare(String(b[col])) );
    render(sorted);
  });
})();