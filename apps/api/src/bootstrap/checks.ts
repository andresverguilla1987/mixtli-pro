// apps/api/src/bootstrap/checks.ts
import { tryRedisPing, getRedisUrl } from "../lib/redis";

export async function bootChecks() {
  const url = getRedisUrl();
  if (!url) {
    console.warn("[BOOT] Redis deshabilitado (no hay REDIS_URL). La app seguirá sin cache/colas.");
    return;
  }
  const res = await tryRedisPing();
  if (!res.ok) {
    console.warn("[BOOT] Redis no disponible:", res.reason);
  } else {
    console.log("[BOOT] Redis OK.");
  }
}
