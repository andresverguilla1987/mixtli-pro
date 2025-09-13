import React, { useRef, useMemo, useState } from 'react'
import { uploadMixtli } from '../lib/uploadMixtli'
import { Upload, Loader2, AlertTriangle, CheckCircle2, XCircle, Link, ExternalLink, Trash2, FileText } from 'lucide-react'

const MAX_BYTES = 50*1024*1024
const ALLOWED_MIME_PREFIXES = ['image/','application/pdf']
const cn = (...xs)=> xs.filter(Boolean).join(' ')
const fmtBytes = n=>{ if(!Number.isFinite(n))return '-'; const u=['B','KB','MB','GB']; let i=0,v=n; while(v>=1024&&i<u.length-1){v/=1024;i++} return `${v.toFixed(v<10?1:0)} ${u[i]}` }
const allowedMime = t=> ALLOWED_MIME_PREFIXES.some(p => t===p || (t && t.startsWith(p)))

export default function MixtliUploader(){
  const [items,setItems]=useState([]); const [running,setRunning]=useState(false); const inputRef=useRef(null); const xhrMap=useRef(new Map())
  const invalidCount=useMemo(()=>items.filter(i=>i.status==='invalid').length,[items])
  const queuedCount=useMemo(()=>items.filter(i=>i.status==='queued').length,[items])
  const uploadingCount=useMemo(()=>items.filter(i=>i.status==='uploading').length,[items])
  const openPicker=()=> inputRef.current?.click();
  const onPick=(e)=>{ const files=Array.from(e.target.files||[]); enqueue(files); e.target.value='' }
  const enqueue=(files)=>{
    const now=Date.now();
    const next=files.map((f,idx)=>{
      const tooBig=f.size>MAX_BYTES; const badMime=!allowedMime(f.type)
      return { id:`${now}-${idx}-${Math.random().toString(36).slice(2,8)}`, file:f, name:f.name, size:f.size, type:f.type, status:(tooBig||badMime)?'invalid':'queued', reason: tooBig?'> 50 MB': badMime?`MIME no permitido (${f.type||'desconocido'})`:null, progress:0, key:null, publicUrl:null, getUrl:null, error:null }
    });
    setItems(prev=>[...next,...prev])
  }
  const removeItem=id=>{ const xhr=xhrMap.current.get(id); if(xhr&&xhr.readyState!==4){ try{xhr.abort()}catch{} } xhrMap.current.delete(id); setItems(prev=>prev.filter(i=>i.id!==id)) }
  const clearDone=()=> setItems(prev=>prev.filter(i=>!['done','invalid'].includes(i.status)))
  const clearAll=()=>{ xhrMap.current.forEach(x=>{try{x.abort()}catch{}}); xhrMap.current.clear(); setItems([]) }

  async function uploadOne(item){
    const file=item.file
    const p = await fetch((import.meta.env.VITE_API_BASE || window.API_BASE || 'https://mixtli-pro.onrender.com') + '/api/presign', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ filename:file.name, type:file.type, size:file.size }) })
    if (!p.ok) throw new Error(`presign ${p.status}: ${await p.text()}`)
    const { url, key, publicUrl } = await p.json()
    await new Promise((resolve,reject)=>{ const xhr=new XMLHttpRequest(); xhr.open('PUT', url, true); xhr.setRequestHeader('Content-Type', file.type||'application/octet-stream'); xhrMap.current.set(item.id,xhr); xhr.upload.onprogress=(e)=>{ if(e.lengthComputable){ const pv=Math.round((e.loaded/e.total)*100); setItems(prev=>prev.map(it=>it.id===item.id?{...it,progress:pv,status:'uploading'}:it)) } }; xhr.onload=()=> (xhr.status>=200&&xhr.status<300)?resolve():reject(new Error(`R2 PUT ${xhr.status}: ${xhr.responseText}`)); xhr.onerror=()=>reject(new Error('R2 PUT network error')); xhr.send(file) })
    const c = await fetch((import.meta.env.VITE_API_BASE || window.API_BASE || 'https://mixtli-pro.onrender.com') + '/api/complete', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ key }) })
    if (!c.ok) throw new Error(`complete ${c.status}: ${await c.text()}`)
    const meta = await c.json()
    setItems(prev=>prev.map(it=>it.id===item.id?{...it,status:'done',progress:100,key,publicUrl,getUrl:meta.getUrl||null}:it))
  }
  async function runQueue(){ if(running) return; setRunning(true); const MAXC=3; const ids=items.filter(i=>i.status==='queued').map(i=>i.id); let idx=0,act=0; await new Promise(res=>{ const pump=()=>{ while(act<MAXC && idx<ids.length){ const id=ids[idx++]; act++; const item=items.find(i=>i.id===id); setItems(prev=>prev.map(it=>it.id===id?{...it,status:'uploading',progress:0}:it)); uploadOne(item).catch(err=>{ setItems(prev=>prev.map(it=>it.id===id?{...it,status:'error',error:String(err)}:it)) }).finally(()=>{ act--; pump() }) } if(act===0 && idx>=ids.length) res() }; pump() }); setRunning(false) }

  return (
    <div>
      <div className="border-2 border-dashed rounded-2xl p-8 text-center transition border-zinc-700 bg-zinc-900">
        <div className="flex flex-col items-center gap-3">
          <p className="text-zinc-300">Arrastra archivos aquí o</p>
          <button onClick={openPicker} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 font-medium inline-flex items-center gap-2"><Upload className="w-4 h-4"/> Elegir archivos</button>
          <input ref={inputRef} type="file" multiple className="hidden" onChange={onPick}/>
          <p className="text-xs text-zinc-400">Máx. 50MB. Tipos permitidos: imágenes y PDF.</p>
        </div>
      </div>

      <div className="flex items-center justify-between mt-6 mb-2">
        <div className="text-sm text-zinc-400">{items.length===0? 'Sin archivos aún' : `${items.length} archivo(s). ${queuedCount} en cola, ${uploadingCount} subiendo, ${invalidCount} inválidos.`}</div>
        <div className="flex items-center gap-2">
          <button disabled={queuedCount===0||running} onClick={runQueue} className={cn('px-4 py-2 rounded-xl font-medium inline-flex items-center gap-2 border', queuedCount===0||running ? 'bg-zinc-800 border-zinc-800 text-zinc-500':'bg-emerald-600 hover:bg-emerald-500 border-emerald-500')}>{running? (<><Loader2 className="w-4 h-4 animate-spin"/> Subiendo...</>): (<>Iniciar subidas</>)}</button>
          <button onClick={clearDone} className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 hover:bg-zinc-700">Limpiar listos/invalidos</button>
          <button onClick={clearAll} className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 hover:bg-zinc-700">Limpiar todo</button>
        </div>
      </div>

      <ul className="grid md:grid-cols-2 gap-4 mt-2">
        {items.map(it => (
          <li key={it.id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <div className="flex gap-3 items-start">
              <div className="p-2 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-300"><FileText className="w-5 h-5"/></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="truncate font-medium" title={it.name}>{it.name}</div>
                  <div className="text-xs text-zinc-500">{fmtBytes(it.size)}</div>
                </div>
                <div className="mt-1 text-sm">
                  {it.status==='invalid' && (<span className="inline-flex items-center gap-1 text-amber-400"><AlertTriangle className="w-4 h-4"/> {it.reason}</span>)}
                  {it.status==='queued' && (<span className="text-zinc-400">En cola</span>)}
                  {it.status==='uploading' && (<span className="inline-flex items-center gap-2 text-blue-300"><Loader2 className="w-4 h-4 animate-spin"/> Subiendo...</span>)}
                  {it.status==='done' && (<span className="inline-flex items-center gap-1 text-emerald-400"><CheckCircle2 className="w-4 h-4"/> Listo</span>)}
                  {it.status==='error' && (<span className="inline-flex items-center gap-1 text-rose-400"><XCircle className="w-4 h-4"/> {it.error}</span>)}
                </div>

                <div className="h-2 rounded-full bg-zinc-800 mt-3 overflow-hidden">
                  <div className={cn('h-full transition-all', it.status==='error'?'bg-rose-500':'bg-blue-500')} style={{ width: `${it.progress || (it.status==='done'?100:0)}%` }}/>
                </div>

                {it.status==='done' && (
                  <div className="mt-3 flex flex-wrap gap-2 text-sm">
                    {it.publicUrl && (
                      <button onClick={()=> navigator.clipboard?.writeText(it.publicUrl)} className="px-2.5 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 inline-flex items-center gap-2 hover:bg-zinc-700">
                        <Link className="w-4 h-4"/> Copiar enlace público
                      </button>
                    )}
                    {it.getUrl && (
                      <a href={it.getUrl} target="_blank" rel="noreferrer" className="px-2.5 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 inline-flex items-center gap-2 hover:bg-zinc-700">
                        <ExternalLink className="w-4 h-4"/> Abrir (GET firmado)
                      </a>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-col items-end gap-2">
                <button onClick={()=> removeItem(it.id)} className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800" title="Eliminar">
                  <Trash2 className="w-4 h-4"/>
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
