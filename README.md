# Nautilus Engine

A shared foundation for Animal Factory Tactics 3D, Farmyard Commando and Tinderbox. **Version 0.2 provides a standalone 3D map workshop, a headless map-authoring package and shared character/skill/combat rules.**

The workshop reuses AFT's working editor and Farmyard's painted industrial control materials. It supports map and reusable-block editing, six authored layers, object and character placement, undo/redo, browser-local saves, portable JSON, connection rules, seeded block assembly, feature-line plans and sector presets.

## Run

Node.js 22 or newer. No dependency installation is required.

```sh
npm run check
npm test
npm run test:upstream
npm run build
npm run serve
```

Open `http://127.0.0.1:4517`. The read-only preview server stops automatically after 30 minutes, on Ctrl+C, or when `artifacts/preview/STOP` is created. Browser saves live in Nautilus's own IndexedDB namespace. Export JSON for a portable backup.

Start with the example yard, choose a build tool, and drag to place. Settings contains file import/export, named saves, camera controls and workspace switching. Blocks exposes the reusable-block library, connection settings and generation. On narrow screens, **Tool options** opens the properties drawer; Escape closes it. Right-drag or WASD pans, scroll zooms, Q/E turns the camera, and Ctrl/Cmd Z undoes.

## Use the map core

```js
import {createMapDocument, openDocument, generateConnectedMap}
  from './packages/map-core/index.js';

const document = createMapDocument('Shared yard');
const result = document.apply({
  tool: 'floor', start: {x: 10, y: 10, z: 0}, end: {x: 14, y: 13, z: 0}
});
if (!result.ok) throw new Error(result.error);
document.undo();
document.redo();
const portableJSON = document.export();
const restored = openDocument(portableJSON);
const errors = restored.validate();
```

The package runs in Node without a DOM, renderer or browser storage. See [the architecture](docs/architecture.md) for the API, format and consumer boundary, and [the intake workflow](docs/upstream-updates.md) for adding reviewed upstream changes.

## Use the rules core

`@nautilus-engine/map-core/rules` exposes portable character sheets, the established 14-stat formulas, training, saved-seed checks, explicit combat profiles and resource/damage operations. The original map entry point stays compatible. `./rules/dialogue` retains committed choice receipts; `./rules/aft` preserves AFT climbing/injury helpers.

See [the rules contract and examples](docs/rules.md) and [the comparison of all three games](docs/reviews/2026-10-28-rules-foundation.md). Rolls, world impacts and game scheduling have explicit boundaries. No game has switched to Nautilus rules automatically.

## Compatibility boundaries

This release retains the existing AFT map v2 and block v1 formats, 240 × 240 maps, 24 × 24 blocks and inherited character/content limits. The shared document/controller still contains AFT-specific content conventions. These are explicit compatibility constraints, not a claim of a fully generic engine.

The standalone workshop does not bundle any game's combat application. **Send to game** becomes available when a host connects an adapter. The three games have not yet switched their editors or toolkit dependencies to Nautilus. Farmyard supports a flat-map subset; Tinderbox's content representation needs an explicit adapter. The inherited strategic overmap generator and a complete procedural campaign are outside this milestone.

Original upstream bytes remain in `vendor/`. `upstream.json` pins full source commits and each snapshot's `provenance.json` records SHA-256 hashes. Build-only adaptations have separate hashes in `dist/build-provenance.json`. See [source notices](NOTICE.md). The GitHub source is public; the Sites review build uses owner sign-in.
