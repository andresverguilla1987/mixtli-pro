# Server Security Hardening (Templates)
    
Generated: 2025-09-07T02:03:42

These files are **templates** to help you harden a fresh Linux server (Ubuntu/Debian-like).
Review and adapt before using in production.

## Contents
- `harden.sh` — idempotent shell script with common hardening steps.
- `ssh/sshd_config.sample` — stricter SSH daemon config.
- `sysctl/60-hardening.conf` — kernel/network sysctl settings.
- `ufw/ufw-commands.txt` — UFW rules to allow SSH and HTTP/HTTPS.
- `fail2ban/jail.local.sample` — basic Fail2Ban jail for SSH.
- `auditd/audit.rules.sample` — starter audit rules.

## Quick start (run as root, review first)
```bash
# dry-run: just print what would run
bash harden.sh --dry-run

# apply (careful!)
bash harden.sh
```

---
**DISCLAIMER:** These are generic examples. Test carefully on a non‑production server first.
