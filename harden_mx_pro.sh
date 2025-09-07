#!/usr/bin/env bash
set -euo pipefail

# ===== Valores integrados =====
CREATE_USER="deploy"
SSH_PORT="2222"
OPEN_PORTS="80,443,3000,8080"
TIMEZONE="America/Mexico_City"
ENABLE_UPDATES="1"
FAIL2BAN="1"
AUDITD="1"
EMAIL_TO=""  # si configuras msmtp, añade tu correo aquí

run() {
  echo "[RUN] $*"
  eval "$@"
}

ensure_pkg() {
  if ! dpkg -s "$1" >/dev/null 2>&1; then
    run "apt-get install -y $1"
  fi
}

echo "==> Actualizando paquetes"
run "apt-get update -y"
run "apt-get upgrade -y"

echo "==> Creando usuario no-root con sudo: ${CREATE_USER}"
if ! id "$CREATE_USER" &>/dev/null; then
  run "adduser --disabled-password --gecos '' '$CREATE_USER'"
  run "usermod -aG sudo '$CREATE_USER'"
fi

echo "==> Zona horaria: ${TIMEZONE}"
if command -v timedatectl >/dev/null 2>&1; then
  run "timedatectl set-timezone '${TIMEZONE}'"
fi

echo "==> Endureciendo SSH (puerto ${SSH_PORT})"
mkdir -p /etc/ssh/backup
if [[ -f /etc/ssh/sshd_config && ! -f /etc/ssh/backup/sshd_config.backup ]]; then
  run "cp /etc/ssh/sshd_config /etc/ssh/backup/sshd_config.backup"
fi
run "sed -i 's/^#*\s*PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config"
run "sed -i 's/^#*\s*PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config"
run "sed -i 's/^#*\s*ChallengeResponseAuthentication.*/ChallengeResponseAuthentication no/' /etc/ssh/sshd_config"
run "sed -i 's/^#*\s*MaxAuthTries.*/MaxAuthTries 3/' /etc/ssh/sshd_config || echo 'MaxAuthTries 3' | tee -a /etc/ssh/sshd_config >/dev/null"
run "sed -i 's/^#*\s*MaxSessions.*/MaxSessions 2/' /etc/ssh/sshd_config || echo 'MaxSessions 2' | tee -a /etc/ssh/sshd_config >/dev/null"
run "sed -i 's/^#*\s*LoginGraceTime.*/LoginGraceTime 20/' /etc/ssh/sshd_config || echo 'LoginGraceTime 20' | tee -a /etc/ssh/sshd_config >/dev/null"
if grep -qE '^[#\s]*Port\s+' /etc/ssh/sshd_config; then
  run "sed -i 's/^#*\s*Port.*/Port ${SSH_PORT}/' /etc/ssh/sshd_config"
else
  run "echo 'Port ${SSH_PORT}' >> /etc/ssh/sshd_config"
fi
run "systemctl reload ssh || systemctl restart ssh"

echo "==> Sysctl de kernel/red"
run "install -d -m 755 -o root -g root /etc/sysctl.d"
cat > /tmp/60-hardening.conf <<'SYSCTL'
kernel.kptr_restrict = 2
kernel.randomize_va_space = 2
kernel.unprivileged_bpf_disabled = 1
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1
net.ipv4.tcp_syncookies = 1
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.default.accept_source_route = 0
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.send_redirects = 0
net.ipv4.icmp_echo_ignore_broadcasts = 1
net.ipv6.conf.all.accept_redirects = 0
net.ipv6.conf.default.accept_redirects = 0
SYSCTL
run "install -m 644 -o root -g root /tmp/60-hardening.conf /etc/sysctl.d/60-hardening.conf"
run "sysctl --system"

echo "==> UFW firewall (abrirá: ${OPEN_PORTS} y SSH ${SSH_PORT})"
ensure_pkg ufw
run "ufw allow ${SSH_PORT}/tcp"
IFS=',' read -ra PORTS <<< "${OPEN_PORTS}"
for p in "${PORTS[@]}"; do
  p_trim=$(echo "$p" | xargs)
  [[ -n "$p_trim" ]] && run "ufw allow ${p_trim}/tcp"
done
run "yes | ufw enable"

if [[ "1" == "1" ]]; then
  echo "==> Fail2Ban"
  ensure_pkg fail2ban
  if [[ -f /etc/fail2ban/jail.local ]]; then
    run "cp /etc/fail2ban/jail.local /etc/fail2ban/jail.local.backup"
  fi
  cat > /tmp/jail.local <<JAIL
[DEFAULT]
bantime  = 1h
findtime = 10m
maxretry = 5
destemail = ${EMAIL_TO}
sender = fail2ban@$(hostname -f 2>/dev/null || hostname)
mta = sendmail
action = %(action_mwl)s

[sshd]
enabled = true
port    = ${SSH_PORT}
logpath = %(sshd_log)s
backend = systemd
JAIL
  run "install -m 644 -o root -g root /tmp/jail.local /etc/fail2ban/jail.local"
  run "systemctl enable --now fail2ban"
fi

if [[ "1" == "1" ]]; then
  echo "==> Unattended-upgrades"
  ensure_pkg unattended-upgrades
  cat > /tmp/20auto-upgrades <<'AUTO'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
AUTO
  run "install -m 644 -o root -g root /tmp/20auto-upgrades /etc/apt/apt.conf.d/20auto-upgrades"
fi

if [[ "1" == "1" ]]; then
  echo "==> auditd"
  ensure_pkg auditd
  cat > /tmp/hardening.rules <<'ARULES'
-w /etc/passwd -p wa -k identity
-w /etc/group  -p wa -k identity
-w /etc/shadow -p wa -k identity
-w /var/log/secure -k auth
-w /var/log/auth.log -k auth
ARULES
  run "install -D -m 640 -o root -g root /tmp/hardening.rules /etc/audit/rules.d/hardening.rules"
  run "systemctl enable --now auditd || true"
fi

echo "==> (Opcional) Configura correo SMTP para Fail2Ban con msmtp:"
echo "    - Instala: apt-get install -y msmtp msmtp-mta"
echo "    - Copia extras/msmtprc.sample a /etc/msmtprc (edita API key) y: chmod 600 /etc/msmtprc"
echo "    - ln -sf /usr/bin/msmtp /usr/sbin/sendmail"
echo "==> Listo. Aplica el checklist para validar."
