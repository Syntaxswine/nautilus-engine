# Native static windows — optional renderer candidate

**Registered reviewed candidate / Unreleased.** Public entry `@nautilus-engine/renderer/adapters/farmyard/windows/three`; component ID `window.native-static-presentation`, presentation API v1, no new save schema or engine capability. Use the host's actual public `./windows` and
`./adapters/farmyard/windows` modules; pass one borrowed Three namespace and one
host-owned material/texture pool. No game has adopted this presenter.

| Item | Contract |
| --- | --- |
| Native content | `industrial-windows/2`, Farmyard `251bf8094b5f9ebe44208443084c1a6d6658512a`; 39 presets plus explicit-metre `window.full.borderless` |
| Dimensions | 1/2/3 m framed spans, 2 m framed height; 2.12 m borderless presets. Frame .20 m, lower wall .16 m, glass .008 m. Root scale one. |
| Coordinates | Local X span, Y height, Z front. Ground `(x,y)` becomes Three `(X,Z)`; quarter turns only. Ground anchoring does not imply upper-floor support. |
| Identity | Complete scene/placement/member/pane IDs, explicit ≤24-character engine alias, definition/content/geometry digests and runtime state/epoch/revision. No shortening or ID-prefix inference. |
| Materials | Host supplies actual Three materials: glass, shine, steel/sage/ivory `{frame,edge}`, walls `{brick,concrete,corrugated}`, legacyWall. Pure recipes/pixel data are optional conveniences. |
| Ownership | Presenter owns outer/view/placement roots and geometries only. Host renderer, scene, material/texture pool, clocks, authoritative state, query and save services survive disposal. |
| Limits | At most 1,024 placements, six panes each, 4,096 explicit legacy walls; one active view plus two candidates. Plain data ≤500,000 nodes, depth 24 and 8,000,000 UTF-16 units. Public core enforces its independent byte/geometry limits. |
| Excluded | Shatter, audio, impact choice/confirmation, costs, clocks, save writing, gameplay adoption and editor/game adoption. |

`window-bay-compact` and `window-bay-period` remain older decorative sash/wall
bays: their 2 m complete bay contains .5 m flank + 1 m opening + .5 m flank.
They are not native 2 m glazing, and this presenter never stretches them.

## Installed authoring-preview example

This complete public-import example runs in Node without DOM/WebGL. It creates an offline preview and preserves the full map underlay/history; it creates no live pane epoch. Its host pool uses flat wall materials. `nativeWindowSurfacePixels` supplies optional native paint data when the host also owns textures. The installed-package proof executes this block.

```js
import {blankMap} from '@nautilus-engine/core';
import * as W from '@nautilus-engine/core/windows';
import * as F from '@nautilus-engine/core/adapters/farmyard/windows';
import * as A from '@nautilus-engine/core/windows/authoring';
import * as THREE from '@nautilus-engine/renderer/render-effects/three';
import * as V from '@nautilus-engine/renderer/adapters/farmyard/windows/three';

// This is an offline authoring preview, with no live epoch or game mutation.
const base = blankMap('Native window preview');
base.edges['s:20:21'] = 'wall-brick';
const document = A.createWindowAuthoringDocument(A.createWindowAuthoring({
  id:'preview-document', worldId:'preview-world', baseBlueprint:base
}));
const placed = document.apply({kind:'place', engineInstanceId:'preview-view',
  placement:A.windowPlacementAtEdge({id:'preview-window',
    definitionId:'window.full.clear.1m', edge:'s:20:21'})});
if (!placed.ok) throw Error(placed.reason);
const saved = document.serialize();
if (!document.undo().ok || !document.redo().ok || document.serialize() !== saved)
  throw Error('Authoring history did not preserve the complete source.');
const captured = document.snapshot;
// These handles share the actual public core. Transport only the plain projection.
W.inspectWindowGeometry(A.windowAuthoringGeometry(captured.prepared));
const prepared = V.prepareAuthoringWindowView(W, F.FARMYARD_WINDOW_DEFINITIONS,
  A.windowAuthoringGeometryProjection(captured.prepared));

const ownedMaterials = [];
let presenter, hostDisposals = 0, borrowedPoolSurvived = false, finalOwnedGeometry;
const make = (Class, options) => {
  const material = new Class(options);
  material.addEventListener('dispose', () => hostDisposals++);
  ownedMaterials.push(material);
  return material;
};
try {
  const recipes = V.WINDOW_PAINT_RECIPES;
  const materials = {glass:make(THREE.MeshStandardMaterial, recipes.glass),
    shine:make(THREE.LineBasicMaterial, recipes.shine), walls:{}};
  for (const style of ['steel','sage','ivory']) materials[style] = {
    frame:make(THREE.MeshStandardMaterial, recipes.finishes[style].frame),
    edge:make(THREE.MeshStandardMaterial, recipes.finishes[style].edge)
  };
  for (const skin of ['brick','concrete','corrugated'])
    materials.walls[skin] = make(THREE.MeshStandardMaterial, recipes.wall);
  materials.legacyWall = materials.walls.concrete;
  presenter = V.createNativeWindowPresenter({THREE, materials, isCurrent(scope) {
    const now = document.snapshot;
    return scope.mode === 'authoring' && now.preparationCurrent &&
      now.prepared === captured.prepared && now.revision === captured.revision &&
      now.contextKey === captured.contextKey && scope.geometryDigest === prepared.geometryDigest;
  }});
  const scene = new THREE.Scene(); // Geometry only; no DOM or WebGL renderer required.
  scene.add(presenter.root);
  if (!presenter.activate(presenter.stage(prepared))) throw Error('Stale preview.');
  if (document.serialize() !== saved) throw Error('Presentation changed authored source.');
  if ('contentEpoch' in presenter.inspect().scope) throw Error('Preview created live authority.');
} finally {
  try { presenter?.dispose(); }
  finally {
    finalOwnedGeometry = presenter?.stats().geometries ?? 0;
    borrowedPoolSurvived = hostDisposals === 0;
    for (const material of ownedMaterials) material.dispose(); // Host retires its own pool.
  }
}
export const nativeWindowExampleResult = {status:'pass', actualPublicEntries:true,
  registeredAuthoring:true, borrowedPoolSurvived, finalOwnedGeometry,
  completeSourcePreserved:document.serialize() === saved, liveEpochCreated:false};
```

## Runtime binding

```js
import * as W from '@nautilus-engine/core/windows';
import * as F from '@nautilus-engine/core/adapters/farmyard/windows';
import * as V from '@nautilus-engine/renderer/adapters/farmyard/windows/three';

const presenter = V.createNativeWindowPresenter({
  THREE, materials: hostWindowMaterials,
  isCurrent(scope) { return host.matchesAcknowledgedPublication(scope); }
});
hostScene.add(presenter.root);

// Called by the actual retained host's acknowledged publish callback.
function publish({receiptId, geometry}) {
  const state = host.currentWindowStateFromThisOwningCore(W);
  const prepared = V.prepareRuntimeWindowView(
    W, F.FARMYARD_WINDOW_DEFINITIONS, state,
    {publication: {receiptId, geometry}, legacyWalls: host.explicitLegacyWalls()}
  );
  const staged = presenter.stage(prepared); // offscene; current fence before allocation
  // If the host changes before this call, activation retires only the candidate.
  if (!presenter.activate(staged)) host.requestCurrentPublication();
}
```

The presentation producer calls **the supplied owning core's**
`windowStateGeometry`, `inspectWindowGeometry` and `serializeWindowState`.
It compares the exact acknowledged publication geometry, then reopens plain
geometry through public `openWindowGeometry` with fixed definitions and compares
every inspected field. This is not a new public core projection API. A copied
state/handle cannot be substituted for a core-owned one.

`isCurrent` is a borrowed synchronous host fence, not a renderer assertion of
authority. Compare the complete state/scene/epoch/content/geometry/revision and
the acknowledged current host/context token. Return true only for the actual
accepted publication or validated initial/cold load. The reference binds this
inside `connectFarmyardWindows` publication and a validated initial load; real
games supply all six version-1 host services. Never publish speculative effects
or derive breaks from a mesh raycast. The first tranche consumes no effect stream.

All pane visibility is applied from the accepted mask before activation; glass
and its two-sided framed glints share one pane group. Borderless sheets have no
glints and only their two broad faces (four triangles), with no side/cap seams.
No receipt replay, sound, debris, clock or random stream runs while restoring.

## Authoring preview

Use the registered public `@nautilus-engine/core/windows/authoring` entry. The installed proof uses a separately staged physical package from fixed `e5ff08c2401bb6f33a236a63efc0eb0b24bbbc7a` only to prove foreign opaque-handle refusal.
Call its `windowAuthoringGeometryProjection(prepared)` and pass that detached
plain value to `prepareAuthoringWindowView(W, fixedDefinitions, projection)`.
The presenter's own public-core instance reopens it. Do not pass
`windowAuthoringGeometry` handles between installations. Preview scopes have no
runtime epoch, state ID or impact receipts; live damage masks are refused.

The authoring owner prepares one history ticket, stages the presenter offscene,
accepts only the still-current ticket and activates it. Its current fence must
track the exact pending/accepted ticket and prepared geometry, including cancel,
undo, redo and context invalidation. Abort art on cancellation/refusal; an
invalid edit leaves the prior scene/history unchanged. The installed proof
exercises prepare/stage/accept, undo, redo and cancellation. It does not register
an editor UI or convert the authoring envelope into a game save.

## Legacy wall composition

Supply explicit `{provider:'farmyard-legacy-wall-v1',edge,floorId:'ground',bounds}`
records. `bounds.height` is the **absolute top elevation**, not an extent.
The actual public `clipWindowLegacyWall` validates exact native 1.12 m spans,
suppresses covered walls, and trims .06 m neighbour overhangs to the shared seam.
The staged root renders these exact clipped opaque records; its inspection
returns detached `{original,clipped}` pairs for host composition. The host must
apply the same clipping to its complete query, as the reference does. Passing a
transparent window in front of an unclipped wall is a failed integration.

Keep the original source/base underlay in saved data. Never infer provenance
from a wall name, delete a saved wall to make glass visible, or claim arbitrary
native/curved walls are supported by this legacy clipper. Window passage
reservations remain non-vaultable even when every pane is broken.

## Retirement and builder checklist

`stage(prepared)` returns an offscene handle. `activate(handle)` atomically
replaces the visible owned view only if the host fence still agrees. A stale or
failed candidate is retired; the last accepted root stays. `abort(handle)`
retires only a pending view. At most three views coexist. There is no loader,
watcher, private frame loop or async work hidden inside this synchronous API.

Lifecycle mutations are serialized. Reentrant `stage`, `activate`,
`removeInstance` and `setResident` throw `REENTRANT_LIFECYCLE`. Reentrant
`abort(pendingHandle)` and `dispose()` latch cancellation without running nested
destructors. The outer operation settles those requests before returning;
repeated abort/dispose is harmless. `inspect`/`stats` remain readable during a
callback, including while cancellation is pending.

Activation attaches the candidate hidden, checks cancellation and the current
fence after native attachment/removal callbacks, and keeps the old geometry
owned until those checks pass. Failure before that commit retires the candidate
and restores the old root unless the host intentionally disposed the presenter.
Old-resource notification errors after commit are reported with the replacement
consistent; disposed old geometry is never resurrected. A stale/retired
replacement returns false or throws after cleanup, never true.

Retirement transfers all owned nodes/geometries out of live records before
calling native Three removal/disposal. It attempts every owned resource despite
listener exceptions, then repairs owned parent/child links without replaying
events. This also handles a listener reparenting a retiring node. Cleanup
failures throw `AggregateError` with code `WINDOW_VIEW_LIFECYCLE_FAILED` after
consistency is restored; at most 64 errors are retained, with the full
`failureCount`. Native dispatch semantics remain intact: one throwing listener
can stop later listeners on that same event; the provider does not retry/replay
it or change Three prototypes. All other owned resource attempts still run.

`setResident(completePlacementIds)` changes presentation visibility only and
preserves pane masks. `removeInstance(id)` retires only that owned instance;
neighbour geometry/materials remain live. `dispose()` detaches all owned roots
and disposes owned geometry idempotently. Dispose the host pool separately,
after all borrowers retire. `inspect()` exposes visual roots/meshes for host
attachment/review, never a query or confirmation authority.

- Bind the same actual public owning core and fixed definitions.
- Bind actual acknowledged publication and a complete current fence.
- Supply a single borrowed Three namespace and explicit host-owned materials.
- Compose clipped opaque walls in both renderer and complete host queries.
- Preserve original underlays and complete IDs/digests through saves/history.
- Abort stale/cancelled preparations; retire neighbours independently.
- Keep shatter/audio, editor chrome and game adoption separate.

Run `node tools/check-native-window-presenter.mjs`,
`node tools/test-native-window-presenter-package.mjs` and the four repository
gates. Browser reference: `examples/native-window-presenter.html`; reproducible
bounded review: `node tools/review-native-window-presenter.mjs --source`, then
the default built review and `--installed`. See the review report for exact
provenance, results, remaining gaps and the registration request.
`node tools/check-native-window-lifecycle.mjs --baseline` intentionally fails
against exact `9fe6fc989a147a2a2c578727ebebfec5ef1e8b58`; the command without
that flag passes the current source using actual pinned Three events and public
core. The actual declared renderer-package proof runs the same lifecycle cases.
