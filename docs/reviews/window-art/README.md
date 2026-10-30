# Native pane art audit and presentation proposal

**Ready for API/integration review; no renderer implementation.** Prefer the original native frame/glass factories and analytic shatter presentation, fed exclusively by the approved pane authority. Keep legacy decorative bays distinct. Do not import `WindowScenery`, `WindowEffects` or the donor's mutable window system as a second engine authority.

This artist checkpoint is based on released Nautilus `e8a66b1f4ead9a6f56c5609bd2a881caceb66b32` / v0.10.0. It inspects Farmyard **`251bf8094b5f9ebe44208443084c1a6d6658512a`**, including window integration `3c29604bdfb4210864910369ec09c59095249e8a`, against approved corrected proposal/fixture **`0f5bc5be84e813feb9e70c34dcf4ebd9ff3287ba`**. [Sources and hashes](sources.json), [native measurements](measurements.json), [existing-resource comparison](existing-resource-comparison.json), [visual checks](checks.json) and [helper cleanup](helper-cleanup.json) accompany this proposal.

## Review card

| Field | Status / boundary |
| --- | --- |
| Content | `industrial-windows/2`: 39 native presets plus explicit-dimension `window.full.borderless`. State/command/query version 1 in the approved proposal is a separate version. |
| Runtime | Proposed optional `./adapters/farmyard/windows/three`; **not implemented or registered here**. Coder owns the headless `./windows` and definition/query/confirmed-impact contract. Artist waits for its fixed reviewed checkpoint. |
| Native source | `dist/art/windows/{catalog.js,geometry.js}` and `dist/window-shatter.js` under the fixed Farmyard source. The original review workbench was exercised unchanged; its availability is not engine gameplay support. |
| Services | One borrowed host Three namespace; fixed compiled definitions/content; complete host-composed current query/impact state; host-owned time and optional audio/visibility/residency. The six required services and scope/identity rules remain exactly those of proposal `0f5bc5…`. |
| Ownership target | Shared library owns its geometry/material/texture pools; instance retirement preserves other instances. Host renderer/scene/clock, authoritative state and borrowed services survive disposal. No AP/ammunition, hit choice, damage, mover, save writer or private frame clock belongs to art. |
| Example | The source-only reproduction below is executable. It is **not an installed engine pane-API example**. A public installed consumer belongs to the later reviewed provider. |
| Stop | Deliver this audit; wait for the fixed headless API and Root's integration review before provider/renderer work. No source pins, portable schemas, consumer pins, main branch or Site audience change. |

## Native dimensions, joins and identities

Local axes are `[X,Y,Z]`, span along X, floor at Y=0, front normal +Z, glass centre Z=0. Render ground maps source `(x,y)` to `(X,Z)`; query height `h` maps to render Y. Quarter-turn +Y rotation obeys `X=x+cos(r)*localX+sin(r)*localZ`, `Z=y-sin(r)*localX+cos(r)*localZ`. Keep source layer `z=0`; a tall pane does not create floors or upper-level traversal.

| Part | Original native fact |
| --- | --- |
| Framed presets | Width 1/2/3 m, height 2 m, depth .20 m. Full aperture Y=.055–1.945; waist aperture Y=.90–1.945. |
| Structure | Posts .055 m, mullions .035 m, lower wall .16 m thick. Waist lower wall ends at .845; its sill occupies .845–.90. Frames project .02 m beyond each face of a .16 m wall. |
| Glass | .008 m thick. Framed glass uses a box; borderless glass retains only the two broad faces (four triangles), eliminating dark side/cap seams. |
| Borderless presets/template | Presets span 1/2/3 m at 2.12 m height. The separate template uses saved metre dimensions. A 20 × 10.6 m sheet is **one `r0c0`, zero frame members, four triangles**. Five storeys means 10.6 m; five metres means five metres. |
| Joins | `left`/`right` halve the relevant .055 m end post. Two joined neighbours combine to one .055 m post, confirmed for all four rotations. Pane IDs do not change; their bounds do, so joins belong in the fixed definition/content identity. No top/bottom/corner/free-angle joining is implied. |
| Members | `frame.left`, `frame.right`, `frame.sill`, `frame.head`, `mullion.v*`, `mullion.h*`, `wall.lower`; panes `r{row}c{column}`. Enamel highlights and reflection lines are cosmetic, not extra physical members. |

Preserve whole placement IDs: the approved fixture's 77-character ID passes native inspection. Use `{sceneId,placementId,paneId/memberId}` with the explicit `engineInstanceId` binding. Approved visual handles use `partIdentity(engineInstanceId,'visual','pane:'+paneId)`; do not shorten a source ID to fit the existing 24-character instance grammar. Geometry root names repeat definition IDs and cannot identify independent placements. Camera/back views and rotations never renumber panes.

Glass has query kind `glass` without a source role; preserve the approved contract's explicit null role instead of serializing undefined or inventing a structural role. Physical pane `partId:r0c0` remains distinct from its visual handle's `pane:r0c0` name. A structural receipt with `paneId:null` does not imply a glass break.

The raw art spec nests `pane.bounds` / `solid.bounds`; source query specs flatten those bounds and use `height` as the upper elevation. Bind the fixed kernel's actual records explicitly, rather than casting a raw mesh spec into a query packet. Root scale stays one; original primitive mesh scales express the declared native member dimensions. Do not stretch an old decorative window into these openings.

The first gameplay profile permits ground-anchored quarter turns and whole-metre covered spans, with explicit world/buffer limits. The static art describer can display dimensions that the gameplay compiler refuses. Visual availability does not authorize fractional-width placement, free rotation, arbitrary floors, doors/vaulting or glass structural engineering. Preserve the 2.12 m storey datum and all explicit refusals.

## Materials and resource closure

Native finishes are steel, sage enamel and aged ivory; lower-wall finishes are brick, concrete and corrugated metal. Glass is source colour `0x8eafb0`, roughness .3, metalness .25, opacity .56, transparent with depth writing disabled. Two-sided reflection strokes belong only to framed panes and disappear with their pane. Enamel-edge strips remain within their structural bounds. They must not become extra raycast/hit targets.

Lower-wall maps are **procedural 128 × 128 RGBA DataTextures**, 65,536 bytes each; three kinds total 196,608 bytes when all are prepared. Original `surfaceUV` retains physical-metre UVs, instead of stretching a one-metre paint across a wider wall. There is no new external PNG requirement for these presets. Preserve native UVs/finishes first; review mixed-span texture phase and alternate skins later without changing geometry or IDs.

| Closure / reuse | Measured decision |
| --- | --- |
| Native geometry | 6 original JS modules / **2,102,638 bytes**, including original Three. Excluding those two Three files leaves **18,744 bytes** of raw art/helper source. |
| Full source view/effects reference | 11 JS modules / **2,126,986 bytes**. Reference only; do not transplant its source state compiler, event counter, residency or audio controller into the shared authority. |
| Shared Three | Revision 180. Original module/core bytes differ from Nautilus only by CRLF normalization; executable code is equal. A future adapter must borrow the existing host namespace, not bundle another Three copy. |
| Existing headless sources | Catalogue, window-system and catalogue wrapper already exist byte-for-byte in the immutable grenade conformance snapshot. Reuse the fixed evidence; do not append files to that snapshot or duplicate definitions. |
| Existing material helpers | `hybrid-materials.js` code matches the pinned AFT helper after CRLF normalization; `diagonal-roads.js` bytes match exactly. No helper upgrade is justified by this audit. |
| Missing visual intake | Native geometry/shatter modules are not currently runtime resources. Their deliberate immutable visual intake, adapters and package registration belong to the next accepted stage. |
| Optional sound | Original OGG **27,455 bytes**, SHA-256 `438c45398ee77a40d5cc6ffcc59db0cdc709dc6d0521da5e2896b4afc19fcacb`; accompanying **730-byte** rubberduck CC0 notice is required. They are absent from the current runtime closure. Source URI adaptation and package-safe resources need a deliberate intake. |

The shatter study pin is AFT `ebf51393909040b61a7c40649d9d5f0ac3678735`; preserve `window-shatter-provenance.json`, its original-module hash, Three MIT notice and audio credit/license. User-project source has no blanket license declared; this audit adds none. The 21-file / 2,363,695-byte original source cache is ignored audit material, not a vendor/runtime import. Existing source hashes/notices remain distinct from any future adapter.

## Shatter, state consumption and lifecycle proposal

Use the source analytic shatter factory with **`includePane:false`**. The accepted scene already owns the intact glass and glints; a second preview pane would duplicate them. Preserve source pane-local bounds, seed and the approved confirmation's local normal sign `direction:±1`; apply the same placement transform as the window. The approved fixture uses a scalar direction, not an invented vector field.

The factory samples explicit **elapsed seconds** and has no frame loop or game RNG. Its source controller takes host time in milliseconds and converts to seconds; do not mix those units or use a logical round number as elapsed time. Source analytic gravity is 7.8 m/s², initial clearance lasts .1 s and the original receiving floor is zero. There is no general collision, ceiling, water, stairs or shard-hazard simulation.

Native full/waist samples settle/fade in 2.2 s. The seed-17 20 × 10.6 m sheet produces 64 shards, fade starts at **2.019215586 s**, duration **2.919215586 s**. Sample the returned duration; a fixed 2.2 s retirement is wrong for tall panes. Six tested shape/direction combinations keep all vertices finite and at least .003 m above the source receiving floor. These are CPU mesh observations, not GPU shatter acceptance.

Source limits are six active effects, **210 total triangles**, at most 70/pane and three audio voices. Reduced motion suppresses debris while source sound remains a separate choice. Budget/residency drops may omit cosmetics; they must not omit authoritative pane transitions or receipts. The original 128-event cosmetic ring and source `windowSequence` are not a durable impact journal or an epoch-scoped identity.

The later presentation should consume the approved contract in this order, without adding another state protocol:

1. Prepare against exact profile/content/definition digests and the fixed placement/member/pane binding map. Required host services remain fixed definitions, complete query composition, confirmed-impact authority, atomic context/host commit, geometry invalidation and complete-save staging (all version 1). Only the host can declare those bindings.
2. Project accepted **current pane masks** onto the original native handles. Hide only the pane group and glints; retain its frame, sill, mullions/lower wall. Visibility/residency is presentation, never retirement of query geometry or pane state. Stage a new content epoch before resizing/rejoining/replacing; failed preparation preserves the accepted scene.
3. Observe only the kernel/host's post-commit deferred effects. Treat the complete approved receipt ID as opaque and retain full scene/state/epoch/content scope. Do not key effects by definition, seed, local pane name or the old source sequence alone. Exact retries have empty effects; changed payload conflicts remain Coder decisions. A renderer hit, preview, roll attempt or animation callback cannot authorize a break or debit anything.
4. On restore/reconnect/revisit, apply saved masks and start at the supplied current observation cursor, without old shatter/audio. The first provider should keep the committed mask exact. Source `holds()` can delay visible removal while a cue returns null; any later projectile-synchronised hold needs an explicit bounded/cancellable presentation contract, and cannot restore a query collider.
5. Retire instance-owned wall/glint geometry at instance close; shared cube/sheet/material/maps only at library close. The native ownership probe confirms an instance can close without harming another or disposing shared glass material. A future host-material option must preserve borrowed inputs. Do not close a borrowed renderer, scene or audio context.
6. Audio remains optional and gesture-gated. Original unlock/decode/resume/voice/dispose behavior is source evidence, not tested physical playback. A future owned loader needs abort/late-completion guards; a borrowed audio service needs its explicit ownership/voice contract. Audio or rendering failure cannot undo/repeat an accepted game action.

Walking reservation `passage` / `window-passage` remains after breakage; only the intended glass query members disappear. Sight, bullets/flame and walking have different source purposes. Host composition must remove covered legacy edges and clip the adjacent 1.12 m wall overhang to the half-cell seam for **both** view and query geometry. Do not draw transparent glass over a remaining opaque wall or raycast every decorative mesh as authoritative. Existing door/grenade profile window refusals remain unchanged.

## Native review and recommendation

Original factories pass **624** rotation/join cases, **3,456** solid-member and **1,776** pane-bound comparisons. Maximum CPU error versus source query boxes is **7.11e-15 m**; this does not measure GPU precision or real-world accuracy. All six approved placements and four approved tall-sheet rotations retain IDs/bounds. Two joined half-posts combine to .055 m in each orientation. Nine finish/wall combinations, independent visibility and shared-resource disposal pass.

The unmodified source workbench rendered all **39 presets** as intact/removed pairs, plus back/alternate-wall/tall-sheet views: **42 captures and one 390 px phone capture**, native WebGL on local Edge/SwiftShader, zero page/resource errors and no horizontal phone overflow. [1 m](previews/native-1m.jpg), [2 m](previews/native-2m.jpg), [3 m](previews/native-3m.jpg), [tall-sheet continuity](previews/tall-sheet.jpg), [back](previews/full-six-back.jpg) and [corrugated wall](previews/waist-six-corrugated.jpg) were visually reviewed. Native GPU rotation/joins, live shatter/audio, complete world queries and installed-provider proof remain later integration gates.

One source-workbench limitation was observed: switching patterns can leave an unavailable Removed pane selected; its thumbnail silently uses the last valid pane instead (phone `r1c2` becomes `r1c1`). That is a review-UI fallback, not allowed provider behavior. Native `setPaneVisible` rejects unknown IDs. The later selector should list actual compiled pane IDs and preserve explicit refusals; no donor/UI fix is made here.

**Accuracy:** prefer real native members and exact pane IDs to painted-window proxies for functional sight/impact state. Keep first-hit-stops glass, permanent walking reservation, stylised transparency and analytic debris as named Farmyard choices, not a universal physical glass model. Tinderbox heat/fire or other material policies remain separate.

**Efficiency:** measured native cost is **4–336 triangles**, **1–28 mesh objects** plus up to six reflection-line objects (**1–34 draw objects**) per asset. Shared geometry/materials are not instancing. Prefer lazy native construction, retained pools and bounded analytic effects; profile actual mobile scenes before draw-call/instancing changes. These counts and byte budgets are measurements; frame-time savings are unmeasured. Large transparent sheets can be pixel-expensive despite four triangles.

**Narrative:** original aged steel/sage/ivory, legible glints and independent broken panes suit Farmyard's painted industrial world (art judgment). Preserve the older decorative 2 m wall bay with its roughly 1 m opening under its existing identity; it is not a 2 m native glazing assembly. No new skin, duplicate door art or actor rescaling is needed. The door wood intake is already closed by `3371859cac750b38e0161d6da43b208ae061fab6` in released main; the completed Tinderbox artist branch `81a271ecf92189939e1008d5f512eb98b05aff3e` remains preserved separately.

## Reproduction and next acceptance

```text
node docs/reviews/window-art/source-audit.mjs --repo <read-only Farmyard checkout>
node docs/reviews/window-art/inspect-native.mjs
node docs/reviews/window-art/review-source.mjs
python docs/reviews/window-art/compose-previews.py
```

Native inspection uses Node >=22. The optional original-workbench review reuses the project Playwright/Edge helper with an actual 120 s expiry and supported cleanup. The contact-sheet tool uses bundled Python/Pillow and Windows fonts. No helper is retained; the exact Node/Edge lifetimes ended and port 54089 was rechecked released. Original source, launch/input/output references and cleanup are recorded for restart; no background watcher was created.

Delivery gates pass on this audit branch: `npm run check -- --tracked`, **559/559** `npm test`, **32/32** `npm run test:upstream`, and `npm run build` with **435 module paths** checked. Fourteen evidence/preview hashes and eleven relative guide references were verified. These inherited engine regressions do not turn this proposal into a registered pane API.

Before later renderer acceptance:

- [ ] Root distributes the fixed headless API/definition/query/confirmed-impact checkpoint; no competing kernel or premature public export.
- [ ] Preserve exact content IDs, 2/2.12 m heights, .20/.16/.008 m depths, all four rotations, shared-post joins, lower-wall metre UVs and the 77-character source binding.
- [ ] Consume accepted masks and public nearest-world impact state; verify misses, frame hits, retries, restore and epoch replacement produce no duplicate pane/effect/cost.
- [ ] Keep broken windows non-vaultable under this profile; remove/clip covered legacy geometry consistently and refuse unsupported content explicitly.
- [ ] Deliver a package-safe source/notices/audio closure and a public installed example using the one host Three; no raw donor view/system runtime import.
- [ ] Exercise failed/late preparation, disposal/reopen, retained host services, effect budgets/duration, optional audio and reduced motion on the actual supported devices.
- [ ] Perform native GPU joins/rotations/shatter and full game/editor save/history/import/export review when those bindings exist; update a game pin separately.

This checkpoint stops at the requested audit/proposal. Other roster, Coldwell and exterior-ghost work stays queued.
