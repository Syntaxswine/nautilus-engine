# Custom tile integration review

Status: component review in progress. This record does not yet accept the complete
editor workflow, publish an overlay provider or change any game's engine pin.
Stacked tiles were accepted through PR #32 at
`d869410625b246cfff2b51089e7878c31951775c`; its helper deadline repair was accepted
through PR #33 at `08540b0ec8acd1be8b9d9929187d82a7300a59c2`. Both merged checks
passed. Their browser evidence is preserved separately from C1 recollection.

## Fixed inputs and scope

The [C0 decisions](c0-decisions.md) remain authoritative. The public headless Core
runtime is `3df11ce6e62fb94806e30652b87168949f8ef4dd`; its final evidence tip is
`eedfc0149cbaa5715445ed2dc909c2d694a81d50`. Architect imported its 26-path delta
from fixed Git objects. No donor or builder working copy was changed.

The public `./tiles/authoring` entry supplies rectangle producers, a verifying
content sealer, requirements/discovery and finite plan/bind operations. It returns
plain proposals, never commit authority. Its production closure is 83 files:
eight new JavaScript modules, the exact accepted C0 schema and 74 unchanged public
dependencies. Core and compatibility each gain 13 shipped paths; renderer and
assets gain none. No dependency, package version, global schema/capability
registry, consumer pin or publication audience changes.

The intended C1 workflow creates A1, clones B1, revises B2, saves a preset pinned
to B1, places two independent copies in one operation, and explicitly upgrades
one copy. Old versions, the other copy, the preset and original source must remain
intact. Human and JSONL commands use one Editor authority and one history.
Overlays follow acceptance of that actual workflow.

## Corrections returned to the builders

Six Core findings were returned and independently closed at `3df11ce`:

- Unicode labels use the documented code-point limit.
- Current preset pins agree with their owner's current definition.
- Surface bindings agree with the complete current definition, frame and grid.
- Placing a preset checks that preset's own requirements.
- Planning and binding check the complete source/target resource closure.
- Binding independently derives nonplanning costs instead of trusting a mutable
  proposal's asserted charges.

Matching positive controls cover supported metadata and geometry operations.
Cosmetic selected-owner upgrades retain mark/chunk bytes and anchors; marked
geometry resizing still refuses. Core remains headless and all successful
proposals remain noncommittable. These are bounded correctness controls, not
performance or full Editor acceptance.

UI `fac180e2909ba499146bb8e4560c79cf4794ca93` closes two independently reproduced
component defects: harmless object-key order no longer retires a connection, and
reentrant packet construction cannot collect a stale command. Its constructor
field/bounds alignment with the actual public Core is a separate follow-up.

Editor `e8161b0d4c667c2811a5ba080175a3965ba3e074` closes the aggregate-only
allocation check. Five bounded actual-session controls accept only the Review's
own allocation transition and reject foreign/reentrant changes at final CAS,
without refreshing public Expected. Four full workflow checks remain stopped by
the known fresh-map work-budget issue; the builder is correcting initialization
while preserving retained source bytes. This checkpoint is not imported or
accepted as the complete editor delivery.

## Architect integration adaptations

An additive registration layer authenticates the complete fixed C1 export,
closure, support list and all four distribution profiles before exposing the
historical view to existing checks. The original stacked registration helper
and historical B1/B2 records remain unchanged. Five existing source-check callers
use that composition; the packaged C0 schema needs one explicit inventory
addition, without changing a global schema registry.

The only correction to the imported distribution guide restores the original
rock-workflow sentence's arrow characters from the accepted stacked source.
The new C1 paragraph remains intact. Every CI fetch block retains its old tips
and adds the fixed C1 object inputs. Browser evidence inventories include the new
registration and source checks. Old reports are historical; none is restamped.

## Remaining acceptance

Accept the final fixed Editor and aligned UI, authenticate their exact deltas,
then run the complete human/JSONL workflow against actual source, built and
ordinary installed packages. Review desktop and phone presentation, complete
save/reopen, Undo/Redo, one-use Review/Apply, unknown-outcome recovery and resource
retirement. Recollect the existing stacked and legacy matrices against the new
shared session and physical packages. Run all four repository gates and verify
CI before promotion. Optional gameplay bindings and device-performance claims
remain outside this tranche.
