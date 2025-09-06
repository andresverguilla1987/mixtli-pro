import crypto from 'crypto';

const HEX_KEY = (process.env.CRYPTO_KEY || '').trim();
if (!HEX_KEY || HEX_KEY.length !== 64) {
  console.warn('[crypto] CRYPTO_KEY inválida o ausente (usa 32 bytes hex).');
}

export function encrypt(plain) {
  const key = Buffer.from(HEX_KEY, 'hex');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

export function decrypt(payloadB64) {
  const buf = Buffer.from(payloadB64, 'base64');
  const iv = buf.subarray(0,12);
  const tag = buf.subarray(12,28);
  const data = buf.subarray(28);
  const key = Buffer.from(HEX_KEY, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(data), decipher.final()]);
  return dec.toString('utf8');
}
