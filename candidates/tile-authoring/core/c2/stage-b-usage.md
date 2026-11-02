# Private C2 Stage B: capture/save and portable original bytes

| Field | Value |
| --- | --- |
| Identity | nautilus.tile-authoring.core.c2.private.B |
| Status | Private non-placement candidate; Architect review pending |
| Entry | candidates/tile-authoring/core/c2/index.js; no installed/public registration |
| Base | Independently accepted scoped A ledger correction8b4cd72c2d8f424d6811196d9651916bb7e9e2bd |
| Immutable content | Original30 Artist records and two original PNGs fixed at a66c78332c90fda33c16ffa7518a358b60249169; original hashes/notices preserved |
| Schemas/types | Unchanged C0 persisted schemas and appearance Plan2; stage-b.schema.json and stage-b.d.ts describe only new private pure producer/file-set APIs |
| Maintainer | Coder; Architect owns integration and the combined-placement freeze |

This checkpoint captures selected existing local marks into a preset, saves that exact immutable preset through canonical preset.save, and exports/imports complete real PNG bytes with exact content/resource/notice closure. It implements no placement with captured marks, archive codec, renderer, decoder, storage, authority or game behavior. C1 Editor acceptance/public/consumer adoption remain separate.

## Working pure consumer and connections

Run node tools/tile-authoring-core-c2-stage-b-example.mjs. It uses the actual public Core for source validation, the actual private capture/save planner/binder, all original30 content records and2,560,200 original encoded PNG bytes. Its admission/native/sharing observations remain explicitly synthetic DTO unit data; it demonstrates pure source/byte behavior, not live ownership/readiness.

Supply the actual public tiles namespace and a complete source document. captureTilePreset(tiles,{document,identity,ownerId,layerRemaps,markRemaps,limits?}) takes explicit current owner/mark/layer IDs and explicit template IDs. It returns {preset,pin,work}, without mutating source. All selected marks need a selected layer; duplicate/missing/foreign IDs refuse. Capture copies local graphic transform/pivot/tint/opacity/mask/artwork Pin exactly and preserves the exact definition Pin. World pose does not become a default. Requires and full notices are the exact dependency union, with conflicting notice IDs refused.

Pass that returned preset unchanged in the frozen canonical preset.save operation. It appends only the next immutable preset revision; no placed owner, geometry, source mark, current association, resource reference or content version is rewritten. A saved preset with default graphics still has no automatic effect on placed copies. Stage B import now accepts supported self-contained presets with those defaults. It checks unique template IDs/layer orders, exact definition-surface/grid/layer/artwork references and bounded masks.

Each pure producer is bounded. A consumer that includes capture construction in one overall work budget can deduct actual captured work via the existing tightened plannerUnits limit when starting the save command. The working controls keep capture+save within1M this way. Once the save command starts, source → capacity → reversible preparation → actual admission → final bind uses the unchanged cumulative meter and effective limits, with no reset.

The actual retained Host must still provide genuine Source/Prepared capture, byte availability, decoder/resource/native ownership, current guards, real operation/ticket/full-WAL validation, Review and one Apply. On a painted source the frozen Plan2 route conservatively prepares appearance again; it requires actual sharing observations to reuse already decoded source pages. The example's observations are labelled synthetic. Do not substitute them for a live provider.

## Portable content is an exact file set

exportTileContentPack(tiles,{document,query,manifestId,entries,limits?}) accepts the exact canonical content.export query with includeAllDependencies:true. Select exact preset Pins; it derives the self-contained preset/definition/artwork dependency closure, canonical blob file names and required profiles. No unrelated library version, engine/runtime or implicit game dependency is bundled.

entries is a finite array of {entry,bytes:Uint8Array}. Actual bytes are mandatory for every complete unique PNG page, including unused views in an included page. Entry paths, byte lengths and full SHA-256 must match exact immutable descriptors. No absolute path, URI, filename alias, digest-only placeholder or readiness flag supplies bytes.

The result {pack,entries,work} contains the unchanged canonical C0 Pack plus actual owned byte copies under its canonical blobs/<sha>.png paths. A consumer may write the pack JSON and those files into its approved directory/archive transport. This Core checkpoint supplies neither a ZIP/container format nor filesystem publication. Normal map persistence still stores the same durable ResourceRef fields. The engine/finish catalogue and native/game services remain explicit declared consumer prerequisites.

importTileContentPack(tiles,{pack,entries,limits?}) revalidates full closure/records/notices and actual bytes without modifying a document. Feed its exact pack into canonical content.import; actual resource retention/publication stays with the Host and occurs only at the authorized transaction boundary. Metadata is frozen; returned byte arrays are independent owned mutable copies, not a readiness capability. Every subsequent import rehashes them.

The byte adapter derives SHA-256 from fixed public parts-core source with the original preserved in vendor/c1/parts-hash.js; it hashes bytes directly rather than UTF-8 encoding binary data. Tests independently compare Node crypto on non-text bytes and both complete original PNGs. This is byte integrity, not PNG decoding, pixel fidelity or renderer readiness. Encoded dimensions/interpretation become native-ready only through the real Artist profile during actual preparation.

## Bounds, failure and ownership

All fixed caps remain unchanged:1M work,4M source/output,6M aggregate input, finite node/depth/operation/library bounds,64MiB encoded pack ceiling and the accepted artwork/native/material/mark/geometry caps. Metadata plus actual copied binary input/output counts; the4M/6M Core limits can refuse before the64MiB pack ceiling. Overrides only tighten. Hash/copy/output work is charged; there is no streaming/unbounded archive escape.

Only stable non-shared Uint8Array storage is accepted. Intrinsic typed-array reads avoid caller byteLength getters. Sparse/accessor/exotic entry containers, duplicate or extra files, wrong lengths/hashes, absent dependencies, stale Pins, wrong grids, conflicting immutable versions, unknown profiles and unsupported media refuse atomically. A failed producer/import owns no Host state and cannot clear source/redo/debt or publish blobs.

Save/reload remains WorkbenchDocument@3, canonical preset records/Pack and existing19 bindings. Source/admitted physical sets and the accepted A lifetime/retirement/residency/full-page charge guards remain exact. Unknown resource retention still includes source/target/history/redo/pending/export obligations, and actual Host same-ID recovery must reconcile without replay.

## Placement boundary and evidence

preset.place with C2 capture explicitly refuses C2_COMBINED_ROUTE_REQUIRED. The separate proposals/combined-route.{md,schema.json,d.ts} packet proposes new ephemeral Plan3/combined kinds, one actual retained public-v1 repair result and one fully charged native candidate, with exact original Expected/ID and one whole Apply. It is not imported or implemented. Combined history remains explicitly unavailable pending its own exact seam. Grouping/reanchor/owner delete remain Stage C refusals.

Golden fixtures preserve the complete captured preset, whole saved document and exported canonical pack metadata. Tests cover original30 graphics/pins/frames/notices, explicit selection/remaps, pose independence, constructor/save work carry, independent raw-byte hashes, real-byte round trip, corruption/path/closure/accessor/shared-buffer/quota failures, canonical content.import and explicit placement refusal. Normal distributions/public registries/pins/Sites remain unchanged.

For map-authoring accuracy and narrative, retaining exact source-local controls and original assets/notices is preferred to reconstructing or normalizing defaults. For efficiency, export includes each full unique encoded page once; frame count is not page count. Measured deterministic work and actual encoded byte counts apply only to these pure controls. Native allocation observations in tests are synthetic, with no timing,480-native, visual, decoder or usability acceptance claim. No preview server or retained helper is needed.


## Portable boundary correction

The initial f09e56d checkpoint was returned by independent Architect review. Its exact probe, results and original portable source remain under vendor/architect-review/f09e56d/. The correction counts the final returned carrier metadata, including the final work.outputBytes and final unitsCharged, plus every raw payload byte. A bounded16-step reconciliation measures the large fixed header once and charges each small work-summary step; no result is returned until the exact representation stabilizes within the unchanged quotas. Boundary and one-byte-below controls cover import, export and a no-payload pack.

Backing-store checks use the actual ArrayBuffer byteLength intrinsic as a realm-independent brand check, alongside intrinsic typed-array length/buffer/type access. Genuine SharedArrayBuffer storage is rejected across realms even when prototypes, tags or user accessors are disguised. Genuine non-shared cross-realm bytes remain supported and copied independently. Neither caller buffer/length/tag getters nor fake typed-array prototypes establish storage identity. No canonical schema, Native/Host behavior or quota changed.
