#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/home/m/maksutic/maksutovdesign.ru/musicnews"
NODE_DIR="/home/m/maksutic/maksutovdesign.ru/.local"

cd "$APP_DIR"
export PATH="$NODE_DIR/bin:$PATH"

"$NODE_DIR/bin/npm" run backup:db
