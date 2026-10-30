#!/bin/bash
# Once the CI falsifiers are done: the last survivors at f98d4cc, then the formal runs.
set -u
W="<measured>"; S="<scratch>"
until grep -q "CI_EXIT" "$S/mutation/ci-falsifiers.log" 2>/dev/null; do sleep 15; done
git -C "$W" checkout -q --detach f98d4cc
node "$S/mutate-a3.mjs" "$W" "$S/mutation/a3-last.json" --only C7-headless-base-check-off,C8-two-pass-refusal-off > "$S/mutation/a3-last.log" 2>&1; echo "LAST_EXIT $?" >> "$S/mutation/a3-last.log"
node "$S/mutation/mutate-r3.mjs" "$W" "$S/mutation/r3-last.json" --only I6-no-early-release,I7-release-leaves-copies-hidden,C5-rig-rule-check-off > "$S/mutation/r3-last.log" 2>&1; echo "R3LAST_EXIT $?" >> "$S/mutation/r3-last.log"
bash "$S/formal3.sh"
