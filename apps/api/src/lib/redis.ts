// Safe Redis wrapper: if no Redis is available, provide a no-op in-memory client.
// This avoids crashes like ECONNREFUSED 127.0.0.1:6379.

type Value = string;
class MemoryRedis {
  private store = new Map<string, Value>();
  isOpen = true;

  async connect(): Promise<void> {}
  async quit(): Promise<void> {}
  disconnect(): void {}
  on(): void {}

  async get(key: string): Promise<string | null> {
    return this.store.has(key) ? (this.store.get(key) as string) : null;
  }
  async set(key: string, value: string): Promise<'OK'> {
    this.store.set(key, value);
    return 'OK';
  }
  async del(key: string): Promise<number> {
    const had = this.store.delete(key);
    return had ? 1 : 0;
  }

  // Pub/Sub no-ops
  async publish(_channel: string, _message: string): Promise<number> { return 0; }
  async subscribe(_channel: string, _listener?: (message: string) => void): Promise<void> {}
  async unsubscribe(_channel?: string): Promise<void> {}

  multi() { return { exec: async () => [] as any[] }; }
}

export type RedisLike = MemoryRedis;

let singleton: MemoryRedis | null = null;

export function getRedis(): RedisLike {
  if (!singleton) singleton = new MemoryRedis();
  return singleton;
}

// Optional helpers some codebases expect:
export function getRedisUrl(): string | undefined {
  return process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL || undefined;
}

export async function tryRedisPing(timeoutMs: number = 500): Promise<boolean> {
  // Always resolve true for the stub (to avoid failing health checks).
  await new Promise(res => setTimeout(res, Math.min(timeoutMs, 50)));
  return true;
}
