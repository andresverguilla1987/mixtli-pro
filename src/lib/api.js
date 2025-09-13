export const API_BASE = import.meta.env.VITE_API_BASE || (typeof window!=='undefined' && window.API_BASE) || 'https://mixtli-pro.onrender.com';
export async function api(path, opts){ const r = await fetch(API_BASE+path, opts); if(!r.ok) throw new Error(`${path} ${r.status}: ${await r.text()}`); return r.json(); }
