// server-snippets/allowed-origins.js
export function parseAllowedOrigins(input) {
  // Accept JSON array or CSV string; return array of trimmed strings.
  if (!input || String(input).trim() === "") return [];
  const raw = String(input).trim();
  try {
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) {
      return arr.map(s => String(s).trim()).filter(Boolean);
    }
  } catch {
    // Not JSON -> treat as CSV
  }
  return raw.split(",").map(s => s.trim()).filter(Boolean);
}
