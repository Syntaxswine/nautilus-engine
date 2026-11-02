# Intrinsic geometry-storage currentness correction

This append-only follow-up addresses the remaining TypedArray getter spoof against db64bc5c666f635f64b3bd6f1a838a0a85d3aa36. The earlier db64/f029/06dee commits, both earlier correction/original evidence directories, and the original detail0/900-triangle mixed fixture remain unchanged.

The independent actual public-geometry witness kept the old digest/currentness while a real position changed from 21 to 21.125: an own buffer getter alternated between the real store and a pristine copy. The original result is preserved verbatim in independent-db64-failing-results.json as failing historical evidence. The reviewer source/result hashes are in independent-witnesses.json; no peer code was imported or executed.

## Corrected supported path

A single typed-array-storage.mjs reader captures the intrinsic TypedArray buffer, byteOffset, byteLength, length and internal element-brand getters plus the intrinsic ArrayBuffer capacity getter. It never calls instance metadata accessors, constructor/BYTES_PER_ELEMENT properties or a spoofed Symbol.toStringTag. It requires the matching ordinary supported element prototype and rejects proxy/DataView/unsupported elements, shared backing and resizable geometry stores.

Geometry snapshots use those actual slots for every attribute/index identity, layout, capacity and element count. They pass a fresh byte view over the same captured backing/window to hashing. This view aliases the original store; it is not a pixel/buffer copy. PublicViewOwner.hashBytes independently reads actual input and scratch storage intrinsically. Geometry acquisition and the owned-context bufferData observation/tagging paths use the same reader. BufferAttribute.array must be its supported own data slot; an accessor is refused without invocation.

Controls cover every supported element type; hostile buffer/offset/byte-length/element-length/capacity/constructor/element-size/tag getters; nonzero windows; scratch metadata; actual index and canonical-interface state; prototype/brand spoofing; and unsupported storage. On real sealed public geometry, harmless metadata shadows leave the unchanged source current, then a real data edit invalidates the source lease and existing preparation and makes another encoded-only preparation refuse STALE_SOURCE. Getter call counts remain zero; source data/totals/ownership stay preserved.

The initial focused run exposed a test hash callback that itself read shadowable metadata. Binding the hash callback to the captured byte window closed that path too. Its initial log stays in ignored artifacts; focused-45-tests.log records the final direct controls, and the full required-gate log includes the actual source/preparation cases.

## Evidence and scope

All four required repository gates pass: source check; 1222/1222 tests including all 123 private tests; 32/32 upstream tests; build with 552 module paths. Full logs are under gates/. The current fixed graphics/sampling/PNG/hash-kernel/ledger bytes are unchanged; their exact comparison is recorded alongside the gate results. The 245-pixel GPU run is not repeated or restamped, and no new browser/timing helper was started for this correction.

This does not implement the separate 20118 browser-accounting design. Its review-only packet remains under ignored artifacts/art-c2-browser-accounting-review-20118/, with source/reference hash and focused record/type pairing controls. No full repository rerun belongs to that unchanged design review. Strict final capture/upload admission remains UNBOUND and public adoption remains with Root.
