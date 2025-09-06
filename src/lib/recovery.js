import argon2 from 'argon2';

export async function hashCode(plain) {
  return argon2.hash(plain);
}

export async function verifyCode(hash, plain) {
  try { return await argon2.verify(hash, plain); } catch { return false; }
}

export function generateBackupCodes(n=10) {
  const rnd = () => Math.random().toString(36).slice(2,6);
  return Array.from({length:n}, () => `${rnd()}-${rnd()}-${rnd()}`);
}
