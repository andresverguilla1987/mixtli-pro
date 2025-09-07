/**
 * Redis helper con "stub" cuando no hay REDIS_URL o el paquete no está.
 * Evita ECONNREFUSED 127.0.0.1:6379 en Render.
 */

type AnyClient = {
  isOpen?: boolean;
  connect?: () => Promise<void>;
  quit?: () => Promise<void>;
  disconnect?: () => void;
  on?: (...a: any[]) => void;
  get?: (...a: any[]) => Promise<any>;
  set?: (...a: any[]) => Promise<any>;
  del?: (...a: any[]) => Promise<any>;
  publish?: (...a: any[]) => Promise<any>;
  subscribe?: (...a: any[]) => Promise<any>;
  unsubscribe?: (...a: any[]) => Promise<any>;
  multi?: (...a: any[]) => { exec: () => Promise<any[]> };
  ping?: () => Promise<any>;
};

let _client: AnyClient | null = null;

export function getRedisUrl(): string | null {
  return process.env.REDIS_URL || process.env.REDIS_URL_INTERNAL || null;
}

function stubClient(): AnyClient {
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
    ping: async () => "PONG",
  };
}

export async function getRedis(): Promise<AnyClient> {
  if (_client) return _client;
  const url = getRedisUrl();
  if (!url) {
    console.warn("[REDIS] Sin REDIS_URL, usando stub (no-op).");
    _client = stubClient();
    return _client;
  }
  try {
    const mod: any = await import("redis").catch(() => null);
    if (mod && typeof mod.createClient === "function") {
      const c: AnyClient = mod.createClient({ url });
      if (typeof c.on === "function") {
        c.on("error", (e: any) => console.warn("[REDIS] error:", e?.message || e));
      }
      if (typeof c.connect === "function") {
        await c.connect();
      }
      _client = c;
      return c;
    }
    console.warn("[REDIS] Paquete 'redis' no disponible, usando stub.");
    _client = stubClient();
    return _client;
  } catch (e: any) {
    console.warn("[REDIS] Conexión falló, usando stub:", e?.message || e);
    _client = stubClient();
    return _client;
  }
}

export async function tryRedisPing(): Promise<"ok" | "skip" | "error"> {
  const url = getRedisUrl();
  if (!url) return "skip";
  try {
    const c = await getRedis();
    if (typeof c.ping === "function") {
      await c.ping();
    } else if (typeof c.get === "function") {
      await c.get("health");
    }
    return "ok";
  } catch (e: any) {
    console.warn("[REDIS] ping failed:", e?.message || e);
    return "error";
  }
}