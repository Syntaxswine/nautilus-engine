# Standard game title screen

Status: implemented candidate for architect review; component API v1. Baseline: Nautilus commit 8c4670450cb2b38c1e1abd811d633c22de9e2b7c. Consumer adoption is separate.

Optional DOM entry: `@nautilus-engine/map-core/game-ui/title`; stylesheet: `@nautilus-engine/map-core/game-ui/style.css`. Headless `./game-ui` exports `gameAssetGuides()`, including guide URLs, required bindings and design decisions. The [starter yard](../examples/game-starter.html) demonstrates the complete flow with original Nautilus artwork.

## Connect it

```js
import {mountTitleScreen} from '@nautilus-engine/map-core/game-ui/title';
// Include the exported stylesheet through your host's CSS/bundler setup.
const title = mountTitleScreen(titleContainer, {
  title: 'Your game',
  tagline: 'A sentence from your world.',
  edition: 'VERSION / BUILD',
  art: {src: titleArtURL, alt: 'Describe meaningful title artwork.'},
  credits: ['Art: …', 'Music: …', 'Engine and third-party notices: …'],
  // Return metadata only. Continue reopens/validates the actual save.
  checkSave: ({signal}) => saves.inspect({signal}),
  onStart: ({signal}) => game.prepareNewGame({signal}),
  onContinue: ({signal}) => game.prepareSavedGame({signal}),
  onSettings: ({signal}) => settings.openAndWaitUntilClosed({signal}),
  onVisibilityChange(visible) {
    input.setGameplayEnabled(!visible);
    simulation.setPaused(visible);
  },
  focusGame() { gameCanvas.focus(); },
  onError(error, action) { diagnostics.record(error, action); }
});
await title.ready;
// When returning from play:
await title.show();
// When replacing this screen:
title.dispose();
```

Callbacks must honour `AbortSignal` and perform their own atomic save/scene adoption. A resolved start/continue means the game is ready to enter; the screen hides and calls `focusGame`. A rejected callback keeps the menu visible and provides retry feedback. An aborted callback must not later overwrite another game session. The title cannot undo external writes a host performs after ignoring cancellation.

`checkSave` returns `{available:boolean,summary?:string}`. While checking, start and continue wait. Failure keeps both unavailable until **Check again** succeeds, avoiding an unchecked save replacement. The latest check wins; show/dispose abort older requests. Continue is disabled with an explanation when no save exists. When a save exists, **New game** opens a keyboard-accessible confirmation with **Keep playing** focused by default. Cancelling changes no game state.

`onStart` is required. Supplying `checkSave` also requires `onContinue`. Without a save check the screen represents a game with no continuation. Settings is shown only when `onSettings` is provided; that promise resolves when its panel closes. Credits use a native modal dialog and text supplied by the host. The screen starts no renderer, timer, fetch, audio context or storage system, and never redirects to a donor checkout.

The returned handle has `element,ready,refreshSave(),show(),hide(),dispose()`. Refresh checks metadata again. Repeated show/dispose is safe; disposal removes listeners and cancels owned requests. `hide` is for entering the already-prepared game; do not use it to ignore a pending load. Use show/dispose to cancel/reopen. Importing this DOM entry is inert; mounting needs a real document.

## Give it the game's identity

Layout and behavior are shared; the game's title, language, palette, typography and illustration remain configurable. The default paper, green and brass theme follows Nautilus's existing workshop direction. Override scoped CSS variables on `.nautilus-title`: `--ng-ink,--ng-muted,--ng-accent,--ng-panel,--ng-edge`. Override `.ng-title` for the game's typeface. Artwork is a host-owned image URL and is never distorted by changing the game's metre scale. No donor art or texture is implicitly required. Omit artwork for the CSS background.

Options include `eyebrow,tagline,edition,menuLabel,art,credits,newGameWarning,focus` plus callbacks. `labels` overrides button, confirmation and loading strings; the initial English readiness/error messages currently remain fixed, so full localization requires extending that message contract. Do not claim complete localization. Dynamic title/credit/summary strings use text nodes. Art URLs accept image-bearing http(s), file or blob transport; the host controls URL trust and CSP.

## Decisions for the next game

| Topic | What the game team must decide |
| --- | --- |
| Identity | Title art, logo/typeface, readable palette and narrative tone; PC and phone crop review. |
| Starting | Character/loadout/mission setup before entry; a resolved callback must mean preparation is complete. |
| Continuing | Save compatibility, multiple slots/cloud state, corruption recovery and latest-save policy. |
| Replacement | What New game replaces and when. Supply accurate warning text; the host owns the durable transaction. |
| Input/time | Disable gameplay shortcuts and pause the intended clocks while title/settings are open. Native menu buttons remain keyboard/touch accessible. |
| Settings | Audio, controls, accessibility and graphics settings that this game actually supports; persistence and rollback. |
| Audio | Start/resume audio only after a player gesture; title inspection/load must not spend gameplay resources. |
| Credits | Actual art/music/source notices and links in the surrounding game UI. Text credits do not replace required notices. |
| Lifecycle | Cancellation, failed/slow loads, retry, rapid presses, return-to-menu and replacement/disposal. |

The supplied menu is a reusable engine component. It does not publish or adopt a title/menu branch into Farmyard or another game.

## Builder checklist

- [ ] Pin the reviewed component and include its exported stylesheet.
- [ ] Supply the game title, honest build/status text, theme and artwork/credits.
- [ ] Bind save metadata checks, complete start/continue preparation and cancellation.
- [ ] Describe exactly what New game replaces and make the host save transaction atomic.
- [ ] Gate gameplay input and intended simulation clocks while menus/settings are open.
- [ ] Supply only supported settings and activate audio after a player gesture.
- [ ] Review keyboard/modal focus, failed and slow loads, retry, phone crop/reflow and disposal.
