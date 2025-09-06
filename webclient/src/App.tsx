import React, { useEffect, useMemo, useState } from 'react'
import { randomString, sha256base64url } from './pkce'

const API = import.meta.env.VITE_API_URL || 'http://localhost:10000'
const CLIENT_ID = import.meta.env.VITE_CLIENT_ID || 'mixtli-web'
const REDIRECT_URI = import.meta.env.VITE_REDIRECT_URI || 'http://localhost:5174/callback'

export default function App() {
  const [email, setEmail] = useState('admin@example.com')
  const [password, setPassword] = useState('S3gura#123')
  const [access, setAccess] = useState<string>('')
  const [code, setCode] = useState<string>('')
  const [tokens, setTokens] = useState<any>(null)
  const [log, setLog] = useState<string>('')

  useEffect(() => {
    const u = new URL(window.location.href)
    if (u.pathname === '/callback' && u.searchParams.get('code')) {
      setCode(u.searchParams.get('code') || '')
    }
  }, [])

  async function devLogin(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    const data = await res.json()
    setAccess(data.accessToken || '')
    setLog(l => l + '\n[login] ' + JSON.stringify(data))
  }

  async function startAuthorize() {
    if (!access) return alert('Primero haz login para obtener Bearer')
    const code_verifier = randomString(64)
    const code_challenge = await sha256base64url(code_verifier)
    localStorage.setItem('pkce_verifier', code_verifier)

    const body = {
      response_type: 'code',
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      code_challenge,
      code_challenge_method: 'S256',
      scope: 'openid profile email',
      state: randomString(16)
    }
    const res = await fetch(`${API}/oauth/authorize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${access}` },
      body: JSON.stringify(body)
    })
    const data = await res.json()
    setCode(data.code || '')
    setLog(l => l + '\n[authorize] ' + JSON.stringify(data))
    // Simula redirección
    const u = new URL(REDIRECT_URI)
    u.searchParams.set('code', data.code)
    window.history.replaceState(null, '', u.toString())
  }

  async function exchangeToken() {
    const code_verifier = localStorage.getItem('pkce_verifier') || ''
    const body = {
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      code_verifier
    }
    const res = await fetch(`${API}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    const data = await res.json()
    setTokens(data)
    setLog(l => l + '\n[token] ' + JSON.stringify(data))
  }

  return (
    <div style={{maxWidth: 720, margin: '40px auto', fontFamily: 'system-ui, sans-serif'}}>
      <h1>Mixtli OAuth2 + PKCE (Demo)</h1>
      <p>API: {API}</p>

      <section style={{padding: 12, border: '1px solid #ddd', borderRadius: 8, marginBottom: 16}}>
        <h2>1) Dev Login (obtener Bearer)</h2>
        <form onSubmit={devLogin}>
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="email" />
          <input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="password" />
          <button type="submit">Login</button>
        </form>
        <p><b>accessToken:</b> {access ? access.slice(0,30)+'...' : '(sin token)'}</p>
      </section>

      <section style={{padding: 12, border: '1px solid #ddd', borderRadius: 8, marginBottom: 16}}>
        <h2>2) Authorize (PKCE)</h2>
      <section style={{padding: 12, border: '1px solid #ddd', borderRadius: 8, marginBottom: 16}}>
        <h2>2.1) Login con Mixtli (redirect)</h2>
        <p>Hace GET a <code>/oauth/authorize</code> y redirige a <code>redirect_uri</code> con <code>?code=</code>.</p>
        <button onClick={async ()=>{
          if (!access) { alert('Primero haz login para obtener Bearer'); return; }
          const verifier = randomString(64);
          const challenge = await sha256base64url(verifier);
          localStorage.setItem('pkce_verifier', verifier);
          const state = randomString(16);
          const params = new URLSearchParams({
            response_type: 'code',
            client_id: CLIENT_ID,
            redirect_uri: REDIRECT_URI,
            code_challenge: challenge,
            code_challenge_method: 'S256',
            scope: 'openid profile email',
            state,
            access_token: access // DEMO: para que el backend identifique al usuario
          }).toString();
          window.location.href = `${API}/oauth/authorize?${params}`;
        }}>Login con Mixtli</button>
      </section>
    
        <button onClick={startAuthorize} disabled={!access}>Obtener code</button>
        <p><b>code:</b> {code || '(sin code)'}</p>
      </section>

      <section style={{padding: 12, border: '1px solid #ddd', borderRadius: 8, marginBottom: 16}}>
        <h2>3) Token</h2>
        <button onClick={exchangeToken} disabled={!code}>Intercambiar code → tokens</button>
        <pre style={{whiteSpace:'pre-wrap'}}>{tokens ? JSON.stringify(tokens, null, 2) : '(esperando...)'}</pre>
      </section>

      <section style={{padding: 12, border: '1px solid #ddd', borderRadius: 8}}>
        <h2>Log</h2>
        <pre style={{whiteSpace:'pre-wrap'}}>{log}</pre>
      </section>
    </div>
  )
}
