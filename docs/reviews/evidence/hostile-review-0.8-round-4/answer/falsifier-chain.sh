#!/bin/bash
# The documented refresh against round 4's digest mutants, then the CI gate against Q5 and K3,
# one after the other, on built copies of the commit.
set -u
R4="<scratch>"
COMMIT="${1:?commit}"
bash "$R4/refresh-check.sh" "$COMMIT"
bash "$R4/ci-falsifiers.sh" "$COMMIT"
echo "$(date +%H:%M:%S) falsifier chain done" >> "$R4/falsifier-chain.done"
