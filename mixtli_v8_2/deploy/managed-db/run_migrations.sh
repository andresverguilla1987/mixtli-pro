#!/usr/bin/env bash
set -euo pipefail
echo "Running Prisma migrations against: ${DATABASE_URL:-<unset>}"
npx prisma migrate deploy
