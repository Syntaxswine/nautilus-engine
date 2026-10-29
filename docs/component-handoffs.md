# Component handoffs and standard wiring

Status: required handoff format for new and materially revised Nautilus components, 29 October 2026. Existing components acquire the format as they are reviewed; this document does not claim that every catalogue part already has runtime behavior. Use the [copyable handoff template](templates/component-handoff.md) for an asset, behavior module, UI component or starter recipe.

A builder should be able to select a part, see what it needs, run its example and follow a checklist to connect it to a game. Connect a game's retained services once through a small adapter. Standard recipes then bind compatible parts through declared identities and profiles instead of asking each building or character author to copy donor code.

## What every part must tell the builder

Expose a usage-card link through the component's public catalogue, guide index or adjacent documented metadata. The card points to a maintained guide, the smallest working consumer and its acceptance checklist. Include this material in the installed distribution that supplies the component. Do not make a rules-only or asset-only user load the editor or title screen to find it.

A complete guide snippet can be the minimal example if it works with the installed public entry and identifies every host function. A larger interactive reference yard may remain in the source/static workshop, linked at a fixed reviewed commit; it need not inflate each runtime package.

| Card field | Required information |
| --- | --- |
| Identity and status | Stable component/content ID, public entry, package/API/profile/schema versions, supported capabilities, source pin/notices and status: proposed, reviewed candidate or released. Keep these versions distinct. |
| Purpose and scope | What the component does, supported use cases, prerequisites and what a successful adoption demonstrates. Label appearance-only assets explicitly. |
| Connections | Required and optional services, supported interface versions, the host values/callbacks to supply, readiness checks and actionable failures. Identify which services an older game can retain. |
| Space and presentation | Units, axes, origin, native scale, bounds, floors, sockets and semantic part IDs. State collision/support assumptions separately from visual bounds. Mark spatial fields inapplicable for a non-spatial UI part. |
| Actions and ownership | Who creates, advances, commits, persists and disposes each object. Describe pure previews, stale-action checks, command/event identities, cancellation, partial failure and exactly-once effects. |
| Persistence | State schema and content requirements, save/load example, mid-action restore, migration/unknown-field policy and atomic failure behavior. Say explicitly when the part owns no saved state. |
| Game decisions | Safe art/style substitutions and selectable policies; list balance, permission, cost, scheduling or geometry decisions still belonging to the game. |
| Example and proof | Public-import example, checklist, supported/unsupported cases, exact reviewed commit, focused tests, browser/device evidence where relevant and helper cleanup. |

Use the actual module manifest, schema and capability declarations as the source for executable requirements. Guide cards explain those declarations; they must not disagree with or override them. Existing strict runtime configuration parsers do not accept arbitrary guide fields. Use separate metadata or an existing supported registry until an extension is deliberately versioned and implemented. A guide-index API supplied by a candidate is not a released engine API.

The [functional editor parts project](projects/functional-editor-parts.md) assigns implementation of these automatic connections and editor-run readiness checks. Its scope separates accepted runtime boundaries from candidate code and assigns the compiler, content, authoring and player work to the existing helpers.

## Standard connection sequence

1. **Select and inspect.** Choose an exact reviewed engine/content pin and read the card's supported profile. Show required dependencies and missing bindings before changing the live game.
2. **Bind retained services.** Supply the game's renderer, queries, commands, clock, persistence or other required services through public adapters. Use the optional [module planner](runtime-modules.md) where service composition helps; direct public imports remain valid for one small component.
3. **Prepare and validate.** Resolve package-safe resources, validate semantic references and negotiate actual capabilities. An unknown floor, unsupported shape, absent animation socket or missing provider produces a named error and remedy. Preparation failure releases acquired resources and preserves the current scene.
4. **Connect behavior.** The recipe maps stable part IDs to the selected providers. Input proposes an action; the authoritative host revalidates and atomically commits it. Render, animation and audio follow committed state/events without awarding the action again. The host supplies time and random streams.
5. **Restore and retire.** Validate a complete staged save before replacing live state. Restore poses without replaying one-shot effects. Stop/dispose only owned resources, including incomplete and late loads; preserve borrowed host services.

Provide one working connection example using these steps, not only a list of method signatures. The smallest example should retain a host service so gradual adoption remains practical. If an automatic binding or recipe is still missing, list that gap and its owner; documentation alone does not implement it.

## Examples of the intended standard

| Part | Declared semantics and standard behavior | Game-supplied decisions |
| --- | --- | --- |
| Door or gate | Stable leaf/portal IDs, hinge/poses, collision and motion clearance, interaction target and saved open/locked state. A compatible recipe binds presentation and dynamic queries to the same committed state. | Permissions/keys, AP/time costs, breakability, fire rules and the actual geometry provider. A paired door requires explicit paired-leaf support. |
| Stair flight | Entry/exit floor and support identities, native elevations, route, width/clearance and permitted directions. A compatible traversal provider validates and advances the route, preserving progress through save/load. | Actor dimensions, speed, turn/AP policy, occupancy and geometry accurate enough for the building. Do not infer a safe route from a decorative stair mesh. |
| Bear or another actor | Native rig/paint/equipment identities, attachment sockets, supported poses and semantic animation markers, loader ownership and appearance capability. | Cast/role, inventory, movement/combat rules and durable gameplay effects. A throw marker presents a committed release; it does not independently spend inventory or create a second projectile. |
| Title screen | Shared start/continue/settings/credits flow, loading/error/cancellation, focus and disposal hooks. A minimal host example shows all required callbacks. | Title/art/style, save-slot and compatibility policy, actual scene preparation, pause/input rules, settings and audio policy. |

These examples define the handoff target. The [foundation checkpoint](modular-foundation.md) records existing runtime boundaries. The [bear proposal](intake/2026-10-29-bear-integration-proposal.md) and UI worker's title/interaction candidate must earn their own integration acceptance; neither changes a production game's pin automatically.

For common game adoption, prefer explicit semantic bindings with replaceable providers. They improve the relationship between visible parts and playable state (**accuracy**); registering known bindings once may avoid repeated integration work, but performance and time savings remain unmeasured (**efficiency**); separate game policies and art preserve each game's identity (**narrative**). Follow [design evaluation](design-evaluation.md) for richer or simpler providers and label measurements, code estimates and judgments.

## Builder acceptance checklist

Copy this checklist into the component's guide, replacing general words with its actual imports, IDs and fixtures. Mark inapplicable items with a reason. Record the adopting game, exact component/engine pins, selected profile, remaining host decisions and evidence beside the completed checklist.

- [ ] Find the card, full guide, public entry/resources, example, notices and versions in the installed package; use no sibling checkout or donor/editor-private import.
- [ ] Identify required/optional services and bind retained host systems. Validate missing, incompatible and ambiguous providers before live mutation.
- [ ] Match units, origins, floor identities, semantic references and actor/geometry bounds where applicable; confirm supported capabilities and explicit unsupported cases.
- [ ] Run the minimal successful path with the game's actual content. Connect input/preview, authoritative commit and presentation without duplicate costs or events.
- [ ] Exercise stale/repeated actions, failed/late loading, cancellation and retry. Rejection leaves the live scene, resources, save and history intact as promised by the component.
- [ ] Save/reload supported state, including mid-action progress when applicable. Reject incompatible state before replacing the live session; preserve existing formats and host-owned data.
- [ ] Check relevant desktop/phone controls, focus, loading/errors and visual/accessibility behavior. Keep simulation correctness independent of presentation failure.
- [ ] Replace/dispose/reopen the component and verify owned cleanup plus survival of borrowed resources. Stop disposable helpers and record cleanup.
- [ ] Run relevant engine and consumer checks, record the fixed reviewed candidate and rollback path, and adopt the exact pin in a separate game change.

The component owner writes and tests the guide. Coder owns shared behavior/provider contracts, Editor owns authoring bindings, Artist owns native art/semantic evidence, and UI owns reusable screens and control/presentation review. The architect reviews cross-component contracts and integrates accepted fixed commits. A reference example proves its declared boundary; production adoption requires that game's own workflow and checks.
