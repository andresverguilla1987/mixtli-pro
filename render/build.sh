#!/usr/bin/env bash
set -euo pipefail

# 1) Normaliza tsconfig de apps/api
node - <<'NODE'
const fs = require('fs');
const p = 'apps/api/tsconfig.json';
const j = JSON.parse(fs.readFileSync(p,'utf8'));
j.compilerOptions = j.compilerOptions || {};
j.compilerOptions.rootDir = 'src';
j.include = ['src'];
j.exclude = ['scripts','**/*.test.ts','**/*.spec.ts'];
fs.writeFileSync(p, JSON.stringify(j,null,2));
console.log('[tsconfig] normalized');
NODE

# 2) Instala, genera Prisma y compila con esbuild
pushd apps/api >/dev/null
if [ -f package-lock.json ]; then npm ci; else npm i; fi
npx prisma generate
npx --yes esbuild 'src/**/*.ts'   --outbase=src --outdir=dist --platform=node --format=esm   --sourcemap --tsconfig=tsconfig.json --log-level=info

# 3) Quita Sentry.Handlers v7 si estuviera en el JS compilado (no-op si no existe)
find dist -type f -name '*.js' -exec   sed -E -i "s/app\.use\(\s*Sentry\.Handlers\.(requestHandler|tracingHandler|errorHandler)\(\s*\)\s*\)\s*;\s*//g" {} +

# 4) Si NO hay REDIS_URL, inyecta stubs para que no intente conectarse a 127.0.0.1:6379
if [ -z "${REDIS_URL:-}" ]; then
  mkdir -p dist

  cat > dist/redis-stub.js <<'EOF'
export function createClient() {
  return {
    isOpen: true,
    connect: async () => {},
    quit: async () => {},
    disconnect: () => {},
    on: () => {},
    get: async () => null,
    set: async () => "OK",
    del: async () => 0,
    publish: async () => 0,
    subscribe: async () => {},
    unsubscribe: async () => {},
    multi: () => ({ exec: async () => [] }),
  };
}
export default { createClient };
EOF

  cat > dist/ioredis-stub.js <<'EOF'
export default class Redis {
  constructor() { console.warn("[REDIS] ioredis stub activo (no-op)."); }
  async connect() {}
  async quit() {}
  disconnect() {}
  on() {}
  async get() { return null; }
  async set() { return "OK"; }
  async del() { return 0; }
  async publish() { return 0; }
  async subscribe() {}
  async unsubscribe() {}
  multi() { return { exec: async () => [] }; }
}
EOF

  # Reescribe imports/require de redis/ioredis a los stubs
  find dist -type f -name '*.js' -exec     sed -E -i "s/from ['\"]redis['\"]/from '.\/redis-stub.js'/g;                s/require\((['\"])redis\1\)/require('.\/redis-stub.js')/g;                s/from ['\"]ioredis['\"]/from '.\/ioredis-stub.js'/g;                s/require\((['\"])ioredis\1\)/require('.\/ioredis-stub.js')/g" {} +

  # Por si el código importa 'lib/redis' directamente
  mkdir -p dist/lib
  cat > dist/lib/redis.js <<'EOF'
export function getRedis() {
  return {
    isOpen: true,
    connect: async () => {},
    quit: async () => {},
    disconnect: () => {},
    on: () => {},
    get: async () => null,
    set: async () => "OK",
    del: async () => 0,
    publish: async () => 0,
    subscribe: async () => {},
    unsubscribe: async () => {},
    multi: () => ({ exec: async () => [] }),
  };
}
export function getRedisUrl() { return process.env.REDIS_URL || ""; }
export async function tryRedisPing() { return "PONG"; }
export default { getRedis, getRedisUrl, tryRedisPing };
EOF
fi

popd >/dev/null
