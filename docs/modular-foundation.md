# Modular foundation checkpoint

29 October 2026. The user approved the modular blueprint and extended-height plan. Version **0.8.0** is the first implementation wave. The original 0.7 baseline and its portable map/block, character, rock and progression contracts remain compatible. This checkpoint is not completion of the entire [blueprint](engine-blueprint.md).

| Area | Delivered boundary | Acceptance still required |
| --- | --- | --- |
| Optional composition | Explicit provider/version plan, borrowed host services, synchronous handles, prepare/start and rollback/teardown | Concrete game recipes, command/outcome routing, cancellation and coordinated state commits |
| Farmyard adoption seam | Pure stat-v2 adapter with actual preset/weapon parity and resource preservation, including menu actors without ID/weapon | A separately reviewed production game change and exact engine pin |
| Native heights | Extended-world v1 with up to 32 stable floor positions, native coordinates, static AABB/contact/support queries, validated authored traversal endpoints | Movement/clearance/sweeps, sloped/rotated geometry providers, dynamic obstacles, complete migration and game adoption |
| Floor UI | Five visible labels, arrows, Page keys, selector-only wheel, host-confirmed follow/contact/manual modes; legacy editor cancellation | Live-game camera/cutaways, perception/knowledge adapters and physical-device performance |
| Tall authoring | Separate native 15-story plus roof-deck workshop: measured/dragged edits, revision-bound previews, bounded history, world JSON and browser saves | Gameplay traversal, falls/damage, fire and AI remain separate services |
| Existing assets | Twelve actor rigs, thirteen weapons, Misha throw markers and landmark surface evidence at immutable pins | Demand-loading/ownership API, body-only rock animation adapter and measured clearance/support fixes |

## Reviewed source checkpoints

- Coder world contract: `97085997ba7c6b811d506fe3f72776afcca94cf3`, tightened native metadata/validation `7aaec081ddb3a83139bf713cff53d6bbc0823dd0`, final documented support tie policy `fbb57293805ecae34569ab3dd9f689ffea53beb0`.
- UI controller/view: `a92ed7b73eaf9569b4670f516ebf760362ee083d`, browser evidence `e0977e785857277a1c59acc1134ada5156a3fa4b`. Root integrates package exports and automatic editor installation separately.
- Extended authoring: `df1333616a20a881b56f1cad3d10f5881baa9dd8`, evidence `dd7e15feaec1526649c99a4e4da43c6238273927`. This is a built-only, event-driven structural SVG view of the actual saved/query geometry; it imports no new actor/model closure. Reviewed follow-up `cc4eba5365f9df36f262a0b675a32425a89eb6b3`, with evidence `5bc0f0c3a9159d9f994f6dc16422366066de493a`, enforces history limits after undo/redo and rejects invalid imports or saved floor selections without replacing the open world or its usable floor controller.
- Toolbar correction: `49bf6d0196baf7da6b795083c35636966847d4f0`, evidence `94255707cfa8bffe533c7e9de55963f1fbacf29c`. Inactive roof settings cannot override a wall brush material; actual brush edits/history/reload are checked.
- Artist intake: `d9ba3fc912a4e9331f617edd9d15572ddd2a635a`. No additional donor runtime bytes or new cast are imported by the proposal.
- Farmyard calculation evidence: full game commit `279d2d34786b3e6e5c5baeeac6898e60030afdbe`; [source records](reviews/2026-10-29-farmyard-rules.sources.json) preserve Git blobs, raw mixed line endings, byte counts and SHA-256. The fixture is test-only, excluded from every runtime distribution.

Root-owned composition and integration are reviewed in this release's Git history. Worker checkouts remain untouched by the importer; only full committed checkpoints are integrated. Required source, test, inherited regression, build, installed-package and affected browser gates must pass before main promotion. Recorded worker evidence identifies its own source; final integrated acceptance is separate.

## Decisions and limits

**Accuracy:** prefer explicit metre heights, floor/support identities and actual landing references for tall authoring. A static AABB proxy cannot represent a sloped roof or detailed rotated mesh exactly. Preserve that distinction and reject unimplemented semantics. The native kit interval is **2.12 m** (2 m walls plus 0.12 m slab); explicit alternative profiles remain valid and are not silently rescaled.

**Efficiency:** prefer a small pure Farmyard seam and optional composition over requiring replacement of its working world/turn systems. Sparse worlds avoid per-floor cell allocation; the reproducible desktop workload in `tests/fixtures/extended-world/baseline.json` is observational evidence, not a phone or GPU budget. Asset intake selected a roughly 4.7 MB Misha closure versus a roughly 53.6 MB complete actor/motion set; neither is imported by this proposal.

**Narrative:** preserve the existing games' actors, paint and animation intent. The 76.32 m Administration Building has four pavilion stories, galleries, terraces and voids; its crown does not manufacture 36 occupied floors. Use a distinct native 15-story circulation fixture for tall-floor acceptance. Misha's measured door/prone clearance and the grenade study's incompatible direct rock prop remain explicit follow-up work.

The next accepted tranches should put the Farmyard seam into the real game, then add a bounded content/actor loader and rock animation binding, world movement/visibility providers, command/outcome/persistence coordination, lighting/cameras/controls and tested game recipes. Species/class perks and invented cast remain deferred. Each consumer keeps its existing pin until its own reviewed adoption. No Site audience or publishing setting changes here.
