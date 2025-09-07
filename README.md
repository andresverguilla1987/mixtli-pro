# MX PRO — Server Security Hardening (valores integrados)

Generado: 2025-09-07T02:22:07

Valores **ya integrados** (puedes cambiarlos después si quieres):
- Usuario sudo: `deploy`
- Puerto SSH: `2222`
- Puertos abiertos: `80,443,3000,8080`
- Zona horaria: `America/Mexico_City`
- Activado: unattended-upgrades, Fail2Ban, auditd
- Notificación Fail2Ban por correo: **preparado** (usa `extras/msmtprc.sample` + `DESTEMAIL`)

## Uso rápido
**Script (single server):**
```bash
sudo bash harden_mx_pro.sh
```
> Aplica directo con los valores anteriores.

**Ansible (múltiples servers):**
```bash
cd ansible_mx_pro
ansible-playbook -i inventory.ini playbook.yml --ask-become-pass
```

## Checklist de verificación
```bash
sshd -T | egrep 'port|permitrootlogin|passwordauthentication|maxauthtries|maxsessions|logingracetime'
sudo ufw status numbered
sudo fail2ban-client status sshd || true
sudo sysctl -a | egrep 'kptr_restrict|randomize_va_space|unprivileged_bpf_disabled|rp_filter'
timedatectl
systemctl is-active auditd || true
```
