# Private C2 surface-artwork UI component

Status: private component candidate for Architect review. No normal export,
navigation, build, public schema registration or game pin changes. The fixed UI
contract is 05723c3cada36249c6b6777dd40c8a478701bccb. C1 remains byte-identical.
Actual Core, Artist and Editor providers are NOT paired. A synthetic component
fixture is not Host/native/WAL adoption or a successful live first mark.

The [usage card](usage-card.json) points here, the [typed API](component.d.ts),
the [synthetic example](tests/review.html) and [acceptance checklist](checklist.json).
The single private runtime entry is component.js; styles.css is opt-in and scoped.
The helper modules are not public engine APIs. This component owns no saved state.

## Required connections and the exact coordinator seam

Supply the SAME borrowed workbench/HostService used by the existing JSONL path.
Its atomic getSnapshot/subscribe read adds the approved overlay projection.
overlayPorts has exactly selectExisting, acceptCanvasSelection,
constructOverlayCommand and resolveVerifiedThumbnail from the fixed contract.
All fresh IDs, hashes, canonical masks, commands and dependency packs come from
Core/Host. UI only proposes finite forms and checks the returned shape/scope.
It never calls a sealer, allocator, hash, decoder, mesh, history writer or planner.

The protected C1 createTileAuthoringUIController is NOT changed or used as a
fallback. Root must supply attachCoordinator with the existing controller API and
these minimal opt-in additions before actual wiring. attachCoordinator must
return this panel's disposable presentation attachment to the EXISTING coordinator,
never create a second coordinator. Its dispose unregisters this panel's observers
and extra guard before callback-producing UI cleanup; it preserves C1, the central
coordinator and the service. A central shared-controller dispose is not that port.
The attachment multiplexing/disposal contract is also a required Root freeze point.

Required comparison/callback behavior:

1. readAdditionalData(read) returns the complete finite overlay projection.
   Compare it with the displayed original at preflight and after callback-
   producing work. Object-key order is semantic; arrays and raw sourceJSON bytes
   remain exact. Keep all original C1 Expected/action/binding/identity guards.
2. isAdditionalConnectionCurrent() checks the original workbench/service and
   overlay port object/method identities, plus optional adapter methods. A false
   result permanently retires the connection; restoring a function does not
   revive it. Existing service/collector guards remain required.
3. strictCallbackReads:true requests a FRESH actual read after onPending and the
   synchronous Stage build callback, before collect/service invocation. Compare
   the original action/source/additional data and observer epoch/ticket. Recheck
   the connection after read/callbacks too. Published A→B→A must fail by epoch.
   Do not restamp Expected, replay a producer/allocator or collect a second time.

These names are a proposed private seam, not self-authenticating flags. Root must
review its actual behavior in the retained coordinator; passing an options object
to C1 today silently ignores extra options and is unsafe. With attachCoordinator
omitted/null, the component shows the named gap with every action unavailable.
The syntheticCoordinator under tests implements a TEST DOUBLE for component
controls only. It must never be wired as a production coordinator.

The component additionally fences its own field/selection/render versions and
fresh full reads before/after command construction. It limits its own DOM render
reentry to eight visits, refuses interaction during rendering, and retains the
latest view. Those integers are local invalidation, never authority generations.
There is no second controller, authority, journal, prepared resource or history.

## Minimal deliberate mount

```js
import {mountC2OverlayUI} from './candidates/tile-authoring/ui/c2-runtime/component.js';
// Load the adjacent styles.css in the host's private embedding page.
const panel = mountC2OverlayUI(container, existingWorkbench, {
  attachCoordinator: rootReviewedCoordinatorAttachment,
  onError(error) { reportToExistingEditor(error); }
});
// All seven service methods, source reads and canonical collection are borrowed.
// Optional canvasInput/thumbnailPresentation may be omitted; numeric UI works.
// When this UI mount leaves the host:
panel.dispose();
```

The two named application functions in this snippet are intentionally required
host bindings. No default can create or discover them. The fully executable
tests/review.html is driven by tools/browser-review.mjs and explicitly uses
synthetic fixtures. It is not a production usage example or public entry.

The now accepted private surface producer is pinned at
0597fc3b7ed9213842df90e8a1bbd4d0887ba49f. Its deriveTileSurfaceTarget(tiles,input)
returns committable:false, exact target/grid/surface/bindingSeed, existingBinding
or null, sourceDocumentDigest/workspaceRevision and work. Editor/Core wrappers
must supply the original source/definition and carry result.work into remaining
governing budgets without changing caps. UI does not call it or derive hashes.
That acceptance fills the pure surface-derivation dependency; the actual Host
wrapper, synchronous publication, C2 ID/command constructor, built-in dependency
prefix and verified byte owner remain to be paired. The browser accounting design
20118a849f9cfe56f86c4d32eb3594b920b96b74 grants no capture runtime permission.

## Supported controls and scope

Select an authored copy/surface, a retained layer/mark and an exact artwork Pin.
The palette does not follow latest or select a revision automatically. Source
membership, native floor, saved frame/grid/current pose, complete layer/mark/group
lists and source resource refs are compared without hashing or repairing data.
Labels/revisions are visible; exact IDs/provenance stay in collapsed Technical
details. Unknown/unsupported/locked/grouped states preserve the source and explain
why mutation is unavailable. A layer's hidden status derives from opacity.

Numeric controls cover native U/V metres, size, radians, image-top-left pivot,
mirror U, linear RGB tint, mark opacity and stamp/detail form. C0 field bounds and
finite/negative-zero rules are enforced even when browser validity is bypassed.
Loaded values are never rounded or normalized. Patch forms name only explicitly
edited fields, leaving all other values to the canonical owner. A retained mask
can remain unchanged; an explicit replacement is all-surface or integer i,j cells
for the CURRENT authored grid. UI does not create grid spans/digests. Source U is
right and V is up; native/render conversion, owner D4 and gesture math remain with
existing owners, exactly once. Appearance makes no gameplay/physics claim.

First mark on an unpainted surface uses exactly surface.layers then decoration.add
when the exact artwork/descriptors are retained and actual owner readiness permits
it. For an absent known built-in it requires one or more explicit content.import
operations FIRST in the SAME command, then layers/add, with complete validated
chosen closure/full PNG page/notices and a real verified byte owner. The UI never
assembles, trims or reseals that pack. Current single-record built-ins reject an
all30 record import. Discovery/selection adopts nothing. Missing producer or stale,
missing or corrupt bytes keep first-mark unavailable and preserve the source.

Existing-layer add/mark edit require retained artwork in this contract. An absent
built-in on those routes is unavailable until an explicit dependency contract is
reviewed. New layers have no UI-issued IDs. The layer draft can edit, insert,
reorder or remove layers, then stage the COMPLETE list once. Removing a populated
layer requires explicit confirmation of its complete retained mark list. Selected
erase is explicit and uses preserve-whole-group; all Stage A group mutation is
unavailable. General byte upload/export/default capture and combined placement
stay unavailable; accepted C1 clean presets are untouched.

Stage collects once, without prepare. Review forwards the retained canonical
command to the same service.prepare. Apply requires the actual Editor-retained
request and forwards it unchanged, without reprepare. Draft discard and retained
review cancellation use distinct existing hooks. Unknown freezes edits/cancel and
keeps the original recovery request; Escape cannot clear it. Confirmed commits
with pending/failed presentation remain committed; existing Editor owns retry.
No Save/Open/Undo/Redo is replaced or inferred by this component.

## Optional borrowed presentation and input

thumbnailPresentation.attach(handle,element) returns UI attachment cleanup only.
resolveVerifiedThumbnail must return an exact Pin/ref and live owner handle.
After attachment/callbacks, stale UI attachments are detached. The UI never retires
an image, texture, pool or lease. A verified thumbnail is not native/byte/Apply
authority. Synthetic thumbnail tests use a labelled span and no verified image.

canvasInput.subscribeSelection(listener) subscribes to the EXISTING input owner's
live hit; acceptCanvasSelection forwards it to Core/Host. cancelUntilAllUp(reason)
belongs to that owner and handles Escape, focus/window blur, current source/frame/
pose/resource/geometry invalidation and disposal. The existing owner must handle
capture loss, a second pointer/pinch, floor/mode changes and all-up quarantine.
No pointer listener, raycaster, gesture math or shortcut takeover is installed.
Keyboard/native buttons, IME/repeat guards and numeric/text alternatives work
without either optional owner. Observer refresh preserves focused input/select
nodes. Scope styling uses C1's green/gold tokens with 14px text,44px targets and
320/390px single-column layouts. Review actions remain in normal document flow.

Disposal attempts every owned listener/subscription/attachment cleanup once,
reports cleanup errors, and never cancels/disposes the borrowed service/resources.
No clock, worker or retained preview exists in the component. The browser tool
uses an isolated hidden Edge session and short-lived HTTP server through the
existing review helper, with an actual five-minute expiry and finally cleanup.
It records exact process creation identity, port, restart source and cleanup.
The review tool requires matching PID/creation/port cleanup receipts and holds an
exclusive output lock; it never retires an unrelated or app-managed process.

## Verification and limits

```text
node --test candidates/tile-authoring/ui/c2-runtime/tests/component.test.mjs
node candidates/tile-authoring/ui/c2-runtime/tools/browser-review.mjs
node candidates/tile-authoring/ui/c2-runtime/tools/check.mjs
```

Focused controls cover field/C0 shapes, all12 Expected fields, complete membership,
source preservation, canonical scope, missing/invalid bytes, callbacks/connection/
ABA/form invalidation, cancel/unknown and borrowed cleanup. The real browser checks
DOM, native AX, keyboard/IME, focus and 1600/390/320 layouts using explicitly
synthetic workbench/coordinator providers. It demonstrates no actual Host/native
ownership, WAL, resource accounting, successful live first mark, history, save/
reopen or installed/package/game adoption. Source-derived fixture hashes are
metadata, not proof of verified bytes. Viewport emulation is not a physical phone
or performance measurement. IME guards use synthetic composition events with
native keyboard activation; no OS IME certification is claimed. The role evidence
records 36 focused controls,26 browser groups,13 independent schema cases and six
strict negative type consumers. Evidence and exact pins are adjacent under evidence/
and source.json; all required Root gates are in checklist.json.

For map authoring, prefer exact source-linked choices over UI-created material
records: correctness is supported by scope/membership controls (accuracy, not a
physical realism claim). Borrowing the existing services avoids duplicate owners
(code-based efficiency estimate; device/CPU cost unmeasured). Reusing the green/
gold palette and explicit small steps suits Nautilus/Farmyard authoring (subjective
narrative judgment). Richer game-specific effects remain the game's adapter work.
