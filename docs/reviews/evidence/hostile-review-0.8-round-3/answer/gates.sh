#!/bin/bash
# The repository gates, one after another, each with its exit code and time.
set -u
T="<author>"; S="<scratch>"
mkdir -p "$S"; : > "$S/summary.txt"
echo "HEAD $(git -C "$T" rev-parse HEAD) status: $(git -C "$T" status --porcelain | wc -l) uncommitted (docs only)" >> "$S/summary.txt"
gate() {
  local name="$1"; shift; local start=$(date +%s)
  (cd "$T" && "$@") > "$S/$name.log" 2>&1; local code=$?
  echo "$(date +%H:%M:%S) $name exit $code $(( $(date +%s) - start ))s $(grep -E '^ℹ (tests|pass|fail|cancelled) ' "$S/$name.log" | tr '\n' ' ')" >> "$S/summary.txt"
}
gate build npm run build
gate check npm run check -- --tracked
gate test npm test
gate upstream npm run test:upstream
gate package npm run test:package
gate assets npm run test:assets
gate grenade-renderer npm run test:grenade-renderer
gate buildings npm run check:buildings
gate draw-counts node tools/asset-draw-counts.mjs
gate integration npm run review:integration
gate asset-counts npm run review:asset-counts
echo "finished $(date +%H:%M:%S)" >> "$S/summary.txt"
