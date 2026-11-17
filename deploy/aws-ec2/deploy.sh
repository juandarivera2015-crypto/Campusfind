#!/usr/bin/env bash
# Runs ON the EC2 server (called by .github/workflows/deploy-ec2.yml after copying the code).
#   APP_DOMAIN=1-2-3-4.sslip.io bash deploy/aws-ec2/deploy.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
: "${APP_DOMAIN:?APP_DOMAIN is required}"

# Runtime configuration (not secrets) for docker compose
cat > .env <<ENV
APP_DOMAIN=${APP_DOMAIN}
APP_URL=https://${APP_DOMAIN}
COOKIE_SECURE=true
TRUST_PROXY=2
TAG=${TAG:-prod}
ENV

# Secrets are generated ONCE on the server and never leave it (kept across deployments)
bash scripts/generate-secrets.sh

COMPOSE="docker compose -f docker-compose.yml -f deploy/aws-ec2/docker-compose.prod.yml"
$COMPOSE build
$COMPOSE up -d --remove-orphans
docker image prune -f >/dev/null

echo "Waiting for the application..."
for i in $(seq 1 30); do
  if curl -fsS -o /dev/null "http://127.0.0.1:80" -H "Host: ${APP_DOMAIN}" 2>/dev/null || $COMPOSE exec -T web wget -qO- http://127.0.0.1:8080/nginx-health >/dev/null 2>&1; then
    break
  fi
  sleep 5
done
$COMPOSE ps
echo "Deployed: https://${APP_DOMAIN}"
