import React, { useState } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:10000'

export default function AdminPanel() {
  const [access, setAccess] = useState('')
  const [userId, setUserId] = useState('')
  const [clientId, setClientId] = useState('')
  const [sessions, setSessions] = useState<any[]>([])
  const [refreshes, setRefreshes] = useState<any[]>([])
  const [log, setLog] = useState('')

  async function fetchSessions() {
    if (!access || !userId) return alert('Falta access token o userId')
    const res = await fetch(`${API}/api/admin/sessions?userId=${encodeURIComponent(userId)}`, {
      headers: { 'Authorization': `Bearer ${access}` }
    })
    const data = await res.json()
    setSessions(data.items || [])
    setLog(l => l + '\n[sessions] ' + JSON.stringify(data))
  }

  async function revokeSession(sid: string) {
    if (!access) return
    await fetch(`${API}/api/admin/sessions/revoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${access}` },
      body: JSON.stringify({ sid })
    })
    await fetchSessions()
  }

  async function revokeAllSessions() {
    if (!access || !userId) return
    await fetch(`${API}/api/admin/sessions/revoke_all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${access}` },
      body: JSON.stringify({ userId })
    })
    await fetchSessions()
  }

  async function fetchRefresh() {
    if (!access || !userId) return alert('Falta access token o userId')
    const url = new URL(`${API}/api/admin/refresh/list`)
    url.searchParams.set('userId', userId)
    if (clientId) url.searchParams.set('clientId', clientId)
    const res = await fetch(url.toString(), {
      headers: { 'Authorization': `Bearer ${access}` }
    })
    const data = await res.json()
    setRefreshes(data.items || [])
    setLog(l => l + '\n[refresh] ' + JSON.stringify(data))
  }

  async function revokeRefresh(userId: string, clientId?: string) {
    if (!access || !userId) return
    await fetch(`${API}/api/admin/refresh/revoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${access}` },
      body: JSON.stringify({ userId, clientId })
    })
    await fetchRefresh()
  }

  return (
    <div style={{padding:12, border:'1px solid #ddd', borderRadius:8}}>
      <h2>Admin Panel</h2>
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
        <div>
          <h3>Credenciales</h3>
          <input placeholder="Access Token (ADMIN)" value={access} onChange={e=>setAccess(e.target.value)} style={{width:'100%'}} />
          <p style={{fontSize:12,color:'#666'}}>Inicia sesión con el admin seed en la sección de Demo y pega aquí el access token.</p>
          <h3>Filtros</h3>
          <input placeholder="userId" value={userId} onChange={e=>setUserId(e.target.value)} style={{width:'100%'}} />
          <input placeholder="clientId (opcional)" value={clientId} onChange={e=>setClientId(e.target.value)} style={{width:'100%'}} />
        </div>
        <div>
          <h3>Acciones</h3>
          <button onClick={fetchSessions}>Listar Sesiones</button>{' '}
          <button onClick={revokeAllSessions}>Revocar Todas Sesiones</button>
          <br/><br/>
          <button onClick={fetchRefresh}>Listar Refresh Tokens</button>{' '}
          <button onClick={()=>revokeRefresh(userId, clientId || undefined)}>Revocar Refresh (usuario/cliente)</button>
        </div>
      </div>

      <h3>Sesiones</h3>
      <div style={{overflowX:'auto'}}>
        <table border={1} cellPadding={6} style={{width:'100%', borderCollapse:'collapse'}}>
          <thead><tr><th>sid</th><th>IP</th><th>UA</th><th>Created</th><th>Expires</th><th>Revoked</th><th>Acción</th></tr></thead>
          <tbody>
            {sessions.map(s => (
              <tr key={s.id}>
                <td style={{fontFamily:'monospace'}}>{s.sid}</td>
                <td>{s.ip || ''}</td>
                <td style={{maxWidth:240,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={s.userAgent}>{s.userAgent}</td>
                <td>{new Date(s.createdAt).toLocaleString()}</td>
                <td>{new Date(s.expiresAt).toLocaleString()}</td>
                <td>{s.revokedAt ? new Date(s.revokedAt).toLocaleString() : ''}</td>
                <td><button onClick={()=>revokeSession(s.sid)}>Revocar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3>Refresh Tokens</h3>
      <div style={{overflowX:'auto'}}>
        <table border={1} cellPadding={6} style={{width:'100%', borderCollapse:'collapse'}}>
          <thead><tr><th>jti</th><th>clientId</th><th>Issued</th><th>Expires</th><th>Revoked</th><th>Reason</th></tr></thead>
          <tbody>
            {refreshes.map(r => (
              <tr key={r.id}>
                <td style={{fontFamily:'monospace'}}>{r.jti}</td>
                <td>{r.clientId || ''}</td>
                <td>{new Date(r.issuedAt).toLocaleString()}</td>
                <td>{new Date(r.expiresAt).toLocaleString()}</td>
                <td>{r.revokedAt ? new Date(r.revokedAt).toLocaleString() : ''}</td>
                <td>{r.reason || ''}</td>
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
