// Check Sentry error count in the last 15 minutes and exit non-zero if above threshold
// env: SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT, SENTRY_ERROR_THRESHOLD (default 20), SLACK_WEBHOOK_URL (optional)

const sinceMinutes = 15;
const interval = "5m";

const token = process.env.SENTRY_AUTH_TOKEN;
const org = process.env.SENTRY_ORG;
const projectSlug = process.env.SENTRY_PROJECT;
const threshold = parseInt(process.env.SENTRY_ERROR_THRESHOLD ?? "20", 10);

if (!token || !org || !projectSlug) {
  console.error("Missing SENTRY_AUTH_TOKEN / SENTRY_ORG / SENTRY_PROJECT");
  process.exit(78); // CI skipped
}

async function fetchJSON(url) {
  const res = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`HTTP ${res.status}: ${txt}`);
  }
  return res.json();
}

async function getProjectId() {
  // Try to resolve slug -> id
  const projects = await fetchJSON(`https://sentry.io/api/0/organizations/${org}/projects/`);
  const p = projects.find(p => p.slug === projectSlug);
  return p ? p.id : null;
}

async function getErrorCount(projectId) {
  // Use events-stats with a filter for error events
  const params = new URLSearchParams({
    project: projectId ?? projectSlug,
    field: "event.type:error",
    statsPeriod: `${sinceMinutes}m`,
    interval
  });
  const data = await fetchJSON(`https://sentry.io/api/0/organizations/${org}/events-stats/?${params.toString()}`);
  // data likely has .data[0].data = [[ts, count], ...]
  const series = Array.isArray(data.data) && data.data[0] && Array.isArray(data.data[0].data) ? data.data[0].data : [];
  const total = series.reduce((acc, point) => acc + (Array.isArray(point) ? (point[1] ?? 0) : 0), 0);
  return { total, series };
}

async function maybeSlack(text) {
  const webhook = process.env.SLACK_WEBHOOK_URL;
  if (!webhook) return;
  try {
    await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });
  } catch {}
}

(async () => {
  try {
    let id = null;
    try {
      id = await getProjectId();
    } catch {}

    const { total } = await getErrorCount(id);
    console.log(`Sentry errors (last ${sinceMinutes}m): ${total} (threshold ${threshold})`);
    if (total > threshold) {
      const msg = `🚨 Sentry error rate high (${total} in last ${sinceMinutes}m) for ${org}/${projectSlug}`;
      console.error(msg);
      await maybeSlack(msg);
      process.exit(1);
    } else {
      console.log("Error rate OK");
    }
  } catch (e) {
    console.error("Sentry check failed:", e.message || e);
    // Don't fail the pipeline just because the API failed; exit neutral
    process.exit(0);
  }
})();
