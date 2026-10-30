# Standard game title screen

Status: implemented candidate for architect review; component API v1. Baseline: Nautilus commit 8c4670450cb2b38c1e1abd811d633c22de9e2b7c. Consumer adoption is separate.

Optional DOM entry: `@nautilus-engine/map-core/game-ui/title`; stylesheet: `@nautilus-engine/map-core/game-ui/style.css`. Headless `./game-ui` exports `gameAssetGuides()`, including guide URLs, required bindings and design decisions. The [starter yard](https://github.com/Syntaxswine/nautilus-engine/blob/9d33ca65edf7b4d6b169d50e17dfc6bb40276373/examples/game-starter.html) demonstrates the complete flow with original Nautilus artwork.

The source/static workshop route is /examples/game-starter.html. The larger yard is linked at the fixed reviewed candidate; it is not bundled into headless runtime packages.

## Connect it

This first snippet names the host service roles. The complete minimal browser host below defines every callback and can be copied into an installed-package browser bundle.

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

For New game, prepare a candidate and establish the save write outcome before replacing the live host. A failed write preserves the current host; if a storage wrapper throws after writing, reconcile the saved candidate before reporting success or failure. The reference yard uses this ordering for New game while ordinary movement remains in memory until Save, export, or return to menu.

Mark a host retired before disposing its title screen: disposal synchronously reports visibility changes and can abort an open settings panel. Cancel its animation frame, remove input listeners and guard scheduling, late frame callbacks and asynchronous scene adoption against retirement. A hidden or removed menu alone does not retire the host.

`checkSave` returns `{available:boolean,summary?:string}`. While checking, start and continue wait. Failure keeps both unavailable until **Check again** succeeds, avoiding an unchecked save replacement. The latest check wins; show/dispose abort older requests. Continue is disabled with an explanation when no save exists. When a save exists, **New game** opens a keyboard-accessible confirmation with **Keep playing** focused by default. Cancelling changes no game state.

`onStart` is required. Supplying `checkSave` also requires `onContinue`. Without a save check the screen represents a game with no continuation. Settings is shown only when `onSettings` is provided; that promise resolves when its panel closes. Credits use a native modal dialog and text supplied by the host. The screen starts no renderer, timer, fetch, audio context or storage system, and never redirects to a donor checkout.

The returned handle has `element,ready,refreshSave(),show(),hide(),dispose()`. Refresh checks metadata again. Repeated show/dispose is safe; disposal removes listeners and cancels owned requests. `hide` is for entering the already-prepared game; do not use it to ignore a pending load. Use show/dispose to cancel/reopen. Importing this DOM entry is inert; mounting needs a real document.

## Complete minimal browser host

This example uses an in-memory save service and a DOM scene, with every host callback defined. Run it through a browser bundler that resolves the public JavaScript and CSS exports. The existing reference yard demonstrates durable browser saves and a real interaction world. The example creates no game clock; replace the marked gate with the retained game input/clock services.

```js
// Browser bundler example; both imports use supported package exports.
import {mountTitleScreen} from '@nautilus-engine/map-core/game-ui/title';
import '@nautilus-engine/map-core/game-ui/style.css';

const root = document.createElement('main');
const titleRoot = document.createElement('div');
const play = document.createElement('section');
const readout = document.createElement('p');
const turn = document.createElement('button');
const back = document.createElement('button');
turn.textContent = 'Advance a turn';
back.textContent = 'Save and return to menu';
play.tabIndex = -1;
play.append(readout, turn, back);
root.append(titleRoot, play);
document.body.append(root);
const listeners = new AbortController();
let live = null, checkpoint = null; // In-memory example save service, not durable storage.
const checkSignal = signal => {
  if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
};
const draw = () => { readout.textContent = 'Your scene is ready. Turn ' + live.turn; };
const title = mountTitleScreen(titleRoot, {
  title: 'Your world', tagline: 'A place worth entering.',
  credits: ['Example: Nautilus Engine. Replace with your actual game credits.'],
  newGameWarning: 'Replace this example’s in-memory checkpoint?',
  async checkSave({signal}) {
    checkSignal(signal);
    return {available: !!checkpoint, summary: checkpoint ? 'Turn ' + checkpoint.turn : ''};
  },
  async onStart({signal}) {
    checkSignal(signal);
    live = {version: 1, turn: 1};
    checkpoint = structuredClone(live);
    draw();
  },
  async onContinue({signal}) {
    checkSignal(signal);
    if (checkpoint?.version !== 1) throw Error('Unsupported checkpoint');
    live = structuredClone(checkpoint);
    draw();
  },
  onVisibilityChange(visible) {
    play.hidden = visible;
    play.inert = visible;
    // This minimal host has no clock or global shortcuts. A game must also
    // gate its retained simulation and input services here.
  },
  focusGame() { play.focus(); }
});
turn.addEventListener('click', () => { live.turn++; draw(); }, {signal: listeners.signal});
back.addEventListener('click', () => {
  checkpoint = structuredClone(live);
  void title.show();
}, {signal: listeners.signal});
await title.ready;
function disposeExample() {
  listeners.abort();
  title.dispose();
  root.remove();
}
// Call disposeExample() when this host is retired. Settings are deliberately
// absent; supply onSettings only when your real settings panel is ready.
```

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
