// Minimal Redis helper that becomes a no-op if REDIS_URL/package are missing
let _client: any | null = null;
let _initialized = false;

export function getRedis() {
  if (_client) return _client;
  const url = process.env.REDIS_URL;
  if (!url) {
    // no-op stub
    _client = makeStub();
    return _client;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createClient } = require("redis");
    const c = createClient({ url });
    c.on("error", (e: any) => console.warn("[REDIS] error:", e?.message || e));
    // connect in background
    c.connect().catch((e: any) => console.warn("[REDIS] connect error:", e?.message || e));
    _client = c;
    _initialized = true;
    return _client;
  } catch (e: any) {
    console.warn("[REDIS] package not found or failed, using stub:", e?.message || e);
    _client = makeStub();
    return _client;
  }
}

function makeStub() {
  const noop = async () => {};
  const ret = {
    isOpen: false,
    connect: noop,
    quit: noop,
    disconnect: noop,
    on: (_ev: string, _fn: any) => {},
    get: async (_k: string) => null,
    set: async (_k: string, _v: any, _opts?: any) => "OK",
    del: async (_k: string) => 0,
    publish: async (_c: string, _m: string) => 0,
    subscribe: async (_c: string, _fn?: any) => {},
    unsubscribe: async (_c: string) => {},
    multi: () => ({ exec: async () => [] }),
  };
  if (!_initialized) {
    console.warn("[REDIS] stub activo (no-op). Establece REDIS_URL para conectar de verdad.");
    _initialized = true;
  }
  return ret;
}

export function getRedisUrl() {
  return process.env.REDIS_URL || "";
}

export async function tryRedisPing() {
  try {
    const url = process.env.REDIS_URL;
    if (!url) return { ok: true, skipped: true };
    const c = getRedis() as any;
    await c.set("mixtli:p", "pong", { EX: 1 });
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
}