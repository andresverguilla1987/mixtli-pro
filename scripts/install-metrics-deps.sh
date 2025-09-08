#!/usr/bin/env bash
set -euo pipefail
echo "[metrics-pack] Installing prod dependency: prom-client"
cd apps/api
npm i prom-client
echo "[metrics-pack] Done."
