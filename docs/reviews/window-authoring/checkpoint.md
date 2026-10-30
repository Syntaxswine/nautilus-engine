# Window authoring checkpoint — 30 October 2026

Branch `codex/window-authoring` is based exactly on canonical main `5f3627cd9fc4d95f15b7f1eefafdfb1d6034475f`. This is the approved map-only headless checkpoint for Architect review. It implements a new closed `nautilus-window-authoring` v1 wrapper (`urn:nautilus:schema:window-authoring:1`), pure native preparation, transactional commands/history, fixtures, a usage card and [builder guide](../../window-authoring.md).

The wrapper preserves the complete base map/underlay, unknown bounded JSON, explicit native placements and separate visual aliases. Place/remove/move/quarter-turn/copy/dimensions/manual joins use one accepted history entry. Failed and stale preparations preserve accepted text, redo and preparation. Source definitions remain fixed; authoring never allocates a pane epoch, copies receipts or replaces live state. Existing runtime/service APIs are used without modification.

The [registration request](registration-request.json) specifies the optional `./windows/authoring` export, one schema and exact new runtime/support files. Root exports, manifests, schema registration, package/distribution whitelist, package version, CI, apps/editor, donor bytes/pins, other worktrees, consumer games and Sites are unchanged. Parts-v1/world-v1 are not extended. Root must review and register the candidate, then run actual declared-package proof; the default proof currently refuses `AUTHORING_REGISTRATION_PENDING` as intended.

## Verification

All four required gates passed after the final runtime change:

| Command | Result |
| --- | --- |
| `npm run check` | Pass; existing pinned sources, assets, closures and headless APIs verified |
| `npm test` | 650 passed, 0 failed; includes 23 authoring tests |
| `npm run test:upstream` | 32 passed, 0 failed |
| `npm run build` | Pass; 452 module paths checked and scripts syntax-checked |
| `node tools/test-window-authoring-package.mjs --candidate` | Pass; **private overlay, partial availability**, production availability false |
| `node tools/window-authoring-schema-cases.mjs` then `python tools/verify-window-authoring-schema.py --dependencies artifacts/window-authoring/schema-dependencies` | Pass; 19 independent Draft 2020-12 cases, using isolated jsonschema 4.25.1 tool dependencies |

The installed proof packs and installs the actual unchanged core beside an explicit private authoring overlay. It executes the guide example with only the candidate package prefix substituted, opens/edits/undoes/redoes/saves authoring, resolves guide/schema/request/support URLs, checks all 39 source presets plus the tall template, and exercises missing service/export refusals. A second physical core rejects the first core's opaque handle; a detached plain projection transports without ownership claims. This is data transport evidence, **not a presenter acceptance test**. The headless closure has 120 modules and no browser/editor/DOM/storage/network dependency violations. Reports and archive hashes are written under ignored `artifacts/window-authoring/` by the reproducible tool.

Tests include descriptor-first refusals, aggregate/base budgets, old/nested authority refusal, exact ground coordinates, explicit pivots, metre/storey distinction, long IDs/short aliases, door/steel/wood/concrete/jail families and locks, retained edge occupants, protected covered edges, unknown base values, multilevel handoff refusal, combined history budgets, stale tickets/context changes and complete-base capability negotiation. Binding all six actual host service records validates the existing retained save/context through the public connector while preserving its epoch, actor resources, typed sets, unknown fields and complete serialized save; no CAS/publication occurs.

The first complete run passed 649 tests. A subsequent dense-map probe exposed `STATE_LIMIT` when more than 65,536 unrelated base edges were sent to the pane compiler. The final adapter retains all base edges and projects covered facts only. A 65,537-edge regression now passes; the final full suite is 650. The retained host still composes complete world/actor queries: the pane projection is not a full world query.

[Provenance](dependencies.json) records the fixed journal Git blob/hash from `136e3ae7227b8b280e452fc9bcd5f11c3d91ac02` and original source facts from `9f525026f3185e0dce8115ce3a69f3a175ec7cf4`. Git-object comparison verified the journal algorithm is identical after documented factory/comment changes and both fact fixtures are byte-identical. Their historical metadata is preserved; no whole older branch was merged.

## Review boundaries

Valid authoring is saveable independently from a presenter or gameplay host. Negotiation checks authoring schema, actual retained base requirements and compiled pane requirements separately. Nonempty panes additionally require all six actual service bindings. `bindWindowAuthoringHandoff` validates those prerequisites and an existing host, returns `adopted:false`, and does not install authored geometry or convert a portable map into a complete game save. That complete-game projection/adoption remains a separate missing adapter; a successful prerequisite binding cannot be shown as playable-ready.

Native presenter integration, editor chrome, live actor-body measurements, traversal and richer multilevel support remain outside this checkpoint. Old authorities, pane legacy/block/generation exports and unsupported handoffs refuse without fallback; an empty overlay can explicitly export its lossless complete base payload. Presentation readiness stays false. Separately installed presentation must receive the existing detached public projection shape, never kernel handles.

The earlier decorative compact/period sash assets are a distinct fixed art checkpoint at `90054d07134116a5d9661f8318a76fe68f922aad`: `packages/window-kit/index.js` and `three.js`. Both are 2 m complete bays (.5 m wall + 1 m opening + .5 m wall); this authoring candidate neither imports nor rescales them. Native Farmyard catalogue dimensions remain unchanged.

The installed tool removed its temporary stage/consumer in `finally` and verified removal. No preview/browser/server/watchers or retained helper were launched. Isolated schema dependencies, local logs and package archives are data artifacts only. No deployment was requested or performed. Branch delivery ends at this fixed checkpoint for Architect review.
