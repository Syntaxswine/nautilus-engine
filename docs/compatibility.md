# Portable contracts and compatibility

Nautilus 0.9 exposes engine-owned plain-data interfaces. Import public package entry points; donor modules, editor classes, storage and renderer internals are implementation details. The inherited map vocabulary remains an explicit compatibility profile, with four squad starts, one travel marker and the reviewed content allowlists. A facade does not make that profile universal.

## Schemas and persistence

| Schema ID | Current version | Policy |
| --- | --- | --- |
| aft-map | 2 | Existing 240 by 240 portable JSON remains unchanged; six available layers. |
| aft-block | 1 | Existing 24 by 24 portable reusable blocks remain unchanged. |
| nautilus-save | 1 | Optional stamped envelope around an unchanged portable blueprint. |
| nautilus-rock | 1 | Optional item sidecar; explicit instance/owner/flight state. |
| nautilus-rock-impact-noise | 1 | First confirmed surface-contact event; host deduplicates delivery. |
| nautilus-progression | 1 | Optional strict progression bundle containing an unchanged character-v1 and saved reward/allocation receipts. |
| nautilus-grenade-state | 1 | Optional strict static same-floor Farmyard grenade context and durable command journal; complete host adoption remains explicit. |

The structural schemas live in schemas/. Full geometry/content validation uses loadBlueprint or validateBlueprint; a structural JSON Schema check alone is insufficient. createSave, parseSave and serializeSave add engine/schema stamps and capability requirements without saving editor caches/history. No internal clock, generated time stamp, resource refill or silent damage normalization is introduced. Canonical key ordering makes repeated serialization stable; array order is preserved. The limit is 4,000,000 UTF-8 bytes.

Accepted additive JSON fields survive at their original paths in current-format blueprints and envelopes. Explicitly closed functional extension schemas reject unfamiliar fields; they do not silently discard them. They are opaque data, without implied behavior. Features needed to interpret gameplay or geometry must declare a required capability; an unfamiliar required feature fails closed. Optional behavior can be unavailable, but its stored data must still survive. Future schema/envelope versions reject; no guessed down-conversion is attempted.

Legacy map version 1 needs the explicit migrateBlueprint operation. Its reviewed one-way 24/28 by 24 expansion returns a migration receipt. It preserves metadata and rejects other extra legacy fields the inherited conversion cannot retain. Existing low-level parsing helpers keep their historical behavior for compatibility; new consumers should use this explicit persistence facade. Golden block/save fixtures are in tests/fixtures/persistence and are read, reserialized and compared in tests.

Rock sidecars use the strict [item contract](rock-distraction.md), separately from portable map/block saves. `openRock` validates complete state and `serializeRock` writes stable field order; unfamiliar fields, altered physics profiles and future versions reject. No forward migration is inferred. Persist authoritative inventories and command/event ledgers atomically with sidecars. The engine does not refill inventory on load. The shared `nautilus-rock-items-v1` capability identifies the available action contract; a game must implement its world/hearing/inventory bindings before advertising support.

[Progression bundles](progression.md) are separate from map/block saves and declare `nautilus-basic-progression-v1`. The loader rejects unfamiliar versions, fields and unsupported profiles; no guessed migration or resource refill occurs. Changing a curve or practice policy requires a deliberate versioned profile/migration. Reward identity, character changes and the progression revision must commit together.

## Capability negotiation

engineManifest returns a copied manifest with stable schema IDs, exact supported versions and feature IDs. blueprintRequirements derives required features from authored content. negotiateCapabilities accepts separate required and optional arrays, each with an inclusive integer minVersion/maxVersion. A consumer publishes contractVersion 1, an ID, schemas and capabilities with exact versions arrays. Unknown/invalid/duplicate entries and incompatible schema versions produce structured errors with code, path, affected feature, supported versions and an action.

assertBlueprintCompatible refuses unsupported required data before handoff. The browser bridge accepts adapter.manifest; historical string-array adapter.features remains supported. A feature declaration is the consumer's promise to preserve and implement its semantics, not automatic gameplay integration. Empty future/invalid extension envelopes still reject through blueprint validation.

## Release policy

Main is the canonical integrated source; worker branches are candidates. The [promotion procedure](https://github.com/Syntaxswine/nautilus-engine/blob/main/docs/releasing.md) records review, checks, main integration and immutable release tags; deliberate unreleased asset pins retain explicit candidate status.

Semantic versions identify complete engine builds. During 0.x, a minor version may change an experimental public contract; patch versions preserve it. Schema/capability versions are independent of package versions. Saved immutable catalogue IDs never redirect to new geometry. Releases document migration and compatibility changes in CHANGELOG.md, tag the reviewed commit, and retain its source hashes. Consumers deliberately pin an exact tag/commit/package integrity; updates never alter another game's pin automatically.

No reverse migration or forward-schema interpretation is promised. A new semantic contract needs a new capability/schema version and compatibility checks; adding a field does not silently grant support for new behavior. Production adoption remains distinct from conformance tests or shared asset exchange.

schemaDocuments() exposes the stable schema URNs and package-relative document URLs. Register all returned documents with a JSON Schema validator: cross-document references use absolute URNs and never depend on resolving a relative URL against a URN. The core itself does not fetch schemas.

## Native-height and composition contracts

Version 0.8 registers independent `nautilus-extended-world` v1 and `nautilus-module-configuration` v1 structural schemas. The former lives beside world-core and is discoverable through `schemaDocuments()`; the latter lives in schemas/. Their registration does not grant any game a new capability.

Extended worlds require `nautilus-extended-height-v1`; nonempty geometry, placements and links additionally require `nautilus-world-aabb-v1`, `nautilus-world-placements-v1` and `nautilus-world-traversal-links-v1`. These promises describe static authored data, AABB queries and valid endpoints, not a character movement service. Configuration composition uses `nautilus-module-composition-v1`. Unsupported semantics reject before opening/activation.

The world contract has its own joint limits, including 32 declared positions and an 8 MB UTF-8 input/save budget. Other existing save/legacy budgets stay unchanged. Unknown fields in both new strict schemas reject. Native values are never rescaled on load. Migration/legacy representability reports retain the source and always refuse conversion until a complete reviewed binder exists. See [world limits and refusal behavior](extended-world-core.md#bounds-and-legacy-handling).

The optional Farmyard stat-v2 adapter ignores host resource state and preserves it exactly in a shallow derived-field projection; it is not a portable character loader or repair function. Strict portable character loading remains unchanged. Each production game still adopts an exact source/package pin in its own reviewed change.

## Farmyard grenade profile

Version 0.9 adds the separate `nautilus-grenade-state` v1 schema and capabilities `nautilus-grenades-static-planar-v1` / `nautilus-grenade-aim-v1`. [The grenade guide](grenades.md) records the exact source profile, public entries, supported geometry and transactional host requirements. Map/block and character formats stay unchanged.

The optional module preserves ordinary Farmyard grenade behavior at its recorded source pin. Windows, fueled/volatile targets, active fire and multilevel contexts require separately reviewed complete consequence adapters and reject before costs in this profile. Runtime capability declarations must describe these limits. The engine manifest advertises available code; a game must additionally implement atomic context commits, visibility refresh and body registration before advertising a usable host.

Grenade loading validates the complete retained journal and current resource state. Future schemas/profiles and unknown functional fields reject; no automatic migration, receipt eviction, healing or ammunition refill occurs. New state must fit aggregate load/save limits before a transaction succeeds. Presentation is transient and never replays from loading or an exact command retry. All production game pins remain independently owned.
