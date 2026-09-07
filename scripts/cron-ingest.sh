#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/home/m/maksutic/maksutovdesign.ru/musicnews"
NODE_DIR="/home/m/maksutic/maksutovdesign.ru/.local"

cd "$APP_DIR"
export PATH="$NODE_DIR/bin:$PATH"
export NEXT_PUBLIC_BASE_PATH="/musicnews"
export MUSICBRAINZ_LOOKUP="0"

"$NODE_DIR/bin/npm" run ingest
