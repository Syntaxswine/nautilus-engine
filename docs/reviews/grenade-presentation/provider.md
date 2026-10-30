# Native grenade visual provider: builder guide

**Status: reviewed integration candidate, API version 1; integrated browser/player acceptance pending.** Optional public entry `@nautilus-engine/map-core/grenades/three` is [packages/grenade-visuals/three.js](../../../packages/grenade-visuals/three.js). The compatibility and renderer packages register this optional provider. Headless core excludes its renderer entry and files. This guide does not register a gameplay capability or change the source-authoritative grenade profile.

The fixed integration target is core candidate `c7beb44fa254b2d72657f7e3a959920216f09b35` (0.9.0). This provider branch remains based on artist audit `958e8a6a41675db8d4eba0750411153306b6153d`; it imports no dirty worker files or grenade authority. UI binds those fixed candidates through the frame ABI below.

The provider reuses the original horse/normal paint and 820-triangle grenade, the same Three r180 instance as `./render-effects/three`, and published Farmyard throw source `251bf8094b5f9ebe44208443084c1a6d6658512a`. The [initial audit](https://github.com/Syntaxswine/nautilus-engine/blob/2b7d57dcd45a30d5b02a1ac357d559fedb35b854/docs/reviews/grenade-presentation/README.md), [native measurements](https://github.com/Syntaxswine/nautilus-engine/blob/2b7d57dcd45a30d5b02a1ac357d559fedb35b854/docs/reviews/grenade-presentation/measurements.json), [generated-source ledger](../../../packages/grenade-visuals/source.json) and [reference-only immutable inputs](https://github.com/Syntaxswine/nautilus-engine/blob/2b7d57dcd45a30d5b02a1ac357d559fedb35b854/vendor/farmyard-grenade-visuals/251bf8094b5f9ebe44208443084c1a6d6658512a/provenance.json) retain exact pins/bytes. The visual snapshot is separate from the architect's strict `vendor/farmyard-grenades` gameplay snapshot. No original vendor bytes, shared package/build/upstream files, game pins, other worker branch or Sites setting is changed by this provider.

## Concrete ABI

Both constructors are **async** and return independently disposable handles:

| Export | Contract |
| --- | --- |
| `createGrenadeModel(options = {})` | Painted prop only. Returns `id`, `root`, `parts`, `anchors`, `carry`, `triangles`, `diagnostics()` and idempotent `dispose()`. No horse, paint projection, motion or balance module is imported. |
| `createNativeGrenadePresentation(options)` | Requires opaque nonempty `presentationId` and a borrowed host `renderer` when creating its own painted horse. Returns `root`, synchronous `seek(frame)`, `diagnostics()` and idempotent `dispose()`. |
| `grenadeVisualResourceURLs()` | Resolves three resources relative to the module/package layout. Use these URLs rather than a sibling checkout or hard-coded deployment origin. |
| `GRENADE_VISUAL_RESOURCE_PATHS` | The exact three package-relative data/paint paths, listed below. |
| `GRENADE_PRESENTATION_MARKERS` | `{pin:.50, drop:.70, plant:1.60, release:1.92, lever:1.945, duration:4.6}` in elapsed host seconds. |

`presentationId` is an opaque host-committed receipt/clip identity, including tuple-encoded strings. The provider does not split, decode, truncate, deduplicate or commit it. The host supplies one already-committed presentation, retains deduplication and chooses when to create/dispose its visual.

### Frame and coordinate contract

```js
visual.seek({
  elapsedSeconds: 1.98,
  actor: {x: 20, y: 14, h: 4.24, headingRad: Math.PI / 2},
  projectile: {state: 'flying', x: 20, y: 14, h: 5.34}
});
```

**Actor and projectile inputs are in the presentation root's local coordinate system.** `{x,y,h}` maps to local Three `[X,height,Z]`. Positive actor heading turns +X toward +Z; source model yaw is `−headingRad`. `releasePoint`, `authoritativePoint` and `renderedPoint` diagnostics are arrays in that same root-local `[X,height,Z]` frame. The presentation root and any retained parent translation/rotation apply **after** native IK sampling. The provider temporarily isolates its own subtree synchronously for the source solver, then restores parent/order/root transforms. It does not inverse-map world points automatically.

For ordinary Nautilus world coordinates, keep the presentation root and ancestors at identity. With a transformed root/parent, deliberately convert both actor placement/heading and committed projectile points into the same local frame; do not supply world coordinates and then apply the parent transform again. Native unit scale is required. Focused evidence combines a translated/rotated retained parent with a quarter-turned actor elevated by 4.24 m, and verifies both root-local diagnostics and actual world mesh placement. This is native geometry evidence; UI still owes the matching browser view.

Before 1.92 s `projectile` may be `null`. At/after release, provide either `{state:'flying',x,y,h}` or `{state:'ended'}`. Missing, nonfinite or unsupported frames reject before posing; the demonstration flight is never substituted. `ended` hides the released casing immediately. Cancellation uses `dispose()` or the supplied AbortSignal. Invalid input leaves the last accepted pose intact; an unexpected native solver failure retires the instance and restores a borrowed actor.

The actor's source pose clamps at 4.60 s, while later host samples can continue displaying a flying projectile. No `Date`, internal animation timer, frame callback or game loop advances this component. Seeking backwards, repeating a frame or restoring the same elapsed value emits no gameplay or audio event.

### Source arc and cosmetic transition

The source-authoritative trajectory remains unchanged, starting at actor ground x/y and height 1.1 m. The native hand releases at `[0.1245299924,1.5672673579,0.2563392314]`, a 0.547317 m local origin gap. The provider moves the **same three casing meshes** from the held prop to one released visual group; it does not create a second grenade or logical projectile. Ring/lever remain cosmetic source motion.

Body choreography and head gaze retain the original study; this first provider does not retarget the eyes to every host trajectory or add world collision to loose ring/lever effects. Those cosmetic limits do not alter the committed projectile.

`releaseBlendSeconds` defaults to `0.12` (supported range 0–0.5). During that interval, only the rendered casing position/orientation blends from the transformed native release pose toward the supplied current projectile point/spin. The exact supplied point is copied to `authoritativePoint`; no target, trajectory, collision, fuse, timing, AP, damage or receipt changes. `projectile:{state:'ended'}` stops the visual bridge immediately on impact. A zero blend exposes the discontinuity explicitly. This is cosmetic continuity, not a physically continuous source arc or a change in gameplay authority.

The committed core `result.presentation.trajectory` uses source `{x,y,z}` with height in `z`. UI must sample that existing trajectory under its retained presentation clock and map it to `{x:p.x,y:p.y,h:p.z}`. Do not re-run the driver's five-metre demonstration flight. The provider neither imports the headless grenade kernel nor invokes `stageGrenade`, applies its delta or interprets the opaque receipt.

## Loading and ownership

| Option | Ownership / use |
| --- | --- |
| `signal` | Cancels preparation promptly; abort after readiness also disposes the instance. Late load/paint results are retired. |
| `resolveResource(key, defaultURL)` | Optional synchronous URL resolver for `horseData`, `horsePaint`, `grenadePaint`. Keep all resources within the adopting distribution/deployment. |
| `loadJSON(url,{signal,kind})` | Optional JSON loader; defaults to fetch with the owned abort signal. `horseData` can supply the existing parsed data instead; the provider clones it before construction. |
| `loadTexture(url,{signal,kind})` | Optional loader returning a **transferred, owned** Three Texture. Default TextureLoader preparation retires its placeholder on error/abort and safely ignores late completion. A custom loader must not transfer another owner's shared texture. |
| Prop `texture` | Optional **borrowed** original grenade paint; the provider creates/owns a private sampler clone and preserves the input. |
| Native `horseTexture`, `grenadeTexture` | Optional borrowed paints; each role uses its own owned clone. The default loading path instead owns the loaded textures. |
| Native `preparePaint({renderer,worker,texture,signal})` | Optional owned paint-preparation hook returning `{material,dispose()}` (or a promise). Its disposer is synchronous. It must retire its own partial allocations if it throws and respect cancellation. The provider cleans transferred input textures and late successful results. Default preparation uses the original shader/segmentation with a guarded projection adapter. |
| Native `borrowedActor` | `{species:'horse',worker,acquireController({presentationId})}`. The synchronous acquisition returns one release function. Called only after resources are ready. The provider skips horse data/paint loading and does not replace borrowed materials. |

Default native preparation borrows the renderer, prepares the same four-view 2048×1024 projection, and restores render target, colour space, tone mapping, clear colour/alpha, viewport and scissor state even after a failed draw. Temporary ID materials, target/depth, paint masks/materials and input textures are owned and retired. There is no asynchronous timer-based paint preparation. Shader drawing failures are not allowed to leave a borrowed renderer pointed at the private target.

The default own-horse path owns geometry, rig, original auxiliary rifle/grip resources, native paint and projection, grenade geometry/materials and transferred/clone textures. A borrowed actor is controlled through a single lease: original geometry/skin attributes, equipment, local pose, parent/order and visibility are restored before releasing the controller. Source motion never disposes the actor. The host controller can then reapply current committed state. `dispose()` continues cleanup after an erroneous host release hook and reports an AggregateError; subsequent disposal is a no-op. Borrowed renderer, scene, original textures, worker geometry/skeleton and services survive normal disposal.

### Exact resource and module paths

All existing visual resources use `vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/`:

- `tactics/horse-10k-data.json`
- `assets/characters/lowpoly-proof/horse-worker-model-paint-v1.png`
- `assets/equipment/painted-ui/grenade-surface.png`
- Existing native factories/material closure: `tactics/horse-light-model.js`, `tactics/horse-model-paint.js`, `tactics/grenade-model.js` and their reviewed dependencies. They resolve the same existing Three module as `packages/render-effects/three.js`.

The generated adapter is `packages/grenade-visuals/throw-motion.js`; only its Three import is redirected, with LF normalization labelled separately from unchanged vendor bytes. `horse-balance.js` contains the original 1,841 horse rows (48,967 bytes including its generated module wrapper), rather than loading the whole twelve-animal preparation table. The reference inputs retain 626,567 original bytes under `vendor/farmyard-grenade-visuals/251bf8094b5f9ebe44208443084c1a6d6658512a/`. Their dependency ledger explicitly maps Three/MIT to the reused immutable closure; raw reference modules are not runtime entry points. Preserve [Nautilus notices](../../../NOTICE.md); provenance grants no new licence.

## Small consumers

These examples use the public compatibility entry. For the renderer-only profile, use the equivalent `@nautilus-engine/renderer/grenades/three` and its `render-effects/three` namespace. Keep one renderer package/Three namespace per scene. `hostScene`, `hostRenderer`, `committedPresentation` and `borrowedGrenadePaint` are retained host values.

```js
import {createGrenadeModel} from '@nautilus-engine/map-core/grenades/three';

const prop = await createGrenadeModel({texture: borrowedGrenadePaint});
hostScene.add(prop.root);
// The host renders its retained scene/camera.
prop.dispose(); // Borrowed paint, scene and renderer survive.
```

```js
import {createNativeGrenadePresentation} from '@nautilus-engine/map-core/grenades/three';

const controller = new AbortController();
const visual = await createNativeGrenadePresentation({
  renderer: hostRenderer,
  presentationId: committedPresentation.id,
  signal: controller.signal
});
hostScene.add(visual.root); // Keep root/scene identity for world-coordinate frames.

// The retained host chooses elapsed time and samples the committed trajectory.
visual.seek({elapsedSeconds: 0, actor: {x:0,y:0,h:0,headingRad:0}, projectile:null});
visual.seek({elapsedSeconds: 1.92, actor: {x:0,y:0,h:0,headingRad:0},
  projectile: {state:'flying',x:0,y:0,h:1.1}});
visual.seek({elapsedSeconds: 2.1, actor: {x:0,y:0,h:0,headingRad:0},
  projectile: {state:'ended'}}); // Accepted impact ends the cosmetic projectile.
visual.dispose(); // Or abort the controller on cancellation/replacement.
```

Borrowing the existing native horse instead of creating another actor:

```js
const visual = await createNativeGrenadePresentation({
  presentationId: committedPresentation.id,
  borrowedActor: {
    species: 'horse', worker: existingHorseWorker,
    acquireController() {
      retainedLocomotion.suspend();
      return () => retainedLocomotion.resumeFromCommittedState();
    }
  }
});
// Add visual.root, seek committed frames, then dispose before another controller
// takes ownership. The actor's former parent/equipment/skin are restored.
visual.dispose();
```

## Acceptance and remaining work

- [x] Reuse the original prop/paint/horse at unit scale, measured markers and original source inputs; no extra Three/game dependency.
- [x] Keep prop-only discovery/loading independent from horse art, projection and throw modules.
- [x] Exercise native grip, repeated/backward seeks, one casing and cosmetic release continuity with the authoritative point unchanged.
- [x] Verify root-local coordinates through a transformed retained parent and elevated/quarter-turned actor; restore sibling order.
- [x] Verify owned/borrowed cleanup, multiple instances, failed/late loads, initial/active abort, failed source setup and late paint completion.
- [x] Exercise the real native paint construction path with a renderer-state test double, including failed projection cleanup. This is lifecycle/shader construction evidence, not rendered-pixel acceptance.
- [ ] Root register the optional public export, source/upstream/distribution resources and item catalogue/card; run offline installed-package checks. This branch makes no shared metadata edits.
- [ ] UI bind the fixed grenade core presentation and this provider in the actual reference view with desktop/phone controls.
- [ ] Artist compare native painted phase captures, transformed/elevated independent instances, release bridge/ended projectile, actual paint loading failures and cancellation/reopen.
- [ ] Combined host save/reload preserves authoritative receipts and spent/injured state without replaying presentation, costs, damage, events or sound. The source grenade profile saves no transient clip. A consumer that deliberately resumes a pose must separately persist its clip identity/time, validate it and use seek without replaying authority. The provider owns no game save.
- [ ] Architect record exact combined pins, CI/browser results, budgets/limits and cleanup before release; games adopt separately.

Focused tests are [grenade-visuals.test.mjs](https://github.com/Syntaxswine/nautilus-engine/blob/2b7d57dcd45a30d5b02a1ac357d559fedb35b854/tests/grenade-visuals.test.mjs). [Candidate check evidence](https://github.com/Syntaxswine/nautilus-engine/blob/2b7d57dcd45a30d5b02a1ac357d559fedb35b854/docs/reviews/grenade-presentation/provider-checks.json) records local gates and source hashes. No preview helper is needed for this coding checkpoint; UI's integrated browser proof and artist review follow a fixed candidate.

**Accuracy:** prefer the original native art/IK and measured hand/feet to scaled replacement models. The 0.12 s blend is explicitly cosmetic; source flight/collision remains authoritative. Measured action clearance is larger than unarmed standing and remains a selected game/query policy.

**Efficiency:** prop-only consumers avoid horse/data/projection/motion loads. The optional throw uses one shared Three, 41,285 adapter bytes and 48,967 horse-balance bytes before compression; these are measured source files, not installed/GPU/frame-time budgets. Runtime/device/render counters await the combined reference view.

**Narrative:** preserve painterly grenade/horse, pin pull, planting and follow-through for the Farmyard/AFT proof. Future games can borrow the prop alone or select an explicit simpler presentation. No character redesign, damage policy or game story is imported.
