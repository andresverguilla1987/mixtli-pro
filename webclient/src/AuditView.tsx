import React, { useState } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:10000'

export default function AuditView() {
  const [access, setAccess] = useState('')
  const [type, setType] = useState('')
  const [userId, setUserId] = useState('')
  const [clientId, setClientId] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [events, setEvents] = useState<any[]>([])
  const [relative, setRelative] = useState('')
  const [detailsQ, setDetailsQ] = useState('')
  const [detailsRe, setDetailsRe] = useState('')
  const [deliveries, setDeliveries] = useState<any[]>([])
  const [log, setLog] = useState('')

  async function loadEvents() {
    if (!access) return alert('Pega un access token ADMIN')
    const url = new URL(`${API}/api/admin/audit/events`)
    if (type) url.searchParams.set('type', type)
    if (userId) url.searchParams.set('userId', userId)
    if (clientId) url.searchParams.set('clientId', clientId)
    if (relative) url.searchParams.set('relative', relative)
    if (start) url.searchParams.set('start', start)
    if (end) url.searchParams.set('end', end)
    if (detailsQ) url.searchParams.set('details_q', detailsQ)
    if (detailsRe) url.searchParams.set('details_re', detailsRe)
    const r = await fetch(url.toString(), { headers: { 'Authorization': `Bearer ${access}` } })
    const d = await r.json()
    setEvents(d.items || [])
    setLog(l=>l+'\n[events] '+JSON.stringify(d))
  }
  async function loadWebhooks() {
    if (!access) return alert('Pega un access token ADMIN')
    const r = await fetch(`${API}/api/admin/audit/webhooks`, { headers: { 'Authorization': `Bearer ${access}` } })
    const d = await r.json()
    setDeliveries(d.items || [])
    setLog(l=>l+'\n[webhooks] '+JSON.stringify(d))
  }
  async function retryOne(id: string) {
    if (!access) return
    await fetch(`${API}/api/admin/audit/webhooks/retry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${access}` },
      body: JSON.stringify({ id })
    })
    await loadWebhooks()
  }
  async function retryAll() {
    if (!access) return
    await fetch(`${API}/api/admin/audit/webhooks/retry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${access}` },
      body: JSON.stringify({})
    })
    await loadWebhooks()
  }

  return (
    <div style={{padding:12, border:'1px solid #ddd', borderRadius:8}}>
      <h2>Audit & Webhooks</h2>
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
        <div>
          <h3>Credenciales</h3>
          <input placeholder="Access Token (ADMIN)" value={access} onChange={e=>setAccess(e.target.value)} style={{width:'100%'}} />
          <h3>Filtros de eventos</h3>
          <input placeholder="type (opc)" value={type} onChange={e=>setType(e.target.value)} />
          <input placeholder="userId (opc)" value={userId} onChange={e=>setUserId(e.target.value)} />
          <input placeholder="clientId (opc)" value={clientId} onChange={e=>setClientId(e.target.value)} />
          <div style={{display:'flex', gap:8, alignItems:'center'}}>
            <label>Rango:</label>
            <select value={relative} onChange={e=>setRelative(e.target.value)}>
              <option value=''>-- personalizado --</option>
              <option value='24h'>Últimas 24h</option>
              <option value='7d'>Últimos 7 días</option>
              <option value='30d'>Últimos 30 días</option>
            </select>
            <input type="datetime-local" value={start} onChange={e=>setStart(e.target.value)} />
            <input type="datetime-local" value={end} onChange={e=>setEnd(e.target.value)} />
          </div>
          <div style={{display:'flex', gap:8}}>
            <input placeholder="details contiene (texto)" value={detailsQ} onChange={e=>setDetailsQ(e.target.value)} />
            <input placeholder="details regex (/.*/i)" value={detailsRe} onChange={e=>setDetailsRe(e.target.value)} />
          </div>
          <button onClick={loadEvents}>Cargar eventos</button>
        </div>
        <div>
          <h3>Webhooks</h3>
      <div style={{margin:'8px 0'}}>
        <a href="#" onClick={(e)=>{e.preventDefault(); if(!access) return alert('Pega token ADMIN'); const u=new URL(`${API}/api/admin/audit/events.csv`); if(type) u.searchParams.set('type', type); if(userId) u.searchParams.set('userId', userId); if(clientId) u.searchParams.set('clientId', clientId); if(relative) u.searchParams.set('relative', relative); if(start) u.searchParams.set('start', start); if(end) u.searchParams.set('end', end); if(detailsQ) u.searchParams.set('details_q', detailsQ); if(detailsRe) u.searchParams.set('details_re', detailsRe); window.open(u.toString(), '_blank');}}>Exportar eventos CSV</a>
        {' | '}
        <a href="#" onClick={(e)=>{e.preventDefault(); if(!access) return alert('Pega token ADMIN'); const u=new URL(`${API}/api/admin/audit/events.ndjson`); if(type) u.searchParams.set('type', type); if(userId) u.searchParams.set('userId', userId); if(clientId) u.searchParams.set('clientId', clientId); if(relative) u.searchParams.set('relative', relative); if(start) u.searchParams.set('start', start); if(end) u.searchParams.set('end', end); if(detailsQ) u.searchParams.set('details_q', detailsQ); if(detailsRe) u.searchParams.set('details_re', detailsRe); window.open(u.toString(), '_blank');}}>Exportar eventos NDJSON</a>
        {' | '}
        <a href="#" onClick={(e)=>{e.preventDefault(); if(!access) return alert('Pega token ADMIN'); window.open(`${API}/api/admin/audit/webhooks.csv`, '_blank');}}>Exportar webhooks CSV</a>
        {' | '}
        <a href="#" onClick={(e)=>{e.preventDefault(); if(!access) return alert('Pega token ADMIN'); window.open(`${API}/api/admin/audit/webhooks.ndjson`, '_blank');}}>Exportar webhooks NDJSON</a>
      </div>
          <button onClick={loadWebhooks}>Cargar deliveries</button>{' '}
          <button onClick={retryAll}>Reintentar pendientes</button>
        </div>
      </div>

      <h3>Eventos</h3>
      <div style={{overflowX:'auto'}}>
        <table border={1} cellPadding={6} style={{width:'100%', borderCollapse:'collapse'}}>
          <thead><tr><th>ts</th><th>type</th><th>userId</th><th>clientId</th><th>ip</th><th>ua</th><th>details</th></tr></thead>
          <tbody>
            {events.map((e:any, i:number) => (
              <tr key={e.id || i}>
                <td>{new Date(e.ts).toLocaleString()}</td>
                <td>{e.type}</td>
                <td>{e.userId || ''}</td>
                <td>{e.clientId || ''}</td>
                <td>{e.ip || ''}</td>
                <td style={{maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={e.userAgent}>{e.userAgent}</td>
                <td style={{maxWidth:280,whiteSpace:'pre-wrap'}}>{e.details ? JSON.stringify(e.details) : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3>Webhook Deliveries</h3>
      <div style={{overflowX:'auto'}}>
        <table border={1} cellPadding={6} style={{width:'100%', borderCollapse:'collapse'}}>
          <thead><tr><th>status</th><th>attempts</th><th>lastError</th><th>nextAttemptAt</th><th>acciones</th></tr></thead>
          <tbody>
            {deliveries.map((d:any) => (
              <tr key={d.id}>
                <td>{d.status}</td>
                <td>{d.attempts}</td>
                <td style={{maxWidth:240,whiteSpace:'pre-wrap'}}>{d.lastError || ''}</td>
                <td>{d.nextAttemptAt ? new Date(d.nextAttemptAt).toLocaleString() : ''}</td>
                <td>{d.status!=='delivered' ? <button onClick={()=>retryOne(d.id)}>Reintentar</button> : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3>Log</h3>
      <pre style={{whiteSpace:'pre-wrap'}}>{log}</pre>
    </div>
  )
}
