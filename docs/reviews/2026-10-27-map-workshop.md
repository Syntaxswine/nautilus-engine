# Map workshop foundation — 27 October 2026

## Delivered source

Nautilus Engine 0.1.0 establishes an independent browser map editor and a headless map API. It imports 528 AFT source/assets/test files from `781246a668c723d5a4c5463e70534cc04b6a5641` and six Farmyard UI source/assets/metadata files from `b2f2b6bd033cc3dbc8b572caa251244d283829c8`. All 534 imported files retain their original bytes and SHA-256 records. No donor game or consumer pin was changed.

The browser build records eight deployment patches: Nautilus's opening example and host handoff, independent storage namespaces, and the affected module adaptations. The browser entry adds Nautilus branding, original Farmyard painted control/frame materials, a narrow-screen properties drawer and an authored demonstration yard. The three consumer games remain independently maintained.

## Verification

- Integrity, exact source pins and relative module closure: passed for all 534 imported files.
- Seven Nautilus behavior tests: passed. They exercise headless operation, document isolation, edit/undo/redo, rejected-command rollback, map/block round trips, malformed/oversized import rejection, deterministic generation and failed-plan preservation.
- Thirty-two original AFT regressions: passed. Original tests run unchanged from the snapshot root, including their original road/fence fixture.
- Static build and JavaScript syntax: passed.
- Browser rendering: the authored yard, painted controls, props and character markers render without reported errors/warnings. The default narrow in-app browser has no horizontal overflow; its properties drawer and two-row edit toolbar remain accessible. A desktop viewport was also inspected for its separate tools/workspace/properties layout; the side-panel screenshot surface clips a widened viewport, so the default-size view is the primary visual evidence.
- Browser behavior: renamed a map; undid/redid the rename; saved it in Nautilus's own browser store; exported JSON, opened a new design and imported the export; created and saved a block with all four connections; generated 100 matching blocks at seed 7; undid generation to restore the earlier yard; painted a floor rectangle directly on the canvas. Status messages confirmed save, generation, undo and edit completion. No browser errors/warnings were reported after these operations.
- Test-only browser outputs are `Nautilus regression yard` and `Nautilus open ground` at the local preview origin. The exported regression JSON was downloaded locally. These are not source content or production defaults.

## Limits and next boundary

The inherited map format, dimensions, spawn conventions, content catalog and generation limits remain explicit. A general content registry, consumer adapters and strategic-world-to-playable-sector generation are subsequent work. No combat application is bundled. Both Send to game buttons stay disabled until a host connects an adapter.

The private GitHub repository is `Syntaxswine/nautilus-engine`; the private Sites identity is recorded in `.openai/hosting.json`. Publication results are verified separately against the exact committed source. The temporary preview owns port 4517, has a real 30-minute automatic shutdown and a helper-lifecycle registration; it is stopped after verification. The source and restart record remain available for deliberate restart.
