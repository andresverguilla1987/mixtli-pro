// Optional Redis helper — no-op when REDIS_URL is not set.
// Drop-in replacement to stop any connection attempts to localhost:6379.
//
// Usage in the rest of the code does not need to change. If Redis is disabled
// (no REDIS_URL), all helpers become safe no-ops.
//
// This file intentionally uses dynamic import to avoid requiring the 'redis'
// package at runtime when REDIS_URL is not configured.
// It also keeps the same function names many codebases expect.
//
// NOTE: Keep types very loose to avoid build issues in strict TS projects.

let client: any | null = null;

export function getRedisUrl(): string | undefined {
  return process.env.REDIS_URL && String(process.env.REDIS_URL).trim() || undefined;
}

export function isRedisEnabled(): boolean {
  return !!getRedisUrl();
}

export async function getRedis(): Promise<any | null> {
  if (!isRedisEnabled()) return null;
  if (client && (client as any).isOpen) return client;

  // Lazy-load 'redis' only when needed.
  const mod: any = await import('redis').catch(() => null);
  const createClient = mod?.createClient;
  if (typeof createClient !== 'function') {
    console.warn('[redis] package not installed or unavailable. Running without Redis.');
    return null;
  }

  client = createClient({ url: getRedisUrl() });
  client.on('error', (e: any) => console.warn('[redis] error:', e?.message || e));
  if (!client.isOpen) await client.connect();
  return client;
}

// Compatibility ping used by health/readiness checks.
export async function tryRedisPing(): Promise<{ ok: boolean; message?: string }> {
  if (!isRedisEnabled()) return { ok: true, message: 'redis disabled' };
  try {
    const c = await getRedis();
    if (!c) return { ok: true, message: 'redis disabled (no client)' };
    const pong = await c.ping();
    return { ok: pong === 'PONG', message: pong };
  } catch (e: any) {
    return { ok: false, message: e?.message || 'redis ping failed' };
  }
}

// Safe wrappers — become no-ops if Redis is disabled.
export async function redisGet(key: string): Promise<string | null> {
  const c = await getRedis();
  return c ? (await c.get(key)) : null;
}

export async function redisSet(key: string, value: string, ttlSeconds?: number): Promise<'OK'> {
  const c = await getRedis();
  if (!c) return 'OK';
  if (ttlSeconds) {
    await c.set(key, value, { EX: ttlSeconds });
  } else {
    await c.set(key, value);
  }
  return 'OK';
}

export async function redisDel(key: string | string[]): Promise<number> {
  const c = await getRedis();
  if (!c) return 0;
  return await c.del(key);
}

export async function redisPublish(channel: string, message: string): Promise<number> {
  const c = await getRedis();
  if (!c) return 0;
  return await c.publish(channel, message);
}

export async function quitRedis(): Promise<void> {
  try { if (client?.quit) await client.quit(); } catch {}
  client = null;
}
