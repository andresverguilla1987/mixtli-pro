#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."/apps/api

echo "[deps] Installing security/observability deps..."
npm i --no-save helmet cors pino pino-http express-rate-limit zod
echo "[deps] Done."
