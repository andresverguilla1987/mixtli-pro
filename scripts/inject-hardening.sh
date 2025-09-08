#!/usr/bin/env bash
set -euo pipefail

APP_TS="apps/api/src/app.ts"
if [[ ! -f "$APP_TS" ]]; then
  echo "❌ $APP_TS not found. Edit your app entry manually to import & call applyHardening()."
  exit 0
fi

# Ensure bootstrap & middleware files exist suggestion (they will after unzip)
if [[ ! -f "apps/api/src/bootstrap/hardening.ts" ]]; then
  echo "❌ apps/api/src/bootstrap/hardening.ts not found. Make sure you unzipped correctly."
  exit 1
fi

# Idempotent import insertion (only if missing)
if ! grep -q "applyHardening" "$APP_TS"; then
  # Insert import after last import line
  awk '
    BEGIN{inserted=0}
    /^import /{last=NR}
    {lines[NR]=$0}
    END{
      for(i=1;i<=NR;i++){
        print lines[i]
        if(i==last && inserted==0){
          print "import { applyHardening } from \x27./bootstrap/hardening\x27;"
          inserted=1
        }
      }
    }
  ' "$APP_TS" > "$APP_TS.tmp" && mv "$APP_TS.tmp" "$APP_TS"
  echo "✅ Import added to $APP_TS"
else
  echo "ℹ️ Import already present in $APP_TS"
fi

# Insert call applyHardening(app) after the line where app = express()
if ! grep -q "applyHardening(app)" "$APP_TS"; then
  awk '
    {print $0}
    $0 ~ /const[[:space:]]+app[[:space:]]*=[[:space:]]*express[[:space:]]*\(/ && !added {
      print "applyHardening(app);"
      added=1
    }
  ' "$APP_TS" > "$APP_TS.tmp" && mv "$APP_TS.tmp" "$APP_TS"
  echo "✅ applyHardening(app) inserted in $APP_TS"
else
  echo "ℹ️ applyHardening(app) already present in $APP_TS"
fi

echo "Done. Commit your changes and deploy when ready."
