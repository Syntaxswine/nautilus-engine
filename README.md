# Nautilus Engine

A shared foundation for Animal Factory Tactics 3D, Farmyard Commando and Tinderbox. **Version 0.5 adds procedural sloped roofs, explicit save/capability contracts and smaller distributable packages to the shared 3D map workshop.**

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

Designs are selected using [accuracy, efficiency and narrative](docs/design-evaluation.md), with [explicit recommendations](docs/reviews/2026-10-28-design-tradeoffs.md) for the current differences. Weekly intake applies the same criteria as the games grow.

## Angled wall authoring

The existing square-wall tool is joined by measured native-scale wall runs: exact or snapped endpoints, one-to-five stories, transactional edits and portable map/block transforms. [The wall-run contract](docs/wall-runs.md) explains the optional `nautilus-wall-runs-v1` host capability and unsupported generated seam continuations. Consumer movement, LOS, projectiles and fire remain adapter responsibilities.

## Procedural sloped roofs

Choose **Roofs**, select **Sloped roof**, then drag a footprint or open **Measured footprint** for exact dimensions. Preview before placing; gable, hip and shed styles support pitch, overhang, slate/clay/metal paint and a deterministic seed. Roof edits participate in undo/redo, saves, import/export, block capture/rotation and generation.

The headless `./roofs` and optional `./roofs/three` entries let any of the three games borrow the same data and mesh. They are architectural shells; games bind fire, collision and navigation deliberately. See [the roof contract and visual review](docs/sloped-roofs.md) and [combined acceptance](docs/intake/2026-10-28-reusability-roofs.md).

## Optional contour effect

`./render-effects` exports the reviewed golden `SearchHalo` effect and standard/wide presets. `./render-effects/three` supplies the same pinned Three r180 instance. Games choose eligible roots; loot, discovery and marker rules stay in their adapters. The initial pipeline is full-frame WebGL2 with standard depth and NoToneMapping. See [the contract and example](docs/render-effects.md); the built example is `/examples/search-halo.html`. No donor game or editor behavior switches automatically.
## Original building library

The art collection adds **48 original buildings**, 77 floors, 409 described rooms and 16 painterly materials. It spans homes, schools, chapels, shops, factories, a depot, barns and utility buildings. Public developer plans and historic measured drawings informed newly authored designs. Detailed source recipes are preserved alongside simplified glTF meshes, room/opening data and a searchable 3D review gallery.

Run `npm run build`, then `npm run serve:buildings`; open the printed URL. The preview stops after 30 minutes. See the [catalogue and integration contract](docs/building-catalog.md), [reference notebook](art/buildings/README.md) and [visual review](docs/reviews/2026-10-28-building-catalog.md). Game collision, navigation, fire and persistence remain explicit consumer work.

## Compatibility boundaries

This release retains the existing AFT map v2 and block v1 formats, 240 × 240 maps, 24 × 24 blocks and inherited character/content limits. The shared document/controller still contains AFT-specific content conventions. These are explicit compatibility constraints, not a claim of a fully generic engine.

The standalone workshop does not bundle any game's combat application. **Send to game** becomes available when a host connects an adapter. The three games contribute source, assets and design feedback to Nautilus. Production runtime adoption is still a separate deliberate pin: the first Tinderbox adapter is conformance-tested against its actual compiler and simulation. Farmyard supports a flat-map subset; Tinderbox's content representation needs an explicit adapter. The inherited strategic overmap generator and a complete procedural campaign are outside this milestone.

Original upstream bytes remain in `vendor/`. `upstream.json` pins full source commits and each snapshot's `provenance.json` records SHA-256 hashes. Build-only adaptations have separate hashes in `dist/build-provenance.json`. See [source notices](NOTICE.md). The GitHub source is public; the Sites review build uses owner sign-in.

## Public contracts and packages

See [compatibility and persistence](docs/compatibility.md), [distributable profiles and asset reuse](docs/distribution.md), and the [bounded Tinderbox adapter](docs/adapters/tinderbox.md). Public engine-owned interfaces keep donor/editor internals private. Versioned manifests distinguish required from optional features; stamped saves retain portable blueprint data and reject unsupported schemas.

The source checkout contains the full authoring/review material. The default package has an explicit runtime whitelist; separate core, renderer and optional building-assets profiles keep large art payloads out of headless consumers. npm run test:package tests a real offline installation; npm run test:assets verifies all 48 model/binary/blueprint/atlas URLs from the installed asset package. The browser authoring workflow runs in its own isolated browser and in GitHub CI.
