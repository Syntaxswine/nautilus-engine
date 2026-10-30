# Farmyard pane library: editor preparation and integration request

Owner: Editor. Source: Farmyard published `251bf8094b5f9ebe44208443084c1a6d6658512a`, including reviewed windows `3c29604bdfb4210864910369ec09c59095249e8a`. Orders: `e773317cdf605262c0f714eb90154c22c9f0d64a`; original intake `69829f9afdd224b7f55f159b852ee16532b1861a`. Current canonical main was read from GitHub as `8644b44ce1c049983fd722d83237ebb2dcec0eb3` (v0.9.0, grenades released). It has no public pane entry. This preparation preserves the editor's v0.8.0 branch and all previous checkpoints; it does not import a runtime or advance any pin.

**Next dependency/checkpoint:** Coder owns the pane state/query/schema/capability API after the current door fixes. Root must distribute its full reviewed public checkpoint and the applicable generic UI binder. Editor then implements actual discovery/controls, single-transaction authoring/history and preserving import/export against those contracts. Artist/UI own native geometry/material and browser acceptance. This report and its test-only fixtures establish no new public format or installed pane feature.

## Catalogue and actual metres

The [complete 39-entry fact fixture](../../tests/fixtures/editor-panes/catalogue-facts.json) lists every exact ID, native span/height, glass sill/head, grid and local pane ID. Eight inspection roots carry full source Git blobs, SHA-256 and byte counts; all eight are byte-identical between the reviewed window commit and published source pin. They are inspection roots, not an approved distribution closure.

| Family | Catalogue entries | Native geometry |
| --- | --- | --- |
| Full framed | 18: six patterns × 1/2/3 m spans | 2 m assembly height; glass from 0.055 to 1.945 m. |
| Waist framed | 18: the same six patterns × 1/2/3 m spans | 2 m assembly height; glass from 0.90 to 1.945 m; lower wall retained. |
| Full borderless | 3: `window.full.borderless.{1,2,3}m` | 2.12 m high, one `r0c0` pane, no frame/mullion/post/cap solids. |
| Resizable borderless template | Separate ID `window.full.borderless`, outside the 39 entries | Requires saved `{width,height}` in metres. Sector placement accepts whole-metre widths 1–240; height is positive/representable, with no source storey-count cap. Selected host/world limits still apply. |

Framed patterns are `clear`, `vertical-2`, `vertical-3`, `horizontal-2`, `grid-2x2`, `grid-3x2`. Finishes are steel/sage/ivory; walls brick/concrete/corrugated. Frame depth is 0.20 m, wall thickness 0.16 m, glass 0.008 m, post 0.055 m and mullion 0.035 m. Joined posts halve their share, while pane IDs remain local and stable. Borderless ignores joins and its finish control is disabled because it has no frame. The renderer's positive-finite dimension template is broader than the sector author's integer-grid placement contract: do not advertise arbitrary fractional sector widths.

The source converts height storeys explicitly at **2.12 m/storey**: width 20, height 5 metres means 20 × 5 m; height 5 storeys means 20 × 10.6 m. Tall glass adds no occupied floor, vault route or upper walking support. A `window.full.clear.2m` is a two-metre-wide glazed assembly covering two boundary cells. It differs from the existing `window-bay-compact/period` sculpture's **2 m total wall bay = 0.5 m flank + 1 m opening + 0.5 m flank**, corrected at `90054d07134116a5d9661f8318a76fe68f922aad`. Preserve those identities and label what each dimension measures.

## Placement, identity, preservation and audited limits

Source `window-authoring.js` accepts a ground-floor edge. A wide placement starts at that selected cell and replaces its complete span; it does not centre itself on the first cell. It saves an explicit placement ID, definition ID, x/y, quarter-turn degrees, finish/wall, optional joins/dimensions and a per-edge wall underlay. Source runtime `window-system.js` validates unique 1–96-character ASCII placement IDs, up to 1,024 instances, complete aligned widths, bounds and nonoverlap. Local pane IDs are `r{row}c{column}`; identity is the instance/pane pair. Bounds are recomputed from the definition/dimensions, not trusted saved mesh bounds.

Source glass damage is separate: `windowBreaks[instanceId]` names valid local panes and `windowSequence` persists. Breaking a pane twice returns no new break. Restore retains damage/counter and removes transient `windowEvents`; the event array's 128-entry tail is cosmetic history, not the grenade module's durable-command deduplication journal. A broken sheet keeps its passage reservation: it becomes transparent to the appropriate sight/projectile query without becoming walkable. A 20 × 10.6 m sheet remains one damage identity, independent of adjacent copies or divided panes.

`placeWindow`/`removeWindow` clone a candidate, retain replaced wall kinds, and restore underlay only where no replacement edge currently exists. Source UI places/removes via one `document.replace`, then awaits the designer refresh; undo/redo/import/export retain the extension. The async control wrapper refreshes after the designer clears its busy flag. There is no source in-place resize/preset migration, assembly-copy contract or portable block authoring support to claim. Future transform/copy/delete work must use the approved shared compiler, invalidate queries and rebind all references in one transaction, with fresh copy instance IDs and an explicit live-damage policy.

The [actual source-generated authoring fragment](../../tests/fixtures/editor-panes/legacy-authoring-fragment.json) replaces three specific wall/window edges with `editor-pane-a`. The [executed observations](../../tests/fixtures/editor-panes/observations.json) record exact opaque editor undo/redo/reopen, four rotations, unit conversions, same-definition damage isolation, no effect replay, joins and malformed/unsupported cases.

Two integration findings need explicit handling:

- The preserved editor baseline retains `farmyardWindows` as opaque JSON and returns **no required pane capability**. That is retention evidence, not functional export support. The new public authoring/consumer contract must derive pane requirements and refuse unsupported legacy map/block or game exports while preserving the complete source document. Do not drop the extension, flatten glass to opaque walls, relabel it as scenery, or infer support from a game/profile name. Source Farmyard's own dedicated flat-sector adapter is separate and refuses vertical traversal.
- The donor placement helper rejects `door-*` by prefix but admits `jail-door-closed`. The unlocked jail-door probe is accepted as opaque authoring; a locked probe yields an orphaned lock and the existing Nautilus validator rejects it atomically, retaining the document. Use semantic door classification across all families before covering a span; do not copy this prefix guard into the new adapter. These are bounded helper/host observations, not claims that Farmyard's game adapter accepts jail doors.

## Small integration request to Coder/Root

1. Publish exact preset/template discovery, metre limits, units, origin/axes and finish applicability through the accepted public provider. Preserve the 39-preset/template distinction and complete source/resource/notices closure. The source catalogue's own provenance includes an unresolved inherited study/art license statement; retain it rather than treating the metadata audit as a license grant.
2. Provide strict authored placement and live pane-state entries, stable instance/pane identity/source maps, deterministic transforms/joins and a declared resize/preset-change/copy damage policy. Specify accepted-incomplete authoring versus failed compilation and the supported world/floor profile. Do not place new fields into closed parts/world-v1 schemas implicitly.
3. Expose pure preview and confirmed-impact/query bindings, exact aperture/member heights, walk reservation versus sight/shot roles, persistent damage and once-only cosmetic observation. Keep the source first-hit-stops-and-breaks behavior a named tactical policy. Window traversal, heat/fire and ordered reactive grenade effects need separate accepted contracts; released planar grenades currently refuse windows.
4. Derive capabilities from actual authored contents and give instance/pane/property diagnostics and preserving export refusals. Require the full prospective save/state to validate before replacing accepted authoring or a live session.
5. Supply package-safe host-Three bindings and lifecycle/readiness metadata. Editor consumes the generic binder; it does not port donor iframe monkeypatches or create another renderer. Cross-realm buffers, loading/retry/cancel/dispose, native glass/shaders and consumer resource ownership remain explicit UI/package/browser gates.

No API identifiers beyond those already present in the donor are proposed here. Coder/Root own schema, capability, package and compiler decisions.

## Concrete acceptance gates after the public checkpoint

| Case | Inputs and expected outcome |
| --- | --- |
| P01 discovery/dimensions | Discover all 39 presets plus the separate template; show exact glass/assembly dimensions. Framed custom sizing refuses. Borderless frame finish is inapplicable, with usable controls on 320 px and desktop. |
| P02 units/tall sheet | Compare 20 × 5 m with 20 m × 5 storeys = 10.6 m. Save/reopen exact metre values; one tall pane, no frame caps and no invented upper floors. Hit at h=9 m breaks the whole sheet once. |
| P03 rotation/joins | Use the fixture's 0/90/180/270° placements: each covers 20 complete edges. Check native geometry/member/pane query parity, joined seam post widths and stable local pane IDs; recompute joins when neighbours change. |
| P04 authoring/history | Place/remove the actual three-edge underlay fixture, then transform/copy/delete through public commands. Each accepted command is one history entry; undo/redo restores source IDs, underlay, dimensions and references. Copy gets fresh instance IDs; no runtime effect receipts copied. |
| P05 isolated damage/restore | Two identical large sheets plus a six-pane grid: break A/r0c0 and grid/r0c1; B stays intact, grid has five glass panes. Repeat break/reload/revisit emits no old effect; passage remains nonwalkable. |
| P06 rejection/retention | Door families including jail, overlaps, outside/upper placements, width 20.5/241, zero/unrepresentable heights, missing custom dimensions, stale definitions and corrupt pane IDs reject without clearing redo or replacing the accepted preview. |
| P07 exports/generation | Unknown/unimplemented consumers, legacy blocks and generation paths must refuse pane data they cannot preserve. An actual supported path must round-trip dimensions/IDs/underlay and remap copies across generated placements; opaque JSON alone cannot pass this gate. |
| P08 readiness/lifecycle | Exercise busy undo/redo, malformed import, late compile, failed material/GPU load, retry and session replacement. Select named source diagnostics; preserve the previous document/history/scene and dispose only newly owned resources. Review real shared-Three glass on desktop/phone; CPU/frozen-source proofs are insufficient. |

## Reproduction and design recommendation

Run `node tools/audit-editor-panes.mjs --source-repository ABSOLUTE_READ_ONLY_FARMYARD_PATH` to check fixtures; `--write` deliberately regenerates only `tests/fixtures/editor-panes/`. The tool reads exact Git objects, verifies ancestry and eight root hashes, cross-checks all 39 JSON entries against the executable catalogue, and executes only four explicit headless source modules in memory, changing relative import addresses only. No donor working files, runtime imports, package whitelists or source pins are changed. Unit tests run offline from committed observations and exercise real editor/journal retention; they do not certify a pane API. Host observations identify the preserved v0.8.0 editor baseline; Root should review/regenerate that host portion when adopting on a newer engine, retaining the fixed donor hashes.

Checkpoint verification passed: immutable-source reproduction and all 39 catalogue cross-checks; five focused pane-intake tests; `npm run check -- --tracked`; `npm test` (372 passed); `npm run test:upstream` (32 passed); `npm run build` (384 module paths); audit-tool syntax and staged whitespace checks. Local logs are in ignored `artifacts/pane-editor-preparation/`. No preview/browser helper was started. Native material/shader, actual controls and consumer adoption gates remain pending as listed above.

**Accuracy:** prefer real native pane/frame/member geometry and explicit metre dimensions over inherited placeholder window walls, while preserving the old profile for compatibility. Tall glass remains ground-anchored art/collision, without invented traversal. **Efficiency:** retain bounded cosmetic shatter and compile/load-time query preparation for tactical authoring; four rotations and counts here are measurements of data, not frame-rate benchmarks. **Narrative:** retain readable tactical breakage for Farmyard/AFT; Tinderbox's richer fire/material consequences stay separately selected. This is a provisional recommendation pending shared API, native visual review and consumer evidence.

The assigned later queue is recorded in [editor intake queue](editor-intake-queue.md).
