#!/usr/bin/env bash
# Generates random local secrets for docker compose. Never commit ./secrets/*.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p secrets
# Compose bind-mounts these files into the containers keeping the host permissions; the services
# run as non-root users (node 1000, app 10001), so the files must be world-readable inside them.
# Protect the *directory* instead (it is git-ignored and only on the developer machine / server).
umask 022
rand() { openssl rand -base64 "$1" | tr -d '\n/+=' | cut -c1-"$2"; }
gen() { [ -s "secrets/$1" ] && echo "keep    secrets/$1" || { printf '%s' "$2" > "secrets/$1"; echo "created secrets/$1"; }; }

gen db_password.txt            "$(rand 32 32)"
gen db_root_password.txt       "$(rand 32 32)"
gen jwt_secret.txt             "$(rand 64 64)"
gen django_secret_key.txt      "$(rand 64 64)"
gen grafana_admin_password.txt "$(rand 24 20)"
if [ ! -s secrets/exporter.my.cnf ]; then
  printf '[client]\nuser=root\npassword=%s\n' "$(cat secrets/db_root_password.txt)" > secrets/exporter.my.cnf
  echo "created secrets/exporter.my.cnf"
fi
chmod 644 secrets/*.txt secrets/exporter.my.cnf
chmod 700 secrets 2>/dev/null || true
echo "Grafana admin password: $(cat secrets/grafana_admin_password.txt)"
