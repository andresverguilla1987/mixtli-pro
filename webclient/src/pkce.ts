export function randomString(len: number) {
  const arr = new Uint8Array(len)
  crypto.getRandomValues(arr)
  return btoa(String.fromCharCode(...arr)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')
}

export async function sha256base64url(input: string) {
  const enc = new TextEncoder()
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(input))
  const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)))
  return b64.replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')
}
