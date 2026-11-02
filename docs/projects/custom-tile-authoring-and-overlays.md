# Custom tile workbench and local overlays

Status: C1 rectangle custom-tile authoring is [accepted](../reviews/tile-authoring/architect/c1-editor-integration.md), 2026-11-02. [Stacked authoring](tile-stack-authoring.md) is accepted on main at `d869410625b246cfff2b51089e7878c31951775c` through PR #32. The [accepted contract decisions](../reviews/tile-authoring/architect/c0-decisions.md) govern this work. Users and agents can create, clone and revise rectangle definitions, save immutable presets, place independent copies and explicitly upgrade a selected copy. Curves remain available in the older supported Smart Tile workspace; C1 does not claim a general custom geometry editor. C2 overlays remain a separate review and integration gate; private candidates do not grant editor, package or game adoption. The remaining text records the larger target and its acceptance requirements.

## Intended authoring experience

Users can make their own tiles in the editor: start from a supported primitive or duplicate a reviewed recipe, edit dimensions/curve controls/finish/connections, name and version the result, save it to a personal/project library, and stamp it into another map. The first geometry grammar is the actual supported public-v1 field/region/level-path set. Unsupported clipping, solids, grades or intersections stay explicit refusals until a reviewed provider supports them. A custom tile is editable authored source, not a screenshot or an opaque mesh.

Agents must be able to perform the same work through a documented, machine-readable authoring API and a headless JSON/CLI path. They do not need screen coordinates or private editor internals. Human tools and agent commands use the same validators, preview/prepare path, permissions, source/context checks and authoritative commit/history. An agent with authorization to apply an edit uses that path directly; no second journal or synthetic button-click adapter is needed.

Every supported local tile surface can have its base appearance plus an optional transparent overlay channel. Sparse decorations include blood, scorch, leaf litter, flat plant graphics, road arrows/lines/numbers, grime and special textures. A clean surface has an empty channel and needs no per-cell texture allocation. The channel should allow a bounded ordered stack of marks, rather than forcing one new mark to erase another. Initial profiles, storage and rendering budgets are explicit and independently validated.

Decorations belong to the selected placement by default. Painting one instance does not mutate every user of its recipe. An explicit **save as tile preset** action may capture chosen decoration defaults for future stamps. Updating a preset does not silently update placed copies, overwrite their local marks or bypass locks.

## Three distinct operations

| Intent | Saved authority | What it may change |
| --- | --- | --- |
| Create/revise a reusable tile | Immutable recipe/preset identity, version and content digest, with complete original controls | A new definition; existing placed versions remain pinned until an explicit selected-instance update |
| Add/remove/edit a surface graphic | Versioned decoration source tied to one owner/surface/floor, with fixed artwork references | Appearance on the named surface; collision, height, support and navigation stay unchanged |
| Make a physical crater or place a 3D plant | A separately supported geometry/prop/component command and its declared services | Real geometry/obstacles only when those providers and their transactional updates are bound |

A crater graphic may show an apparent depression; it does not lower terrain. A flat plant graphic is decoration; it does not become a 3D plant or obstruction. Visual blood/scorch does not award damage, ignite material or spend an action again. A game can request a decoration after its own confirmed event through a consumer adapter. Physical and gameplay effects need their own capabilities and proofs.

## Recipe workbench and portable content

The workbench exposes supported shape controls, metre dimensions, native floor/profile requirements, original anchors, deterministic seed/detail and explicit connection presets. Connection presets carry the actual canonical border, floor/channel/layer, material/normal/UV and transform rules. Users may edit permitted fields with live diagnostics; a label or a painted edge cannot manufacture a matching port. Optional grid snapping affects a proposed control only, never silently normalizes loaded source.

Definitions are immutable versions. Changing one used by multiple placements creates a new version or a copy; applying it to existing owners is a separate explicit operation. Keep old referenced versions, complete source, locks and dependencies. Do not prune referenced definitions, refit curves from samples or let agent updates mutate a shared recipe behind another owner.

Portable tile content needs a versioned manifest containing complete canonical recipe data, preset/default-decoration definitions, required feature/resource references and source/license notices. Reuse the existing strict v1 recipe/bundle grammar where supported; overlays or editor-library rules do not become unrecognized `interior` fields or functional `extensions`. Their new typed documents have separate schemas and explicit compatibility handling.

Artwork references identify immutable content by ID/version/hash and declared type/dimensions. The initial custom raster profile should support bounded PNG/WebP RGBA assets; other formats require an explicit reviewed path. Portable files cannot depend on a sibling checkout, an absolute path or a moving URL. Normal saves pin required resources; a portable export includes the resource bytes or a complete content pack that can be independently reopened. A preview thumbnail is derived and never replaces the recipe.

Image decode, storage and rendering are borrowed host services. Pure authoring/validation remains usable in Node. Resource preparation can acquire immutable blobs before commit, but reference adoption belongs to the same authoritative document operation. Unknown commit outcome must retain potentially committed resources until same-ID reconciliation; cleanup cannot delete assets that may now belong to the accepted save.

## Stable local targeting

One authored tile can span many derived cells, and cell windows/LOD/meshes can change. Persisted marks must never target a transient triangle index, GPU instance index, chunk address or derived cell enumeration.

The first anchor profile is an explicit stable owner ID, semantic surface ID and floor ID, plus owner-local metre coordinates and a declared rotation/size. The supported profile also defines the source surface/grid frame. Per-local-cell painting stores an authored grid origin/cell size/version and integer cell coordinates or an equivalent stable bounded mask. That authored grid is independent of derived sampling. Raycast/derived-cell hits are converted to that source anchor before proposing an edit.

Marks normally follow their owner under a supported placement/D4 transform. World-fixed marking, path-parameter anchors, walls, roofs and other surface frames require explicit profiles rather than coordinate guesses. Re-tessellation, LOD, streaming and whole-owner finish changes preserve the same decoration source and visual position. Floor identity prevents paint from appearing on another overlapping storey.

The provider clips graphics to the actual target surface, holes and selected local mask. A stamp may extend beyond a cell/owner before clipping without painting neighbours or another floor. A geometric edit that orphans an anchor requires a preserving refusal or an explicit reanchor/delete decision in the same transaction. Never silently drop, stretch or transfer a mark. Copy/paste/stamping produces fresh instance IDs with deterministic reference remapping; deletion and Undo/Redo restore the whole dependency set.

An explicitly selected multi-tile stroke may target several owners on one declared floor. It creates a bounded group of local records with a shared graphic phase/group identity and one atomic command, so a road marking can cross a seam continuously. Targets and lock handling are visible in preview; a locked target cannot be silently omitted. This is distinct from an accidental projection onto neighbours or another floor.

## Overlay appearance and costs

Base finish and decoration appearance remain independent from physical boundary material. The overlay cannot modify canonical positions, normals, connection tangents, source border profiles or matching rules. A colour/alpha overlay and a repeating detail/mask texture are useful initial forms. Extra material channels, animated effects, arbitrary blend modes, wrapped 3D decals and physical displacement are separate explicit capabilities.

For the first flat-surface profile, prefer evaluating overlays on the owning surface or another method that clips to that surface reliably. Compare material compositing, atlas/instance batching and clipped decal geometry before choosing a provider. Avoid z-fighting, cross-floor projection and one material/texture/draw call per cell. Preserve borrowed Three/material/atlas ownership and count every newly acquired, candidate and unverified retiring allocation.

Initial **proposed**, not measured or registered, reference ceilings are eight ordered layers per surface, 4,096 stored marks per authoring chunk, 1,024 aggregate resident marks across accepted/candidate/acquiring/retiring views, and 32 MiB of unique additional decoded artwork residency. Geometry still shares the existing total triangle/root limits. A 480-cell fifteen-floor fixture should support one local mark on every cell with accepted plus candidate accounted together. Budgets are refined against representative PC/phone evidence before acceptance; increasing them silently or allocating a blank image for every cell is unacceptable.

Use shared atlases/immutable asset identities and sparse records where suitable. Missing resources or unsupported blend/anchor profiles produce actionable diagnostics before adoption. Optional read-only fallback must preserve data and report missing presentation; it cannot masquerade as a successfully reviewed complete authoring result. Static editor marks persist until explicitly changed. Any game-driven fading/expiry uses a declared host clock/policy; no ambient core clock or hidden RNG is introduced.

Opacity/tint, colour-space/alpha convention, blend profile and stable order are explicit data/bindings, not implicit image-loader behavior. Compare their source and rendered results across exported/reopened assets.

## Shared human/agent command seam

Publish machine-readable command schemas, discovery metadata and small JSON examples. The initial command set should cover create/clone/revise recipe, save preset, place preset, add/update/remove decoration, inspect requirements and export/import a content pack. Exact names and discriminators are candidate contracts, not promised public APIs yet.

Each finite command carries a request identity, captured source/context/content bindings and explicit target IDs/versions. Deterministic inputs produce equivalent authored data. Dry-run reports source diff, supported/refused features, resource requirements and cost bounds without mutation. Applying uses the same current prepared result and final lease as the UI. Repeated/uncertain operations keep the original identity and cannot duplicate stamps or replay a game effect.

A brush stroke proposes one bounded batch and becomes one Undo entry when applied, rather than committing each cell separately. A batch with an invalid resource, stale owner, locked target or unsupported feature leaves the accepted library, map, decorations, history and redo intact. Preserve current Review/Apply and gesture-cancellation guarantees; an eventual continuous-paint mode needs its own explicit input contract and tests.

## Versioning and one authority

The complete workspace must capture original source, canonical tile bundle, referenced custom definitions/resources, decoration sidecar and active profile/catalogue bindings coherently. They participate in the same before/target tokens, receipts, Undo/Redo and same-ID recovery. Do not create a second overlay save/history beside the map authority, reset old receipts, or adopt new library/decoration state merely because preview succeeded.

That rule concerns an editing workspace. A game may borrow the decoration data/provider under its own retained authority without loading the editor or its history. Its adapter maps stable scene owners/floors and defines runtime event, edit-lock and save policies explicitly; runtime effects do not rewrite the published tile preset. Optional visual failure must not replay or award the confirmed gameplay effect.

Current stacked v2 work remains bounded to its accepted contracts. A new authoring/decoration module may require a new workspace/content version or explicit typed module envelope; decide that during contract review, not by adding an unchecked metadata bag to v1/v2. Old loaders reject unsupported required features explicitly and retain existing saves through their supported workshop. No silent migration or journal restamping is authorized.

## Builder assignments and sequencing

The current stack planner proof correction and fixed Gate A deliveries take priority and remain separately reviewable. After delivering those checkpoints, each existing builder starts the contract/design work below in a new bounded checkpoint. No additional user approval is needed; Architect freezes interfaces and authorizes implementation stages. Keep this addition out of the planner's proof-only fix.

| Builder | Next contract/design responsibility |
| --- | --- |
| **Coder, Nautilus Engine** | Headless recipe-authoring command and content/decoration schemas; source-stable anchors/masks; deterministic finite commands; compatibility, resource/work limits and atomic target requirements. Core has no renderer/storage/clock. |
| **Editor, Nautilus Engine** | Recipe workbench/library workflows; one human/agent authoring service; immutable revisions/COW; whole-workspace save/export/resource preparation and recovery; propose the shared codec policy extension without editing frozen hosts. |
| **Artist, Nautilus Engine** | Blood, scorch, apparent-crater, leaf-litter/flat-plant and road-marking/special-texture sample families; alpha/mask/scale/pivot/atlas metadata and a clipped borrowed-Three provider proposal. Follow the imagegen skill for new raster generation. |
| **UI, Nautilus Engine** | Create/Edit/Save-as-preset/library panels and local surface brush/layer controls: preview, select/move/rotate/scale/erase, reorder, opacity, unavailable reasons and the same command discovery as agents. Preserve owned input/floor/focus behavior. |
| **Architect, Nautilus Engine** | Reconcile fixed contracts, choose supported profiles and proof budgets, review actual UI/agent parity and rendering, and own registrations/distribution/CI/promotion. |

Contract-stage ownership is `candidates/tile-authoring/<role>/`, role-prefixed tests/tools and `docs/reviews/tile-authoring/<role>/`. Existing accepted sources and ongoing tile-stack paths stay isolated. All donor/peer inputs are committed reviewed Git objects. Public export/schema/capability/version changes, consumer pins and publication remain Architect-owned. Every component carries its usage card, actual bindings, portable example, ownership and builder checklist.

## Acceptance path

1. A human creates a supported custom tile, saves it as a versioned preset and places it twice. An agent using the same public candidate commands creates equivalent source without a DOM or private-editor import. Editing one placement preserves the other; explicit selected-instance upgrade is tested separately.
2. Put blood, scorch and a road/detail layer on one local tile; another copy stays clean. Save/reopen and portable pack export/import retain exact original controls, identities, asset hashes, layer ordering, alpha, transforms and masks.
3. Show nonuniform floors, D4 placements, analytic curves, holes/edges, detail/LOD and chunk residency. Marks stay on their intended source surface, with no seams, floor bleed, altered canonical borders or reliance on transient cells/triangles.
4. Test batch Undo/Redo, deletion/remapping, malformed/unsupported versions, unknown/missing resources, stale profiles, lock conflicts, all governing budget boundaries, cancelled strokes and same-ID uncertain commits. Mutants must corrupt actual outcomes/targets, not fixture expectation markers.
5. Runtime-generated decorations are presentation following a separately confirmed game event. Reload does not reaward damage or regenerate effects; changing a graphic does not change geometry, support, navigation or fire. Physical crater/plant requests without bound providers refuse clearly.
6. Run source and actual-installed human/agent paths plus a narrow real-browser workflow. Verify full source/data/resource parity independently, current hashes and real public dependencies. Measure representative PC/phone costs before claiming performance; retain explicit device limitations and cleanup receipts.
7. Run the four required repository gates for implementation deliveries. No normal distribution silently includes a private candidate or substitutes a fake public provider.

## Design recommendation

**Accuracy:** Source-stable anchors, exact recipe versions and separate visual versus physical effects preserve meaning across tools, LOD and saves. A painted crater is not physical evidence of changed height or collision. Prefer explicit capability boundaries and original authored controls.

**Efficiency:** Sparse layered records and shared resources are preferable to baking one new base texture per marked cell. Batching/compositing choices and the proposed ceilings need measurements; this is currently a code/design assessment, not a GPU or device benchmark.

**Narrative:** Local wear, damage, vegetation graphics and road markings can give reused parts distinct histories while a shared workbench lets humans and agents build new content. That is a subjective product preference. Each game retains its own blood/art style, damage, fire, vegetation and time policies.
