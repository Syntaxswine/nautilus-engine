# Tile tranche 2: stacked surfaces, tall-floor authoring and reusable finishes

Status: scoped and delegated by Architect on 2026-11-01, following the user's instruction to expand the tile system. Implementation baseline is reviewed main `2502646482218524fd5129641da769bb82462e4d` (PR31). This document authorizes the bounded work below; it does not declare new public exports, capabilities or completed integration.

## Product result

A builder can open a new fifteen-floor tile workspace, draw a level rectangle, choose declared floors and a minimum clearance, review the complete stack and apply it once. All surfaces retain editable source and stable owner identities. The builder can inspect the tower through a five-label floor window, change an unlocked floor's finish, undo/redo and save/reload the complete result. The same finish library also works on supported isolated line/arc/cubic paths.

This advances the larger reusable family system: geometry, shared borders, floor identity, finish and live-game services remain distinct choices. Additional roof, wall, trim, terrain and structural families should use those contracts. This tranche supplies authoring clearance between declared envelopes; it does not make the surfaces structurally supported, traversable or playable.

The existing Smart Tile workshop, accepted saves and public v1 core remain compatibility targets. C2a remains private and planar. Existing single-plane rectangle adjacency and isolated level curves must continue to work.

The user additionally authorized [custom tile creation and local overlays](custom-tile-authoring-and-overlays.md), including headless agent authoring. Its contract/design work follows the current fixed Gate A deliveries; it does not enlarge the planner's focused proof correction or silently add fields to the frozen save formats.

## The two contract gates

**Gate A: fixed candidate contracts and independently useful components.** Coder builds the headless stack-intent planner and actual-public-core proof. Editor proposes the versioned floor/checkpoint boundary and shared-session adaptation, with pure validators/fixtures in new candidate paths. UI builds the floor/stack/finish presentation against the explicit candidate adapter fixture. Artist builds the finish family and measured visual fixtures. All four start now in their own worktrees from the baseline. Each supplies a full committed SHA, source hashes, an API/usage card, supported/refused cases, meaningful checks and a short integration checklist.

Editor and UI exchange their proposed adapter shape through Architect before either treats it as frozen. Coder and Artist send their exact result/metadata shapes early. Architect reconciles the one interface and relays immutable checkpoints. Do not import another worker's uncommitted files or a moving branch.

**Gate B: one real authoring workflow.** After Architect accepts those contracts, Editor wires the fixed planner, finish library and UI through one session authority. Architect then reviews the complete result and owns registration, source-fence changes, CI and promotion. Existing accepted source fences stay effective during Gate A; no worker disables them, adds a blanket bypass or edits the protected fifteen host files merely to make checks pass. A necessary focused refactor of those files is proposed at Gate A and authorized explicitly at Gate B, with old behavior retained as a regression target.

This staging is an integration gate, not a request for another round of user permission. Worker blockers go to Architect promptly; independent assigned work continues.

## Geometry and height contract

The first stack intent is a host-side adapter over the actual public v1 tile core. It emits one finite repair request; core remains the only matching/contact/repair authority. It cannot call the private C2a evaluator, turn annotations into functional rules or introduce an Editor resolver.

Supported stack members are validated level, axis-aligned rectangular region recipes under existing D4 placements. Their original controls, base/thickness and named conservative primary reservation must agree. Preserve all additional reservations, anchors, seeds, profiles, ports, unused recipes, locks and opaque supported source data. A family name or a mesh is not proof that source meets this profile.

Validate every relevant owner in the old/new affected closure, including unchanged neighbours. Unsupported nearby used geometry cannot disappear from contact obligations because it has no reservation or is not being edited. Preserve unused/unaffected future source where the public contract permits it; refuse unsupported affected source explicitly.

The host predeclares the complete ordered floor table with stable IDs and explicit native metre elevations. Neither labels nor ordinal positions determine heights. This tranche does not edit the table while a session or write is active. Minimum clearance is an explicit saved/requested requirement; never lower it to whatever would pass.

For supported positive-XY-overlap pairs, emit ordinary persisted v1 `cross` relations and let the core validate them. Preserve existing IDs; allocate bounded collision-checked IDs rather than concatenating arbitrary owner strings. Every relevant owner/reservation pair needs its own proof. Transitive links, a stack label or an unchanged source file do not waive contact checks. Include old and new neighbours even on other floors; do not add a broad height filter that hides tall reservations or old-location dependencies.

Public v1 cannot prove a separated projected-edge/radius-only contact using `cross`. Such cases must refuse clearly in this tranche, with the owners/contact and required next capability named. Same-plane overlap, zero/insufficient clearance, incorrect bindings, invalid envelopes and uncovered additional reservations also refuse. Do not silently reinterpret `alongside`, add permissive extensions, or assert that missing positive XY overlap means there is no obligation.

Coder additionally supplies a **design-only** versioned floor-separation proposal for those projected edge/near cases. It must cover source representation, complete contact obligations, old/new closure, limits and compatibility. It is not implemented or registered in this tranche. This keeps the next generalization visible without weakening the accepted v1 rules.

## Fifteen-floor acceptance fixture

Use fifteen explicitly supplied floors with labels 1–15 and saved elevations `0, 2.12, 4.24, …, 29.68` metres under a named compatibility profile. These are fixture values, not a universal storey interval. A second nonuniform-height fixture must demonstrate that labels/indices cannot supply elevations.

Construct fifteen aligned 8 × 4 m surfaces with the reviewed 0.12 m reservation interval in **one operation**. Fourteen lower owners are locked; the highest remains editable. All 105 pairwise positive-overlap relations require the declared 2 m clearance. The [archived headless feasibility witness](../reviews/tile-stack/architect/floor-stack-feasibility.json) at main `47c7fe160473ae72e1d6af50f65433088d9c6a87` passed with 16 repair steps, 435 spatial tests and 1,950 geometry work units. Its [source record](../reviews/tile-stack/architect/source.json) identifies the historical script's original location and limits. Those measurements describe that fixture only; they are not new API limits or a performance promise.

Repeat prepare deterministically, serialize/reopen, change the unlocked owner's finish, undo/redo and recover uncertain acknowledgements. Lower locked owners, source controls, anchor subsets, recipe identity rules and required relation IDs remain intact. Missing one crossing, insufficient clearance, wrong floor binding, tall extra reservations, stale context, cancellation and each lowered governing budget produce no committable candidate and preserve accepted state/history/redo/view.

Use a separate same-floor two-rectangle fixture for locked-neighbour adjacency and finish isolation. Do not append that neighbour to the fifteen-floor fixture by inventing unsupported cross-floor edge relations. Add move/remove tests with supported starts/ends and explicit relation changes; preserve a named refusal witness for unsupported projected edge/near contacts.

The existing aggregate resource accounting remains authoritative: accepted, candidate, acquiring and unverified retiring allocations share two roots, 50,000 triangles and 1,024 cells. Fifteen 8 × 4 m decks yield 480 one-metre cells per complete view, so accepted plus candidate uses 960 cells before any other charged allocation. These are source-derived counts, not measured GPU performance. Do not silently increase ceilings or exclude hidden floors from allocation accounting.

## Floor profiles and saves

The retained portable source currently has three real legacy layers. It must remain verbatim. Additional tile-only floors belong to an explicit versioned authoring profile; they must not be forged as extra original-map layers or exported as legacy geometry.

Editor's Gate A proposal must distinguish a valid legacy-layer reference from a new authored tile-floor identity, reject unknown versions/malformed bindings, bind the exact floor table in session/operation context, and define the new complete checkpoint's version and storage namespace. Existing v1 files and their original authority remain available through the accepted workshop. The new profile starts a new workspace in this tranche; automatic conversion of old journals/checkpoints, receipt restamping, clearing pending requests and silent in-place upgrades are excluded.

Reuse the resource-free journal/history algorithm and one input/transaction/view coordinator. A profile-specific document validator is appropriate; a copied second CAS/recovery/history implementation is not. Editor must propose the smallest shared-policy seam needed before changing the accepted session. Acknowledged acceptance stays committed after display failures; unknown acknowledgements freeze edits and overwriting saves until reconciliation of the same original request ID.

Saved floor IDs/elevations, full original map, complete canonical tile bundle, finish choices and required relation source are authoritative. Meshes, visibility and sampled cells remain derived. Unsupported legacy/game export must preserve source and explain the incompatibility. No consumer pins change.

## Controls and visual behavior

Use the existing floor controller and DOM widget: at most five available labels, previous/next arrows, PageUp/PageDown on the owned desktop target, and one floor step per wheel gesture over the floor control. Preserve form/dialog/composition/modifier guards. Canvas wheel remains camera zoom. Retire input, drafts and review tickets before changing drawing plane or mode, including same-floor mode changes.

At 320/390 CSS px, retain readable current-floor/elevation feedback and usable touch targets without horizontal overflow. Follow-character and contact/eye actions require actual supplied subjects/services; do not manufacture them for this authoring proof. An unbound action needs an honest disabled explanation. Mobile gameplay follow policy stays consumer-owned.

Provide selected-floor inspection and a clearly labelled overview/cutaway using actual tile surfaces at their authored heights. Do not distort elevations to make a tower screenshot or substitute debug boxes for the shared assets. Visibility is presentation only and cannot change support, contacts, budgets or saved source. Preserve UI-first touch ownership, whole-sequence quarantine, all-up/fresh-primary recovery, capture-loss cancellation and native Review/Apply separation.

The current provider draws flat surfaces at canonical base height. Thickness remains source/reservation metadata; it is not solid extrusion. Material-sidedness or an overview is not a slab, underside, wall or support capability. An extruded family needs its own future typed contract and review.

## Finish family

Artist supplies four practical painterly finish families: brick pavers, stone flags, timber boards and poured concrete. Reuse appropriate reviewed engine materials/atlas resources; avoid duplicate bitmap copies when an existing resource suffices. New raster generation, if needed, follows the image-generation skill and supplies provenance. Do not change the preserved 294-study lab or reintroduce its matcher.

Each candidate family carries a stable ID/version, human label, supported source/profile IDs, explicit borrowed material/resource bindings, compatible border contract, seed/detail behavior, costs/limits, disposal ownership, example and builder checklist. The same finish should apply to supported rectangle and isolated level line/arc/cubic surfaces. Unsupported shapes remain named refusals; a catalogue entry grants no geometry or gameplay capability.

Keep cosmetic skin separate from physical boundary material. Preserve canonical border positions, normals, tangents, material intervals, UV phase, floor/channel/layer and original controls across finishes, D4 poses and detail choices. Artist owns appearance and any newly owned material/texture lifetime; the host retains ownership of supplied Three, maps and borrowed pools. No duplicate Three copy or donor gameplay import.

UI uses the typed catalogue for friendly choices and unavailable reasons, retaining stable IDs in source. It does not resolve contacts, author recipes, spend resources or create a second journal. Existing painterly/slate/sandstone IDs remain compatibility choices.

## Assignments

| Builder | Gate A deliverable | Gate B responsibility |
| --- | --- | --- |
| **Coder, Nautilus Engine** | Pure bounded public-v1 stack planner; 15-floor + nonuniform fixtures; independent integer-interval oracle; actual-installed core proof; deferred edge/near separation design | Fixed planner corrections and final headless/package review support |
| **Editor, Nautilus Engine** | Versioned floor/checkpoint proposal, pure validation/recovery fixtures and proposed shared-session seam; coordinate exact adapter with UI | One real stacked workspace using accepted components; atomic review/apply/history/save/recovery and source retention |
| **Artist, Nautilus Engine** | Four finish families, typed cards, borrowed-Three/material lifecycle and actual public-provider visual fixtures; selected-floor/tower presentation proposal | Exact native-height visual integration and representative seam/finish/LOD review |
| **UI, Nautilus Engine** | Existing five-label floor widget on 15 floors; stack draft/clearance and finish-catalogue controls against an explicit fixture; keyboard/touch/accessibility/unknown-state cases | Bind actual Editor adapter with no local authority; finish real desktop/phone workflow checks |
| **Architect, Nautilus Engine** | Reconcile/freeze committed interfaces, evaluate design differences, keep handoffs and provenance current | Focused independent review; public registration/whitelist/fences/CI only when accepted; combined checks and guarded promotion |

Each worker changes only its own checkout and task paths. Preserve all accepted baselines. No repins, release tags, package versions, consumer adoption, main merges or private Sites audience changes. Root owns integration. Stop disposable helpers after their immediate purpose and preserve exact ownership/cleanup records.

Gate A ownership is `candidates/tile-stack/core/` (Coder), `candidates/tile-stack/editor/` (Editor), `candidates/tile-stack/art/` (Artist) and `candidates/tile-stack/ui/` (UI), plus role-prefixed tests/tools and `docs/reviews/tile-stack/<role>/` evidence. Keep candidate HTML/fixtures inside those candidate directories during Gate A, served explicitly from source when needed. Do not accidentally ship a new example whose dependency closure the existing static build does not contain. These candidate paths are not public exports or normal package contents; actual installed proofs must identify any copied host helper as such. Root decides final runtime/example locations at Gate B.

## Evidence required for acceptance

1. Exact source SHAs/hashes and explicit dependency closure; Node-only planner/core load with no DOM, storage, renderer, clock or game policy.
2. Source and actual-installed results agree. Test the candidate host helper openly if it is not registered yet; never overlay a fake public core or claim public registration from a private import. Root owns the eventual optional entry decision.
3. Independent interval arithmetic verifies the 105 crossing obligations, gaps and additional-reservation refusals. Repeated output, round-trip source, bounded collision allocation and old/new dependency evidence are retained.
4. One atomic accepted stack/history entry; rejected prepares preserve redo; source/locks/anchor subsets/seed/relations remain exact; same-ID uncertain commit recovery and post-commit display retry do not replay costs or history.
5. Real browser create stack → inspect lower/upper floors → finish unlocked owner → undo/redo → save/reload → verify equivalent source. Repeat source/built/actual-installed host modes after Root registration. Capture current inputs, actual public bindings, labelled synthetic faults, semantic parity and cleanup. Retain the earlier 27-check workflow as a regression target; do not equate screenshots, fake-adapter tests or raw CDP diagnostics with physical-device proof.
6. All four repository gates pass for each deliverable: `npm run check`, `npm test`, `npm run test:upstream`, `npm run build`. Add only meaningful tranche-specific checks. Record measured work separately from ceilings; phone/desktop performance remains unmeasured until a representative benchmark is actually run.

## Design recommendation

**Accuracy:** Prefer explicit native floor identities, authored controls and measured reservation clearance. Keep the original map untouched and distinguish a flat visible surface from a physical floor. These are source/geometry guarantees, not physical calibration.

**Efficiency:** Reuse the existing public resolver, floor widget and journal, with finite requests and shared resource accounting. Pairwise relations grow quadratically (105 for fifteen overlapping owners); a later compact contract must still prove actual obligations. This is a code-based assessment. The feasibility work counts above are measurements of one headless fixture, not CPU/GPU timings.

**Narrative:** A readable tall-floor workflow and a shared painterly finish menu help future games borrow the same building tools while retaining their own movement, support, fire and story policies. This is a subjective product/style preference. Preserve AFT's height profile as a named compatibility option and permit other explicit host profiles.
