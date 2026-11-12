# Reusable player setup and UI composition

Scope proposed by Architect on 11 November 2026 after the train playtest. This is a missing assembly layer, not a delivered API. Finish the compact steam reverse correction first; continue with one accountable builder at a time.

## Evidence and intended result

At main `db656a6d717ad36aabe32955b47a09b8badb116e`, the train yard manually defines its surrounding markup, walking joystick/keys, camera buttons, HUD placement, input handoff and save controls in `examples/train-yard.{html,css,js}`. Its character startup also imports the pinned AFT motion catalogue/paint directly. The train widget itself is reusable, but the complete player setup is not yet a public recipe.

Existing public pieces include train controls, title flow, world/interactions/parts contracts, optional module planning/lifecycle, assets and their handoff metadata. `packages/game-ui/index.js` supplies guide discovery, not a complete gameplay shell. Module planning resolves declared services; a game still supplies manifests and factories. Preserve these pieces and promote the missing connections rather than creating parallel interaction, inventory, save or movement kernels.

Tinderbox `fb0628605c274550ff8abad50b151843f08747d1`, especially `src/ui/index.js`, supplies a surrounding grouping of contextual actions, movement, train controls and status, with a game-specific wood skin. Farmyard Fighters `7cd3d56e62a8087133a9fdf2f521cf92d310d6fd`, especially `sites/tactical-animal/dist/app.js` and its battle HUD, is a second committed reference for shared layout and input expectations. These are read-only design references, not approvals to copy their full game runtimes or update their pins. Any imported bytes require the normal fixed-commit source closure and notices.

The intended new-game path is: choose a scene/content manifest, actor and gameplay/control profile; select optional modules and a UI skin; start the supplied recipe. Standard providers supply the ordinary wiring. An older game can replace one provider with its retained service and continue migrating incrementally. A documented manual callback list alone does not satisfy this outcome.

The user identified Deepnight's [Game feel demo (v2)](https://deepnight.net/games/game-feel/) as the usability reference. Its official description documents an Enter/Start options menu for enabling/disabling individual features; its [public source](https://github.com/deepnight/gamefeel) is a design reference. No code or assets are imported by this scope. Adopt the rapid choose/change/try loop, and make its configuration the same recipe a real game uses.

## Shared contracts

- **Player layout:** responsive status, map/inventory hooks, contextual actions, movement/control slot, notifications and modal layer. Desktop and phone profiles preserve their different ergonomics. The scene receives measured HUD-safe bounds for camera framing.
- **Actions:** one versioned descriptor/binding path for compatible open/close, pickup, enter, ride, drive and exit actions. Stable target/action identities, eligibility, reason, label and icon references come from authoritative providers. Buttons, hotkeys, touch and agents propose the same commands. Existing provider validation, costs, expected revisions and receipts remain authoritative.
- **Presentation:** text, pictogram, material and layout choices replace appearance through public skin/presenter hooks. Accessible names, focus, eligibility and action semantics remain available. Bind animation/audio/lights to confirmed outcomes; restore never replays a one-shot effect.
- **Control context:** one owner arbitrates on-foot, driver, rider, menu/modal, paused and unavailable states. Changing context releases the original input lease/captures, then installs the compatible control. Late events cannot act for a new actor/cab. Menus and text fields suppress gameplay input; closing returns appropriate focus.
- **Setup recipe:** executable registered defaults, package-safe resources and a versioned configuration. Reuse the existing module planner and lifecycle. Resolve the selected provider closure, validate content and bindings, prepare offscreen, then activate once. Missing bindings/assets/animation roles produce named, actionable diagnostics and preserve an existing live scene.
- **Host ownership:** new-game defaults are supplied; retained games can bind their existing world, actor/mover, clock, queries, transactions and persistence once. The recipe owns only the providers it creates. World time, command authority, saved resources and geometry do not move into DOM widgets.

Proposed new public entries and configuration names must be settled with their owners before registration; this scope deliberately does not advertise a factory that does not exist.

## Live playground and compatible ports

The first recipe must be usable through an in-scene menu, not only source edits. In the playground, Enter/Start or an accessible on-screen control opens that menu with correct input/focus ownership. Other games can bind their own menu action. Offer a few working presets, expose the selected modules' meaningful settings, close the menu and immediately try the result. First settings should exercise actual accepted movement, camera, controls, animation/feedback and skin providers; do not display a working toggle for an unimplemented subsystem.

Generate the menu and agent-readable configuration from the same versioned component descriptors. A component class declares its required/optional inputs and outputs: semantic service/type ID and version, schema, units/coordinate frame where applicable, cardinality, owner/lifetime, and whether a value is a request, confirmed state or committed event. A numeric brake input is not compatible with an arbitrary numeric effect parameter merely because both are numbers. An animation consumes confirmed movement/pose; a one-shot impact cue consumes a committed impact event rather than an unconfirmed input request.

Standard recipes supply deliberate compatible bindings and useful defaults. Resolve an unambiguous registered provider automatically; retain a named readiness error for a missing or ambiguous connection. Expose a connection inspector for builders who need to override a binding. The ordinary menu should not require drawing wires. Compile this separate recipe metadata into the existing supported module configuration; adding guide/port fields to that strict configuration is not an unversioned shortcut.

Skin swaps preserve authoritative gameplay. A behavior/provider change prepares and validates a candidate, safely releases old input and activates atomically at a supported boundary. Descriptors must say whether a setting is live-safe, requires pause, or requires a deliberate fixture restart. Failed changes retain the accepted setup. A sandbox reset is explicit and distinct from loading a saved character; it must not quietly heal/refill a real save.

Save/export an exact recipe with component/content versions and settings. Loading it must recreate the selected connections without rerunning accepted commands/effects. Agents use the same configuration, validation and activation commands as the menu. The playground is a consumer of the engine's real composition API, with no private demo-only wiring path.

## Sequential builder assignments

| Stage | Accountable builder and file ownership | Finished deliverable |
| --- | --- | --- |
| 1. Shared shell and actions | Existing UI builder; a new optional `packages/player-ui/` candidate, its guide, focused fixtures/tests and adapters around existing controls. Root owns registration and example integration. | Layout/control-context/action composition with Farmyard-style and Tinderbox-style profiles. Existing title/train widgets are mounted through owned slots. One documented action contract reaches the existing provider commands; ordinary scene code does not create buttons or keyboard handlers. The playground menu consumes agreed descriptors rather than a second handwritten options list. |
| 2. Executable default recipe | Existing Coder after stage 1's interface review; a new optional player/starter composition candidate and public actor startup adapter, with guide and installed proof. UI package remains read-only. | Selected existing providers and native actor assets start through public entries. Implement descriptors/default recipes, compatibility resolution and guarded activation through existing planner/lifecycle contracts. New projects receive ordinary defaults; old games can substitute retained services. No scene-specific vendor imports, copied donor runtime or placeholder actor is needed. Missing capabilities and unsupported actions reject explicitly. |
| 3. Real-scene integration | Architect; public cards/exports/whitelists/build registration and the train example. Return concrete component defects to their owner. | The two-circuit yard uses the recipe for its full player layout, contextual boarding, cab/coach controls, walking, camera/menu/save flow and existing native art. Surrounding diagnostic chrome is explicitly optional. |
| 4. Independent reuse proof | One existing builder after stage 3; a second small door/item scene and content configuration. | The same installed recipe, input ownership and action UI work with different content and skin. Report actual setup steps, time and remaining host code. Correct gaps in the shared implementation instead of adding a second scene's private wiring. |

Keep each handoff to a finished full commit, concise change summary, focused proof and limitations. Builders may ask the architect for clarification; routine implementation choices stay with the owner. Avoid duplicate broad testing: Root runs the four required engine gates on the composed result, with meaningful affected package/browser checks.

## Acceptance

1. A clean installed-package consumer starts the train yard from assets/configuration through public imports, without sibling checkouts, donor internals, handwritten ordinary HUD markup, bespoke joystick handlers or per-instance action callbacks. Game-specific content and policy remain explicit configuration/adapters.
2. Walk to either train; get an eligible action presented as text or an icon; board the appropriate car; drive or ride; brake/exit; regain movement and focus. Repeat with both UI skins and desktop/touch profiles. Check overlap, safe areas, camera framing, keyboard navigation, reduced motion and accessible action names.
3. Door/item actions in the second scene follow the same descriptor and context path. Identical action semantics survive a skin change. Unsupported actions/modules and missing bindings are reported before activation, rather than silently omitted.
4. Modal/pause, actor/cab changes, hidden page, held gestures, disposal, asynchronous failure and stale completion cannot preserve or transfer input authority. Restore preserves resources, pose, identity and committed state without replaying sounds, commands or pending input.
5. Exact content/engine versions, saved schemas and service requirements travel with the recipe/handoff. Authoring can point compatible parts at the accepted bindings; arbitrary decorative assets do not acquire behavior by inference. Preserve portable map formats and declare unsupported features.
6. Record setup time and application-specific code for a fresh builder, selected package/resource bytes and owned cleanup. The aspiration is setup in minutes; do not claim that result until measured. A browser phone viewport proves layout/input, not physical-device performance.
7. Open the playground menu, select a working preset, change compatible components/settings and immediately test them. Save/export, reopen and apply the same recipe in the second installed scene and through agent commands. Incompatible, missing, ambiguous and cancelled changes leave the accepted setup intact. Effects do not duplicate, disposed controls cannot act, and repeated swaps retire their owned resources. Describe any setting that still needs a fixture restart.

## Design recommendation

**Accuracy:** share action identity, host validation and confirmed state. Preserve different game policies behind explicit profiles rather than inferring gameplay from a visual asset. Existing game workflows establish implementation evidence, not physical calibration.

**Efficiency:** prefer one input/context owner and event-driven UI composition, with selected providers loaded on demand. Avoid widget-owned game clocks or another renderer. These are code-based recommendations; CPU/FPS savings are unmeasured. Record actual resources and setup effort during the reuse proof.

**Narrative:** prefer Farmyard's established contextual grouping for its continuous phone profile and Tinderbox's warm mechanical skin for steam. Preserve a separate desktop interaction profile. Skin replacement should change the presentation without making the builder rewrite behavior. This preference is subjective and requires review in both real scenes.

This tranche proves a reusable player setup. Campaign systems, a universal inventory redesign, every historical asset and every gameplay genre retain their own scopes. Available slots and explicit capabilities let those features join later without holding the first complete recipe open indefinitely.
