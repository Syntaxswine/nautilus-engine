# Private shared C1/overlay controller

`mountSharedTileAuthoringUI` mounts both real panels with one actual Root controller
and one binding subscription. It creates one `createSharedTileAuthoringController`
hub and passes its same attachment factory to the explicit C1 opt-in mount and the
unchanged 938e overlay component. The hub owns UI attachment lifetimes only. Draft,
Expected, pending operations, authority, history, resources and execution remain
with the borrowed controller/service/session.

Root is pinned to full reviewed commit
`648cad33c3e0e1f36b4313b1492b1a750492ece4` (tree
`168f35cbddcc8115269ea886475a14511c4ecdac`). Its coordinator remains byte-exact
SHA-256 `81e0d2ad2aaa52c01b9d1d3ed172b5bef951b4f8e7440c8218e591f787425db4`.
The additive `vendor/source.json` receipt proves the former 938e frozen coordinator
is exactly that committed Root source. Historical 938e/a4 files and receipts stay
unchanged; no staged or moving file is imported.

## Concrete usage

Call `mountSharedTileAuthoringUI` from `mount.mjs` with separate library and overlay
containers, the SAME complete workbench binding, its actual
`isAdditionalConnectionCurrent`, C1 public tile/authoring namespaces and
`rectangleSpec`, plus optional borrowed overlay input/thumbnail presentation.
Use the stylesheet from `vendor/root648/styles.css` and 938e's original 5a7 overlay
stylesheet. The actual 938e form producer/WeakMap remains the overlay's producer.

```js
import {mountSharedTileAuthoringUI} from './mount.mjs';

// pairing is the existing, explicitly bound C2 read-pairing adapter.
const ui = mountSharedTileAuthoringUI({
  libraryContainer,
  overlayContainer,
  binding: pairing.binding,
  isAdditionalConnectionCurrent: () => pairing.isConnectionCurrent(),
  libraryOptions: {tiles, authoring, rectangleSpec},
  overlayOptions: {thumbnailPresentation, canvasInput},
  resourceActions // Root-owned {loadSelected(actualIssuedRead)}; omit when unbound.
});

// Both panels now stage/review/apply through that same borrowed connection.
// Closing one panel keeps the other attached; closing both unsubscribes.
ui.dispose();
// The host separately owns pairing, service, resource and scene lifetimes.
```

For an existing Root mount, apply the proposed semantic change in
`proposal/root-mount-opt-in.patch`: add optional `attachCoordinator`, validate its
function type, and borrow it instead of privately creating another coordinator.
Omitting the option calls the exact original Root algorithm. `c1-mount.mjs` is the
explicit private demonstration, with one recorded import relocation for this
candidate; it does not edit Root's actual panel file.

Independent hosts may call `hub.attach(sameBinding, callbacks)` for each surface.
An overlay attachment supplies its existing complete comparison/currentness tuple.
The hub always compares the WHOLE overlay, even for C1, alongside attachment
lifetimes. Both surfaces forward every action to the same Root controller and
borrow the same service/history. There is no second coordinator fallback.

Each attachment's `dispose()` removes only that consumer. The last close retires
the controller and its one subscription. A later explicit attachment starts one
new UI lifetime. It does not cancel an in-flight Host operation; genuine late
results keep their original meaning. Exposed resource references remain borrowed.

Callbacks cannot attach a second controller or invoke commands reentrantly.
Attachment changes fence builders and final collection; callbacks are checked
before/after delivery. An observed rebind stays retired after restoration and
invalidates both views. Full overlay comparison, Root's post-callback checks and
attachment lifetime checks stop stale construction/collection. Diagnostic counters
are UI observations, never saved fields, IDs, editing credit or authority.

Pending preparation cancellation remains the separately reviewed SAME-session
helper. The hub forwards the existing controller cancel action, preserves its
availability flags and never treats draft discard or a review token as pending
preparation cancellation. There is no eighth service verb.

## Explicit artwork loading

The combined mount adds `button[data-action="load-selected-artwork"]` beside the
artwork palette, labelled **Load selected artwork**. It calls exactly
`resourceActions.loadSelected(actualIssuedRead)`, preserving the actual fresh
binding-issued read. The port is optional, captured at mount and retired if an
observed replacement occurs. Without an own function it is visibly unavailable
and disabled. There is no automatic selection fetch or cancel-load alias.

Root must bind actual d8 verification **and** resident native palette-page work
through that port, under bounded RESOURCE work with zero editing credit. UI does
not acquire/import bytes, allocate IDs, stage commands, touch WAL or implement
native ownership itself. `ui.resources.load()` invokes the same action for a host
or collector; its `status: 'refreshed'` means only that the borrowed invocation
settled and actual binding readiness was refreshed. All resolved callback values,
including `{ready: true}`, are ignored. Only the actual read can enable Stage.

One owned invocation adds a temporary UI gate across both panels. Root pending and
actual action flags remain authoritative when that gate ends. Detaching the load
control removes its DOM/listener but keeps the invocation gate until borrowed work
settles; the remaining panel is refreshed then. UI does not claim cancellation,
release a borrowed native resource or erase debt. A real owned cancel port can be
added in a later fixed review. The current tests use protocol load callbacks only;
actual d8/native composition remains unbound.

## Adoption checklist

- [ ] Root reviews/applies the explicit opt-in mount semantic patch.
- [ ] Both panels use this concrete mount or the SAME hub attachment factory.
- [ ] One actual complete binding/service/history and full overlay are supplied.
- [ ] Actual Host/Core/native/meter preparation and owned pending cancellation are bound separately.
- [ ] Root supplies actual `resourceActions.loadSelected` RESOURCE work and readiness/debt publication.
- [ ] Resource/save/unknown-outcome ownership remains with the existing session.
- [ ] Root composes against its reviewed foundation and runs combined integration review.

Tests count one actual Root controller/subscription, shared draft/history,
cross-panel pending, independent detach, callback reentry/caught rebind, last-close
cleanup and unchanged default C1. DOM review uses actual Edge, both real panels
and three viewport layouts. Workbench/session/readiness/history are explicitly
protocol fixtures. No actual Host Apply, native rendering, browser-wide editing
meter, WAL or consumer adoption is established. Normal builds/exports and consumer
pins remain unchanged. No preview is retained after review.

## Reproduce the fixed review

From the repository root, use Node22 or later. Run
`node candidates/tile-authoring/ui/shared-controller/tools/verify.mjs` for original
hashes, immutable prior components, exact derivation, dependency closure and an
isolated patch-application proof. Add `--index` after staging to compare indexed
bytes; `--record` is reserved for deliberately resealing owned source changes.

The focused commands are
`node --test candidates/tile-authoring/ui/shared-controller/tests/hub.test.mjs`
and `node candidates/tile-authoring/ui/shared-controller/tools/browser-review.mjs`.
The latter closes its isolated browser/server in `finally` and installs an actual
three-minute expiry. It writes all lifetime/cleanup receipts and screenshot files.
`tools/repository-checks.mjs` runs the four required npm gates once, with bounded
test concurrency. `tools/record-checks.mjs --tsc=PATH_TO_EXISTING_TSC` verifies the
strict type controls, final logs, all helper exits/ports and review receipts.

The normal runtime in this private worktree remains the 938e/471 baseline. Its
required checks are 1,162 tests,32 upstream and build563; Architect's separately
reviewed Root648 foundation has 1,174 tests/build602. The exact Root648 UI algorithm
is used here without importing that other foundation's runtime changes.

Accuracy favors one consistent displayed source and actual attachment lifetimes.
Efficiency is one subscription/controller with bounded callback fanout (code-based,
not a frame-rate measurement). Narrative preference is coherent menu behavior across
both surfaces, a subjective UI judgment. No donor design/profile changes here.
