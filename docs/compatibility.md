# Portable contracts and compatibility

Nautilus 0.5 exposes engine-owned plain-data interfaces. Import public package entry points; donor modules, editor classes, storage and renderer internals are implementation details. The inherited map vocabulary remains an explicit compatibility profile, with four squad starts, one travel marker and the reviewed content allowlists. A facade does not make that profile universal.

## Schemas and persistence

| Schema ID | Current version | Policy |
| --- | --- | --- |
| aft-map | 2 | Existing 240 by 240 portable JSON remains unchanged; six available layers. |
| aft-block | 1 | Existing 24 by 24 portable reusable blocks remain unchanged. |
| nautilus-save | 1 | Optional stamped envelope around an unchanged portable blueprint. |

The structural schemas live in schemas/. Full geometry/content validation uses loadBlueprint or validateBlueprint; a structural JSON Schema check alone is insufficient. createSave, parseSave and serializeSave add engine/schema stamps and capability requirements without saving editor caches/history. No internal clock, generated time stamp, resource refill or silent damage normalization is introduced. Canonical key ordering makes repeated serialization stable; array order is preserved. The limit is 4,000,000 UTF-8 bytes.

Accepted additive JSON fields survive at their original paths in current-format blueprints and envelopes. Explicitly closed functional extension schemas reject unfamiliar fields; they do not silently discard them. They are opaque data, without implied behavior. Features needed to interpret gameplay or geometry must declare a required capability; an unfamiliar required feature fails closed. Optional behavior can be unavailable, but its stored data must still survive. Future schema/envelope versions reject; no guessed down-conversion is attempted.

Legacy map version 1 needs the explicit migrateBlueprint operation. Its reviewed one-way 24/28 by 24 expansion returns a migration receipt. It preserves metadata and rejects other extra legacy fields the inherited conversion cannot retain. Existing low-level parsing helpers keep their historical behavior for compatibility; new consumers should use this explicit persistence facade. Golden block/save fixtures are in tests/fixtures/persistence and are read, reserialized and compared in tests.

## Capability negotiation

engineManifest returns a copied manifest with stable schema IDs, exact supported versions and feature IDs. blueprintRequirements derives required features from authored content. negotiateCapabilities accepts separate required and optional arrays, each with an inclusive integer minVersion/maxVersion. A consumer publishes contractVersion 1, an ID, schemas and capabilities with exact versions arrays. Unknown/invalid/duplicate entries and incompatible schema versions produce structured errors with code, path, affected feature, supported versions and an action.

assertBlueprintCompatible refuses unsupported required data before handoff. The browser bridge accepts adapter.manifest; historical string-array adapter.features remains supported. A feature declaration is the consumer's promise to preserve and implement its semantics, not automatic gameplay integration. Empty future/invalid extension envelopes still reject through blueprint validation.

## Release policy

Semantic versions identify complete engine builds. During 0.x, a minor version may change an experimental public contract; patch versions preserve it. Schema/capability versions are independent of package versions. Saved immutable catalogue IDs never redirect to new geometry. Releases document migration and compatibility changes in CHANGELOG.md, tag the reviewed commit, and retain its source hashes. Consumers deliberately pin an exact tag/commit/package integrity; updates never alter another game's pin automatically.

No reverse migration or forward-schema interpretation is promised. A new semantic contract needs a new capability/schema version and compatibility checks; adding a field does not silently grant support for new behavior. Production adoption remains distinct from conformance tests or shared asset exchange.

schemaDocuments() exposes the stable schema URNs and package-relative document URLs. Register all returned documents with a JSON Schema validator: cross-document references use absolute URNs and never depend on resolving a relative URL against a URN. The core itself does not fetch schemas.
