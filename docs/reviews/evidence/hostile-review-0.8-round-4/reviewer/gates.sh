#!/bin/bash
# Round 4 gates on the clean sandbox, one after another; each log ends with its exit code.
set -u
S="$(cd "$(dirname "$0")/../.." && pwd)"; O="$S/artifacts/r08-4/gates"; mkdir -p "$O"
SUM="$O/summary.txt"; : > "$SUM"
echo "HEAD $(git -C "$S" rev-parse HEAD) status [$(git -C "$S" status --porcelain)] $(date +%H:%M:%S) load $(powershell -NoProfile -Command '(Get-CimInstance Win32_Processor).LoadPercentage')%" >> "$SUM"
gate() {
  local name="$1"; shift
  local t0=$(date +%s)
  ( cd "$S" && "$@" ) > "$O/$name.log" 2>&1; local code=$?
  echo "EXIT $code" >> "$O/$name.log"
  echo "$(date +%H:%M:%S) $name exit $code $(( $(date +%s) - t0 )) s :: $(grep -E '^. (tests|pass|fail|cancelled) ' "$O/$name.log" | tr '\n' ' ')$(grep -E 'match the pinned|equals the reviewed|differ from|drawCalls|Refused|Wrote artifacts' "$O/$name.log" | head -2 | tr '\n' ' ')" >> "$SUM"
}
gate build node tools/build.mjs
gate check npm run check -- --tracked
gate test npm test
gate test-upstream npm run test:upstream
gate test-package npm run test:package
gate test-assets npm run test:assets
gate test-grenade-renderer npm run test:grenade-renderer
gate check-buildings npm run check:buildings
gate asset-draw-counts node tools/asset-draw-counts.mjs
gate record-building-geometry node tools/record-building-geometry.mjs
gate review-integration npm run review:integration
gate review-asset-counts npm run review:asset-counts
echo "status after [$(git -C "$S" status --porcelain)] $(date +%H:%M:%S)" >> "$SUM"
cat "$SUM"
