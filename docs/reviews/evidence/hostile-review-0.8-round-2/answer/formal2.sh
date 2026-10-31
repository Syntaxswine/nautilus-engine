#!/usr/bin/env bash
# Formal gates and measurements on the answer to round 2. Exit codes go into
# summary.txt (a pipe would swallow them). Run from the worktree root.
#   formal2.sh <out dir> <baseline tree with dist/> <baseline tree for --node>
set -u
OUT="$1"; BASE="$2"; TREE="$3"
mkdir -p "$OUT"
S="$OUT/summary.txt"
echo "started $(date -Iseconds)" > "$S"
echo "head $(git rev-parse HEAD)" >> "$S"
echo "status [$(git status --short | tr '\n' ';')]" >> "$S"
run() { local name="$1"; shift; "$@" > "$OUT/$name.log" 2>&1; echo "$name exit $? at $(date -Iseconds)" >> "$S"; }
run build npm run build
run check-tracked npm run check -- --tracked
run test npm test
run test-upstream npm run test:upstream
run test-package npm run test:package
run test-assets npm run test:assets
run test-grenade-renderer npm run test:grenade-renderer
run review-integration npm run review:integration
cp artifacts/engine-integration/acceptance.json "$OUT/integration-acceptance.json" 2>/dev/null
run editor-gpu node tools/bench-asset-rendering.mjs --editor --a "$BASE" --runs 6 --backend gpu --frames 30 --blocks 4 --opens 3 --assets-only --expect --out "$OUT/editor-gpu.json"
run editor-swiftshader node tools/bench-asset-rendering.mjs --editor --a "$BASE" --runs 2 --backend swiftshader --opens 1 --blocks 1 --expect --out "$OUT/editor-swiftshader.json"
run node-generator node tools/bench-asset-rendering.mjs --node --a "$TREE" --runs 8 --out "$OUT/node-generator.json"
echo "finished $(date -Iseconds)" >> "$S"
