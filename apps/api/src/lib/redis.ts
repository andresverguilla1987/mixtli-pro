// apps/api/src/lib/redis.ts
// Cliente Redis tolerante: usa REDIS_URL (Render Key Value/Redis) y soporta TLS automáticamente.
import type { RedisClientType } from "redis";
import { createClient } from "redis";

let client: RedisClientType | null = null;
let connecting = false;

const URL_ENV_KEYS = ["REDIS_URL", "KV_URL", "REDIS_INTERNAL_URL"] as const;

export function getRedisUrl(): string | null {
  for (const k of URL_ENV_KEYS) {
    const v = process.env[k];
    if (v && v.trim()) return v.trim();
  }
  return null;
}

export async function getRedis(): Promise<RedisClientType | null> {
  const url = getRedisUrl();
  if (!url) return null;
  if (client && client.isOpen) return client;
  if (connecting) {
    // espera simple
    await new Promise(r => setTimeout(r, 150));
    if (client && client.isOpen) return client;
  }
  connecting = true;
  const isTLS = url.startsWith("rediss://");
  client = createClient({
    url,
    socket: isTLS ? { tls: true } : undefined,
  });
  client.on("error", (err) => {
    console.error("[REDIS] error:", err?.message || err);
  });
  await client.connect();
  connecting = false;
  return client;
}

export async function tryRedisPing(): Promise<{ ok: boolean; reason?: string }> {
  try {
    const c = await getRedis();
    if (!c) return { ok: false, reason: "REDIS_URL no está establecido, se omite Redis." };
    const pong = await c.ping();
    return { ok: pong === "PONG" };
  } catch (e: any) {
    return { ok: false, reason: e?.message || String(e) };
  }
}
