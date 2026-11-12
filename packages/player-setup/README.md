# Executable player setup candidate

Stage 2 on accepted UI commit `578a86113395ea3ebcb76c636ce8f0882600d03e`. Architect owns final public registration, complete package build, yard integration and delivery. This candidate adds no root exports or consumer pins. Proposed entries are `@nautilus-engine/map-core/player-setup` (headless) and `/player-setup/browser` (DOM/shared Three). The installed overlay proof registers those names only in an isolated test package.

## New game

```js
import {mountPlayerSetup, createSetupConfiguration, flatYardContent}
  from '@nautilus-engine/map-core/player-setup/browser';

// Use the exact reviewed commit containing your content definition.
const content = flatYardContent({sourcePin: reviewedContentCommit});
const setup = await mountPlayerSetup(document.querySelector('#game'), {
  content, configuration: createSetupConfiguration({content: content.identity})
});
// On scene retirement:
await setup.dispose();
```

The host supplies one positioned scene container with a nonzero size. Registered defaults create the existing world/interactions mover, frame clock, shared Three surface, painted native goat, HUD-aware camera and existing player UI. Styles and their resources load automatically. The scene writes no ordinary HUD markup, joystick code, keyboard handling or donor imports. The flat yard is an explicit small content fixture, not the later modular test ground. Its actor starts injured/spent (`health:37, ap:3, stamina:11`), deliberately making accidental refill observable.

`createSetupConfiguration` also accepts `actorId`, `model:'goat'|'donkey'`, `trains` and `title`. Trains require a compatible retained connector and refuse before activation when absent. Title uses the existing title widget. Map/inventory slots remain consumer extension points; no inventory kernel or persistence service is created by a widget.

## One recipe and one lifecycle

The version 1 plain JSON recipe contains exact engine/content identities, actor ID, selected versioned components, settings and provider bindings. Keep engine identity at `@nautilus-engine/map-core` `0.10.0`, source pin `7f50cb2a48aef87a16fc0465997549be9ed88dc2`; this candidate does not stamp a release. Content has its own ID, version and full reviewed commit. The flat-yard content is authored in `packages/player-setup/world.js` at `290926270b04c739e78efb427f330db9483ec847`. `source.json` records candidate bytes separately from inherited engine identity.

`SETUP_COMPONENTS` extends the accepted UI descriptors with runtime and native-model settings. The existing generated menu, agent `dispatch({version:1,type:'configuration',configuration})`, `validate`, `applyConfiguration`, `readConfiguration`, export/import and checkpoints use this same full recipe. `setup.ui.applyConfiguration` intentionally remains the existing UI-only subset API; consumers normally use the outer setup API.

`validatePlayerSetup` discovers a unique compatible registered provider recursively. It reports `MISSING_PORT`, `AMBIGUOUS_PORT`, `INCOMPATIBLE_PORT`, `PORT_CONFLICT` and invalid module/settings errors with corrective actions. Matching includes service/version, direction, semantic role, schema, units, frame, cardinality, ownership and lifetime. An input request, confirmed state and committed event are different roles even when their values are numbers. `connectionInspector()` reports actual selected endpoints and owned-module/retained-host ownership; `bindSetupProvider` supplies explicit overrides. Registry changes require matching lifecycle factories; they are not serialized callbacks.

Metadata compiles into only the existing strict runtime-core fields. `startModules` prepares the selected dependency closure and stops it in reverse order. A second composition framework, renderer in a UI widget, or world authority in a menu is not introduced.

Candidate providers prepare inactive. After final cancellation/version checks, one acceptance point transfers input and visual ownership. Before it, refusal/cancellation leaves the old setup intact. After it, a result remains `committed:true` even if feedback or retirement reports observer errors. `onError(error,{phase})` identifies those phases. A replacement requires the current menu/pause boundary; unchanged provider/UI settings use the accepted UI's guarded path. Pace, camera and skin work live; layout/train profile/native model changes need pause; content or actor changes return `SCENE_RESTART_REQUIRED` rather than resetting a save.

## Retained train yard

```js
import {mountPlayerSetup, createSetupConfiguration, bindSetupProvider,
  retainTrainYard, createRetainedFrameSource}
  from '@nautilus-engine/map-core/player-setup/browser';

const frames = createRetainedFrameSource();
const retained = retainTrainYard({
  host: existingHost, content: content.identity,
  surface: {renderer, scene, camera, canvas, resize, draw},
  clock: frames, setUIPaused
});
const configuration = bindSetupProvider(
  createSetupConfiguration({content: content.identity, trains: true}), retained);
const setup = await mountPlayerSetup(container, {content, configuration,
  providers: [retained]});
// In the host's existing clock, once per step (seconds <= 0.1):
frames.beforeStep(seconds, isUIPaused);
if (!isUIPaused) existingHost.advance(seconds);
frames.afterStep(seconds, isUIPaused);
```

`setUIPaused` must join the retained game's pause owners, not replace an unrelated pause flag. `surface.draw` presents the existing scene after confirmed updates; the setup does not advance a retained clock. The default camera can use that borrowed surface. To retain a custom camera too, bind its staged `prepare/commit/dispose` endpoint and `onHudBounds` together. Renderer, scene and native actor must share Nautilus's existing Three instance.

World, mover, actor IDs/revisions, resources, queries, transactions, train command leases, clock and saves stay with the host. This adapter borrows published services once; it never calls `host.save`, `host.dispose` or `renderer.dispose`. Retiring input still sends the existing actuator's safety release to its original cab before losing authority. The source browser test loads the exact reviewed legacy host from Git in a test-only ephemeral module, changing only import URLs. Runtime packages never import examples or a peer checkout. That conformance test is evidence for the bridge; Architect still owns replacing the real train-yard startup in Stage 3.

## Requests, outcomes and evidence

Buttons, hotkeys, touch and agents request the same commands. `readActions()` provides stable provider/action identities, eligibility and offers; a context/offer must still be current at dispatch. A receipt describes that command's acceptance/commit status. Native gait consumes confirmed actor pose; input vectors do not animate a speculative walk. This starter creates no one-shot impact/sound effects.

A successful request receipt is **not sufficient proof of a mission objective**. A future door objective must observe the retained door state and authoritative passage query. Acknowledged requests that withhold an expected observable result must fail verification. Missing observation services are unavailable or inconclusive, never a pass. This candidate has no universal objective executor or observer registry; it does not claim to verify door/item objectives. Preserve exact recipe, fixture/observer versions and random seed in the later test runner. Existing command/confirmed-state/event semantics remain distinct so that runner can attach without rewriting input authority.

## Save and cleanup

`checkpoint()` contains the exact accepted recipe, native gait phase/pose, owned world state and owned elapsed clock. A retained world/clock is represented by `null`; the retained host saves and restores its own authoritative state first. `restoreCheckpoint` requires matching content, actor and ownership. It stages a fresh owned world when needed, preserves health/AP/inventory and rejects native pose mismatch. It does not restore held inputs, command leases, effects, or a pause owner's transient identity. Loading configuration alone changes settings; it is not a world save. No sandbox reset is implicit.

Setup owns its new UI, native meshes/paint, managed stylesheet lease and only those default world/surface/clock providers it creates. Shared owned providers are reference counted across replacements; `sharedOwnedProviders` is that pool's entry count, not GPU allocation telemetry. Disposal removes listeners, input, native roots and owned renderer/RAF, with reverse lifecycle cleanup and reported failures. Borrowed services remain usable. A host must dispose the setup before removing the scene. No preview process is retained after review.

## Evidence and limits

Run `node --test packages/player-setup/tests/setup.test.mjs` and the focused scripts in `tests/`. `evidence/checks.json` and `source.json` bind the checked runtime closure and package resources. The source browser covers real native walking, both models, settings/export, cancellation/refusal, phone HUD framing, touch cancel, exact checkpoint restoration and retained train commands/cleanup. The installed overlay proves a separate consumer's package paths without a donor checkout. It is not the Architect's definitive assembled tarball or deployed site. Phone emulation is not physical handset performance. No fresh-builder setup time or CPU/FPS saving is claimed.

**Accuracy:** existing query/movement/command authority and confirmed poses are preferred to a speculative animation or widget-owned simulation (code-based evidence). Native model dimensions remain separate from game collision policy.

**Efficiency:** choose the unique selected service closure and reuse the existing shared renderer, clock/input owner and native resources. The inventory records actual bytes; performance effects are unmeasured. The browser entry still loads the accepted train widget code as part of the existing shell, even when no train module is selected.

**Narrative:** Farmyard's contextual phone layout is the default; Tinderbox's mechanical wood skin remains available for a cab. This is a subjective presentation preference. Both preserve action meanings and the native goat/donkey identities. New game-specific simulation and animation roles need explicit providers.
