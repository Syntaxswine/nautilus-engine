#!/bin/bash
# After phase 1: K7 and C9 again at the new commit; the whole-suite confirmation of every
# survivor; round 3's own harness on its survivors; the CI falsifiers. One after another.
set -u
W="<measured>"; T="<author>"
S="<scratch>"
node "$S/../mutate-a3.mjs" "$W" "$S/a3-phase1-again.json" --only K7-shadow-ignores-run,C9-lamp-maps-counted-headless > "$S/a3-phase1-again.log" 2>&1; echo "AGAIN_EXIT $?" >> "$S/a3-phase1-again.log"
node "$S/../mutate-a3.mjs" "$W" "$S/a3-confirm.json" --confirm --only C7-headless-base-check-off,C8-two-pass-refusal-off > "$S/a3-confirm.log" 2>&1; echo "CONFIRM_EXIT $?" >> "$S/a3-confirm.log"
# Round 3's harness, its 12 survivors (the instancing code some of them mutate is gone: invalid).
node "$S/mutate-r3.mjs" "$W" "$S/r3-survivors-at-answer.json" --only I1-instance-bounds-template-only,I2-instance-matrix-root-only,I6-no-early-release,I7-release-leaves-copies-hidden,I8-instanced-mesh-never-disposed,E1-editor-never-instances,E2-editor-never-merges-roofs,R1-merged-bounds-first-roof,RC1-slot-material-unnamed,C1-one-pass-always,C5-rig-rule-check-off,F7-shared-view-not-mirrored > "$S/r3-survivors-at-answer.log" 2>&1; echo "R3_EXIT $?" >> "$S/r3-survivors-at-answer.log"
node "$S/../ci-falsifiers.mjs" "$W" "$T" "$T/artifacts/bench/maps" "$S/ci-falsifiers.json" > "$S/ci-falsifiers.log" 2>&1; echo "CI_EXIT $?" >> "$S/ci-falsifiers.log"
