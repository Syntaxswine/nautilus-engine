# C2 overlay UI plan and checklist

Status: **design only**, 2 November 2026. This commit adds documentation only. It leaves accepted UI 8053, C1 delivery, runtime, package exports, schemas, public registrations and game pins unchanged. Runtime implementation requires a later Architect authorization. This checkpoint is committed locally; push is withheld under the current handoff.

Use [checklist.json](checklist.json) for controls, owner dependencies, future file scope and acceptance items. [source.json](source.json) records immutable input bytes and all 30 artwork Pins. The [C1 usage card](../c1/usage-card.json) remains the accepted retained-service baseline.

## Fixed boundary and remaining dependencies

The Architect reports private Stage A 8b4cd72c2d8f424d6811196d9651916bb7e9e2bd accepted headless/private. Its own README/evidence still contains the earlier pending-recheck wording; that historical wording does not establish native/Host acceptance. [Core Stage A](https://github.com/Syntaxswine/nautilus-engine/blob/8b4cd72c2d8f424d6811196d9651916bb7e9e2bd/candidates/tile-authoring/core/c2/README.md) preserves persisted 432 Command/Operation/Expected/Pin/Pack, full document v3 and Review v1, adding a private ephemeral appearance-only Plan2. A pure plan or DTO is committable:false and cannot make Apply ready.

The C1 references are UI 8053b30e4db325ad16e07a456fcf8ef5030324a7, Editor f9ea6ce0ad5600ce07f4be634a29b699d61790f8 and Core 3df11ce6e62fb94806e30652b87168949f8ef4dd. Architect reports their integration checks/collectors passing while its cross-mode comparison correction finishes; this plan does not rerun or complete that integration. Artist content proof a66c78332c90fda33c16ffa7518a358b60249169 supplies the canonical 30 record metadata. Artist's C2 renderer and Core's non-placement Stage B work remain separate pending fixed deliveries.

| Owner | Required handoff to UI |
| --- | --- |
| Editor | Its C2 Host ownership checklist and one coherent current view/action projection over the existing retained service, floor/input owner, history and original-ID recovery. First unpainted surfaces need a Core-validated current/prospective target and grid ref. UI does not calculate binding digests or seed another store. |
| Artist/presenter | Actual supported PNG decode, finite-frame sampling, clipping, owned appearance candidate and borrowed thumbnail/readiness data. A catalogue record or profile string alone does not establish readiness. |
| Core | Accepted 8b4 private Plan2 and exact canonical producers/validators. Descriptor-level content.import is available in Stage A; live verified-byte workflows and non-placement capture/preset.save await separate Stage B acceptance. |
| Architect | Freeze the UI projection/capture seam and exact implementation scope; accept actual providers and private integration. Combined geometry+marks placement needs a separate proposal. Build/navigation, normal distribution, registrations, promotion, pins and Sites remain Architect-owned. |

The private [ABI](https://github.com/Syntaxswine/nautilus-engine/blob/8b4cd72c2d8f424d6811196d9651916bb7e9e2bd/candidates/tile-authoring/core/c2/abi/types.d.ts) names proposed Host-to-provider ports. These are not UI/JSONL methods and this plan does not implement or duplicate Editor's ownership checklist. UI consumes derived data and existing retained actions. Live leases/textures stay outside finite UI/saved data. C1's capture-false reader remains its default; any optional C2 reader/capture comparison must reuse the accepted coordinator and be explicitly frozen first.

## First Plan2 workflow

1. Inspect one existing unlocked rectangle top, its copy/surface/floor and stable authored frame/grid. Inspect the exact chosen artwork revision and selected mark membership.
2. Edit transient layer/graphic fields. A gesture proposes local data through the existing input owner; release updates the form. No command or Apply occurs on pointer movement/release.
3. Stage one canonical packet once through approved construction. Keep the displayed source/Expected and all post-construction, callback, connection, floor/finish and unknown-state fences. An invalidated draft is discarded without producer replay or Expected refresh.
4. Review through the same retained service used by human/agent JSONL. Show Review ready only for the real current owned appearance review. Forward the exact Editor-retained Apply request once and keep one Editor history.
5. Save/restore the complete document through existing hooks. Unknown freezes mutations/overwrite saves and recovers the original request ID; UI never releases uncertain resources.

An explicit first-layer plus mark proposal may be one ordered surface.layers / decoration.add batch after the Host supplies the validated target; UI never adopts a binding before Apply. Graphic size uses 0.000001..100000 m, position uses +/-1000000 m, rotation uses -pi..pi, and pivot/tint/opacity use 0..1, subject to tighter captured Host limits. These are graphic bounds, separate from C1 rectangle dimensions.

Plan2 preserves the exact authored tile bundle, layout revision and constraints. Its preparation may still own a complete second native base view. Roots, cells, triangles, materials, geometry buffers and every additional CPU/GPU/staging/scratch image copy count. Hidden/opacity 0 records and unverified retirement retain charges. Matching image hashes do not prove shared physical allocation. UI displays actual Host status/cost observations and grants no budget credit. Encoded-only unused imports may retain the existing view and visual failure/debt through actual Host admission; they do not earn a fabricated preview or cleared debt.

## Human controls

| Area | First UI design |
| --- | --- |
| Selected surface | Readable copy/owner label, stable surface, native floor, lock and supported profile. Selected mark shows layer and ungrouped/group membership. Full IDs/frame/grid/capture data stay in collapsed Technical details. |
| Artwork | Label plus rN in palette and selected-mark summary; exact Pin retained in values/title/details. Keep the new-mark choice distinct from an existing mark's saved Pin until explicit replacement. Use the exact retained revision; no follow-latest or missing-pin substitution. |
| Palette | Common canonical 30 metadata over two original PNG pages, with label search, available Host-provided category metadata and a bounded scroll area. Show only actual Host availability. Thumbnails borrow verified resources; a text/loading fallback is truthful. Game art/style may select a reviewed subset. |
| Layers | Display explicit order and mark count. Add/order/label/opacity/remove uses surface.layers with a full after-list and every removed mark ID. Empty labels are valid, at most 120 code points; show an unnamed-layer fallback without rewriting the saved label. |
| Opacity/visibility | Show layer and mark opacity plus derived Opacity enabled / Hidden by layer or graphic opacity. Actual clipping or whole-view visibility remains Host-reported. Persisted Layer has no visible field. Set opacity explicitly; a separate saved visibility toggle/prior-opacity restore policy needs a future contract. Hiding grants no resource refund. |
| Stamp/repeat | Stamp pairs form stamp with wrap clamp; Repeat detail pairs detail with repeat. Stamp outside the frame is transparent; detail repeats within that frame. No independent incompatible wrap control. |
| Pose/pivot | Local U/V metres, positive size, edited rotation, mirror U and explicit image-top-left pivot. Keep unedited saved radians/other Graphic fields exact. Convert displayed degrees only when edited. Image-v is down; source-local V is up. No automatic readable-text correction. |
| Tint/mask | Three labelled linear RGB components; whole-surface or exact authored-grid spans. Source grid/ref and canonical spans come from Core/Host. Empty grid selection refuses until cells or whole surface are explicit. |
| Membership/erase | Existing-layer reassignment uses full same-ID next-revision decoration.update at the same target. Display ordinal/order; any reorder needs an approved bounded producer. Add/remove use exact canonical operations and explicit IDs. GroupId stays null for edits. |
| Status/errors | Short Draft / Preparing artwork / Review ready / Saved / View needs attention / Unknown result messages from actual state. One current/attempted error surface; short contextual disabled-control reasons. Provenance, full Pins, raw readiness/action diagnostics, costs and checkpoint JSON remain collapsed. |

Use exact surface.layers and decoration.add/update/remove. A Mark has no kind/version fields. Update uses expectedRevision and a complete replacement; remove has no invented expectedRevision field. Use preserve-whole-group; Stage A does not detach. No mark.move or artwork.add aliases, second resource catalogue/history, UI-computed hashes or new authority tokens.

Masks and selection bind stable source IDs/grid coordinates, never derived cell/triangle indices or mesh UVs. Apply the source frame, current owner D4/origin and native [x,y,h] to render [x,h,y] conversion once each. Owner origin already includes floor height. Preserve corrected sampler/pivot semantics. Composite ordered marks before layer opacity: two alpha 0.5 marks then layer 0.5 gives 0.375.

## Membership and unsupported data

Read membership even when editing is unavailable. Stage A rejects an appearance document containing groups; it does not merely disable the selected grouped mark. Preserve the entire source and report that limitation. Never filter groups, detach silently, skip locked targets or partially adopt a layer deletion.

Curved/path/wall/roof surfaces, cross-owner/surface/floor moves, reanchor, owner deletion, groups/continuous strokes, WebP/other decoders or blend profiles require separate support. Wrong/stale bindings and missing artwork remain preserving refusals. Contextual messages explain the attempted action; unattempted features do not create a page of blanket unbound warnings.

Blood, scorch, apparent crater, leaves, flat plants and road markings remain cosmetic. They add no collision, height change, fire, damage, support, AP cost or game effect. A game adapter may request appearance after its own confirmed event; this UI does not create or replay that event. No animals, classes or other game systems are added.

## Keyboard, pointer and phone layouts

Keep the accepted C1 typography of 14 px or larger and targets of at least 44 px, green/gold tokens, stable exact ARIA labels, explicit empty selections and focus preservation. The selected summary always names the artwork revision and copy/surface; full IDs/digests do not dominate the main flow. Stage/Review/Apply stay by the readable review scope in normal flow.

Use native scoped controls and numeric alternatives for every gesture. Enter/Space activate a focused control once with IME/repeat guards. Text/select/dialog focus blocks canvas shortcuts. Escape cancels the active borrowed gesture/draft through its owner; it never clears unknown or abandons uncertain resources. No global listeners or second pointer/orbit owner.

Cancel on lost capture, second finger/pinch/navigation takeover, blur/visibility/mode change, source/owner/floor/pose/frame/grid/resource/geometry invalidation or disposal. Quarantine until fresh all-up; do not silently reacquire/replay. LOD/rebuild may cancel a live gesture while preserving stable saved selection/anchors.

At 320 and 390 px, use one-column numeric fields and full-width actions, wrapped labels, a bounded palette/layer scroll area and compact selected-artwork summary. Preserve heading/action separation and safe-area spacing. Palette scrolling and pinch must not stamp the canvas. Require screenshots/no horizontal overflow/focus checks; viewport emulation establishes no physical-phone performance claim.

## Separate acceptance gates

Non-placement selected-default capture, preset.save construction and verified byte import/export need accepted Stage B producers/Host/byte evidence. Keep these C2 workflows explicitly unavailable in this first overlay UI. Existing empty-default C1 preset saves retain their accepted route. A JSON pack/export plan is not a verified portable archive; no ready-looking capture/import/export controls precede acceptance.

Combined geometry plus marks/default placement needs a separate **Plan3 proposal**. That name is a coordination label; no wire version/profile is assigned here. The proposal must cover complete fresh mark/layer remaps, both geometry and appearance preparation/admission, one retained Review/Apply/history and whole-resource unknown retention. Do not implement geometry first then append marks. Existing supported C1 placement remains in its accepted C1 route; Plan2 does not authorize C2 placement or geometry edits to painted content.

## Design choice and next implementation scope

**Accuracy:** Prefer exact source-local membership, artwork revisions and explicit cosmetic boundaries. Derived mesh identities or a painted crater would misstate persistent geometry/physical effects. Numeric/transform tests establish contract correctness; physical realism is not claimed.

**Efficiency:** Prefer sparse records and borrowed verified resources. Charging a full owned candidate and every image copy is the conservative accepted 8b4 boundary until actual sharing is proved. Fewer private decoders/duplicate UI state is a code-based expectation; no CPU/GPU/phone measurements are claimed by this plan.

**Narrative:** Local wear/road paint lets copies carry different visual histories while game-specific reviewed art preserves each game's appearance. This is a subjective design preference. Fire, damage and physical vegetation remain game/provider decisions.

Future proposed UI-only files are listed in checklist.json. They are not created here. C2 would use the appearance panel/command/field/palette modules and focused tests/review tool after scope approval. The only possible existing coordinator change is an explicitly approved optional C2 view-reader/capture selector preserving C1 defaults. Editor owns live services/history/resources, Artist owns native presentation, Core owns pure contracts/producers and Architect owns integration/public adoption. Runtime acceptance needs actual-provider source/built/installed checks and the project's required gates; every checklist execution item remains planned.
