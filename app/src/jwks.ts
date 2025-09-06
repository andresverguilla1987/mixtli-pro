import { readFileSync } from 'fs';
import fs from 'fs';
import path from 'path';
import { createLocalJWKSet, exportJWK, importJWK, importPKCS8, SignJWT, jwtVerify, JWK } from 'jose';

export type KeyConfig = {
  kid: string;
  alg: 'RS256' | 'HS256';
  privateKeyPem?: string;
  publicKeyPem?: string;
  hmacSecret?: string;
};

const KEYS_DIR = process.env.KEYS_DIR || path.join(process.cwd(), 'keys');
const ACTIVE_KID = process.env.JWT_ACTIVE_KID || 'dev-rs256-k1';
const ISS = process.env.JWT_ISS || 'https://mixtli.local';
const AUD = process.env.JWT_AUD || 'mixtli-clients';

function read(pathStr: string) {
  return fs.existsSync(pathStr) ? fs.readFileSync(pathStr, 'utf8') : '';
}

function loadKeyConfigs(): KeyConfig[] {
  // Read a JSON manifest if present, else try to load default RSA pair by naming convention
  const manifestPath = path.join(KEYS_DIR, 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  }
  // Fallback defaults
  const k1priv = read(path.join(KEYS_DIR, 'dev-rs256-k1.private.pem'));
  const k1pub  = read(path.join(KEYS_DIR, 'dev-rs256-k1.public.pem'));
  const k2pub  = read(path.join(KEYS_DIR, 'dev-rs256-k2.public.pem'));
  const list: KeyConfig[] = [];
  if (k1priv && k1pub) list.push({ kid: 'dev-rs256-k1', alg: 'RS256', privateKeyPem: k1priv, publicKeyPem: k1pub });
  if (k2pub) list.push({ kid: 'dev-rs256-k2', alg: 'RS256', publicKeyPem: k2pub });
  if (list.length === 0 && process.env.JWT_SECRET) {
    list.push({ kid: 'hmac-default', alg: 'HS256', hmacSecret: process.env.JWT_SECRET });
  }
  return list;
}

export function getActiveKid(): string { return ACTIVE_KID; }
export function getIssuer(): string { return ISS; }
export function getAudience(): string { return AUD; }

export async function signTokens(payload: any) {
  const keys = loadKeyConfigs();
  const active = keys.find(k => k.kid === ACTIVE_KID) || keys.find(k => !!k.privateKeyPem || !!k.hmacSecret);
  if (!active) throw new Error('No signing key available');

  const now = Math.floor(Date.now() / 1000);
  const accessExp = now + Number(process.env.JWT_ACCESS_TTL || 3600);
  const refreshExp = now + Number(process.env.JWT_REFRESH_TTL || 60 * 60 * 24 * 7);

  if (active.alg === 'RS256' && active.privateKeyPem) {
    const pkcs8 = active.privateKeyPem;
    const privateKey = await importPKCS8(pkcs8, 'RS256');
    const accessToken = await new SignJWT({ ...payload, type: 'access' })
      .setProtectedHeader({ alg: 'RS256', kid: active.kid })
      .setIssuedAt(now).setExpirationTime(accessExp).setIssuer(ISS).setAudience(AUD).sign(privateKey);
    const refreshToken = await new SignJWT({ sub: payload.sub, type: 'refresh' })
      .setProtectedHeader({ alg: 'RS256', kid: active.kid })
      .setIssuedAt(now).setExpirationTime(refreshExp).setIssuer(ISS).setAudience(AUD).sign(privateKey);
    return { accessToken, refreshToken, tokenType: 'Bearer', expiresIn: accessExp - now };
  } else if (active.alg === 'HS256' && active.hmacSecret) {
    const key = new TextEncoder().encode(active.hmacSecret);
    const accessToken = await new SignJWT({ ...payload, type: 'access' })
      .setProtectedHeader({ alg: 'HS256', kid: active.kid })
      .setIssuedAt(now).setExpirationTime(accessExp).setIssuer(ISS).setAudience(AUD).sign(key);
    const refreshToken = await new SignJWT({ sub: payload.sub, type: 'refresh' })
      .setProtectedHeader({ alg: 'HS256', kid: active.kid })
      .setIssuedAt(now).setExpirationTime(refreshExp).setIssuer(ISS).setAudience(AUD).sign(key);
    return { accessToken, refreshToken, tokenType: 'Bearer', expiresIn: accessExp - now };
  }
  throw new Error('Invalid key config');
}

export async function verifyJWT(token: string) {
  const keys = loadKeyConfigs();
  const jwks = { keys: [] as any[] };
  for (const k of keys) {
    if (k.alg === 'RS256' && k.publicKeyPem) {
      // Convert PEM to JWK by importing then exporting
      // jose can import PEM via X509 import? We'll skip and trust verification using PKCS8 for public not directly supported.
    }
  }
  // Verification supports both RS256 via provided public PEMs and HS256 fallback
  for (const k of keys) {
    try {
      if (k.alg === 'RS256' && k.publicKeyPem) {
        const pub = await importJWK(await pemToJwk(k.publicKeyPem, 'RS256') as JWK, 'RS256');
        const out = await jwtVerify(token, pub, { issuer: ISS, audience: AUD });
        return out.payload;
      }
      if (k.alg === 'HS256' && k.hmacSecret) {
        const key = new TextEncoder().encode(k.hmacSecret);
        const out = await jwtVerify(token, key, { issuer: ISS, audience: AUD });
        return out.payload;
      }
    } catch (e) { /* try next */ }
  }
  throw new Error('Invalid token');
}

// Expose public JWKS
export async function getJWKS() {
  const keys = loadKeyConfigs();
  const jwks: any = { keys: [] };
  for (const k of keys) {
    if (k.alg === 'RS256' && k.publicKeyPem) {
      const jwk = await pemToJwk(k.publicKeyPem, 'RS256') as any;
      jwk.kid = k.kid;
      jwk.alg = 'RS256';
      jwk.use = 'sig';
      jwks.keys.push(jwk);
    }
    if (k.alg === 'HS256') {
      // Do not expose HMAC secrets in JWKS
    }
  }
  return jwks;
}

// Helpers
async function pemToJwk(pem: string, alg: 'RS256'): Promise<JWK> {
  // Minimal PEM -> JWK using crypto Subtle not available; use Node parse by importSPKI
  // Convert PUBLIC KEY (SPKI) PEM
  const spki = pem.trim().replace(/-----BEGIN PUBLIC KEY-----/g, '').replace(/-----END PUBLIC KEY-----/g, '').replace(/\s+/g, '');
  const der = Buffer.from(spki, 'base64');
  // jose can import SPKI directly with importJWK? Workaround: use importSPKI
  const { importSPKI, exportJWK } = await import('jose');
  const key = await importSPKI(pem, 'RS256');
  return await exportJWK(key);
}
