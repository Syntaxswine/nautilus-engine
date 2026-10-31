#!/usr/bin/env bash
# Round-3 repository gates on the clean sandbox, one after another, exit codes and
# times into summary.txt (a pipe would swallow them). Run from the sandbox root.
#   gates.sh <out dir>
set -u
OUT="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"; mkdir -p "$OUT"; S="$OUT/summary.txt"
echo "started $(date -Iseconds) head $(git rev-parse HEAD) status [$(git status --porcelain | tr '\n' ';')]" > "$S"
run() { local name="$1"; shift; local t0=$(date +%s); "$@" > "$OUT/$name.log" 2>&1; local code=$?; echo "$name exit $code $(( $(date +%s) - t0 ))s" >> "$S"; }
run build npm run build
run check-tracked npm run check -- --tracked
run test npm test
run test-upstream npm run test:upstream
run test-package npm run test:package
run test-assets npm run test:assets
run test-grenade-renderer npm run test:grenade-renderer
run check-buildings npm run check:buildings
run asset-draw-counts node tools/asset-draw-counts.mjs
run review-integration npm run review:integration
echo "finished $(date -Iseconds) status [$(git status --porcelain | tr '\n' ';')]" >> "$S"
