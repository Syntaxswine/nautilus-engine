# Nautilus modular engine blueprint

Status: approved for implementation by the user, 29 October 2026. Original review baseline: Nautilus **0.7.0**, main commit `e2214939080a24ad83b8c2b80614744e6a2b38e7`. The [0.8 foundation checkpoint](modular-foundation.md) records implementation and remaining work. This blueprint remains the target architecture; it is not a claim that every subsystem is complete. [Source inventory](reviews/2026-10-29-engine-blueprint.sources.json).

Nautilus should offer a menu of useful systems. A new game selects a working combination of lighting, characters, assets, movement, physics, statistics and other services; an older game starts with one module while retaining its working systems. **Farmyard Commando is the first production adoption target.** AFT and Tinderbox remain donors and subsequent consumers, with existing asset exchange and the prepared Tinderbox adapter preserved.

“90% there out of the box” is the product goal for common infrastructure in a chosen game recipe, not a measured claim about current completeness or every genre. The remaining work should chiefly express the game's identity: cast, missions, balance, story, special rules and authored content. Track time to first playable scene and remaining host code rather than estimating readiness from the number of modules.

## Adoption paths

| Path | What a game selects | What the game retains |
| --- | --- | --- |
| Borrow content | A reviewed asset collection, materials, animations or procedural builder | Its renderer, simulation, controls, saves and game rules |
| Adopt one system | A public rules, item, lighting, input or other module with explicit bindings | All other working systems; a narrow adapter translates at the boundary |
| Compose a game | A tested starter recipe plus selected providers | Game-specific content and policies; providers can still be replaced |

There must be no mandatory renderer for statistics, RPG sheet for lighting, physics solver for asset discovery, editor for runtime play, or turn scheduler for a real-time game. A composition tool must show transitive dependencies, required bindings and costs before enabling a module. A host-supplied service can satisfy a dependency without replacing that service with an engine implementation.

## What exists and what is missing

“Existing” means a supported Nautilus public boundary at this baseline, not adoption in all three games. Donor implementations and unmerged artist/editor branches are candidates until separately reviewed and integrated.

| Area | Baseline | Missing work |
| --- | --- | --- |
| Maps and authoring | Headless map/block facade, editing/history, validation, generation, portable formats and browser workshop | Neutral content/spawn registries; a reusable runtime compiler and adoption tooling beyond the inherited AFT profile |
| Schemas and capabilities | Versioned requirements, compatibility diagnostics, explicit map migration, golden fixtures | Compose requirements across selected runtime modules and validate the actual providers supplied by a game |
| Distribution | Public exports, file whitelist, separate core/renderer/building-assets profiles, installed-package proof, main/release policy and CI | Tested game recipes, dependency/cost reports and broader consumer conformance; preserve the existing distribution discipline |
| Buildings and roofs | Shared discovery, optional building loaders, procedural buildings and gable/hip/shed shells | Complete semantic bindings for collision, traversal, doors and materials; joined roof generation remains separate work |
| Rendering and lighting | Optional Three adapters, shared Three entry, golden contour effect and inherited editor rendering | Engine-owned scene/lighting/camera facade, selectable quality, explicit loading and disposal; donor rigs are not yet a complete public lighting module |
| Characters and animation | Headless portable sheets; donor models, paint, equipment and animation systems available as sources | Public actor/rig/animation/attachment loader, stable animation semantics and audited asset closures |
| Rules and progression | Optional character/check/combat/dialogue APIs, explicit roll profiles and saved streams; basic progression | Consumer bindings and full game adoption; game scheduling, eligibility and casualty policies remain outside the cores |
| Items and interactions | Bounded rock pickup/throw/impact/hearing contract; optional rock mesh | General inventory/equipment/loot/door transactions, actor animation binding and a production distraction workflow |
| Geometry and physics | Host query boundaries; specialized rock flight | Shared collision/query/navigation/visibility providers, dynamic obstacle updates and optional further physics |
| AI, sound and missions | Some result/event contracts and donor implementations | Reusable optional audio/perception/investigation services and mission/objective primitives; authored behavior stays game-owned |
| Runtime and controls | Editor host bridge and isolated examples | Optional composition/lifecycle services, command routing, PC/phone control providers, game cameras and reusable game UI |
| Persistence | Map envelopes, character/item/progression state and bounded Tinderbox authoring scene saves | Coordinated world snapshots, atomic multi-module commits, checkpoints, journal archival and recovery |

Map saves are not whole-game saves. A placed building is not proof of collision or fire support. A catalogue entry is not a complete character/animation API. The Tinderbox flat-yard adapter is conformance-tested against pinned game code, but its documented restrictions still apply.

## Shared contracts before shared machinery

Keep `map-core` and `rules-core` plain-data, deterministic and loadable in Node without DOM, storage, rendering or an internal clock. New runtime services belong behind optional consumer adapters. The host owns authoritative state, scheduling and durable commits; it can use its existing services or choose Nautilus providers.

Every new or materially revised part follows the [component handoff standard](component-handoffs.md) and its [copyable guide](templates/component-handoff.md). Builders receive public connections, a working example, remaining game decisions and an acceptance checklist. Standard recipes bind known semantic parts after the game supplies compatible providers; incomplete recipes or unsupported geometry remain visible gaps. The title-screen template follows the same handoff while each game supplies its identity, save and session policies.

The first contract tranche needs these small, explicit agreements:

1. **Identity and requirements.** Stable module, content, entity, command and event IDs; separate package, schema, capability and policy versions. A selected module declares required/optional capabilities and provider interfaces. Reject missing providers, version conflicts and dependency cycles before mutating a live scene. Proposed recipe names are not new public exports until implemented and versioned.
2. **Lifecycle and ownership.** Describe who creates, shares and disposes each resource. Optional services have explicit prepare/start/stop/dispose behavior, including partial-start rollback. No import starts a timer, fetch, audio context or renderer. Removing one module must not close the host's shared renderer or dispose another module's textures.
3. **Space and content.** Declare metres, ground axes, native height, floor conversion, origin, pivots, bounds and attachment sockets. Layer indices are not metres. Preserve the inherited distinction between wall height and floor interval. Converters must specify their transforms rather than independently rescaling visuals and collision.
4. **Commands and outcomes.** Inputs express intent; previews are pure. The simulation revalidates reach, knowledge, resources and ownership at commit. A committed event has a durable identity; UI, animation and sound consume it without awarding damage, loot or XP again. A successful attack roll remains separate from a confirmed geometric impact.
5. **Time and randomness.** The host explicitly advances each provider and saves its clocks and named random streams. Turn/AP rules, continuous movement and fixed-step effects can coexist through adapters. Preserve rock-v1's existing 90 Hz/time-unit contract rather than imposing it on every subsystem. Render frame rate must not become an implicit gameplay clock.
6. **Persistence and compatibility.** Each selected provider declares its state schema, migration and required content/policy pins. Save references and plain data, never renderer objects or callbacks. Unknown required behavior rejects before play; optional opaque data survives only where its existing contract permits it. Strict schemas retain their rejection rules.

Do not introduce a universal entity framework or global event bus as a prerequisite for borrowing a function or asset. First prove that the same narrow contracts can be supplied by Farmyard's existing systems and a second host.

## The module menu

The names below describe proposed responsibilities, not packages that already exist. A module can have a pure data component and a separately selected runtime/presentation provider.

| Module | Minimum useful delivery | Required bindings or dependencies |
| --- | --- | --- |
| Content registry and loader | Stable IDs, immutable source/version metadata, dependency closure, demand loading, progress/errors, cancellation and disposal | Host URL/transport policy; renderer provider only for rendered resources |
| Rendering and lighting | Scene assembly, daylight/interior lights, material bindings, shadows, cutaways and quality presets | Host renderer/camera, geometry and selected content; no gameplay truth in draw callbacks |
| Actors and animation | Existing characters, skins, stances, movement clips, equipment sockets, throw clips and semantic markers | Content loader, host actor state and animation clock; character statistics optional |
| World queries | Rays, swept shapes, support/clearance and overlap queries with stable hit/surface IDs | Host or engine geometry provider; explicit coordinate and collision policies |
| Movement and navigation | Actor footprints, paths/steering, dynamic doors, stopping/replanning, floor/traversal links | World queries; selectable grid/continuous movement and game cost policy |
| Physics | Existing specialized projectile behavior first; selectable kinematic/projectile providers | World queries and host clock. Add a rigid-body backend only when a consumer needs it; version its saved behavior separately |
| Inventory and equipment | Item instances, containers, stacks, equipment slots, capacity policy, pickup/drop/transfer and atomic costs | Host item/actor IDs and commit authority; spatial-grid and weight policies selectable |
| Interactions | Inspect/use/open/close/search/loot/treat previews and commands, locks, stale-action rejection | Queries, optional inventory/rules/cost providers; host decides consequences |
| Statistics and combat | Existing sheets, checks, progression and explicit attack profiles, plus portable world bindings | Consumer selects these APIs; turns, damage causes, ammo and confirmed impacts stay explicit |
| Perception and AI | Visibility/hearing queries, knowledge state and a bounded investigation controller | Queries, optional navigation, host sensory/alert policy and saved AI state |
| Audio | Demand-loaded cues, bounded voices, spatial placement, mute/volume and resumed-context handling | Host browser/audio lifecycle and committed events; hearing simulation does not depend on audible playback |
| Input, camera and UI | Rebindable intent commands, focus/modal rules, inspection, HUD, inventory and character panels | Selected PC/phone profile; host authoritative previews and events |
| World persistence | Atomic snapshots/checkpoints, provider manifests, journals, import validation and recovery | Host storage adapter; serializers for the selected authoritative providers |
| Objectives and encounters | Optional conditions, objective progress and deterministic trigger receipts | Host mission data and committed world events; no required campaign or invented cast |
| Authoring and developer tools | Module picker, recipes, importer reports, semantic previews, debug overlays and conformance runner | Selected providers and content; standalone editor remains optional |

A useful dependency route is **public rules alone → content/actor binding → world queries and actions → complete persisted workflow**. Inventory can use an existing host store; animation can use an existing host rig. Avoid building a replacement for every service before the first game can benefit.

## PC and phone profiles from the donor games

Profiles have three independent axes: **input/presentation**, **game rules**, and **device quality**. Portrait touch does not require simpler combat; desktop does not require richer fire. A game can select phone controls with a tactical policy, or desktop controls with the same policy.

### Farmyard: portrait phone foundation

Use the committed [README](https://github.com/Syntaxswine/farmyard-commando/blob/279d2d34786b3e6e5c5baeeac6898e60030afdbe/README.md) and [phone art/adaptation rules](https://github.com/Syntaxswine/farmyard-commando/blob/279d2d34786b3e6e5c5baeeac6898e60030afdbe/sites/tactical-animal/ART_DIRECTION.md) as the initial phone contract:

- Preserve portrait framing, safe-area spacing, readable markings, reduced-motion behavior and demand-loaded art. The source explicitly gives the zoom keys 44-pixel touch targets; it does not establish a universal physical-device performance budget.
- Retain the lower central thumbstick, upper zoom/map controls, lower action controls, and held horizontal choices for stance/movement. Inspection, opening a menu and choosing a preview do not spend resources. Modal aiming owns the stick and blocks accidental movement/end-turn commands; explicit confirmation commits the action.
- Preserve visible health/AP and contextual actions with clear labels. Camera inspection must not turn, target or attack with the actor, reveal hidden opponents, or alter fog. Fading foreground walls is a presentation operation, not a visibility change.
- Keep the painted materials, silhouettes, crop frames, species identity and readable control states. A visible solid needs a matching gameplay footprint. Load only content used by the selected screen/mission; release operation-owned resources on change.

Farmyard's solo actor, continuous metre-based movement/AP, free stance switches and mission/treatment rules are **game policy**, not universal phone rules. Existing keyboard support remains useful. Its separate inherited designer retains a desktop layout, so a phone game runtime does not imply a completed touch editor.

The reviewed README describes an older two-operation slice. The same pinned build has Road Checkpoint and a 240-by-240 world with a moving nine-block render neighbourhood. Its renderer caps pixel ratio at 1.75 and shadows at 1024 squared; these are existing settings, not measured device budgets. See the [large-sector contract](https://github.com/Syntaxswine/farmyard-commando/blob/279d2d34786b3e6e5c5baeeac6898e60030afdbe/docs/missions/large-sector-milestone.md) and current runtime files in the inventory.

The [mission play rules](https://github.com/Syntaxswine/farmyard-commando/blob/279d2d34786b3e6e5c5baeeac6898e60030afdbe/docs/missions/first-shift.md) specify one animal, one floor, objectives plus extraction, and no required class/weapon solution. Their six-to-twelve-minute duration is a playtest target, and their old 40-by-30 backing-array limit is superseded. The current area control handles grenades and flamethrowers. Bounded persistent fire, destroyed-tank state and authored transparent/breakable windows also exist despite older README limitations; legacy opaque windows intentionally retain their behavior. Transient attack playback receipts are omitted from saves and must not replay on reload. Preserve these through deliberate adapters, using the [fire record](https://github.com/Syntaxswine/farmyard-commando/blob/279d2d34786b3e6e5c5baeeac6898e60030afdbe/docs/reviews/fire-and-tanks/README.md) and [window contract](https://github.com/Syntaxswine/farmyard-commando/blob/279d2d34786b3e6e5c5baeeac6898e60030afdbe/docs/window-integration-contract.md). Planned later missions and campaign unlocking remain targets.

### AFT: desktop tactical foundation and control gaps

Use [the 3D battle controls](https://github.com/Syntaxswine/animal-factory/blob/b23334cb77f82e2373b9552b0d8752271a18326e/dist/tactics/battle-3d.js), [the desktop design](https://github.com/Syntaxswine/animal-factory/blob/b23334cb77f82e2373b9552b0d8752271a18326e/dist/tactics/DESIGN.md) and [the evolving rules](https://github.com/Syntaxswine/animal-factory/blob/b23334cb77f82e2373b9552b0d8752271a18326e/docs/tactics/RULES.md) as separate evidence:

- Preserve pointer selection/order, drag panning, Shift group selection and wheel zoom as donor patterns. Keep camera/focus operations separate from authoritative movement/attacks, and provide explicit cancellation.
- The older sprite UI documents and implements first-click target selection, second-click shot confirmation, F/Attack and additional shortcuts. The current 3D battle selects on repeated enemy clicks and uses an explicit Fire action; its battle key handling is much narrower. These are distinct existing implementations, not one proven desktop control profile.
- Specify a complete rebindable keyboard route, focus handling, modal ownership and equivalent button actions as **new shared-profile work**. Do not claim inherited shortcuts work in the 3D battle without exercising them there. Prevent gameplay shortcuts while typing or interacting with a modal.

The authored [hybrid migration rules](https://github.com/Syntaxswine/animal-factory/blob/b23334cb77f82e2373b9552b0d8752271a18326e/docs/tactics/HYBRID-MIGRATION.md) require buttons, hotkeys and headless commands to reach the same action functions. The [3D editor proposal](https://github.com/Syntaxswine/animal-factory/blob/b23334cb77f82e2373b9552b0d8752271a18326e/docs/tactics/THREED-EDITOR-PROPOSAL.md) requires camera gestures to avoid competing with drawing, button alternatives, logical picking and renderer-independent edits. Preserve the [delivered editor contract](https://github.com/Syntaxswine/animal-factory/blob/b23334cb77f82e2373b9552b0d8752271a18326e/docs/tactics/THREED-EDITOR-EDITING.md): preview during a gesture, commit on release, one gesture per undo, cancellation, and shortcut suppression in form fields. These provide stronger shared requirements than copying every old shortcut. Free camera orbit is a later proposal, not delivered behavior.

AFT squad size, primary-member equipment control, stance/AP costs, grid movement, permanent training, casualty rules and campaign travel belong to its gameplay profile. DESIGN explicitly labels its original small-map rules historical. The chronological RULES document also contains superseded values: for example, current inventory code uses a 6-by-3 backpack rather than the prose's older 4-by-4 grid. Use current code and focused tests when resolving conflicts. The inherited four starts, travel marker and content allowlists remain an explicit map compatibility profile, not a requirement for every Nautilus game.

### Shared acceptance for both profiles

The same command and preview can be driven by touch, pointer or keyboard, while presentation can choose a different confirmation flow. Verify keyboard focus, cancellation, rebinding, reduced motion, readable feedback, resized layouts and safe areas. Test touch on a named physical phone as well as a browser viewport; test keyboard/mouse in the actual desktop game. Device quality selects rendering/effect budgets without changing saved gameplay truth. Native packaging is a later platform delivery, not evidence supplied by a browser prototype.

## Design choices and preferences

These are provisional recommendations following [accuracy, efficiency and narrative](design-evaluation.md). CPU observations here are code-based estimates, not benchmarks; narrative preferences are judgments. Existing compatibility profiles remain available.

| Difference | Accuracy | Efficiency | Narrative and preferred use |
| --- | --- | --- | --- |
| AFT grid movement versus Farmyard continuous movement | Continuous positions represent arbitrary stopping and accepted movement distance; a grid explicitly abstracts space. Neither establishes physical calibration | Continuous sweeps/replanning and grid searches have different workload costs; measure comparable actors/obstacles before claiming a winner | Prefer Farmyard movement for its existing solo phone game and a continuous starter. Preserve grid/AP movement for AFT's squad tactics. Share query/cost interfaces rather than converting all games to one model |
| PC controls versus portrait touch | Input layout has no inherent physical-simulation advantage | Layout/gesture and rendering costs must be measured independently; fewer visible controls alone is not a CPU result | Prefer Farmyard's contextual thumb/held-choice patterns for its portrait game; explicit pointer/group control for squad desktop play. Share commands while retaining distinct ergonomic flows |
| Inspection/preview versus immediate action | Pure previews and fresh commit checks improve consistency, not physical realism | Recheck authoritative facts at action boundaries; cache only against explicit revisions | Prefer safe inspection and explicit confirmation for costly actions on both platforms. Preserve the reviewed legacy confirmation flows through mappings |
| Public core versus direct donor internals | A facade improves portability and validation, not simulation fidelity | Selective imports and measured resource closures can avoid unused work; extra adapters have their own cost | Prefer engine-owned plain-data contracts and optional host providers. Existing games keep their working services during migration |
| Reusing visual geometry versus authored semantic bindings | A matching footprint/material/opening model better represents contact than a decorative mesh alone; visual bounds are only an approximation | Shared compiled query data can avoid repeated mesh traversal; cost depends on shapes and update frequency | Prefer explicit semantic bindings for playable solids. Permit appearance-only borrowing when the consumer declares that scope |

For attacks, fire, climbing and damage, retain the [existing three-criterion assessments](reviews/2026-10-28-design-tradeoffs.md): direct percentage checks for a general hit decision; AFT's richer trajectory where its consequences matter; detailed Tinderbox fire where fire is central; cheaper tactical fire where that is the game's chosen abstraction. Platform selection must not silently change those rules.

## Saves, transactions and long campaigns

The world-save tranche needs an envelope containing exact provider/content/profile requirements, stable entity references, each selected module's authoritative state, simulation clocks, named RNG streams and committed command/event identities. Validate all components and references before replacing live state. Stage migrations against a copy and keep the original save recoverable. A failed load must leave the current game intact.

Commit actor/resource changes, item ownership, world state and receipts atomically through a host persistence adapter. Define crash recovery and conflict behavior: reject stale expected state, publish effects only after commit, and do not replay sound, damage, XP or loot when loading a snapshot. A component revision alone cannot protect resource changes made outside that component; retain the progression contract's complete expected-state comparison.

Progression currently permits 4,096 receipts and has **no archival operation**. Before a long-campaign claim, design and test a versioned checkpoint/archive strategy that preserves reward uniqueness and auditability. Never silently drop old receipts to make room. Existing map/character/item schemas and their unknown-field policies stay unchanged until an explicit migration is reviewed.

## Farmyard adoption and retrofit procedure

Begin with a deliberately small production dependency: **the existing shared derived-stat/rules calculations**, with a Farmyard adapter that preserves its current results and resources. This proves an external public import without replacing movement, AI, missions or controls. Select an exact release/package and run conformance in the game repository as a separate reviewed change. Do not activate new progression balance as an incidental result of adopting stat math.

For every older game:

1. Inventory its working services, formats, units, content and policies. Choose one seam and name what remains host-provided. Save representative fixtures and baseline behavior before changing it.
2. Map identities, axes/heights, resources and policies explicitly. Preserve original saves/assets; report unsupported required features with paths and remedies. A converter writes a new result and migration receipt, not an in-place rewrite of the source.
3. Run old and adapted implementations on deterministic fixtures. Require parity where compatibility is promised, save/reload equivalence and rejection tests. Approve intentional behavior changes separately.
4. Test the installed engine dependency without donor/editor/private imports or sibling checkouts. Preserve host-owned fields rather than squeezing a whole game object into a portable character sheet.
5. Adopt the exact pin, run the game's checks and actual workflow, document remaining limits and a rollback path. Repeat at the next seam only after this one works.

The next complete Farmyard workflow should use its **existing characters, painted scenery and throwing animation**: approach a rock, pick it up, aim/confirm a throw, release it at the specified simulation time, resolve first contact, present a sound cue, and let an eligible guard investigate. Save/reload carried and midflight states and a guard's investigation without duplicate costs/cues. Visual failure must not duplicate or undo committed gameplay. Animation markers need a documented exactly-once binding and cancellation policy; they must not award effects independently of simulation.

This is the acceptance target, not a claim that the rock demo already uses the full shared character library. Keep existing Farmyard grenades, windows, fire and loot behavior until separately adopted. Demonstrate a second consumer supplying its own services before calling the adapter pattern reusable; AFT is the desktop contrast, and Tinderbox is the real-time contrast.

## Ordered delivery tranches

Assignments below are proposed bounded work for the existing helpers. The architect owns contract decisions, full-commit intake, review and integration. This blueprint does not dispatch a wholesale rewrite or change another game's pin.

| Order | Deliverable and proposed owner | Depends on | Exit evidence |
| --- | --- | --- | --- |
| 1 | **Contract inventory and Farmyard seam.** Architect + Coder document supplied providers and build the stat/rules adapter candidate | Existing public rules | Installed public dependency; deterministic result/resource parity; original fields/saves preserved; explicit rejection cases; separate game adoption review |
| 2 | **Content, lighting and actors.** Coder owns public facades; Artist supplies existing rigs/materials/socket/clip mappings; UI reviews loading/errors | Ownership/space contracts from 1 | One existing Farmyard actor/weapon/throw clip and a lit scene loaded through public interfaces; unused collections stay unloaded; repeated load/unload and failure cleanup pass |
| 3 | **Optional runtime and query providers.** Coder with Architect; Editor supplies authoring/query fixtures | 1; can use host content providers | Host or engine services satisfy the same contracts; missing/conflicting providers reject before start; clocks, sweeps and door updates are deterministic and disposable |
| 4 | **Actions and world persistence.** Coder owns inventory/interaction/commit/save adapters; UI owns previews and transaction feedback | 1 and 3 | Pickup/transfer/use/open/close are atomic; stale/repeated commands cannot duplicate; save failure/reload preserves resources, ownership, clocks and events; explicit journal-capacity/archival tests |
| 5 | **Farmyard complete slice.** Architect integrates; Coder + UI bind gameplay; Artist reviews existing asset/animation use | 2–4 | Real pickup → aim → animated release → contact/noise → investigation; save/reload and cancellation checks; phone controls and game regressions pass; no donor internals |
| 6 | **PC and phone providers; second consumer.** UI leads controls/camera/HUD; Coder binds commands; Architect owns AFT intake | 1; use 5 as first proof | Actual desktop and touch workflows, focus/modal/keyboard tests, physical-phone evidence; same contracts work with a second game's retained services |
| 7 | **Authoring semantics and starter recipes.** Editor leads module/content selection and importer reports; Coder builds semantic compilation; Artist supplies bindings | Proven contracts from 2–6 | New project reaches a playable saved scene without hand-copying donor runtime; imported unsupported data fails visibly; editor edits/history/export/reload match runtime geometry |
| 8 | **Release and adoption kit.** Architect + Coder; UI/Artist review examples | Each accepted tranche; not deferred until everything is finished | Minimal documented recipes, exact pins/notices, package closure/size reports, measured device budgets, migration/conformance fixtures and verified main/CI promotion |

Tranches 2 and 3 can proceed independently after the shared contracts are reviewed. Each tranche must remain useful on its own and can stop at a host-provided service. Publish accepted capabilities incrementally rather than promising the entire menu in one release.

## Authoring and content work to keep visible

The [extended-height and floor-navigation plan](extended-height-plan.md) adds the fifteen-story use case: five visible floor labels, desktop floor controls, phone character/contact follow and a versioned height contract beyond the current six-layer limit. The initial 32-floor capacity target is provisional; sparse storage, semantic traversal, legacy compatibility and consumer support must be proven before the engine advertises taller gameplay.

The rectangle-building workflow still needs a semantic assembly compiler: walls, floors, openings, trim and roof settings become stable parts with matching render/query data. Current sloped shells do **not** union overlapping roofs. Joining L/T/H footprints, valleys/ridges and unequal eaves heights needs its own versioned geometry capability, deterministic fixtures and explicit rejection of unsupported combinations. Do not label decorative overlaps as solved intersections.

Double doors need paired leaves, hinges/clearance, lock/open state, navigation/sight/projectile updates, interactions and persistence, not just a wider visual opening. Custom assets and historical/fort variants can share the same declared sockets, scale, standard story-height profile and semantic parts. A material/skin change must not silently grant castle-wall durability, fence permeability, catwalk navigation or Tinderbox fuel behavior.

Species/class perks remain a future extension. The approved baseline is basic practice and scaling XP with 15 assignable stat points per level. No new cast, class tree or species ability is required by this blueprint. Networking, console/native packaging, arbitrary rigid-body simulation and a universal campaign are later demand-driven capabilities, not prerequisites for the first Farmyard adoption.

## Acceptance scorecard

For each selected recipe, record supported versions, supplied bindings and limitations alongside evidence:

- **Portable:** offline installed-package consumer, public imports only, headless closure checks, no missing assets/licenses and no undeclared mandatory modules. Test asset-only and rules-only adoption as well as a composed scene.
- **Correct and durable:** deterministic fixtures, negative capability tests, fresh commit checks, malformed/cross-version rejection, migration originals, cross-reference validation, mid-action reload and duplicate/recovery tests. No resource refills on load or training.
- **Usable:** real existing assets/animations, clear failures/loading, PC and phone workflow checks, focus/cancellation/reduced motion, and edit → export → play → save → reload equivalence when authoring is affected.
- **Bounded:** record named device/runtime, representative scene/actor counts, loaded/download bytes, startup time, memory, CPU/frame-time distribution, draw calls and active effects/voices. Set budgets from the first baseline and compare the same workload after adoption; viewport screenshots do not prove physical-phone performance.
- **Maintainable:** one seam adopted in Farmyard, another host using the same contracts, a minimal starter, adapter template, compatibility policy, exact release pin, changelog and ownership/disposal documentation. Measure integration time and remaining game-specific code before reporting progress toward the 90% goal.

Run the repository's required checks for accepted changes and the affected installed-package, consumer, browser and visual checks. Deliver reviewed changes through [main promotion](releasing.md). Shared asset availability, prepared adapters and production adoption remain separately reported.

## Source interpretation

PC references use AFT commit `b23334cb77f82e2373b9552b0d8752271a18326e`; phone references use Farmyard commit `279d2d34786b3e6e5c5baeeac6898e60030afdbe`. Full file identities and SHA-256 values are in the source inventory. These are **design references only**: no donor bytes are imported, no existing `upstream.json` pin changes, and no source branch is treated as a moving dependency. Existing simulation recommendations retain their separately recorded source pins.

When prose, chronological rules and current code disagree, record the difference and verify the chosen behavior against focused tests before implementation. Do not silently treat an older slice description, a planned shortcut or an artist asset as a completed runtime capability.
