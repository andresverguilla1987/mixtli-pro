// server-snippets/allowed-origins.js
export function parseAllowedOrigins(value) {
  if (!value) return [];
  const raw = value.trim();
  // Try JSON first
  try {
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return arr.map(String);
  } catch {}
  // Fallback: CSV
  return raw.split(",").map(s => s.trim()).filter(Boolean);
}