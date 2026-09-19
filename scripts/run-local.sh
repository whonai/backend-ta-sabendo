#!/usr/bin/env bash
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "Starting local infra (Postgres + Mongo)..."
docker-compose up -d postgres mongo

echo "Waiting for Postgres to be ready..."
until pg_isready -h 127.0.0.1 -p 5432 >/dev/null 2>&1; do
  sleep 1
done

export DATABASE_URL="postgresql://user:pass@127.0.0.1:5432/tarolando?schema=public"
export MONGODB_URI="mongodb://127.0.0.1:27017/ta_rolando"

echo "Generating Prisma client and applying migrations..."
npx prisma generate
npx prisma migrate deploy || true

echo "Installing server deps and starting server (Mongo) in background..."
cd server
npm ci
npm run dev &
SERVER_PID=$!
cd "$ROOT_DIR"

echo "Starting Nest backend (Prisma) in dev mode..."
npm ci
npm run start:dev &
NEST_PID=$!

echo "Services started. PIDs: server=$SERVER_PID nest=$NEST_PID"
echo "To stop, run: docker-compose down && kill $SERVER_PID $NEST_PID || true"
