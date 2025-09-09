import {CFG} from './config.js';import * as API from './adapter.js';const $=q=>document.querySelector(q);
$('#apiBase').value=CFG.API_BASE;const L=$('#tabLogin'),R=$('#tabReg'),B1=$('#loginBox'),B2=$('#regBox');
L.onclick=()=>{L.classList.add('active');R.classList.remove('active');B1.classList.remove('hidden');B2.classList.add('hidden');};
R.onclick=()=>{R.classList.add('active');L.classList.remove('active');B1.classList.add('hidden');B2.classList.remove('hidden');};
$('#btnSaveCfg').onclick=async()=>{const base=$('#apiBase').value.trim();localStorage.setItem('mixtli.api',base);CFG.API_BASE=base;try{const h=await API.health();$('#health').textContent=`OK (${h.driver})`;}catch{$('#health').textContent='SIN CONEXIÓN';}};
$('#btnLogin').onclick=async()=>{$('#logOut').textContent='...';try{await API.login($('#logEmail').value.trim(),$('#logPass').value);location.href='dashboard.html';}catch(e){$('#logOut').textContent=e.message;}};
$('#btnRegister').onclick=async()=>{$('#regOut').textContent='...';try{const r=await API.register($('#regEmail').value.trim(),$('#regPass').value);$('#regOut').textContent=JSON.stringify(r,null,2);}catch(e){$('#regOut').textContent=e.message;}};
window.addEventListener('load',()=>$('#btnSaveCfg').click());