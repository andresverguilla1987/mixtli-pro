#!/usr/bin/env -S node --enable-source-maps
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import path from 'path';
import { generateKeyPairSync } from 'crypto';

type KeyManifestItem = {
  kid: string;
  alg: 'RS256';
  privateKeyPem?: string;
  publicKeyPem?: string;
};

type KeyManifest = KeyManifestItem[];

const KEYS_DIR = process.env.KEYS_DIR || path.join(process.cwd(), 'keys');
const PREFIX = process.env.KID_PREFIX || 'rs256';
const KID = process.env.KID || `${PREFIX}-${Date.now()}`;
const ACTIVATE = (process.env.ACTIVATE || 'true') === 'true';
const MANIFEST_PATH = path.join(KEYS_DIR, 'manifest.json');

if (!existsSync(KEYS_DIR)) mkdirSync(KEYS_DIR, { recursive: true });

// 1) Generate RSA key pair (PKCS8 private, SPKI public)
const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

// 2) Write PEM files
const privPath = path.join(KEYS_DIR, `${KID}.private.pem`);
const pubPath  = path.join(KEYS_DIR, `${KID}.public.pem`);
writeFileSync(privPath, privateKey, { encoding: 'utf8' });
writeFileSync(pubPath, publicKey, { encoding: 'utf8' });

// 3) Update manifest.json (append new key meta; we do not store private in manifest)
let manifest: KeyManifest = [];
if (existsSync(MANIFEST_PATH)) {
  try {
    manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
  } catch (e) {
    console.warn('Manifest corrupto, se regenerará.');
    manifest = [];
  }
}
const idx = manifest.findIndex(k => k.kid === KID);
const entry: KeyManifestItem = { kid: KID, alg: 'RS256', publicKeyPem: publicKey };
if (idx >= 0) manifest[idx] = entry;
else manifest.push(entry);
writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

// 4) Update .env.example and/or output new KID for JWT_ACTIVE_KID
const ENV_PATH = path.join(process.cwd(), '.env.example');
try {
  let env = readFileSync(ENV_PATH, 'utf8');
  env = env.replace(/^JWT_ACTIVE_KID=.*$/m, `JWT_ACTIVE_KID=${KID}`);
  writeFileSync(ENV_PATH, env, 'utf8');
} catch { /* ignore */ }

console.log(JSON.stringify({ kid: KID, priv: privPath, pub: pubPath, activate: ACTIVATE }, null, 2));
