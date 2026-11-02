# Bounded owner-state correction

This follow-up corrects two findings against f029e7e75e225c5f973052552deb61403a2fc915. Both that checkpoint and 06dee5b01eeefddbe5e92a3f71d4382dffad0986 remain immutable. All original mixed/pixel/ownership evidence stays byte-exact. Independent witness locations/hashes are recorded in independent-witnesses.json; those peer files were read only, never imported or executed. The original failing JSON result is preserved byte for byte as reference evidence in independent-f029-failing-results.json; it is not current passing output or a runtime dependency.

## Source drawing state

The old fingerprint omitted drawRange and index. The corrected common geometry snapshot covers actual geometry identity; every supported attribute and optional unsigned index; attribute/array/backing identities, type, byte offset/length, item size/count, normalization, usage, GPU type, version, update ranges and upload callback; ordered groups; draw range; bounding box/sphere; and the static morph-relative flag. Infinity in a valid draw count has an explicit unbounded sentinel rather than collapsing into JSON null.

The supported profile is ordinary static shared-Three BufferGeometry with ordinary typed BufferAttributes. Interleaved, instanced, external-GL and morph attributes are explicitly refused. Attribute/group/range observation is bounded. The same function observes rendered geometry and retained canonical interfaces; neither path can omit an index or layout change. GPU buffer observation includes an index when present.

Each private source lease pins its capture-time live CPU/draw fingerprint and, when supplied, actual observed GPU-buffer state. Replacing a mutable view's baseline or resealing it does not restamp an earlier source lease. The private handles and source data shape remain unchanged. This is a supported geometry/resource contract, not a complete Host preserved-world or authority implementation.

Controls cover the exact drawRange/index failures through sealed-source currentness, an existing preparation and refusal of another encoded-only preparation with STALE_SOURCE. Related cases cover groups, counts, positions, bounds, canonical interfaces, index data/type/layout and same-buffer attribute windows. Unchanged sources and no-op full draw-range updates remain current. Source data, ownership and resource totals remain preserved after refusal.

## Quota facts and retirement

PhysicalMemory now holds classification, byte charges, physical identities, references, sampled status, limits, state and retirement inside private records. Returned rows are frozen read-only live views. CPU backing records and native retirement records are separately tagged private wrappers, so caller properties added to a real typed array cannot impersonate native ownership. Physical backing identity is read through intrinsic typed-array/ArrayBuffer getters. Collections/limits are read-only; snapshots and diagnostic sets are detached. Editing a snapshot cannot change admission facts. Copied row objects do not mint an allocation capability. Scratch/image/data clients use explicit copy accounting and one-way unverified transitions, rather than writing row fields.

The exact adversarial controls now fail: a 1024-byte decoded limit cannot admit a second independent 1024-byte store after a returned-row reclassification attempt, and four acquiring sampled reservations cannot admit a fifth after a fake retired flag/receipt. Unverified retirement remains charged. All original ceilings are unchanged.

Native retirement uses a registered live owner over a brand-checked platform WebGL2 context, captured native methods and the actual handle/context/epoch. A nominal receipt cannot remove a still-live texture/buffer. References prevent retirement; a positive owner receipt plus actual native object deletion is required to remove the logical allocation charge. Native handles cannot acquire a second accounting row through nominal equality. Caller CPU storage and unverified staging remain charged.

The bounded real WebGL control, with a tiny 2x2 texture and no geometry fixture or timing loop, verifies owned deletion and the exact logical charge change. final-native/ preserves its final-version rerun after private CPU/native record separation; the earlier control remains preserved separately. It also verifies rejection of a deliberately nominal receipt for a real still-live texture. This is native object lifecycle evidence, not an aggregate driver/VRAM retirement or native-copy quota proof. Opaque driver staging remains unbounded, charged and unsupported for strict admission.

## Evidence and remaining boundary

focused-99-tests.log preserves the complete initial focused correction run. final-52-controls.log covers geometry/owner/memory controls after capture-time CPU/GPU binding. final-private-facts-10-tests.log adds the final private CPU/native-wrapper and intrinsic backing-identity controls; all 101 private tests also pass in the final full suite. All four required repository checks pass: source check; 1200/1200 tests (including all 101 private tests); 32/32 upstream checks; build with 552 module paths. Full logs are preserved under gates/. retirement-report.json and the helper/cleanup files are exact outputs of the bounded native lifecycle control. All control process lifetimes are gone and both control ports are released. No helper/service is retained.

The original committed mixed fixture remains detail0 with 900 total triangles for 960 retained marks/cells; its report is not restamped. No extra full geometry fixture was run for this correction. Other recipe/option combinations and the exact accepted editor fixture are separate Root review evidence.

Strict final capture/upload admission remains UNBOUND. This correction adds no public registration, editor adoption, image generation, package promotion, consumer pin change or deployment. Root must re-review the corrected immutable component and coordinate the remaining closed Core capture/Host/native staging bindings.
