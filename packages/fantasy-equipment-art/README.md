# Fantasy equipment art — usage card and guide

Original Nautilus art, public API/schema **v1**, **painted-v2 art revision candidate**. Built on reviewed integrated baseline `5d19e6198b25e14ef98caf8dbad04ba739f96506`. Existing public entries are `/fantasy-equipment-art` and `/fantasy-equipment-art/three`. This art-only successor awaits the Coder's bounded resource/package registration and installed proof after visual acceptance; the existing consumer pins remain unchanged.

The component supplies 15 native 3D models, descriptive metadata, grip anchors and ranged articulation. Its local runtime closure is six JavaScript modules: `catalogue.js`, `specs.js`, `geometry.js`, `three.js`, `paint-data.js`, `paint-layout.js`, plus this guide/declarations. `three.js` borrows the host's Three namespace; it imports no renderer, actor, editor, gameplay or donor module. Headless metadata requires no DOM, storage, filesystem, clock or Three. The current [source viewer](../../tools/fantasy-equipment-art/painted-v2/viewer.html), [provenance](../../assets/fantasy-equipment/painted-v2/provenance.json) and [masters/prompts/UV sources](../../assets/fantasy-equipment/painted-v2/README.md) accompany the source. Historical first-pass ledgers/masters remain preserved.

Adjacent `catalogue.d.ts` and `three.d.ts` describe this same API. Keep both with their `.js` entries when registering the public exports. The declarations need only ES libraries, with no DOM or `@types/three` dependency. The generic renderer preserves the supplied namespace's full Group/Object3D types, including socket methods. Literal IDs constrain finishes, static/ranged pose inputs and available socket names. Runtime still checks finite draw bounds, plain objects, unknown fields and actual host methods. [The strict type consumer](../../tools/fantasy-equipment-art/types-proof.ts) exercises the declarations with a borrowed namespace and negative controls.

## Required connections and smallest consumer

Supply an existing Three namespace (tested with Nautilus Three r180), a retained host scene or hand attachment, and confirmed game-owned pose values. No image wait, fetch, extra Three instance or renderer allocation occurs. A dedicated model/finish skin is synchronously decoded into one owned 512×512 RGBA DataTexture per instance. There are 18 unique packed pages; instances do not pool textures or retained pixel arrays. Missing Three methods, unknown IDs/finishes and unsupported poses produce `EQUIPMENT_*` errors before an accepted model changes.

```js
// Existing public entries, pinned to the accepted successor after integration.
import {fantasyEquipmentArt} from '@nautilus-engine/map-core/fantasy-equipment-art';
import {createFantasyEquipmentModel} from '@nautilus-engine/map-core/fantasy-equipment-art/three';

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

Bow projectile/nock Y is 0.11 m, above the wrap through an actual riser shelf cutout. Arrow length is 0.72 m. Crossbow nock is `[0,0.18,0.415-0.255*draw]`; bolt length is 0.58 m. The crossbow's solid stock, split rail and split prod clamp leave a centre track for the bolt. Shields retain rear standoffs/grasp bars, arm padding and functional straps. Round shield retains a shallow boss. Board joints/braces, nail heads, wrap ridges, stitchwork, fullers and badge sun/chevron are now entirely paint. Semantic `parts` IDs still name those painted features; they do not imply extra meshes. Clear riot skin has translucent alpha and painted opaque fasteners; `opaque` retains a real viewing band. This is visual material, without refraction, breakage or ballistic claims.

## Supported articulation, state and retirement

Bow and crossbow accept plain-object partial patches `{draw?,loaded?}`. Draw must be a finite number in **0..1**; loaded must be a boolean. Defaults are `{draw:0,loaded:false}`. Every combination is supported, including `draw>0,loaded:false`. Loaded controls projectile visibility only; empty drawing/dry-fire policy belongs to gameplay. Mesh nodes, anchors, geometries and native position buffers remain stable across draws. Limbs bend and retract, string segments follow endpoints/nock, and the retained projectile translates with its nock. No release event, hit, resource debit or projectile simulation is emitted.

Static items accept only `{}`. Unsupported fields, non-plain values, unknown IDs and undeclared finishes reject explicitly. Rejected patches preserve the prior pose. `setArticulation` returns the accepted visual pose, or `{}` for static items. Do not add damage types or action modes to this API; the Coder's authoritative definition owns exact physical types `blunt`, `piercing`, `slash`, mixed modes, reach, eligibility and costs.

Art owns no durable save schema. A host saves its own model ID, finish and complete validated confirmed pose, stages a new instance, restores the pose, and only then replaces the accepted view. Reapplying pose has no one-shot effects. No migration, timing or inventory interpretation is inferred from an art checkpoint.

`dispose()` is terminal/idempotent, hides and detaches the root before observer notifications, drains all owned geometry/material/texture releases, and reports observer failures together as `AggregateError`. Actual native disposal listeners are each visited once even if another throws or re-enters. Host-added children/material replacements and neighbouring instances are not traversed for disposal. The host still owns its scene, renderer, shared namespace, camera, hand and action state. Post-retirement articulation refuses. Callers should retire through this handle rather than mutate/dispose owned internals independently.

## Finish choices and resource envelope

All models support `standard`. Round shield also supports `teal`; badge also supports `red`; riot shield also supports `opaque`. Unknown values reject. Geometry carries outer form, blade/head depth, major guards/bosses, apertures, functional grasps and ranged moving parts. Dedicated front/back/head/shaft/grip/fitting islands carry original painted detail. The gold emblem has no decorative mesh. The round/tower body is continuous geometry with painted boards. Bevel highlights, recessed grooves, fasteners, edge wear and wraps are placed by the UV sources. No dense sculpt or reduction ratio is claimed.

Standard models use **152–1,324 triangles**, **3–13 material/part mesh batches**, **3–6 materials**, and **one 512-square texture** each. A texture holds 1,048,576 RGBA bytes (about 1.33 MiB with mip levels). The standard roster falls from 24,142 to 7,050 triangles and 88 to 73 batches. Dedicated painted pages increase embedded source from 699,865 to 3,459,139 bytes (gzip 249,685 to 2,413,233 bytes). This is a measured storage tradeoff for 18 distinct skins; per-instance texture bytes stay unchanged. Double-sided transparent glass may render in two passes; batch counts are not draw-call guarantees. Small deterministic CPU arrays update retained GPU attributes during draw. Exact counts and live resource evidence are in [the painted revision review](../../docs/reviews/fantasy-equipment/art/painted-v2/README.md).

Accuracy: functional depth, native grip paths and moving geometry are preserved; small relief is now a painted visual approximation. Efficiency: measured triangle/batch counts fall while encoded art storage grows; no FPS improvement is claimed. Narrative: dedicated warm brushwork matches the native actors/vehicles and reads more coherently than physically repeated tiny detail (visual judgment). Prefer this treatment for Nautilus tactical equipment. Existing standard-material settings have restrained metallic response so painted highlights carry the finish; there is no new shader, pooling service, physics or ballistics work.

## Acceptance checklist

- [x] Headless metadata and renderer-local dependency closure; source guide/example/provenance included. Public registry/installed-package wiring remains the Coder's combined deliverable.
- [x] Closed IDs/finishes, explicit units/axes/grips/semantic markers and unsupported pose errors.
- [x] Native goat comparison, contact sheet, individual close views, all shield fronts/backs and loaded draw-state evidence.
- [x] Static/articulated states, 190 fixed-baseline marker samples and 164 live draw/load states, bad IDs/poses, partial pose restore and two instances.
- [x] Native resource retirement, repeated disposal, throwing/reentrant observers and allocation rollback; borrowed resources survive.
- [x] Focused art tests and actual source browser review; helper close receipts and native process/port verification.
- [ ] Coder/Architect: accept the fixed art successor, add `paint-layout.js` and the current painted-v2 provenance/notice to package closure, update art registration deliberately, prove installed distribution and run the combined four gates. Consumer pins and publication remain separate.

Reproduce with `node --test tests/fantasy-equipment-art.test.mjs tests/fantasy-equipment-painted-v2.test.mjs`, `node tools/fantasy-equipment-art/painted-v2/review.mjs` and `node tools/fantasy-equipment-art/painted-v2/verify-browser.mjs`. Browser tools use the existing bounded hidden helper and shut down in `finally`; no preview is retained. `node tools/fantasy-equipment-art/painted-v2/measure.mjs` reads fixed baseline Git objects without touching other worktrees. Repack with `node tools/fantasy-equipment-art/painted-v2/bake.mjs` (Sharp authoring dependency).

Adjacent declarations remain byte-identical to the integrated baseline; the factory/state/ownership contract is unchanged. The historical type proof remains preserved; public/installed type wiring is the Coder's successor integration responsibility.
