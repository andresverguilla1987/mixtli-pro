# MX PRO — Alerts Helper (Fail2Ban → Email via SendGrid/msmtp)

Generated: 2025-09-07T02:24:45

This helper script sets up **msmtp** and wires **Fail2Ban** to send emails.
It also updates `harden_mx_pro.sh` (if present in the same directory) to set `EMAIL_TO`.

## Quick start
```bash
unzip mx_pro_alerts_helper.zip -d mx-alerts && cd mx-alerts

# Example with SendGrid:
sudo bash setup_alerts_sendgrid.sh --email tu@correo.com --api-key "SG.xxxxx" --from notificaciones@tudominio.com
# Optional: --host smtp.sendgrid.net --port 587

# Test mail:
echo "Prueba de alertas MX PRO" | sudo sendmail -v tu@correo.com
```

The script will:
- Install `msmtp` and `msmtp-mta`
- Create `/etc/msmtprc` with your credentials
- Symlink `sendmail` → `msmtp`
- Update `/etc/fail2ban/jail.local` `destemail` and restart Fail2Ban
- If `../harden_mx_pro.sh` exists, it sets `EMAIL_TO="tu@correo.com"` inside it
