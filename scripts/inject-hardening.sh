\
  #!/usr/bin/env bash
  set -euo pipefail

  APP_FILE="apps/api/src/app.ts"
  if [[ ! -f "$APP_FILE" ]]; then
    echo "ERROR: $APP_FILE no existe. Asegúrate de correr desde la raíz del repo."
    exit 1
  fi

  # 1) Inyectar imports si no existen
  if ! grep -q "middleware/security" "$APP_FILE"; then
    # Inserta imports después de los imports existentes
    tmp="$(mktemp)"
    awk '
      BEGIN { inserted=0 }
      /^import / { print; next }
      inserted==0 { 
        print "import { security } from \\"./middleware/security\\";";
        print "import { applyRateLimit } from \\"./middleware/rateLimit\\";";
        print "import { applyLogging } from \\"./middleware/logging\\";";
        print "import { notFound, errorHandler } from \\"./middleware/errors\\";";
        inserted=1
      }
      { print }
    ' "$APP_FILE" > "$tmp"
    mv "$tmp" "$APP_FILE"
  fi

  # 2) Insertar llamadas tras la creación de app
  if ! grep -q "applyLogging(app);" "$APP_FILE"; then
    perl -0777 -pe 's|(const\s+app\s*=\s*express\(\)\s*;)|$1\napplyLogging(app);\nsecurity(app);\napplyRateLimit(app);\n|s' -i "$APP_FILE"
  fi

  # 3) Agregar notFound y errorHandler al final si no están
  if ! grep -q "notFound" "$APP_FILE"; then
    echo -e "\napp.use(notFound as any);\napp.use(errorHandler as any);\n" >> "$APP_FILE"
  fi

  echo "[inject] Hardening middleware aplicado a $APP_FILE"
