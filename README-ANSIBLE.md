# Ansible: Server Security Hardening

Generated: 2025-09-07T02:09:46

## Requisitos
- Control node con **Ansible 2.14+**
- Acceso SSH al/los servidor(es) con un usuario que tenga `sudo`

## Estructura
```
playbook.yml
inventory.ini
group_vars/all.yml
roles/hardening/tasks/main.yml
roles/hardening/files/...
```

## Uso rápido
1. Edita `inventory.ini` con la IP/host de tu servidor.
2. (Opcional) Cambia `create_user` en `group_vars/all.yml`.
3. Ejecuta:
```bash
ansible-playbook -i inventory.ini playbook.yml --ask-become-pass
```
4. Verifica con el checklist del README principal o estos comandos:
```bash
sshd -T | egrep 'permitrootlogin|passwordauthentication|maxauthtries|maxsessions'
ufw status numbered
fail2ban-client status sshd || true
sysctl -a | egrep 'kptr_restrict|randomize_va_space|unprivileged_bpf_disabled'
systemctl status auditd || true
```

> Nota: La config de SSH desactiva contraseñas. Asegúrate de tener **llave pública** cargada antes de aplicar.
