# Functional scene UI: preparation checkpoint

Status: **proposed UI preparation**, not a public compiler/runtime ABI or a playable-scene acceptance. Scope: [functional editor parts package 4](https://github.com/Syntaxswine/nautilus-engine/blob/04f915dd8b16c242d47b1e054b2406aedcbdefc8/docs/projects/functional-editor-parts.md), fixed scope commit **04f915dd8b16c242d47b1e054b2406aedcbdefc8**. Engine/documentation baseline **78d37b6cd3ba5de5c25d4922b4ba301b13491caa**, runtime v0.8.0.

The exact PR12 title files and original SVG are reused from **25224b9f7994db29d2e05ebdce279c73f4434c1e**. That branch remains frozen. The bear acceptance handoff remains queued; no bear or Coldwell implementation is restarted here.

Follow the [canonical component handoff standard](../component-handoffs.md). Shared schemas, kernel, compiler/save/provider contracts, exports, whitelist and capabilities remain Coder-owned. This checkpoint changes none of those files. The modules below are worker-private preparation paths; they are not new installed public exports.

## Prepared components

| Component | Private source | Responsibility |
| --- | --- | --- |
| Readiness view model | packages/functional-scene-ui/readiness.js | Present functional/decorative/incomplete/unsupported parts, reasons/remedies and full source references. UI readiness never grants authoritative permission to play. |
| Readiness panel | packages/functional-scene-ui/readiness-dom.js | Show current preparation feedback and call the host selection callback with instance/part/property path. No document/history mutation. |
| Player controls | packages/functional-scene-ui/controls.js | Scoped WASD/arrows, held pointer/touch input, normalized diagonals, E interact, P pause/resume, save/title callbacks and movement release on blur, hidden page, gating or disposal. No frame-driven commands. |
| Floor presentation | packages/functional-scene-ui/floors.js | Reuse existing five-label controller/view and host-confirmed floor identity. Manual inspection and return-to-character work on desktop/phone; a transition does not invent an arrival. |
| Session lifecycle | packages/functional-scene-ui/session-controller.js | Retain an accepted owned handle during replacement; latest preparation wins; cancellation, late handles, failed activation, title return/resume and disposal. No compiler, save or renderer implementation. |
| Title | packages/game-ui/title.js + style.css | Byte-preserved PR12 flow; bootstrap hooks connect to this preparation factory now and the reviewed prepared runtime later. |

Open /examples/functional-player-preparation.html in a source/static workshop preview. It is labelled **interface fixture only**. Its part reports, seven confirmed floor labels and staged DOM handles are controlled UI test inputs. There is no world compiler, geometry, native actor, physics, durable game checkpoint or Three renderer in that fixture. The save button stays unavailable. It does not satisfy editor -> native two-story play acceptance.

## Private presentation inputs

These inputs are a UI adaptation target, not fields accepted by any runtime manifest. The reviewed compiler/runtime will be adapted at one boundary.

Readiness takes a plain view model with a title, parts and diagnostics. Each displayed part has full instance/part identities, a label, one of the four classifications and optional problems. A problem carries code, severity, source path, reason and remedy. Unknown/malformed classifications refuse readiness. Accessors in the report are not invoked. A selection callback receives the same complete source reference so Editor can select the affected part without clearing history.

Controls borrow a focusable player input surface and callbacks: onMove({x,y}), onInteract, onPause, onCheckpoint, onTitle and onError. Vectors are normalized UI directions; the host's approved camera/input adapter must map them to canonical movement. Update the control view from committed host snapshots. Input never spends costs, applies a command, changes doors, advances traversal or writes a save itself. A held movement direction emits on change and release, not on render frames.

The floor wrapper takes the existing floor records and updateActor({id,confirmedFloorId,transition?}). Transition supplies host-named departure/destination floor identities. The wrapper follows only the confirmed identity, and reports visibleFloorIds solely to presentation. Hidden geometry/actors remain with the authoritative provider. UI labels use the supplied native elevations; no layer-to-metre inference or actor rescaling occurs.

## Prepared-handle ownership prototype

The private session factory receives request, AbortSignal and progress callback. Request is opaque to UI and must be an immutable host-captured request; the final compiler owns strict validation and versions. The factory must release partially acquired resources on failure/cancellation and return a **new owned handle**:

- activate({signal}): stage detached roots/resources and adopt atomically; do not independently spend gameplay costs or replay effects.
- setGated(boolean): synchronously suspend/resume the handle's input and clock access while retaining the user's own pause state.
- dispose(): retire only this handle's owned roots, subscriptions and resources; preserve the borrowed Three namespace, renderer, host services, accepted document/history and other sessions.

A replacement gates the accepted session while preparing but does not retire it on failure. Late/superseded handles are disposed once. A successful replacement retires the old owned handle after activation. A factory returning the live accepted handle is refused. Returning to title gates and preserves the accepted session; resume reuses it. dispose() is idempotent; settled() waits outstanding preparation/retirement owners. A provider that ignores cancellation must still release any late result. Disposal failures remain visible as cleanup diagnostics.

This protocol is executable preparation evidence, not a substitute for the Coder-owned prepared-scene/save interface. The final factory wrapper must use the accepted ABI and keep staged checkpoint validation atomic. No checkpoint schema or command/event receipts are invented here.

## Targeted ABI and metadata requests for Coder

1. Provide the fixed public compiler/readiness/source-map contract: stable authored/compiled scene identity, definition/profile versions, full instance/local-part IDs, statuses, source paths and explicit severity/remedies. The view model above can be adapted; it does not constrain the compiler schema.
2. Provide fixed render-binding semantics and native transforms, resource URLs/ownership, articulated door/hinge/pose IDs and actor rig/motion bindings from Artist's approved kit. Confirm exact axes/pivots and fitting actor dimensions. No per-building name switch or geometry reconstruction belongs in the binder.
3. Provide prepared runtime operations, subscription to committed snapshots/events, command/input and fixed-time ownership, confirmation of current floor/traversal, and event receipt rules. Presentation callbacks and animation markers cannot create gameplay effects.
4. Provide staged full checkpoint load/save, content/geometry identity checks, initial/default state and atomic adoption/rollback requirements. Existing save/formats must remain strict.
5. Register the reviewed optional DOM/render binding exports/styles and actual package resources centrally. Keep headless profiles free of DOM/Three; verify installed resource/guide URLs. No package/export/capability name is prescribed by this private checkpoint.
6. Distribute the accepted ABI, kernel-fix and native kit full commits before dependent binder/player code. The generic binder will use the host Three and existing visual providers, hide only presentation roots and retain authoritative offscreen occupancy/query state.

## Remaining work and acceptance state

- [x] Preserve PR12/title and queued bear handoffs on separate branches.
- [x] Prepare status/source selection, scoped desktop/touch input, floor-follow and asynchronous lifecycle.
- [x] Exercise failed/superseded loads, accepted-handle preservation, cancellation, retry, title resume and owned cleanup in controlled UI fixtures.
- [ ] Consume architect-reviewed kernel/compiler/save/provider ABI and Artist kit commits.
- [ ] Implement the generic native Three binder and reference player through those public bindings.
- [ ] Editor mounts the same binder; verify actual authoring, transforms, history and preserving rejection with Editor.
- [ ] Prove real native character clearance, closed/open door parity, both stair directions, live/hidden obstruction and mid-stair checkpoint reload.
- [ ] Prove a transformed second instance and second layout using the same compiled recipes.
- [ ] Run installed public-package and actual editor -> player desktop/touch/visual acceptance, including load/cancel/dispose and borrowed-renderer survival.
- [ ] Record actual compile/rebuild, loaded/package bytes, scene/actor counts and draw calls for the real fixed scene; physical-device performance is separate.

UI fixture loading timers are short, host-owned, AbortSignal-controlled delays. The UI modules create no gameplay timer/renderer/storage. Temporary browser/server review helpers use the project harness, automatic expiry and finally cleanup.

## Design recommendation

**Accuracy:** present actual provider classification and source references; follow confirmed floor identities and committed state. A UI-only fixture cannot establish native door, stair, body or collision parity.

**Efficiency:** code inspection shows no per-frame input emission; unchanged floor identities avoid rebuilding the floor view. Readiness normalization is linear in the displayed parts/problems. These are code-based observations; no runtime CPU, draw-call or phone frame-rate claim is made.

**Narrative:** retain the PR12 title's game-supplied art and style hooks, with readable contextual actions and source-focused workshop diagnostics. Production players should see supported game choices; raw dependency details stay in the workshop/handoff. This is a provisional UI preference for the first Farmyard-style desktop/phone player, pending native kit review.