#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
DB_FILE="${DB_FILE:-$APP_DIR/prisma/dev.db}"
BACKUP_DIR="${BACKUP_DIR:-$APP_DIR/backups}"

if [[ ! -f "$DB_FILE" ]]; then
  echo "Database not found: $DB_FILE" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
stamp="$(date +%Y%m%d-%H%M%S)"
dest="$BACKUP_DIR/musicnews-$stamp.db"

cp "$DB_FILE" "$dest"
gzip -f "$dest"

find "$BACKUP_DIR" -name "musicnews-*.db.gz" -type f -mtime +14 -delete

echo "$dest.gz"
