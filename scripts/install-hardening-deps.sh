#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR=$(pwd)
if [[ ! -d "apps/api" ]]; then
  echo "Run this from the repository root (where apps/api exists)"; exit 1
fi
cd apps/api
echo "Installing dependencies..."
npm i helmet express-rate-limit pino pino-http
echo "Done."
