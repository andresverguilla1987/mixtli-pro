// Loopback OAuth client: opens browser to GET /oauth/authorize and listens on 127.0.0.1 for the redirect.
// NOTE (demo): we pass ?demo_access_token= to authorize, which the server accepts when DEMO_ENABLE_QUERY_ACCESS=true.
import 'dotenv/config'
import http from 'http'
import crypto from 'crypto'
import open from 'open'

const API = process.env.API || 'http://localhost:10000'
const CLIENT_ID = process.env.CLIENT_ID || 'mixtli-web'
const EMAIL = process.env.EMAIL || 'admin@example.com'
const PASSWORD = process.env.PASSWORD || 'S3gura#123'
const SCOPE = process.env.SCOPE || 'openid profile email audit:read'
const PORT = Number(process.env.PORT || 53682)
const HOST = '127.0.0.1'
const REDIRECT_URI = `http://${HOST}:${PORT}/callback`

function b64url(buf) { return Buffer.from(buf).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'') }
function pkce() {
  const verifier = b64url(crypto.randomBytes(64))
  const challenge = b64url(crypto.createHash('sha256').update(verifier).digest())
  return { verifier, challenge }
}
async function fetchJson(url, opts={}) {
  const r = await fetch(url, { ...opts, headers: { 'Content-Type':'application/json', ...(opts.headers||{}) } })
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`)
  return await r.json()
}

async function main() {
  console.log('== Mixtli CLI OAuth (Loopback) ==')
  console.log('API=', API)
  console.log('CLIENT_ID=', CLIENT_ID)
  console.log('REDIRECT_URI=', REDIRECT_URI)
  console.log('SCOPE=', SCOPE)

  // Bootstrap: get a demo user access to attach as ?demo_access_token=
  const login = await fetchJson(`${API}/api/auth/login`, { method:'POST', body: JSON.stringify({ email: EMAIL, password: PASSWORD }) })
  const demoAccess = login.accessToken

  const { verifier, challenge } = pkce()
  const state = crypto.randomBytes(8).toString('hex')

  const authorizeUrl = new URL(`${API}/oauth/authorize`)
  authorizeUrl.searchParams.set('response_type','code')
  authorizeUrl.searchParams.set('client_id', CLIENT_ID)
  authorizeUrl.searchParams.set('redirect_uri', REDIRECT_URI)
  authorizeUrl.searchParams.set('code_challenge', challenge)
  authorizeUrl.searchParams.set('code_challenge_method','S256')
  authorizeUrl.searchParams.set('scope', SCOPE)
  authorizeUrl.searchParams.set('state', state)
  authorizeUrl.searchParams.set('demo_access_token', demoAccess) // DEMO

  const server = http.createServer(async (req, res) => {
    if (req.url?.startsWith('/callback')) {
      const u = new URL(req.url, `http://${req.headers.host}`)
      const code = u.searchParams.get('code')
      const returnedState = u.searchParams.get('state')
      res.writeHead(200, { 'Content-Type':'text/html; charset=utf-8' })
      if (!code || returnedState !== state) {
        res.end('<h1>Error</h1><p>Missing code or state mismatch.</p>')
        return
      }
      res.end('<h1>OK</h1><p>Puedes cerrar esta ventana.</p>')
      server.close()
      try {
        const token = await fetchJson(`${API}/oauth/token`, { method:'POST', body: JSON.stringify({
          grant_type: 'authorization_code',
          code,
          redirect_uri: REDIRECT_URI,
          client_id: CLIENT_ID,
          code_verifier: verifier
        })})
        console.log('\n[Access token]', token.accessToken.slice(0,24)+'...')
        console.log('[Scope]', token.scope || SCOPE)
        const ev = await fetchJson(`${API}/api/admin/audit/events?limit=3`, { headers: { 'Authorization': `Bearer ${token.accessToken}` } })
        console.log('\n[Audit events]', ev.items?.length ?? 0)
        console.log(JSON.stringify(ev.items||[], null, 2))
      } catch (e) {
        console.error('Token exchange or API call failed:', e.message || e)
      }
    } else {
      res.writeHead(404); res.end()
    }
  })

  await new Promise(resolve => server.listen(PORT, HOST, resolve))
  console.log('Loopback server listening on', REDIRECT_URI)

  console.log('Opening browser to:', authorizeUrl.toString())
  await open(authorizeUrl.toString())
}

main().catch(e => { console.error(e); process.exit(1) })
