#!/usr/bin/env bash
set -euo pipefail

DRY_RUN=0
if [[ "${1:-}" == "--dry-run" ]]; then DRY_RUN=1; fi

run() {
  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "[DRY-RUN] $*"
  else
    echo "[RUN] $*"
    eval "$@"
  fi
}

echo "==> Updating packages"
run "apt-get update -y"
run "apt-get upgrade -y"

echo "==> Creating non-root sudo user (change 'deploy' and set password)"
if ! id deploy &>/dev/null; then
  run "adduser --disabled-password --gecos '' deploy"
  run "usermod -aG sudo deploy"
fi

echo "==> SSH hardening"
mkdir -p /etc/ssh/backup
if [[ -f /etc/ssh/sshd_config && ! -f /etc/ssh/backup/sshd_config.backup ]]; then
  run "cp /etc/ssh/sshd_config /etc/ssh/backup/sshd_config.backup"
fi
run "install -m 600 -o root -g root ssh/sshd_config.sample /etc/ssh/sshd_config"
run "systemctl reload ssh || systemctl restart ssh"

echo '==> Sysctl hardening'
run "install -d -m 755 -o root -g root /etc/sysctl.d"
run "install -m 644 -o root -g root sysctl/60-hardening.conf /etc/sysctl.d/60-hardening.conf"
run "sysctl --system"

echo '==> UFW firewall (allow SSH, HTTP, HTTPS)'
run "ufw allow OpenSSH"
run "ufw allow 80/tcp"
run "ufw allow 443/tcp"
run "yes | ufw enable"

echo '==> Fail2Ban (basic SSH jail)'
run "apt-get install -y fail2ban"
run "install -d -m 755 -o root -g root /etc/fail2ban"
if [[ -f /etc/fail2ban/jail.local ]]; then
  run "cp /etc/fail2ban/jail.local /etc/fail2ban/jail.local.backup"
fi
run "install -m 644 -o root -g root fail2ban/jail.local.sample /etc/fail2ban/jail.local"
run "systemctl enable --now fail2ban"

echo '==> auditd (optional)'
run "apt-get install -y auditd audsitctl || true"
run "systemctl enable --now auditd || true"
echo "Done. Remember to set SSH keys and disable password auth after confirming access."
