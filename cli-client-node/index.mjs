// Minimal CLI OAuth client using Auth Code + PKCE against Mixtli API
// Usage:
//   cp .env.sample .env && edit values, then: npm i && npm start
import 'dotenv/config'
import crypto from 'crypto'
import readline from 'readline'

const API = process.env.API || 'http://localhost:10000'
const CLIENT_ID = process.env.CLIENT_ID || 'mixtli-web'
const REDIRECT_URI = process.env.REDIRECT_URI || 'http://localhost:5174/callback'
const EMAIL = process.env.EMAIL || 'admin@example.com'
const PASSWORD = process.env.PASSWORD || 'S3gura#123'
const SCOPE = process.env.SCOPE || 'openid profile email audit:read audit:export'

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')
}
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
  console.log('== Mixtli CLI OAuth (Auth Code + PKCE) ==')
  console.log('API=', API)
  console.log('CLIENT_ID=', CLIENT_ID)
  console.log('REDIRECT_URI=', REDIRECT_URI)
  console.log('SCOPE=', SCOPE)

  // 1) Resource login to get a user Bearer (demo)
  console.log('\n[1] Login as user to get Bearer (demo first-party)')
  const login = await fetchJson(`${API}/api/auth/login`, { method:'POST', body: JSON.stringify({ email: EMAIL, password: PASSWORD }) })
  const userBearer = login.accessToken
  console.log('User access (trim):', userBearer.slice(0,24)+'...')

  // 2) Generate PKCE
  console.log('\n[2] Generate PKCE')
  const { verifier, challenge } = pkce()
  console.log('code_challenge=', challenge.slice(0,12)+'...')

  // 3) POST /oauth/authorize to obtain code
  console.log('\n[3] POST /oauth/authorize')
  const authBody = {
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    scope: SCOPE,
    state: crypto.randomBytes(8).toString('hex')
  }
  const auth = await fetchJson(`${API}/oauth/authorize`, { method:'POST', body: JSON.stringify(authBody), headers: { 'Authorization': `Bearer ${userBearer}` } })
  const code = auth.code
  console.log('authorization_code=', code)

  // 4) Exchange code for tokens
  console.log('\n[4] POST /oauth/token (exchange code)')
  const token = await fetchJson(`${API}/oauth/token`, { method:'POST', body: JSON.stringify({
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    client_id: CLIENT_ID,
    code_verifier: verifier
  })})
  console.log('Access token (trim):', token.accessToken.slice(0,24)+'...')
  console.log('Scope:', token.scope || SCOPE)

  // 5) Call a scope-protected endpoint (audit:read)
  console.log('\n[5] Call ADMIN scope-protected endpoint (audit:read)')
  try {
    const ev = await fetchJson(`${API}/api/admin/audit/events?limit=5`, { headers: { 'Authorization': `Bearer ${token.accessToken}` } })
    console.log('Events:', ev.items?.length ?? 0)
    console.log(JSON.stringify(ev.items?.slice(0,3) || [], null, 2))
  } catch (e) {
    console.log('Audit call failed (likely missing scope or role):', String(e.message||e))
  }

  console.log('\nDone.')
}

main().catch(e => { console.error(e); process.exit(1) })
