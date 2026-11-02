# Pure tile authoring Core

The optional `./tiles/authoring` entry supplies C1 rectangle-first authoring values and bounded pure plans. It preserves the exact432 command/operation/query/pin/pack grammar; transitive Artwork has the accepted mandatory imageView. It does not change portable maps, default schema/capability registries, game pins or saved legacy namespaces. New full documents are `nautilus-tile-workbench-document@3`, with all six complete B1 fields plus contentRevision, one AuthoringModule and typed resourceRefs.

## Smallest working producer

```js
import * as tiles from '@nautilus-engine/core/tiles';
import {createRectangleDefinition} from '@nautilus-engine/core/tiles/authoring';
const {definition,pin}=createRectangleDefinition(tiles,{
  identity:{id:'paving',revision:1,recipeId:'paving.recipe.1'},
  sourceIds:{prefix:'paving.source',surfaceId:'paving.top',gridId:'paving.grid'},
  widthM:8,depthM:4,finishId:'skin.stone-flags'
});
console.log(definition.body.recipe.anchors,pin);
```

This constructs data; it neither places a tile nor authorizes a write. IDs are caller-supplied. The shared public surfaceRecipe helper builds original four-line geometry with sixteen boundary segments, zero local base, .12m thickness and paint.paving boundary material. Finish changes only interior.skinId; variantSeed defaults17. The source prefix is independent of recipe/definition identity, so clone/revise preserves original anchors. Surface origin is[0,0,0], native XY basis, up[0,0,1], one-metre authored grid. There is no inferred world floor or physical/rendered slab-top claim. The full original source notice is retained; caller notices append.

A derived producer accepts `{identity:{id,revision,recipeId},base,edits,additionalNotices}`. A fresh identity/revision1 is a clone and preserves all source except explicit label and recipe ID. Same identity requires exact next revision and a fresh recipe ID; only explicit supported rectangle dimension/finish/seed/label edits change. Omitted edits inherit the base. Unsupported resizing refuses rather than fitting/dropping controls. Definition Pin hashes the whole record WITHOUT contentDigest, not compileTileRecipe's raw-recipe digest. `sealTileContentRecord(tiles,record)` seals definition/preset records and verifies any supplied digest instead of repairing it.

## Host connection and commands

`planTileAuthoring(tiles,{document,command,context,limits?})` accepts the complete v3 document, exact canonical Command (object or strict JSON text) and a captured plain AuthoringContext. It returns a structured refusal or committable:false plan. Context includes actual host/journal/context/profile/resource/ledger digests, explicit available profiles/finish IDs, exact resourceBindings and aggregate allocation charges. These are captured host data, not caller-granted authority.

A command contains requestId, exact Expected, finite operations[] and the frozen budget profile. Six kinds are implemented: recipe.create/clone/revise, preset.save/place and placement.upgrade. Clone/revise/preset library edits never update placements. C1 presets have empty graphic defaults. Placement specifies complete IDs, pose, native floor, original anchor subsets and lock. Explicit upgrade checks exact from/to pins, every selected lock and anchor-list decision, clears only that changed owner's now-inapplicable preset pin, and preserves the preset and other owners. C2 decoration reanchor/delete/default copying is unavailable. No alias command/asset/Pin parser exists.

One command stages operations in order, then returns source-unchanged or ONE ordinary public-v1 repair request plus complete constraints and staged data. Existing planTileStack owns rectangular old/new spatial/semantic closure and stronger crossing obligations; public tiles owns matching. Core NEVER calls prepareTileStack/prepareTileRepair or creates a retained consumer. Possible unsupported neighbouring shapes still refuse; tags/heights cannot hide dependencies.

The Editor calls its actual retained consumer.prepare exactly once for geometry, then `bindTileAuthoringTarget(tiles,{before,plan,prepared})`. For source-unchanged it passes prepared:null, skips geometry/view allocation and uses the same authority/journal/history. Binder rederives the pure request and complete constraints from the canonical operations under the same charged budget, without preparing again. Binder returns a complete targetDocument, exact source/target bindings, fingerprints and charged costs; it verifies DATA, not actual handle ownership. Editor must retain the actual same-connection handle/review, recheck current authority/context/resources and perform the sole guarded write. Serialized plans/reviews are not capabilities.

Metadata advances contentRevision once without changing layout revision or allocating a new view. Geometry advances layout revision only through the real public preparation. Whole-document Undo/Redo restores historical contentRevision and resources; full checkpoint/journal token supplies freshness. NO_CHANGE makes no write/history entry or lost redo. A display error/debt is never cleared by metadata. Unknown committed:null freezes mutation and retains possibly adopted resources until same-ID recovery. This package supplies no journal, service, CLI binary or recovery owner.

Authoring Expected.floorProfileDigest hashes the FULL floorBinding. The nested stackBinding.floorProfileDigest hashes its reduced geometric floor profile. Never substitute one domain for the other. Original sourceJSON, floor provenance, finish binding, template references, extensions, original/unused recipes and immutable records are preserved exactly. Resources have one immutable library authority and typed descriptor refs; encoded bytes/leases stage outside commands through host ports.

## Bounds and first profile

New placed geometry is a local zero-base, unclipped four-line axis-aligned level rectangle, dimensions .1â€“64m, one conservative explicit reservation/floor slot and bound finish. All supported D4 poses remain explicit. Paths/fields/holes/grades and unsupported required profiles return actionable refusals. inspectTileAuthoringRequirements follows exact preset dependencies and reports unavailable C1 profiles and C2 graphics explicitly. Current path route is single-owner and is not repeated to fake an atomic multi-owner placement.

Limits:1MB command,4MB source/output,6MB aggregate input,200k plain-data nodes/depth32,1M deterministic work units,1024 operations,32 owners/map recipes including unused entries,128 definitions/presets. Reading/validation/hashing/closure/source samples/copies/output work is charged before bounded steps; hash/serialization blocks are64bytes. Only per-call exact immutable-hash validation is deduplicated. No cross-call mutable validation cache exists.

Captured appearance totals preserve8 layers/4096 saved marks per chunk/1024 resident marks/32MiB decoded allocations with copies charged/2 roots/50k triangles/1024 cells/8 contributors per bin/32768 references/4MiB buffers/4 pages/ONE64 owned-material total including finishes and compositor. These are unmeasured refusal bounds. Pure Core does not attest GPU cleanup or acquire/dispose anything; Editor must reserve prospective allocations before creating a review and keep unverified retirement charged.

## Adoption checklist

1. Bind actual public tiles, a full v3 snapshot, original source/floor/finish identities and real host resource/ledger context.
2. Use the same producers/commands for UI and agents; do not reconstruct digests or anchors in adapters.
3. Prepare geometry once through Editor; bind the complete returned target. Verify metadata geometry/appearance equality against the actual accepted view without restamping.
4. Commit through the existing Editor authority/history. Preserve exact whole-document Undo/Redo and same-ID uncertain recovery.
5. Run `npm run test:tiles:authoring`: ordinary core tarball, offline external install, public imports and actual producerâ†’create/clone/reviseâ†’presetâ†’place twoâ†’upgrade one. Node test hosts are not proof of production UI/renderer/game adoption.

The provisional choice favours accuracy through exact source/pins/native floors, efficiency through one preparation and sparse metadata (code-based estimate; no timings promised), and authoring meaning through independent placements and explicit upgrades. Renderer/decoder/clipping/game integration and C2 remain separately reviewed work.
