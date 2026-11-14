// Records the observed L4 hang (a manual observation during mutate.mjs), so the
// "killed" verdict in mutation-results.json is not mistaken for an assertion.
// Re-observe with: node artifacts/r08-1/mutate.mjs L4  (then watch the
// `node --test tests/runtime-modules.test.mjs ...` child; it does not finish).
import {writeResult, nodeRig} from './lib/common.mjs';
writeResult('mutation-l4-hang.json', {rig: nodeRig(), mutant: 'L4', file: 'packages/runtime-core/lifecycle.js', needle: 'if(!stopPromise){state=', replace: 'if(true){state=',
  observed: {
    lineage: 'mutate.mjs (pid 68552) -> node --test runtime-modules + modular-headless (pid 51880) -> runtime-modules.test.mjs runner (pid 67952)',
    runningMinutesWhenObserved: 3, normalTargetedRunSeconds: 'about 3-10 (L1-L3 targeted runs)', childWorkingSetMiB: [410, 436],
    action: 'Stopped pid 67952 only (Stop-Process -Id, after verifying its parent chain). node --test then reported the file as failed (2 fail), which the harness recorded as killed.',
    meaning: 'Under this mutant the suite hangs instead of failing. CI job map-workshop has no timeout-minutes (default 360) and npm test sets no --test-timeout.'}});
console.log('written');
