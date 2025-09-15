
// Ejemplo de llamada al presign desde el front
async function presignFor(file, key) {
  const res = await fetch(`${API_BASE}/api/presign`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      key,                 // e.g. `uploads/${Date.now()}-${file.name}`
      contentType: file.type,
      size: file.size
    }),
    credentials: "include"
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`presign ${res.status}: ${err.error || res.statusText}`);
  }
  return res.json();
}
