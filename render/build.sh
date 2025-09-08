#!/usr/bin/env bash
set -euo pipefail

# 1) Normaliza tsconfig para evitar que compile scripts/ y tests
node -e 'const fs=require("fs");const p="apps/api/tsconfig.json";let j=JSON.parse(fs.readFileSync(p,"utf8"));j.compilerOptions=j.compilerOptions||{};j.compilerOptions.rootDir="src";j.include=["src"];j.exclude=["scripts","**/*.test.ts","**/*.spec.ts"];fs.writeFileSync(p,JSON.stringify(j,null,2));console.log("[tsconfig] normalized");'

# 2) Instala deps y genera Prisma
cd apps/api
if [ -f package-lock.json ]; then npm ci; else npm i; fi
npx prisma generate

# 3) Compila con esbuild (formato ESM para Node)
npx --yes esbuild 'src/**/*.ts' --outbase=src --outdir=dist --platform=node --format=esm --sourcemap --tsconfig=tsconfig.json --log-level=info

# 4) Quita middlewares Sentry v7 que rompen en runtime
find dist -type f -name '*.js' -exec sed -E -i "s/app\.use\(\s*Sentry\.Handlers\.(requestHandler|tracingHandler|errorHandler)\(\s*\)\s*\)\s*;\s*//g" {} +

# 5) Si no hay REDIS_URL, inyecta stubs de redis/ioredis y reescribe imports
if [ -z "${REDIS_URL:-}" ]; then
  echo "[build] REDIS_URL vacío → activando stubs de Redis"
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

  # Reescribe imports/require hacia los stubs
  find dist -type f -name '*.js' -exec sed -E -i     "s/from ['\"]redis['\"]/from '.\/redis-stub.js'/g; s/require\((['\"])redis\1\)/require('.\/redis-stub.js')/g; s/from ['\"]ioredis['\"]/from '.\/ioredis-stub.js'/g; s/require\((['\"])ioredis\1\)/require('.\/ioredis-stub.js')/g" {} +

  # Stub para módulos internos que lean lib/redis
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

else
  echo "[build] REDIS_URL presente → sin stubs"
fi
