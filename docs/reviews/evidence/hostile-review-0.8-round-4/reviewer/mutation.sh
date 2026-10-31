#!/bin/bash
# Round 4 mutation: phase 1 (module tests) for every mutant, then every survivor against the
# whole suite and tools/check.mjs.
set -u
S="$(cd "$(dirname "$0")/../.." && pwd)"; R="$S/artifacts/r08-4"; mkdir -p "$R/mutation"
( cd "$S" && node "$R/mutate-r4.mjs" . "$R/mutation/r4-phase1.json" ) > "$R/mutation/r4-phase1.log" 2>&1; echo "PHASE1_EXIT $?" >> "$R/mutation/r4-phase1.log"
SURV=$(node -e 'const r=require(process.argv[1]); console.log(r.summary.survived.join(","))' "$R/mutation/r4-phase1.json")
echo "survivors: $SURV" >> "$R/mutation/r4-phase1.log"
if [ -n "$SURV" ]; then ( cd "$S" && node "$R/mutate-r4.mjs" . "$R/mutation/r4-confirm.json" --confirm --only "$SURV" ) > "$R/mutation/r4-confirm.log" 2>&1; echo "CONFIRM_EXIT $?" >> "$R/mutation/r4-confirm.log"; fi
echo "$(date +%H:%M:%S) mutation done" >> "$R/mutation/done.txt"
