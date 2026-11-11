# Railway scale correction

The user chose compact game proportions after reviewing the first railway trains. The original passenger cars were 2.7–2.85 m long, with roughly 2 m roofs. Their exact artwork is preserved in `packages/railway-visuals/miniature-stock.js`, copied from reviewed engine commit `832331fe10f27caea7be0b209c18a1c364d7187c`. Its SHA-256 is `b6990ccc93983cb2d318fa91a059001adb830bc1d128f8694d26e79c70591529`.

## Accuracy

The implemented World size profile has 8.1–8.55 m passenger cars, 2.28–2.46 m maximum body widths and roughly 3.8–3.9 m passenger roofs above ground. The electric collector reaches 4.19 m. Passenger doors have 1.84–1.90 m panels. These dimensions are measured from the model buffers and recipes. They give the native characters believable doors and make each car span several metre tiles. They are a deliberate compact interpretation of a passenger railway. The existing 0.90 m rail-centre gauge remains a fictional narrow-gauge common track for both fleets.

New running gear retains round wheels and the 0.43 m rail datum. Separate wheel-contact pivots follow the host's track contacts and tangents, including the reversed commuter cab. Short two-axle trucks approximate the 16 m curve with approximately 6 mm lateral axle error. No suspension or wheel-spin simulation is included.

Large trains use 16 m curves with a reserved 4 m corridor. Their body rectangles clear one another throughout a complete 90° bend. Signals reserve wider junction approaches, and remain held until the longer consist clears. The original miniature routes, lengths and signals remain available through their explicit profile and original save versions.

## Efficiency

Code inspection shows shared procedural paint, geometry and materials within each kit. The two contact pivots per car and articulated steam rods add small transform updates per moving frame. Signals remain three instanced meshes. This is an update-count estimate, not a frame-rate measurement. No donor game or second Three instance is loaded.

## Narrative and recommendation

World size is the preferred default for character-scale authored worlds. The longer bodies, taller doors and wider bends make passenger trains read as vehicles characters could board. This is a visual judgment. Miniature remains useful for small exhibits and the original layouts. Exact miniature bytes and save behavior are preserved rather than enlarging existing authored departures silently.

The new optional railway envelope is version 6. It saves each chosen profile and curve radius, requires a separate consumer capability and preserves all earlier formats. New unsupported sizes and insufficient track are refused before an edit commits. No game consumer pin changes.

## Acceptance

Focused checks cover measured model sizes, exact original artwork, body clearance on the wider curve, renderer pose updates, shared crossing holds and resumptions, durable size fields, undo/redo, and explicit consumer refusal. The built Workshop review covers both full-size fleets, native characters, miniature comparison, crossing and turnout waits, reload and undo. The project delivery record carries the complete gate results.

Delivery passed `npm run check`, all 1,198 engine tests, all 32 upstream regressions and the static build (581 module paths). All 26 focused railway tests passed. Isolated Edge 157 passed `node tools/review-railway-scale.mjs` for both fleets and junctions, and `node tools/review-railway-scale.mjs --route-only` for actual 16 m curve authoring, running, undo/redo and reload. Both browser sessions closed and released their ports.
