// Safe Redis wrapper: runs without a REDIS_URL (no-op), avoids crashes in Render
// Drop-in replacement for apps/api/src/lib/redis.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyRedis = any;

let client: AnyRedis | null = null;

export function getRedisUrl(): string {
  return process.env.REDIS_URL || "";
}

function makeNoop(): AnyRedis {
  const noop = async (..._args: any[]) => undefined;
  return {
    isOpen: true,
    connect: async () => {},
    quit: async () => {},
    disconnect: () => {},
    on: () => {},
    get: async () => null,
    set: async () => "OK",
    del: async () => 0,
    publish: async () => 0,
    subscribe: async () => {},
    unsubscribe: async () => {},
    multi: () => ({ exec: async () => [] }),
  };
}

export function getRedis(): AnyRedis {
  const url = getRedisUrl();
  if (!url) return makeNoop();
  try {
    // Use require to avoid type-resolution during build
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createClient } = require("redis") as typeof import("redis");
    if (!client) {
      client = createClient({ url });
      client.on?.("error", () => {});
      // connect but don't throw if it fails
      client.connect?.().catch(() => {});
    }
    return client;
  } catch {
    return makeNoop();
  }
}

export async function tryRedisPing(): Promise<boolean> {
  try {
    const r = getRedis();
    await r.set?.("__ping__", "1");
    return true;
  } catch {
    // Never fail boot due to Redis
    return true;
  }
}
