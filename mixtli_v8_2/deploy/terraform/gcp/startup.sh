#!/usr/bin/env bash
set -euxo pipefail

# Install packages
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y
apt-get install -y docker.io docker-compose git nginx certbot python3-certbot-nginx

systemctl enable docker
systemctl start docker

# Nginx config
cat >/etc/nginx/sites-available/mixtli.conf <<EOF
server {
  listen 80;
  server_name ${domain};
  location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
EOF
rm -f /etc/nginx/sites-enabled/default
ln -s /etc/nginx/sites-available/mixtli.conf /etc/nginx/sites-enabled/mixtli.conf
systemctl restart nginx

# Clone repo placeholder (you'll clone your own repo)
mkdir -p /opt/mixtli
cd /opt/mixtli
if [ ! -d src ]; then
  echo "Sube tu repo a /opt/mixtli/src (git clone ...)"
fi

# Start stack without container nginx
if [ -d /opt/mixtli/src ]; then
  cd /opt/mixtli/src
  docker compose -f docker-compose.prod.no-nginx.yml up -d --build
fi

# Issue TLS (requires DNS to point to this VM's IP)
certbot --nginx -n --agree-tos -m ${admin_email} -d ${domain} || true
