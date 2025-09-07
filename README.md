# Server Security Hardening — Paquete Refinado (con EXTRAS)

Generado: 2025-09-07T02:16:44

Incluye dos rutas:

1) **Script Bash** (`harden.sh`) con variables para:
   - Usuario sudo `deploy`
   - Puerto SSH `2222`
   - Puertos abiertos `80,443,3000,8080`
   - Zona horaria `America/Mexico_City`
   - `unattended-upgrades`, `fail2ban`, `auditd`
   - Notificación por correo en Fail2Ban (requiere MTA; se incluye ejemplo **msmtp**)

2) **Playbook Ansible** (`ansible/`) idempotente para Ubuntu 22.04/24.04 y Debian 12.

## Uso rápido (Script)
```bash
chmod +x harden.sh

# Dry-run (no aplica cambios)
sudo SSH_PORT=2222 OPEN_PORTS="80,443,3000,8080" CREATE_USER=deploy TIMEZONE=America/Mexico_City ENABLE_UPDATES=1 FAIL2BAN=1 AUDITD=1 EMAIL_TO="" ./harden.sh --dry-run

# Aplicar cambios
sudo ./harden.sh
```

Variables opcionales: `CREATE_USER, SSH_PORT, OPEN_PORTS, TIMEZONE, ENABLE_UPDATES, FAIL2BAN, AUDITD, EMAIL_TO`

## Uso rápido (Ansible)
```bash
cd ansible
# Edita inventory.ini con tu IP/usuario
ansible-playbook -i inventory.ini playbook.yml --ask-become-pass
```

## Extras
- Plantilla `extras/msmtprc.sample` para enviar correo con **SendGrid** o SMTP similar (Fail2Ban usa `sendmail` → msmtp lo provee).
- Apertura de puertos adicionales típicos (`3000`, `8080`).
- Zona horaria México.
- Checklist de verificación en este README y en `postinstall_checklist.txt`.

## Checklist de verificación
```bash
# SSH endurecido
sshd -T | egrep 'port|permitrootlogin|passwordauthentication|maxauthtries|maxsessions|logingracetime'

# Firewall
sudo ufw status numbered

# Fail2Ban (si activaste)
sudo fail2ban-client status sshd || true

# Sysctl aplicado
sudo sysctl -a | egrep 'kptr_restrict|randomize_va_space|unprivileged_bpf_disabled|rp_filter'

# Zona horaria
timedatectl

# auditd (si activaste)
systemctl is-active auditd || true
```
