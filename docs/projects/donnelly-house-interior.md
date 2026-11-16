# Donnelly House: layout and architectural review

Implementation status: the separately versioned [interior-v1 house](../donnelly-interior.md) resolves this proposal with an enlarged hall, native fit and its own saves. The original proposal and drawings below remain design evidence.

This is a proposed domestic interpretation for the game's Victorian house. It supplies room uses, circulation and a review standard before interior construction. The current Mount Dora exterior and the published catalogue examples are separate evidence; the proposal does not claim to reproduce a surveyed Donnelly floor plan. The stair/porch correction is a bounded implementation task. Interior walls, doors, furnishing and traversal remain a later construction tranche.

## Evidence and recommendation

The correct [National Register nomination, 75000560, description page](https://npgallery.nps.gov/GetAsset/b9a5d338-3817-43d7-b5a4-78737ba59bde) describes an off-center entrance into one of two front parlors, an irregular plan, a steep hipped roof with subsidiary gables, a hexagonal corner turret, and a two-sided veranda with a gabled stair entrance. Those building-specific facts take priority over a generic Victorian template. The document has no measured floor drawing.

The period comparisons are the original [Gross n20 / printed 17](https://archive.org/details/TenthAnnualIllustratedCatalogueOfS.e.GrossFamousCitySubdivisionsAnd/page/n20/mode/1up) and [n22 / printed 19](https://archive.org/details/TenthAnnualIllustratedCatalogueOfS.e.GrossFamousCitySubdivisionsAnd/page/n22/mode/1up). Their actual first/second-floor plates show useful relationships between parlors/sitting rooms, dining, pantry/kitchen, stairs, chambers and storage. Both were visually reviewed in the preserved Nautilus source at `vendor/tinderbox-prefabs/6693bfa3fea2edec77649d830de5ac68ba4c1a50/art/source/gross-housing-v1/plates/`. These are comparisons, not this building's original plan.

Tinderbox was also read at fixed commit `e9fbc7bfbb5aa875ecc51f11883d75e65cf1eca3`: [catalogue-block-two reference brief](https://github.com/Syntaxswine/tinderbox/blob/e9fbc7bfbb5aa875ecc51f11883d75e65cf1eca3/docs/research/catalogue-block-two/README.md), the Hopkins Book 4 source ledger under `docs/engineering/catalogue-block-two/intake/art/source/hopkins-housing-v1/`, and [furnished-house handoff](https://github.com/Syntaxswine/tinderbox/blob/e9fbc7bfbb5aa875ecc51f11883d75e65cf1eca3/docs/art/furnished-house/README.md). The [Hopkins No.9 plate](https://archive.org/details/DSHopkinsHousesandcottagesbookno40001/page/n20/mode/1up) is a useful further bay/entry comparison. Tinderbox's route work supplies a concrete lesson: a visually plausible stair, rail, doorway or trim can still obstruct the actual body. Its source records and module conventions inform this brief; no game runtime or asset is imported by it.

Preferred foundation: a coherent domestic room sequence, an attached corner bay and narrow wrap veranda, using ordinary shared wall/floor/stair/door parts. Preserve the first exterior study for compatibility. Give a changed shape an explicit profile and keep old saves bound to their original geometry.

## Proposed arrangement

The [machine-readable proposal](donnelly-house/plan.json) and [ground](donnelly-house/ground.svg), [upper](donnelly-house/upper.svg) and [attic](donnelly-house/attic.svg) drawings use nominal metre wall axes. Front/street is to the right; rear service rooms are to the left. Dimensions are rounded design choices. Finish thicknesses, cut ends, native openings and the retained source-envelope remainder need resolution before these axes become runtime geometry.

| Space | Proposed use and relationship |
| --- | --- |
| Entry parlor | Receive callers and hold conversation/music. Keep a direct route from the off-center door to the recessed stair hall; make the turret a seating bay of this room. |
| Second front parlor | Family sitting and reading. A wide paired opening allows the two rooms to serve larger visits; this connection is an inference. |
| Dining room | Table, chairs and sideboard; reach the service passage without carrying food through the receiving parlor. |
| Study/library | Desk, correspondence and quieter reading. Its use and fittings are proposed. |
| Main stair hall | A set-back circulation space connecting the main rooms and the upstairs landing. |
| Kitchen, scullery, larder and pantry | Cooking, washing, cool food storage and dry stores form a compact rear service group with its own outside entrance. |
| Optional back stair | A separate service route is period-compatible but unverified here. Reserve a store/back-hall alternative if it is omitted. |
| Four main upstairs chambers | Sleeping, dressing and washstands; each has its own landing door and an outside window. The front bay/window belongs to a room. |
| Rear chamber | A guest or household-worker room, chosen for the fictional household; no specific original occupant is asserted. |
| Shared bathroom and linen | Reach the bath from a corridor; stack wet services near the scullery. Plumbing/fitting dates are unverified. |
| Attic | A small optional work/storage room behind the gable windows, with low eaves treated separately. Its use and access are inferred and require actual roof-clearance checks. |

The turret's blind upper drum is decorative in this proposal. It does not automatically become a glass lookout room or another playable story. Lower and upper bays should belong to the adjoining parlor/chamber.

Two circulation sequences guide the design:

- Visitors: veranda → entry parlor → second parlor/dining; family reaches the recessed hall and principal stair from the parlor.
- Household work: rear entrance → kitchen/pantry → service passage → dining; the optional back stair joins the rear landing. Bedrooms are never mandatory corridors to other bedrooms or the shared bath.

## Dimensions and structural checks

The first study's front veranda is **5m** deep and its side veranda **4.2m**, read from the authored part bounds. Prefer a provisional **2m nominal** depth, preserving a useful walking strip beside chairs and the entry. This is a game-design recommendation, not a measurement recovered from the perspective photograph. Move the deck edge, posts, rails, eaves and projected upper bay coherently; attach the turret to the house rather than leaving it stranded beyond the wall.

Keep the engine's **2.12m floor pitch** and **0.12m slabs**. Proposed floor elevations are **0.848**, **2.968** and optional attic **5.088m**. The standardized height is an intentional game abstraction. It must not be described as a measured Victorian ceiling height.

For interior construction, prefer the existing full-story stair kit. A candidate twelve-rise flight arrangement gives approximately **0.177m** per riser. Reserve roughly **1.2m clear** flights/landings, and validate the actual kit's treads, railing, slab hole and headroom. These numbers are design reservations. The natural **one-eighth-story maximum** is a traversal policy, not a reason to replace proper internal stairs with tall blocks. Keep the porch approach's real treads and landing aligned with its support and collision data.

Do not cut door openings, stairs or furniture to a centerline test alone. Validate the selected character's complete body and foot support continuously. Preserve character scale; a larger body may require an explicitly wider opening/route profile. Ground/upper partitions and flues should stack sensibly; projected rooms need bearing beams/posts. A drawn window, door or floor is not a gameplay binding.

In particular, the retained 1.65m door recipe cannot by itself provide clearance for the 1.8m review body. Select an appropriate-height engine-owned insert or a verified open-transom assembly, preserving the legacy part and its profile. Do not shrink the character to make the room plan appear successful.

## Review the house as a house

The first exterior study has a gable-only main roof, an eight-sided turret and an uncovered approach where the source calls for a covered gabled entry. Its tower also reads as a separate object beyond the principal room block. Review the circulation repair and later interior/roof construction against these specific differences. Resolve attachment and massing before adding more trim, and record any remaining stylistic approximation explicitly.

| Check | Acceptance question |
| --- | --- |
| Room and facade | Does each principal window light an actual room at the same level? Does the circular window have a usable chamber behind it? |
| Roof massing | Do the hip, gables, projections and attic volume correspond to the rooms below, with consistent eaves and supported overhangs? |
| Porch | Can a person pass a chair, reach the entrance and turn at the landing without a ballroom-sized veranda? |
| Entrance | Does the covered stair lead to the intended single entrance and receiving room, with a clear door swing? |
| Turret | Is it attached to the corner room, and does its faceting/upper treatment follow the building evidence? |
| Privacy and work | Can callers, family and service work circulate sensibly without treating bedrooms or stores as through-corridors? |
| Climate | Do shaded verandas and operable sash positions support plausible daylight and cross-ventilation? |
| Structure | Do posts, beams, upper walls, chimneys and roof edges have plausible support and vertical continuity? |
| Physical wiring | Do the visible tread, actual support height, complete-body clearance and saved pose agree through an ordinary full route? |
| Style | Are sash proportions, shingle/clapboard changes, spindle rails, brackets and restrained furniture consistent with the selected period interpretation? |

## Accuracy, efficiency and narrative

**Accuracy:** the building-specific description controls the known exterior/entry facts. Rear partitions, room uses, plumbing, secondary stair and attic use are interpretations. A measured original plan or interior survey would supersede them. Current roof/turret mismatches belong on the architectural backlog rather than being excused by decorative trim.

**Efficiency:** reuse a small catalogue of native room/floor/opening/stair parts and derive their render/support/collision projections from one authored source. Keep optional interiors and furnishings separate from the streamed town exterior. This is a code/design estimate; no processor or handset improvement is claimed.

**Narrative:** a receiving parlor, private chambers, domestic service route and shady veranda make the house readable as a lived-in late-Victorian home. This is the preferred game interpretation. A later lodge conversion would need its own explicitly different room/use profile.

## Implementation order and acceptance

1. Correct the existing porch/stair experience under a new compatible profile; reproduce normal keyboard/joystick ascent, descent, diagonal contact, stopping, reversal and landing turns. Keep the original profile/saves usable.
2. Review this room sequence and the exterior style audit before replacing the closed exterior shells with interiors.
3. Build one complete route using real shared parts: approach → door → parlor → hall → stair → upper landing → one chamber → return. Verify opening/closing, full-body support/headroom, visibility cutaway, save/reload, undo/redo and import/export where applicable.
4. Add the remaining rooms/furnishings, optional service stair and attic only after that route is proven. The same room/part IDs should carry appearance, physical projection and interaction metadata, with unsupported capabilities refused explicitly.

Existing tree placements, the depot, railway data, original vendor bytes and other games' pins remain protected. This brief adds no interior capability or live game adoption claim.
