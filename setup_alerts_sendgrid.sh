#!/usr/bin/env bash
set -euo pipefail

EMAIL=""
API_KEY=""
FROM="notificaciones@localhost"
HOST="smtp.sendgrid.net"
PORT="587"

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --email) EMAIL="$2"; shift 2 ;;
    --api-key) API_KEY="$2"; shift 2 ;;
    --from) FROM="$2"; shift 2 ;;
    --host) HOST="$2"; shift 2 ;;
    --port) PORT="$2"; shift 2 ;;
    -h|--help)
      echo "Usage: $0 --email you@example.com --api-key 'SG.xxx' [--from from@yourdomain.com] [--host smtp.sendgrid.net] [--port 587]"
      exit 0
      ;;
    *)
      echo "Unknown arg: $1"; exit 1 ;;
  esac
done

if [[ -z "$EMAIL" || -z "$API_KEY" ]]; then
  echo "ERROR: --email and --api-key are required."
  exit 1
fi

echo "==> Installing msmtp & msmtp-mta"
apt-get update -y
apt-get install -y msmtp msmtp-mta ca-certificates

echo "==> Writing /etc/msmtprc"
cat >/etc/msmtprc <<CFG
# msmtp config for SendGrid (adjust host/port if needed)
defaults
auth           on
tls            on
tls_trust_file /etc/ssl/certs/ca-certificates.crt
logfile        /var/log/msmtp.log

account        sendgrid
host           ${HOST}
port           ${PORT}
user           apikey
password       ${API_KEY}
from           ${FROM}

account default : sendgrid
CFG
chmod 600 /etc/msmtprc

echo "==> Linking sendmail -> msmtp"
ln -sf /usr/bin/msmtp /usr/sbin/sendmail

echo "==> Updating Fail2Ban destemail"
JAIL_FILE="/etc/fail2ban/jail.local"
if [[ -f "$JAIL_FILE" ]]; then
  # Update or insert destemail in [DEFAULT]
  if grep -qE '^\[DEFAULT\]' "$JAIL_FILE"; then
    # Replace existing destemail or append after [DEFAULT] if missing
    if grep -qE '^destemail\s*=' "$JAIL_FILE"; then
      sed -i "s|^destemail *=.*|destemail = ${EMAIL}|" "$JAIL_FILE"
    else
      awk -v email="${EMAIL}" '
        BEGIN{printed=0}
        /^\[DEFAULT\]/{print; print "destemail = " email; printed=1; next}
        {print}
        END{if(!printed) print "[DEFAULT]\ndestemail = " email}
      ' "$JAIL_FILE" > "${JAIL_FILE}.tmp" && mv "${JAIL_FILE}.tmp" "$JAIL_FILE"
    fi
  else
    echo -e "[DEFAULT]\ndestemail = ${EMAIL}\n" | cat - "$JAIL_FILE" > "${JAIL_FILE}.tmp" && mv "${JAIL_FILE}.tmp" "$JAIL_FILE"
  fi
else
  echo -e "[DEFAULT]\ndestemail = ${EMAIL}\n" > "$JAIL_FILE"
fi

systemctl restart fail2ban || true

# Patch harden_mx_pro.sh EMAIL_TO if present one dir up (common layout)
if [[ -f "../harden_mx_pro.sh" ]]; then
  sed -i "s|^EMAIL_TO=.*|EMAIL_TO=\"${EMAIL}\"  # alerts email|" ../harden_mx_pro.sh || true
fi

echo "==> Done. Send a test:"
echo "Prueba de alertas MX PRO" | sendmail -v "${EMAIL}" || true
echo "If the test arrives, Fail2Ban alerts will arrive too."
