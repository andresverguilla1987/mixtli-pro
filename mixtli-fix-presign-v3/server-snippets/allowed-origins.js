// Helper para parsear ALLOWED_ORIGINS de env a Array<String>
export function parseAllowedOrigins(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  const str = String(raw).trim();

  // Intenta JSON primero
  if (str.startsWith('[')) {
    try {
      const arr = JSON.parse(str);
      if (Array.isArray(arr)) return arr;
    } catch {}
  }

  // CSV (a,b,c)
  if (str.includes(',')) {
    return str.split(',').map(s => s.trim()).filter(Boolean);
  }

  // Única origin en string
  return [str];
}