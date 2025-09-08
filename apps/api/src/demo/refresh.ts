// apps/api/src/demo/refresh.ts
// Stub de lógica para refrescar/reesetear el tenant de DEMO.
// Reemplaza el contenido de `refreshDemo` con lo que necesites (limpiar DB, reseed, etc.).
// Este archivo NO depende de Redis.

export type RefreshDemoOptions = {
  log?: (msg: string) => void;
};

export async function refreshDemo(opts: RefreshDemoOptions = {}) {
  const log = opts.log ?? console.log;

  const {
    DEMO_MODE,
    DEMO_TENANT_ID,
    DEMO_EMAIL,
    DEMO_PASSWORD,
    DATABASE_URL
  } = process.env as Record<string, string | undefined>;

  log(`[DEMO] Iniciando refresh-demo…`);
  log(`[DEMO] DEMO_MODE=${DEMO_MODE ?? "undefined"}`);
  log(`[DEMO] DEMO_TENANT_ID=${DEMO_TENANT_ID ?? "undefined"}`);
  log(`[DEMO] DATABASE_URL=${DATABASE_URL ? '***redacted***' : 'undefined'}`);

  // TODO: Inserta aquí tu lógica real de "reset demo":
  // - Truncar tablas (excepto migraciones) con Prisma o SQL directo
  // - Cargar semillas mínimas
  // - Regenerar tokens/llaves temporales
  // - Invalidar caches en memoria (si aplica)

  // Simulación de trabajo asíncrono
  await new Promise((r) => setTimeout(r, 250));
  log(`[DEMO] ¡Listo!`);

  return { ok: true };
}
