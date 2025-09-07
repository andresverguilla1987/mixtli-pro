// A safe Redis wrapper: connects if REDIS_URL is present and reachable.
// If not, returns a no-op client to avoid crashes on platforms without Redis.
type Noop = (..._args: any[]) => any;

export interface RedisLike {
  isOpen?: boolean;
  connect: () => Promise<void>;
  quit: () => Promise<void>;
  disconnect?: () => void;
  on: Noop;
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, ...args: any[]) => Promise<any>;
  del: (...keys: string[]) => Promise<number>;
  publish: (channel: string, message: string) => Promise<number>;
  subscribe: (channel: string, listener?: any) => Promise<any>;
  unsubscribe: (channel?: string) => Promise<any>;
}

let singleton: RedisLike | null = null;

function makeNoop(): RedisLike {
  const noopAsync = async () => undefined as any;
  const noop = () => undefined as any;
  return {
    isOpen: true,
    connect: noopAsync,
    quit: noopAsync,
    disconnect: noop,
    on: noop,
    get: async () => null,
    set: async () => "OK",
    del: async () => 0,
    publish: async () => 0,
    subscribe: async () => undefined,
    unsubscribe: async () => undefined,
  };
}

export function getRedisUrl(): string | null {
  // Common env names
  const direct = process.env.REDIS_URL || process.env.REDIS || process.env.UPSTASH_REDIS_REST_URL;
  if (direct) return direct;
  // host:port
  const host = process.env.REDIS_HOST || process.env.KV_HOST;
  const port = process.env.REDIS_PORT || "6379";
  if (host) return `redis://${host}:${port}`;
  return null;
}

export async function tryRedisPing(url?: string | null): Promise<boolean> {
  try {
    const u = url ?? getRedisUrl();
    if (!u) return false;
    // Try node-redis first
    try {
      const mod: any = await import('redis');
      if (mod?.createClient) {
        const client = mod.createClient({ url: u });
        await client.connect();
        await client.ping();
        await client.quit();
        return true;
      }
    } catch {}
    // Then ioredis
    try {
      const IORedis: any = (await import('ioredis')).default;
      if (IORedis) {
        const client = new IORedis(u);
        await client.ping();
        await client.quit();
        return true;
      }
    } catch {}
    return false;
  } catch {
    return false;
  }
}

export async function getRedis(): Promise<RedisLike> {
  if (singleton) return singleton;
  const url = getRedisUrl();
  if (!url) {
    singleton = makeNoop();
    return singleton;
  }
  // Try node-redis
  try {
    const mod: any = await import('redis');
    if (mod?.createClient) {
      const client: any = mod.createClient({ url });
      // Attach soft error handlers
      client.on?.('error', (err: any) => {
        console.warn('[REDIS] Soft error, switching to NOOP:', err?.message || err);
        singleton = makeNoop();
      });
      await client.connect();
      singleton = client as RedisLike;
      return singleton;
    }
  } catch {}
  // Try ioredis
  try {
    const IORedis: any = (await import('ioredis')).default;
    if (IORedis) {
      const client: any = new IORedis(url);
      client.on?.('error', (err: any) => {
        console.warn('[REDIS] Soft error (ioredis), switching to NOOP:', err?.message || err);
        singleton = makeNoop();
      });
      singleton = client as RedisLike;
      return singleton;
    }
  } catch {}
  // Fallback
  singleton = makeNoop();
  return singleton;
}

// Convenience helpers (safe even if NOOP)
export async function redisGet(key: string) { return (await getRedis()).get(key); }
export async function redisSet(key: string, value: string, ...args: any[]) { return (await getRedis()).set(key, value, ...args); }
export async function redisDel(...keys: string[]) { return (await getRedis()).del(...keys); }
export async function redisPublish(channel: string, message: string) { return (await getRedis()).publish(channel, message); }
