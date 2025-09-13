import React, { useState } from 'react'
import { API_BASE } from '../lib/api'

export default function Library(){
  const [rows,setRows]=useState([]); const [prefix,setPrefix]=useState(''); const [token,setToken]=useState(null);
  async function load(reset){
    const url = new URL(API_BASE + '/api/assets'); if(prefix) url.searchParams.set('prefix',prefix); if(!reset && token) url.searchParams.set('token',token); url.searchParams.set('limit','20');
    const r = await fetch(url.toString()); const data = await r.json(); setToken(data.nextToken || null); setRows(prev => reset ? data.items : [...prev, ...data.items])
  }
  function fmtBytes(n){ if(!Number.isFinite(n)) return '-'; const u=['B','KB','MB','GB']; let i=0,v=n; while(v>=1024&&i<u.length-1){v/=1024;i++} return `${v.toFixed(v<10?1:0)} ${u[i]}` }
  async function del(key){ if(!confirm('¿Borrar?')) return; const r = await fetch(API_BASE+'/api/delete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key})}); if(r.ok) setRows(prev=>prev.filter(x=>x.key!==key)) }
  async function ren(key){ const toKey = prompt('Nuevo nombre', key); if(!toKey||toKey===key) return; const r = await fetch(API_BASE+'/api/rename',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({fromKey:key,toKey})}); if(r.ok) { setRows([]); setToken(null); await load(true); } }
  async function sign(key){ const r = await fetch(API_BASE+'/api/sign-get',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key})}); const data = await r.json(); if(data.url) window.open(data.url,'_blank') }
  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">Biblioteca</h2>
      <div className="flex items-center gap-2 mb-4">
        <input value={prefix} onChange={e=>setPrefix(e.target.value)} placeholder="Prefijo" className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700"/>
        <button onClick={()=>load(true)} className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500">Cargar</button>
        <button onClick={()=>load(false)} disabled={!token} className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 hover:bg-zinc-700">Siguiente</button>
      </div>
      <table className="w-full text-sm border-separate border-spacing-y-2">
        <thead className="text-zinc-400"><tr><th className="text-left">Archivo</th><th className="text-right">Tamaño</th><th className="text-left">Modificado</th><th></th></tr></thead>
        <tbody>
          {rows.map(it => (
            <tr key={it.key}>
              <td className="align-top py-1"><div className="truncate max-w-[320px]" title={it.key}>{it.key}</div></td>
              <td className="align-top py-1 text-right">{fmtBytes(it.size)}</td>
              <td className="align-top py-1">{new Date(it.lastModified).toLocaleString()}</td>
              <td className="align-top py-1">
                <div className="flex gap-2 justify-end">
                  <button onClick={()=>navigator.clipboard?.writeText(it.publicUrl||'')} disabled={!it.publicUrl} className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700">Copiar público</button>
                  <button onClick={()=>sign(it.key)} className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700">GET firmado</button>
                  <button onClick={()=>ren(it.key)} className="px-2 py-1 rounded bg-amber-600 hover:bg-amber-500">Renombrar</button>
                  <button onClick={()=>del(it.key)} className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-500">Borrar</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
