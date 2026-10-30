# Native Farmyard window presentation

**Candidate v1**, based on accepted main `5f3627cd9fc4d95f15b7f1eefafdfb1d6034475f`. Proposed optional entry: `@nautilus-engine/renderer/adapters/farmyard/windows/three`. Root registration and review remain pending. Appearance provider, not production game adoption. [Source ledger](source.json), [notices](NOTICE.md), [minimal installed consumer](#minimal-installed-consumer), [registration request](../../docs/reviews/window-presentation/registration-request.json). The interactive workbench is a repository/static example at `examples/window-presentation.html`; it is not a runtime-package dependency.

Preserves 39 native presets, explicit metre-sized borderless template, three frame finishes, three procedural lower-wall skins, enamel edges, transparent panes and reflected strokes. Broken pane groups hide glass and glints together while structural members remain. Source: Farmyard `251bf8094b5f9ebe44208443084c1a6d6658512a`, catalogue `industrial-windows/2`. Inherited study/art rights uncertainty remains; see NOTICE.

## Connections and plain projection

Borrow the host's one Three r180 namespace and scene. The host owns its renderer, frame loop, monotonic seconds, acceptance/persistence, full-world queries, visibility and game decisions. This component imports no kernel, renderer, clock, game state controller or audio machinery. It owns its root, per-preparation pool/model maps, wall/glint geometry, procedural maps, and at most six effects / 210 shard triangles. Audio is an explicit deferred gate, including gesture unlock and late-load ownership. No automatic host-service recipe is registered.

The **actual owning** `./windows` module supplies three borrowed functions to `projectAcceptedWindowPresentation(core, acceptedState)`: `serializeWindowState`, `windowStateGeometry`, `inspectWindowGeometry`. The bridge calls those functions on their own handles and returns detached plain data. The optional renderer never imports a second kernel or passes handles into one. Copied state is not an acceptable core handle; a JSON round trip of the projection is acceptable.

Projection `kind: nautilus-window-presentation`, `version: 1`:

| Field | Meaning |
| --- | --- |
| `scope` | Full profile, scene, state, content epoch and content digest |
| `revision`, `geometryRevision`, `geometryDigest` | Accepted state/geometry observations |
| `windows[]` | Original placement, engine instance ID, definition digest, compiled native definition, exact pane/visual bindings and broken mask |
| `latestReceipt` | Null initially; otherwise opaque complete ID, revision, outcome, placement/pane, point, direction and cause |

This projection is not a save, confirmation or authority token. Validation checks presentation consistency, native bounds and IDs; it cannot prove CAS acknowledgement. The host supplies accepted state only after its actual commit. Unknown IDs, unsupported versions/styles, accessor/nonplain data, nonfinite Float32 heights and changed content during `update` are refused before replacing the accepted view. Limits: 1,024 windows, 128 receipt revisions, 250,000 traversed plain values and 8,192 characters per string; split oversized presentations in the host. Core/game limits remain independent.

Coordinates are metres. Placement `(x,y)` maps to Three `(x,0,z=y)`. Native local +Y is up and +Z is front; quarter turns remain exact. Root scale stays one; native primitive scales express declared member dimensions. Ground anchoring only; full spans/joins and explicit template dimensions come from core. The 2.12 m storey datum is preserved. Mesh bounds confer no collision, support, vault, passage or hit permission.

## Minimal installed consumer

```js
import * as core from '@nautilus-engine/core/windows';
import * as THREE from '@nautilus-engine/renderer/render-effects/three';
import {createFarmyardWindowPresentation, projectAcceptedWindowPresentation}
  from '@nautilus-engine/renderer/adapters/farmyard/windows/three';

const view = createFarmyardWindowPresentation({THREE, scene: host.scene});
const projection = state => projectAcceptedWindowPresentation(core, state);
await view.prepare(projection(host.acceptedWindowState), {signal: host.abortSignal});
// Called by the host with acknowledged state and its matching post-commit loan.
function afterAcceptedImpact(state, observation) {
  view.update(projection(state), {observation, timeSeconds: host.seconds()});
}
// Called from the host's existing frame loop.
function onHostFrame(seconds) { view.sample(seconds); }
async function restoreAccepted(state, signal) {
  await view.prepare(projection(state), {signal}); // quiet, complete replacement
}
function close() { view.dispose(); }
```

The accepted retained connector's optional `present` publication supplies `{receiptId,effects}` after acknowledgement. Pair that callback with the exact accepted state captured by the host. A mask-only `update` from `publish` followed by `present` for that revision remains quiet: pair both observations in one update if shatter is wanted. Host recovery reopens its complete state with the actual core module. Uncertain/failed commits supply no cosmetic observation. The six headless host services remain required separately.

`prepare` loads local factories asynchronously and stages a complete pool offscene. A newer preparation, successful accepted update, abort or disposal invalidates pending work. Late/cancelled/failed staging releases its own resources and preserves the accepted scene. It returns diagnostics. An optional host-owned `loadNative` loader returns the two native factories; it acquires no assets on this component's behalf before returning them.

`update` validates before allocation/mutation, requires the same full scope/content and refuses backward revisions or repaired masks. It applies the accepted mask. A fresh matching latest glass receipt plus host seconds creates shatter with `includePane:false`; no duplicate intact pane or delayed mask hold. Complete opaque receipt IDs seed only cosmetic debris. Repeats, mask-only updates, skipped earlier receipts and restored receipts stay quiet. The current scope's volatile high-water revision survives quiet reprepare; this is not a durable journal. A new scope quietly seeds its current revision. Cosmetics cannot confirm gameplay.

`sample(seconds)` uses monotonic host seconds after preparation, analytic elapsed time, source metre gravity and the returned effect duration, including tall-pane landing/fade. No RAF/timer is installed. Completed/evicted effects are disposed. Reduced-motion hosts can set `maxEffects:0,maxShards:0` while keeping exact masks. Debris assumes a flat receiving floor at zero and has no world/actor collisions. CPU geometry and SwiftShader WebGL proof do not establish real-device FPS.

`dispose()` is idempotent, rejects further work, fences pending loads, removes only owned roots, clears maps and closes pools/effects. Borrowed scene, renderer, Three and host services survive. The component saves nothing and never edits/migrates host saves. Save/reload/undo/redo and map authoring remain host/editor responsibilities. Reload is quiet preparation, never one-shot journal replay.

## Builder checklist

- [ ] Use an exact reviewed pin; find the entry, guide, source ledger and notices in the installed package. No sibling/donor/private editor imports.
- [ ] Keep one shared Three; bind accepted state from the owning core, host scene/seconds and real acknowledged publication path.
- [ ] Match ground axes, metre dimensions, quarter turns, compiled IDs/joins, content epoch and instance bindings. Verify host visibility/residency separately.
- [ ] Demonstrate an accepted break, mask/glint removal and one effect without extra costs, queries or persistence writes. Unknown/mismatched observations fail atomically.
- [ ] Restore quietly; check retries, skipped receipts, stale scope/content, missing time, cancellation, late/failing loads and disposal/reopen. Visual failure leaves authoritative saves intact.
- [ ] Review native frames, joins, lower-wall paint, borderless continuity, quarter turns and shatter on desktop/phone. Supply reduced-motion policy; audio remains deferred.
- [ ] Confirm owned retirement and borrowed scene/renderer survival. Record helper cleanup, checks and exact reviewed artifacts.
- [ ] Adopt through a separate game change; editor bindings and production acceptance remain that game's work.

**Design recommendation:** prefer native members for Farmyard pane impacts: visible holes match accepted masks (accuracy); shared geometry/materials and bounded debris have known code bounds but unmeasured device cost (efficiency); enamel/glints improve tactical readability (subjective narrative judgment). Decorative proxies suit nonfunctional distant scenery. This stylised first-hit profile is not Tinderbox heat/fire or physical glass simulation.
