// apps/api/src/lib/redis.ts
// Helper tolerante a entorno: usa REDIS_URL si existe; si no, no intenta conectar.
// Import dinámico para no requerir tipos ni paquete 'redis' en build.

export type RedisClientLike = any;

export function getRedisUrl(): string | null {
  const url = process.env.REDIS_URL?.trim();
  return url && url.length > 0 ? url : null;
}

export async function getRedis(): Promise<RedisClientLike | null> {
  const url = getRedisUrl();
  if (!url) return null;
  try {
    // Import dinámico; TS no necesita tipos del módulo.
    const mod: any = await import('redis');
    const createClient = mod?.createClient;
    if (typeof createClient !== 'function') {
      console.warn('[REDIS] Paquete "redis" no disponible en runtime.');
      return null;
    }
    const isTLS = url.startsWith('rediss://');
    const client: any = createClient({ url, socket: isTLS ? { tls: true } : undefined });
    client?.on?.('error', (e: any) => console.error('[REDIS]', e?.message || e));
    await client?.connect?.();
    return client;
  } catch (e: any) {
    console.warn('[REDIS] import dinámico falló:', e?.message || String(e));
    return null;
  }
}

export async function tryRedisPing(): Promise<{ ok: boolean; reason?: string }> {
  try {
    const c = await getRedis();
    if (!c) return { ok: false, reason: 'REDIS_URL no está definido o cliente no disponible.' };
    const pong = await c.ping?.();
    return { ok: pong === 'PONG' };
  } catch (e: any) {
    return { ok: false, reason: e?.message || String(e) };
  }
}
