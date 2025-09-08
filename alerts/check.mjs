// Simple uptime & latency checker with optional Slack alert
// Usage: node alerts/check.mjs
// Env:
//   BASE_URL (required), ENDPOINTS="/,/salud" comma list, TIMEOUT_MS=5000, MAX_LATENCY_MS=1500
//   SLACK_WEBHOOK_URL (optional), METRICS_PATH="/metrics" (optional)
//   EXPECT_STATUS="200" (single code or comma list)
import { setTimeout as delay } from 'timers/promises';

const env = process.env;
const BASE_URL = (env.BASE_URL || "").replace(/\/$/, "");
if (!BASE_URL) {
  console.error("Missing BASE_URL env");
  process.exit(2);
}
const ENDPOINTS = (env.ENDPOINTS || "/salud").split(",").map(s => s.trim()).filter(Boolean);
const TIMEOUT_MS = Number(env.TIMEOUT_MS || 5000);
const MAX_LATENCY_MS = Number(env.MAX_LATENCY_MS || 1500);
const EXPECT = new Set(String(env.EXPECT_STATUS || "200").split(",").map(s=>s.trim()));
const METRICS_PATH = (env.METRICS_PATH || "").trim();
const SLACK = (env.SLACK_WEBHOOK_URL || "").trim();

function withTimeout(promise, ms) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  return Promise.race([
    promise(ac.signal).finally(() => clearTimeout(t)),
    new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms + 10))
  ]);
}

async function ping(path) {
  const url = BASE_URL + path;
  const start = Date.now();
  const res = await withTimeout((signal)=>fetch(url, { method: "GET", signal }), TIMEOUT_MS);
  const dur = Date.now() - start;
  const ok = EXPECT.has(String(res.status)) && dur <= MAX_LATENCY_MS;
  return { path, status: res.status, ms: dur, ok };
}

async function checkMetrics(path) {
  try {
    const url = BASE_URL + path;
    const res = await withTimeout((signal)=>fetch(url, { signal }), TIMEOUT_MS);
    const text = await res.text();
    const hasProcess = /process_cpu_user_seconds_total/.test(text);
    return { path, status: res.status, ok: res.ok && hasProcess };
  } catch (e) {
    return { path, status: 0, ok: false, err: String(e) };
  }
}

function fmtReport(results, mres) {
  const lines = [];
  for (const r of results) {
    lines.push(`• ${r.path} → ${r.status} in ${r.ms} ms ${r.ok ? "✅" : "❌"}`);
  }
  if (mres) lines.push(`• metrics ${mres.path} → ${mres.status} ${mres.ok ? "✅" : "❌"}`);
  return lines.join("\n");
}

async function postSlack(text) {
  if (!SLACK) return;
  try {
    await fetch(SLACK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });
  } catch (e) {
    console.error("Slack post failed:", e.message);
  }
}

(async () => {
  const results = await Promise.all(ENDPOINTS.map(ping));
  const mres = METRICS_PATH ? await checkMetrics(METRICS_PATH) : null;

  const anyFail = results.some(r => !r.ok) || (mres && !mres.ok);
  const summary = fmtReport(results, mres);
  const header = anyFail ? "⚠️ Uptime/latency issue" : "✅ Uptime OK";
  const msg = `${header} @ ${new Date().toISOString()}\nBase: ${BASE_URL}\n${summary}`;

  console.log(msg);
  if (anyFail) {
    await postSlack(msg);
    process.exitCode = 1; // fail the job if something is wrong
  }
})();
