# Stacked tile authoring

Status: bounded stacked authoring workspace. The public v1 tile core remains
the geometry and repair authority. The [stacked tile workshop](../examples/tile-stack-editor.html)
provides the live reference workflow; the [earlier workspace](smart-tile-editor.md)
retains its original three-layer compatibility profile. Acceptance and current
limits are recorded in [the integration review](reviews/tile-stack/architect/integration.md).

## Optional components

| Entry | Responsibility | Host services |
| --- | --- | --- |
| `@nautilus-engine/core/tiles/stack` | Pure finite rectangle-stack intent and constraint planning | Actual public `tiles` namespace, accepted source and captured context |
| `@nautilus-engine/core/tiles/finishes` | Immutable finish catalogue and saved-choice validation | Exact catalogue binding and source eligibility |
| `@nautilus-engine/renderer/tiles/finishes/three` | Optional cosmetic material leases over public geometry | One borrowed Three namespace, reviewed atlas, ordinary supported base materials and current view ticket |

None takes over a game's world, inventory, clock, collision, movement, fire or
save authority. A consumer can borrow the planner or finish library separately.
The original `tiles` API, portable map/block formats and existing Smart Tile
workspace remain separate compatibility contracts.

## Source and heights

A new stacked workspace retains the complete original three-layer map JSON,
the canonical public-v1 tile bundle, explicit floor binding, exact finish
catalogue binding and typed stack constraints. Additional authored floors do
not become fictitious legacy map layers. The fifteen-floor compatibility
profile supplies elevations `0, 2.12, 4.24, …, 29.68` metres; a second explicit
nonuniform profile demonstrates that labels and ordinals cannot supply height.
The floor table is immutable for the lifetime of this workspace.

Source remains editable analytic geometry. Supported stack members are level
axis-aligned rectangles under D4 placement, with explicit conservative primary
reservations. Positive-area projected overlaps require ordinary persisted
`cross` relations for every affected pair. All additional reservations and
old/new neighbours remain subject to public preparation. Projected edge/near
separation, graded or unsupported affected geometry refuse with actionable
diagnostics; no height filter hides a contact obligation.

The reference tower has fifteen aligned 8 × 4 m surfaces, each with a 0.12 m
declared reservation interval. One stack operation creates all 105 crossings
at the requested 2 m clearance, locks the fourteen lower owners and leaves
the top owner editable. Those values describe one fixture, not universal
storey heights or structural requirements.

Minimum clearance is source, not a value selected to make a result pass. A new
intent may strengthen requirements on changed pairs while retaining stronger
saved requirements and unrelated pairs. The accepted workspace minimum stays
unchanged. A named source reservation is a conservative authoring envelope;
the visible surface remains thin and does not grant a physical slab, underside,
support, traversal or navigation capability.

## One authoring authority

The stacked editor uses the shared checkpoint codec, storage authority,
retained tile consumer, input owner and history. Its v2 operation targets the
bundle and constraints together. The complete source and target document,
floor/profile/catalogue, context and request digests bind the same operation.

Review prepares once through the actual retained consumer. Apply adopts one
complete document and one history entry. Refused or stale requests preserve
accepted source, constraints, redo and view. Undo/Redo restores the exact full
document rather than re-planning a reverse geometry edit.

An unknown acknowledgement freezes further editing and overwriting saves
until authoritative recovery of the original request ID. A positive commit
followed by display failure stays committed; retry only acquires presentation.
No second constraint save, journal reset, receipt restamping or implicit
conversion of an existing v1 workspace is permitted.

## Floor and finish presentation

The borrowed floor controller displays at most five available labels with
previous/next controls. PageUp/PageDown and a wheel gesture over the floor
control change the selected floor on an owned desktop target. Canvas wheel
remains camera zoom; forms, dialogs, composition and modifiers retain their
input guards. Plane or mode changes retire active drawing and review ownership
before changing the context.

Selected-floor, overview and cutaway presentation use actual authored native
elevations. Hiding a floor does not change geometry, budgets, constraints or
saved source. Character-follow and contact/eye actions require real host
subjects and services; authoring does not fabricate them.

Four optional painterly families reuse the existing reviewed atlas: brick
pavers, stone flags, timber boards and poured concrete. Cosmetic skin is
independent from physical boundary material. Source controls, ports, canonical
positions/normals/tangents, material intervals and UV phase remain unchanged.
The existing painterly, slate and sandstone skins remain compatibility choices.

Finish materials and their leases are owned; host Three, atlas, base materials
and geometry are borrowed. Unsupported material/shader profiles refuse before
allocation. Retire appearance bindings before geometry, preserve later
host-owned overrides and keep unverified retiring allocations charged.

## Limits and builder checklist

The reference editor retains 32 authored owners/recipes and bounded planning
work. All accepted, candidate, acquiring and unverified retiring views share
two roots, 50,000 triangles and 1,024 derived cells. Fifteen 8 × 4 m decks use
480 one-metre cells per view, or 960 for accepted plus candidate. Hidden floors
still count. These are deterministic source/work counts and reference ceilings,
not measured phone or GPU performance.

Before adopting these components:

1. Bind actual public namespaces, complete immutable floor/catalogue metadata,
   the original source and explicit supported/refused consumer capabilities.
2. Plan finite intent, prepare once, then bind the actual retained result and
   next constraints to the same complete target and final write lease.
3. Keep full-document history, persistence and same-ID recovery atomic. Test
   unknown outcomes, rejected edits, stronger requirements and borrowed-resource
   failures without changing accepted state or replaying effects.
4. Review fifteen/nonuniform floors, locked lower owners, top finish changes,
   native heights and original anchors/controls with actual public providers.
5. Reopen full saves and portable resources. Legacy/game export must refuse
   unsupported additional tile floors explicitly while preserving the source.
6. Verify source, built and actual installed paths and resource cleanup. A
   component fixture or screenshot does not prove a live authoring transaction
   or physical-device performance.

## Design choice

**Accuracy:** Explicit native floor identities and original authored controls
preserve meaning across saves. Declared clearance is distinguished from a real
physical floor or simulation capability.

**Efficiency:** Reusing public repair and one transaction/input coordinator
avoids a second resolver or history. The pair count is quadratic: fifteen
aligned owners require 105 relations. These are code-based assessments and
fixture counts; representative device timings remain a separate measurement.

**Narrative:** A shared floor/finish workbench lets games borrow useful building
tools while retaining their own movement, fire and story policies. This is a
product preference. Compatibility heights remain an explicit profile rather
than a universal building rule.

The [tranche blueprint](projects/tile-stack-authoring.md) and fixed review
records document implementation boundaries. Custom tile workbenches and local
overlays follow their [separate blueprint](projects/custom-tile-authoring-and-overlays.md).
