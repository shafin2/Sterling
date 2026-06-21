#!/usr/bin/env bash
set -e

APP_DIR="/home/ubuntu/sterling"

echo "==> Pulling latest code..."
cd "$APP_DIR"
git pull origin main

echo "==> Building Docker images..."
docker compose -f docker-compose.prod.yml build

echo "==> Starting / updating containers..."
docker compose -f docker-compose.prod.yml up -d

echo "==> Waiting for API to be healthy..."
for i in $(seq 1 30); do
  if docker compose -f docker-compose.prod.yml exec -T api curl -sf http://localhost:4000/api/v1/health > /dev/null 2>&1; then
    echo "    API healthy."
    break
  fi
  echo "    Waiting... ($i/30)"
  sleep 3
done

echo "==> Running database migrations..."
docker compose -f docker-compose.prod.yml exec -T api node apps/api/scripts/migrate.mjs

echo "==> Cleaning up old images..."
docker image prune -f

echo "==> Deploy complete."
