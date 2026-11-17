#!/bin/bash
# EC2 "User data" for Ubuntu 24.04: paste this in Advanced details -> User data when launching
# the instance. Installs Docker + Compose, adds swap (needed to build images on 2 GB RAM)
# and prepares /opt/campusfind for the GitHub Actions deployments.
set -euxo pipefail
export DEBIAN_FRONTEND=noninteractive

apt-get update -y
apt-get install -y ca-certificates curl rsync openssl
curl -fsSL https://get.docker.com | sh
usermod -aG docker ubuntu
systemctl enable --now docker

# 2 GB swap file
if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

mkdir -p /opt/campusfind
chown ubuntu:ubuntu /opt/campusfind

# Clean old images weekly so the disk does not fill up
echo '0 4 * * 0 root docker image prune -af --filter "until=168h" >/dev/null 2>&1' > /etc/cron.d/docker-prune
