import crypto from 'crypto';

let prisma = null;
try {
  const mod = await import('./prisma.js');
  prisma = mod?.prisma || null;
} catch {}

const memUsers = new Map(); // email -> user
const memRecovery = new Map(); // userId -> [{id, hash, usedAt}]

function memGetOrCreate(email, name) {
  let u = memUsers.get(email);
  if (!u) {
    u = { id: 'mem-' + crypto.randomUUID(), email, name, twoFactorEnabled: false, twoFactorSecretEnc: null };
    memUsers.set(email, u);
  }
  return u;
}

export async function getOrCreateUser(email, name) {
  if (prisma?.user?.findUnique) {
    let u = await prisma.user.findUnique({ where: { email } });
    if (!u) u = await prisma.user.create({ data: { email, name } });
    return u;
  }
  return memGetOrCreate(email, name);
}

export async function saveTwoFactorSecret(userId, encSecret) {
  if (prisma?.user?.update) {
    return prisma.user.update({ where: { id: userId }, data: { twoFactorSecretEnc: encSecret } });
  }
  for (const u of memUsers.values()) {
    if (u.id === userId) { u.twoFactorSecretEnc = encSecret; return u; }
  }
}

export async function enableTwoFactor(userId, enabled=true) {
  if (prisma?.user?.update) {
    return prisma.user.update({ where: { id: userId }, data: { twoFactorEnabled: enabled } });
  }
  for (const u of memUsers.values()) {
    if (u.id === userId) { u.twoFactorEnabled = enabled; return u; }
  }
}

export async function createRecoveryCode(userId, hash) {
  if (prisma?.recoveryCode?.create) {
    return prisma.recoveryCode.create({ data: { userId, hash } });
  }
  const list = memRecovery.get(userId) || [];
  const item = { id: 'mem-' + crypto.randomUUID(), userId, hash, usedAt: null, createdAt: new Date() };
  list.push(item);
  memRecovery.set(userId, list);
  return item;
}

export async function listUnusedRecoveryCodes(userId) {
  if (prisma?.recoveryCode?.findMany) {
    return prisma.recoveryCode.findMany({ where: { userId, usedAt: null } });
  }
  return (memRecovery.get(userId) || []).filter(x => !x.usedAt);
}

export async function markRecoveryCodeUsed(id, userId) {
  if (prisma?.recoveryCode?.update) {
    return prisma.recoveryCode.update({ where: { id }, data: { usedAt: new Date() } });
  }
  const list = memRecovery.get(userId) || [];
  const item = list.find(x => x.id === id);
  if (item) item.usedAt = new Date();
  return item;
}
