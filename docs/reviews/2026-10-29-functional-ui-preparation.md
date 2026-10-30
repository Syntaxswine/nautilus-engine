# Functional player UI preparation acceptance

Fixed source: **48f3b786e7df0721c884baacafa6ee63273895bf**. Baseline **78d37b6cd3ba5de5c25d4922b4ba301b13491caa**. Scope package 4 at **04f915dd8b16c242d47b1e054b2406aedcbdefc8**. Frozen PR12 title source **25224b9f7994db29d2e05ebdce279c73f4434c1e** remains byte-identical; see [source inventory](../ui/functional-scene-preparation.sources.json).

## What passed

All **367 engine tests**, **32 upstream regressions**, integrity/closure checks and the static build pass (**389 module paths**). Ten focused cases cover private readiness/lifecycle behavior. The frozen built browser run passes six groups: held keyboard/diagonal input and no frame-driven commands; pointer/focus release; failure/cancellation/retry and retained title session; four readiness classes and exact source selection; confirmed-floor/manual/follow behavior; native phone touch, 44px targets, 320px reflow and disposal. Zero page/console/resource errors. Desktop and phone captures were visually inspected.

A manual preparation gate makes loading/replacement assertions independent of host timing. Earlier runner corrections used semantic classification attributes rather than CSS capitalization and released this gate before waiting for a controlled failure. These are UI fixture checks, not physical gameplay evidence.

See [acceptance](evidence/functional-ui-preparation/acceptance.json), [required gates](evidence/functional-ui-preparation/gates.json) and [cleanup verification](evidence/functional-ui-preparation/cleanup-verification.json). All recorded task-owned review process identities and ports are stopped; no helper/preview is retained. Borrowed-resource counters remain unchanged in the controlled owned-handle tests; native borrowed-Three survival is pending the real binder.

## Scope limits and measured resources

This checkpoint supplies worker-private UI modules, a lifecycle adaptation target, the frozen title, a labelled UI fixture and [targeted interface/metadata requests](../ui/functional-scene-preparation.md). It does not register a new public ABI, exports, package whitelist, capabilities or checkpoint schema. Coder retains those responsibilities. The kernel/compiler and other worker/donor checkouts are unchanged.

Measured local desktop resource timing: **14 resources**, **67461 encoded body bytes**, **71661 transferred bytes**. This excludes the navigation document and describes only the UI fixture; no Three/vendor runtime was loaded. The [resource record](evidence/functional-ui-preparation/resource-summary.json) explicitly leaves compiler/rebuild, installed-package, native actor and draw-call fields unmeasured. No phone FPS or complete-game performance claim is made.

The generic native scene binder, real character animation/clearance, compiled editor -> play, physical door/stair/obstruction behavior, authoritative mid-route checkpoint loading, transformed second instance/layout and installed public-package proof are **not run**. They depend on architect-reviewed kernel/compiler/save/provider and Artist kit commits. Bear acceptance remains queued separately. The [component guide](../ui/functional-scene-preparation.md) records the remaining acceptance checklist and accuracy/efficiency/narrative recommendation.
