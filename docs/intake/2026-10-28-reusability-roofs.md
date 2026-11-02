# Nautilus 0.5 reusability and procedural roofs

The architect accepts the integrated engine candidate after the checks recorded below. This intake extends the [expanded library acceptance](2026-10-28-expanded-library.md). Rock Bot reviewed `main` at `d3c577fbf78974dc0a20660d46748a83758fd51f`; this work starts from the already-reviewed integration `d9a948fa80328be8dccb560efbb70efcda8ed5b4`. The source manifest records full worker commits, original Git blobs and SHA-256 hashes, separately from the resulting integration adapters.

## Audit disposition

| Concern | Accepted result and practical boundary |
| --- | --- |
| Renderer in headless map core | Engine-owned data inspection/editing contracts replace the renderer-reaching donor superclass. Static parsing and sealed-global runtime regressions cover every public map/rules entry. No renderer was deferred behind a lazy import. |
| Real consumer proof | A deliberately bounded Tinderbox adapter passes parity, canonical scene saves, reload and deterministic replay against the byte-verified real game compiler/simulation. The packed core is installed in an independent temporary consumer and drives real wall collision. Production game adoption remains a separate reviewed pin; no game checkout or pin changes here. |
| Capability negotiation | Stable schema/feature IDs, exact supported versions, required/optional intervals and actionable structured errors. The real browser host bridge refuses a versioned host without roof support before calling it. |
| Public facade | Owned document/save/capability/asset interfaces and exported serializable contracts. Public package exports hide donor/editor import paths. The inherited AFT map vocabulary remains an explicit compatibility profile. |
| Persistence | Addressable structural schemas, engine/schema stamps, explicit legacy migration, unknown-field policy, detached plain JSON, canonical output and golden fixtures. Runtime validation also checks geometry; JSON Schema alone is insufficient. |
| Browser workflow | Isolated real WebGL authoring covers preview/edit/history, browser save/reload and file export/import. The same narrow workflow is a GitHub CI job. Local host stubs prove bridge wiring; the separate pinned-game tests establish consumer behavior. |
| Distribution/release | Explicit file whitelists; independent core, renderer, asset and editor outputs; installed package/resource checks; semantic version 0.5.0, changelog and compatibility policy. No npm publication or Site audience change. |

The three games already exchange assets, source and design feedback with Nautilus. That bidirectional collaboration is valuable evidence of shared origins, while committed runtime adoption needs the separate consumer proof above. Tinderbox is the first target because it is currently the most active game. All three can borrow the same 405-entry headless asset catalogue through namespaced identities. Original/Gross building renderers and procedural roof meshes are independent of map or gameplay adoption.

## Sloped roofs and integration repairs

The [portable roof contract](../sloped-roofs.md) generates closed gable, hip and shed shells with measured dimensions, pitch, overhang, signed shed direction, slate/clay/metal paint and saved seeds. The [workshop controls](../editor-roofs.md) support dragged or exact previews, placement/update/delete, rotation, history, save/import/export, reusable blocks and connected generation. Optional opaque authoring metadata survives those operations. Native tile-centre and roof edge coordinates have one explicit half-metre render conversion.

The final review required two additional worker passes:

- Direct public prefab placement/generation originally bypassed the document wrapper's roof occupancy rule. The repaired headless prefab API validates roof envelopes, reserves full overhang rectangles against lots/clearance, skips blocked generation candidates deterministically and rejects impossible layouts atomically. Roof-free seeds retain their earlier results.
- A failed roof atlas request originally cached its rejection permanently. The repaired editor loader owns each attempt, permits retry, retires failed resources, clears its own recovered diagnostic and prevents late completions from binding after disposal.

The checks include regression reproductions of these failures. Roofs remain architectural shells: no attic walls, structural framing, roof unions, fire cells, collision, walking or collapse is implied. The current narrow Tinderbox adapter rejects roof-bearing maps explicitly. Sharing the mesh is available now; adopting roof behavior in that game needs a deliberate material/simulation adapter.

## Evidence and measurements

Frozen implementation reviewed: `0b03fb429c895bf7b1f1635caa5532fe78f781c5`.

| Public static dependency closure | Modules | UTF-8 source bytes | Renderer/browser violations |
| --- | ---: | ---: | ---: |
| Audited main map API | 80 | 7,518,588 | 8 |
| Integrated map API, including new contract/roof entries | 100 | 5,683,747 | 0 |
| Integrated rules entries | 21 | 83,164 | 0 |

These are measured unique transitive source files, not memory, load time or frame-time measurements. Three immutable physical-clearance/BVH data modules still account for about 5.19 MB of source; they preserve traversal fidelity. See the [boundary analysis](../headless-boundary.md) for why approximating them as boxes would change behavior. The additional owned contracts increase module count while removing renderer machinery.

| Actual package inventory | Compressed bytes | Unpacked bytes | Files |
| --- | ---: | ---: | ---: |
| Headless core | 1,146,604 | 6,002,589 | 130 |
| Optional renderer and runtime paints | 17,526,016 | 19,994,301 | 42 |
| Optional original building assets | 10,913,035 | 83,157,743 | 166 |
| Default compatibility package | 18,629,690 | 25,795,557 | 150 |

The default package retains optional rendering compatibility and its byte-preserved paints; it is larger than the core. Test fixtures, editor applications, source plates and review evidence do not ship in these packages. Complete applicable third-party licenses remain. The asset installation test resolves all 48 glTF/binary/blueprint/atlas URL sets. Source-side renderer review also verified both providers and all eight runtime resource requests; an arbitrary game bundler/browser deployment still requires its own adoption check.

All **203 Nautilus tests**, **32 pinned upstream regressions**, tracked integrity checks and the **350-module static build** pass. Both installed package proofs and the final browser workflow pass. [Verification and package inventories](../reviews/evidence/reusability-roofs/verification.json) record the exact commands, tarball integrity values and log hashes.

The combined browser review uses isolated Edge 156.0.4314.50 and software WebGL for correctness. It renders six seeded buildings, a separate wall and all three painted roof styles; tests nonmutating previews, transactional conflicts, undo/redo, browser save/reload, exact JSON round trips and schema document URLs; and checks 1280×900 desktop and 390×844 mobile without horizontal overflow. Unsupported manifest and legacy-feature hosts reject, while a declared asynchronous local host receives the full map once. There are no page/resource errors or scene diagnostics. Roof meshes use 12–20 triangles and three ordinary material groups; these counts and the [matched geometry comparison](../sloped-roofs.md#accuracy-efficiency-and-narrative) do not establish a performance gain.

- [Combined acceptance and image hashes](../reviews/evidence/reusability-roofs/acceptance.json)
- [Roof view](../reviews/evidence/reusability-roofs/procedural-roofs.png), [desktop](../reviews/evidence/reusability-roofs/editor-desktop.png), [mobile](../reviews/evidence/reusability-roofs/editor-mobile-library.png)
- [Audited main closure](../reviews/evidence/reusability-roofs/audited-main-closure.json), [integrated closure](../reviews/evidence/reusability-roofs/integrated-closure.json)
- [Frozen contribution/source hashes](2026-10-28-reusability-roofs.sources.json)

Disposable review browsers and loopback servers closed through their owning APIs. Exact process lifetimes and released ports were verified; cleanup evidence is retained. No preview or background helper remains running for this intake.

## Hosted tooling follow-up

The initial GitHub runs exposed tooling differences after local acceptance: npm lived under the Linux Node prefix rather than beside the executable, and the separate Chromium headless shell timed out during the roof screenshot after the authoring assertions had passed. The package runner now resolves the active npm CLI plus both standard platform layouts. CI uses the documented [full Chromium headless channel](https://playwright.dev/docs/browsers#chromium-new-headless-mode); the workflow disables motion for deterministic images, bounds each capture to 60 seconds and closes the whole review after at most five minutes. These changes preserve all authoring assertions. The local rerun reproduced the same six image hashes. Engine/runtime payloads and the frozen implementation measurements above are unchanged; GitHub CI is the additional Linux acceptance gate.

## Design recommendation

**Accuracy:** prefer plain data contracts at the shared boundary and native Tinderbox compilation for its bounded consumer profile. This preserves existing geometry/collision behavior without translating AFT combat or fire assumptions. True pitched planes preserve slope and silhouette more accurately than stepped slabs; they are still stylized architectural shells.

**Efficiency:** prefer the core package for server tools and game consumers that do not need renderer resources. The measured source/package inventories support this separation. Compact roofs reduce triangles relative to the constructed stepped comparison but add material draws; no CPU, memory, FPS or city-scale improvement is claimed.

**Narrative:** provisionally favor the bounded single-bear yard/wall adapter for the first Tinderbox adoption, while letting all games borrow visual assets independently. Tinderbox should retain richer fire/material behavior; AFT and Farmyard may prefer simpler tactical roof visibility and occupancy policies. This is a game-fit judgment, and saved compatibility profiles remain available. Future houses, doors and roof/fire bindings need their own acceptance rather than a generic capability promise.

Delivery is on `codex/nautilus-integration`, [PR #1](https://github.com/Syntaxswine/nautilus-engine/pull/1), with the 0.5.0 changelog and compatibility policy. Consumer pins, donor/worker checkouts and private Sites access remain separate from this engine delivery.
