// apps/api/src/sentry/instrument.ts — Instrumentación temprana (opcional)
// Cárgala en producción con:
//   node --import ./dist/sentry/instrument.js dist/server.js
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV ?? "production",
  tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 1),
  profilesSampleRate: Number(process.env.SENTRY_PROFILES_SAMPLE_RATE ?? 0),
});
