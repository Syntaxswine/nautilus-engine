# Reusable asset handoffs

An asset should tell the next game team how to use it. Geometry, a button image or an entry in a catalogue is only one part of that handoff. Ship its working entry point, a reference consumer, required bindings, saved state and known limits together.

Start with the implemented [door/stair behavior](standard-interactions.md) and [title-screen recipe](game-title.md). Open `examples/game-starter.html` in the built preview to try both. `gameAssetGuides()` from the headless `./game-ui` export returns these guides as machine-readable usage cards. The guide files travel in installed engine packages; browser examples belong to the source checkout/static workshop build.

## Minimum handoff card

| Field | What the next person needs |
| --- | --- |
| Identity | Stable asset/module ID, schema/profile/API version, source commit, notices and preserved original bytes where applicable. |
| Entry and example | Supported public import/CSS/resource URL and a working reference showing real use. |
| Purpose | Exactly what is implemented, which game/use case it fits and what success looks like. |
| Space | Metres or pixels, ground/height axes, origin/pivot, native bounds, floors and body/clearance assumptions. |
| Bindings | Required world, renderer, actor, query, permission, clock, input and save services. State who owns/disposes each. |
| Commands/events | How to preview, commit, reject stale work and deduplicate downstream effects. |
| Persistence | State shape, matching content versions, mid-action restore, unsupported-version behavior and migration owner. |
| Customization | Art/style hooks and game policies that should change without copying/rebuilding the shared component. |
| Limits | Unsupported geometry, platforms/actions and conservative approximations; actionable refusal instead of silent loss. |
| Proof | Exact reviewed commit, focused tests, real keyboard/phone/browser evidence and cleanup record. |

## Before accepting it into a game

Select a fixed reviewed engine release/commit. Read the usage guide, negotiate actual capabilities and bind existing host services before replacing them. Keep the source world and saves recoverable. Review an actual player path with the game's actors, doors, floor heights, controls, saves and rendering boundaries.

Use the accuracy/efficiency/narrative evaluation in [design-evaluation.md](design-evaluation.md) when choosing a donor design or richer provider. Label measurements, code estimates and subjective choices. A phone tactical game can use conservative boxes for a simple yard; a curved silo or a fire-driven world needs the corresponding geometry/material behavior.

The architect owns cross-game adoption and publication. A passing reference yard demonstrates this engine boundary; it does not certify a donor game's deployment.