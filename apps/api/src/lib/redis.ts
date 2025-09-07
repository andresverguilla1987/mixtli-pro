// apps/api/src/lib/redis.ts
// Safe helper: dynamic import so TS doesn't require 'redis' types installed.
export type RedisClientLike = any;

export async function getRedis(): Promise<RedisClientLike | null> {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  try {
    const mod = await import('redis');
    const createClient = (mod as any).createClient;
    const isTLS = url.startsWith('rediss://');
    const client: any = createClient({ url, socket: isTLS ? { tls: true } : undefined });
    client.on?.('error', (e: any) => console.error('[REDIS]', e?.message || e));
    await client.connect?.();
    return client;
  } catch (e) {
    console.warn('[REDIS] módulo "redis" no instalado o no disponible. URL ignorada.');
    return null;
  }
}
