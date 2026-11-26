# Fantasy equipment art — usage card and guide

Original Nautilus art, API/content **v1**, status **review candidate**. Built at engine base `796c1e73644a30a3061d2f38b3bcccab49519453`. The fixed delivery commit is recorded in the artist's handoff. This source candidate has no public export or distribution registration yet: the authorized Coder owns that combined integration and its installed-package proof.

The component supplies 15 native 3D models, descriptive metadata, grip anchors and ranged articulation. Its dependency closure is five local JavaScript modules: `catalogue.js`, `specs.js`, `geometry.js`, `three.js`, `paint-data.js`, plus this guide. `three.js` borrows the host's Three namespace; it imports no renderer, actor, editor, gameplay or donor module. Headless metadata requires no DOM, storage, filesystem, clock or Three. The browser reference is [viewer.html](../../tools/fantasy-equipment-art/viewer.html). [Provenance](../../assets/fantasy-equipment/provenance.json) and the [exact painting prompt](../../assets/fantasy-equipment/source/paint-prompt.json) accompany the source.

Adjacent `catalogue.d.ts` and `three.d.ts` describe this same API. Keep both with their `.js` entries when registering the public exports. The declarations need only ES libraries, with no DOM or `@types/three` dependency. The generic renderer preserves the supplied namespace's full Group/Object3D types, including socket methods. Literal IDs constrain finishes, static/ranged pose inputs and available socket names. Runtime still checks finite draw bounds, plain objects, unknown fields and actual host methods. [The strict type consumer](../../tools/fantasy-equipment-art/types-proof.ts) exercises the declarations with a borrowed namespace and negative controls.

## Required connections and smallest consumer

Supply an existing Three namespace (tested with Nautilus Three r180), a retained host scene or hand attachment, and confirmed game-owned pose values. No image wait, fetch, extra Three instance or renderer allocation occurs. The original brush atlas is synchronously decoded into one owned 512×512 RGBA DataTexture per instance. Missing Three methods, unknown IDs/finishes and unsupported poses produce `EQUIPMENT_*` errors before an accepted model changes.

```js
// In this source checkout; Coder assigns public package exports at integration.
import {fantasyEquipmentArt} from './packages/fantasy-equipment-art/catalogue.js';
import {createFantasyEquipmentModel} from './packages/fantasy-equipment-art/three.js';

// THREE and rightHand are retained host services, supplied by the game.
const spec = fantasyEquipmentArt('bow');
const view = createFantasyEquipmentModel(THREE, {id: spec.id});
view.setArticulation({draw: 0.65, loaded: true}); // validated detached preview

// All main grips are the origin, identity orientation, scale 1.
// The host first chooses the hand's orientation to point model +Z at its aim.
rightHand.add(view.root); // host acceptance/attachment boundary
// Following a confirmed host update, including a saved mid-draw restore:
view.setArticulation({draw: confirmedEquipment.draw,
                      loaded: confirmedEquipment.loaded});

// Stable moving marker; it never spawns or launches an authoritative projectile.
const arrowTip = view.sockets['projectile.tip'];
const tipWorld = arrowTip.getWorldPosition(new THREE.Vector3());
// ...render with the game's existing renderer...
view.dispose(); // detach only this model; keep rightHand/scene/renderer alive
```

Call `listFantasyEquipmentArt()` for detached catalogue records and `fantasyEquipmentArt(id)` for one. `createFantasyEquipmentModel(THREE,{id,finish?})` returns `{root,sockets,setArticulation,dispose}` synchronously. Construction starts detached. Allocation failure retires every acquired resource before reporting failure. There are no notification callbacks or asynchronous late completions. The host serializes its own accepted view replacement and owns input, clocks and game persistence.

## Native space and semantic anchors

All dimensions are **metres**, native scale **1**, up **+Y**, right **+X**, front **+Z**. A long handheld weapon extends along **+Y**. Shield fronts face +Z; bow/crossbow arrows and bolts point +Z. Main grasp is `[0,0,0]` for every item. The kit is calibrated against the existing unscaled **1.649517536 m goat worker**, with one-metre ground grid evidence. The 2.12 m floor interval is not an object scaling factor.

`bounds:{min,max}` is a conservative root-local visual envelope across all draw states, including the loaded projectile; ranged bounds have 2 mm continuous-pose padding. `restBounds` measures the default visible model, with its unloaded projectile excluded. These fields grant no physical collision, support, reach, blocking or hit policy. `resources.byFinish` supplies exact geometry/material budgets for each finish; `resources.triangles` includes the allocated hidden projectile geometry.

`grip.main/off` is `{position:[x,y,z],quaternion:[x,y,z,w],socket,moves}`. Off grip is `null` for one-handed blades/tools, a second shaft grasp on two-handed forms, the string nock on the bow and the fore-end support on the crossbow. Shields expose both main and off names at the same centre grasp; the host chooses the holding hand. All socket quaternions are identity, including moving markers: they describe model axes, not a surface-normal or limb-tangent frame. The host aligns its actual wrist/pose provider explicitly.

`sockets` returned by the renderer is a plain named object of stable `Object3D` anchors, not a Map. Names exactly match each metadata `sockets[].id`. Every model has `grip.main`; applicable models have `grip.off`. Descriptive `edge`, `tip`, `poll`, `face.left/right`, `head`, `hook`, `butt`, `face/back` or `aim` anchors identify meaningful regions. The catalogue `parts` lists authored semantic construction; material batching does not promise one mesh per semantic part.

| Model | Off grip, metres | Additional moving sockets |
| --- | --- | --- |
| pick | `[0,0.30,0]` | none |
| blacksmith-hammer | `[0,0.32,0]` | none |
| spear | `[0,0.42,0]` | none |
| halberd | `[0,0.44,0]` | none |
| bow | `[0,0.11,-0.15-0.43*draw]` | `limb.upper`, `limb.lower`, `string.nock`, `projectile.nock`, `projectile.tip`, `grip.off` |
| crossbow | `[0,0.105,0.32]` | `limb.left`, `limb.right`, `string.nock`, `projectile.nock`, `projectile.tip` |
| four shields | `[0,0,0]` | none |

Bow projectile/nock Y is 0.11 m, above the wrap through an actual riser shelf cutout. Arrow length is 0.72 m. Crossbow nock is `[0,0.18,0.415-0.255*draw]`; bolt length is 0.58 m. The crossbow's solid stock, split rail and split prod clamp leave a centre track for the bolt. Shields have rear standoffs, grasp bars and braces; larger shields add arm padding and straps. Round shield's protrusion is a shallow boss. Badge relief is a shallow original rising sun/chevron. Clear riot material is alpha-blended tinted polycarbonate appearance; `opaque` retains a real transparent viewing band. This is a visual material, without refraction, breakage or ballistic claims.

## Supported articulation, state and retirement

Bow and crossbow accept plain-object partial patches `{draw?,loaded?}`. Draw must be a finite number in **0..1**; loaded must be a boolean. Defaults are `{draw:0,loaded:false}`. Every combination is supported, including `draw>0,loaded:false`. Loaded controls projectile visibility only; empty drawing/dry-fire policy belongs to gameplay. Mesh nodes, anchors, geometries and native position buffers remain stable across draws. Limbs bend and retract, string segments follow endpoints/nock, and the retained projectile translates with its nock. No release event, hit, resource debit or projectile simulation is emitted.

Static items accept only `{}`. Unsupported fields, non-plain values, unknown IDs and undeclared finishes reject explicitly. Rejected patches preserve the prior pose. `setArticulation` returns the accepted visual pose, or `{}` for static items. Do not add damage types or action modes to this API; the Coder's authoritative definition owns exact physical types `blunt`, `piercing`, `slash`, mixed modes, reach, eligibility and costs.

Art owns no durable save schema. A host saves its own model ID, finish and complete validated confirmed pose, stages a new instance, restores the pose, and only then replaces the accepted view. Reapplying pose has no one-shot effects. No migration, timing or inventory interpretation is inferred from an art checkpoint.

`dispose()` is terminal/idempotent, hides and detaches the root before observer notifications, drains all owned geometry/material/texture releases, and reports observer failures together as `AggregateError`. Actual native disposal listeners are each visited once even if another throws or re-enters. Host-added children/material replacements and neighbouring instances are not traversed for disposal. The host still owns its scene, renderer, shared namespace, camera, hand and action state. Post-retirement articulation refuses. Callers should retire through this handle rather than mutate/dispose owned internals independently.

## Finish choices and resource envelope

All models support `standard`. Round shield also supports `teal`; badge also supports `red`; riot shield also supports `opaque`. Unknown values reject. The geometry is authored directly at delivery resolution using bevelled sections, curved laminates and purposeful fittings. Wood grain, paint, forged brushwork and leather colour come from the original skin. No dense sculpt or reduction ratio is claimed for this tranche.

Standard models use **756–3,636 triangles**, **4–14 material/part mesh batches**, **4–6 materials**, and **one 512-square texture** each. A texture holds 1,048,576 RGBA bytes (about 1.33 MiB with mip levels); encoded source is shared while instance pixels and native resources are independently owned. Double-sided transparent glass may render in two passes; mesh-batch counts are not a guarantee of draw-call count. Articulation recomputes small deterministic CPU arrays and updates retained GPU attributes. It is not a skeletal physics simulation. Exact per-ID counts and live renderer evidence are in [the review](../../docs/reviews/fantasy-equipment/art/README.md).

Accuracy: deliberate bevels, tool eyes, draw tracks and connected back grips improve readable functional construction; this is a code/visual assessment, not engineering certification. Efficiency: batching static material pieces and retaining draw buffers bounds allocations; actual live resource counts are measured in the browser proof, frame-time improvements are unmeasured. Narrative: a shared warm painted palette preserves the Nautilus character/vehicle feel while shield finishes support different factions. Preferred use is tactical third-person equipment at native scale; production games select their own wrist poses and rules.

## Acceptance checklist

- [x] Headless metadata and renderer-local dependency closure; source guide/example/provenance included. Public registry/installed-package wiring remains the Coder's combined deliverable.
- [x] Closed IDs/finishes, explicit units/axes/grips/semantic markers and unsupported pose errors.
- [x] Native goat comparison, contact sheet, individual close views, all shield fronts/backs and loaded draw-state evidence.
- [x] Static/articulated states, 41 live draw samples, bad IDs/poses, partial pose restore and two instances.
- [x] Native resource retirement, repeated disposal, throwing/reentrant observers and allocation rollback; borrowed resources survive.
- [x] Focused art tests and actual source browser review; helper close receipts and native process/port verification.
- [ ] Coder/Architect: register the public component, import this fixed reviewed commit, prove native held poses and installed distribution, then run combined four gates. Consumer pins and publication need their separate authorized integration.

Reproduce with `node --test tests/fantasy-equipment-art.test.mjs`, `node tools/fantasy-equipment-art/review.mjs`, and `node tools/fantasy-equipment-art/verify-browser.mjs`. Browser tools use the existing bounded hidden review helper and shut down in `finally`; they retain no preview service. Repack the original brush source with `node tools/fantasy-equipment-art/bake-paint.mjs` (Sharp authoring dependency).

Check adjacent declarations with `node tools/fantasy-equipment-art/validate-types.mjs --typescript /path/to/typescript/lib/tsc.js`. This uses strict NodeNext resolution and ES2023 without DOM, writes `types-proof.json` and emits no JavaScript. The declaration follow-up preserves all accepted runtime, geometry, paint and review-image bytes from `654f648e8936376358cf57e5733db0a2dad3b760`.
