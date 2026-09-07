#!/usr/bin/env bash
set -euo pipefail

: "${BEGET_SSH:?Set BEGET_SSH, for example user@user.beget.tech}"
: "${BEGET_PATH:?Set BEGET_PATH, for example /home/user/path/to/musicnews}"

ARCHIVE="${TMPDIR:-/tmp}/musicnews-beget.tar.gz"

tar \
  --exclude="./node_modules" \
  --exclude="./.next" \
  --exclude="./.claude" \
  --exclude="./.DS_Store" \
  --exclude="./.env" \
  --exclude="./.env.local" \
  --exclude="./.env.production" \
  --exclude="./dev.db" \
  --exclude="./dev.db-journal" \
  --exclude="./dev.db-shm" \
  --exclude="./dev.db-wal" \
  --exclude="./*.log" \
  --exclude="./tsconfig.tsbuildinfo" \
  -czf "$ARCHIVE" \
  .

ssh "$BEGET_SSH" "mkdir -p '$BEGET_PATH'"
scp "$ARCHIVE" "$BEGET_SSH:$BEGET_PATH/musicnews-beget.tar.gz"
ssh "$BEGET_SSH" "cd '$BEGET_PATH' && tar -xzf musicnews-beget.tar.gz && rm musicnews-beget.tar.gz && test -f .env || cp .env.production.example .env && test -f .env.production || cp .env.production.example .env.production && export PATH=\"\$HOME/.local/bin:\$PATH\" && npm install && npx prisma db push && npm run seed && NEXT_PUBLIC_BASE_PATH=/musicnews npm run build && mkdir -p tmp && touch tmp/restart.txt"

echo "Uploaded and built MusicNews at $BEGET_PATH"
echo "Configure Passenger with deploy/beget.htaccess.example and CronTab with deploy/beget-cron.example."
