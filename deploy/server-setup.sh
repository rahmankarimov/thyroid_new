#!/usr/bin/env bash
# Server-side: create secrets (once), start infra, build images.
set -e
cd /opt/thyroai/deploy
if [ ! -f .env ]; then
  cat > .env <<EOF
POSTGRES_USER=postgres
POSTGRES_PASSWORD=$(openssl rand -hex 20)
MINIO_ROOT_USER=minio
MINIO_ROOT_PASSWORD=$(openssl rand -hex 20)
JWT_SECRET=$(openssl rand -base64 48 | tr -d '\n')
CORS_ORIGINS=http://157.173.121.121
EOF
  chmod 600 .env
fi
sed 's/=.*/=***/' .env
docker compose -f docker-compose.prod.yml up -d postgres minio
docker compose -f docker-compose.prod.yml build > /tmp/build.log 2>&1 && echo BUILD_OK || { echo BUILD_FAILED; tail -30 /tmp/build.log; }
