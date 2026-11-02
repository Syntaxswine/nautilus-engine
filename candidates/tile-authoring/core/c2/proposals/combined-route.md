# Bounded combined-placement seam — proposal only

Status: stop here for Architect freeze. This packet implements no combined placement, new geometry evaluator, Host, public registration or schema migration. Current private B refuses preset.place with C2_COMBINED_ROUTE_REQUIRED. Plan1 and appearance-only Plan2 remain unchanged; a geometry+appearance operation must not be forced through Plan2 or split into two commits.

## Named use case and API

Place one or more captured presets with explicit graphic defaults in an existing supported rectangle map. First profile accepts only the existing canonical preset.place/copy-explicit operation, up to32 finite operation/owner slots and the unchanged global owners/recipe/resource/work caps. Grouped defaults, reanchor, upgrade/delete, path/field/hole geometry and combined-history restore remain unavailable in this initial packet.

Propose an explicit new ephemeral Plan@3, route geometry-and-appearance, tilePreparation public-v1-prepared, and a separately paired combined Host profile. CombinedSourceCapture, CombinedCapacityBound and CombinedPreparedCapture have distinct kind values. Exact closed data shapes are in combined-route.schema.json; none is registered or added to persisted formats.

The proposed planner accepts {document,command,context,combinedSource,limits?}. CombinedSourceCapture captures original canonical command ID/digest/Expected before a public repair request exists; it deliberately has no fake no-geometry hostRequest. Plan3 derives the actual public request under that same original ID. Original command/Expected never changes. The final binder receives before, Plan3, the ONE ACTUAL retained public-v1 preparation result and CombinedPreparedCapture. PublicPreparationObservation binds that retained result's original requestId/Expected/context, complete next.bundle and complete actual result digest. Serialized observations are not ownership.

## Exact sequence and target data

1. Strictly validate current full source and canonical command. Copy defaults through complete explicit freshMarkIds and freshLayerIds mappings already present in the frozen canonical placement body. Every selected template ID is covered exactly once; all new IDs are explicit and conflict-free against current owners/marks/layers. No generated IDs, automatic detach, omitted marks or normalized graphics. Surface/frame/grid, mask, source anchor, local transform/pivot/tint/alpha/layer order and complete resource/notice closure remain exact.
2. Reuse the fixed C1 placement geometry adapter architecture: derive a public stack intent from the original full canonical operation, then call the actual public planTileStack. Preserve exact original Expected and native floor/profile/constraint tokens. Do not alias the reduced public stack-profile digest to the full authoring floor-binding/Expected digest. No rewritten same-ID Command, fake public prepare result, alternative geometry evaluator or root package edit.
3. Plan3 may construct only prospective target DOCUMENT DATA from exact staged records and existing public canonical bundle constructors, including its expected next revision, for conservative capacity sizing/hash. This data is not an operation, preparation, receipt, history ticket or permission. A mismatch against the later actual public result refuses; never patch/restamp the original identity or target hash.
4. Capacity-only bound/refusal binds source checkpoint, prospective target, actual journal/history generation and effective authoring plus fixed Host ceilings, with fixed-width envelope allowance. No placeholder WAL/operation/ticket, native acquisition or durable write.
5. Through an explicitly retained Host seam, perform the one actual public-v1 repair preparation. Check exact request/Expected/context/binding and require its complete next.bundle to equal the prospective target data. The existing high-level Host prepare must not already create a separate C1 native view. If no geometry-only retained seam exists, refuse C2_COMBINED_HOST_UNBOUND; do not create another view.
6. Prepare ONE owned native candidate from that EXACT actual next.bundle with copied marks in its final appearance. Accepted source plus candidate stay within2roots. Charge the full second cells/triangles/materials/geometry buffers and every base/artwork/CPU/GPU/upload/scratch copy; no shared geometry inference. Reuse the accepted A correction's ordered ledger/retirement/residency and complete image-size guards.
7. Admit actual owned observations, then final pure bind against the SAME actual retained public result/candidate. Recheck target/map/content/resources/constraints, original source guards and nineteen existing C0 bindings. Source geometry remains the actual old native set; admitted candidate geometry names the actual new bundle/source fingerprint.
8. Only now create the REAL whole operation/history ticket and validate the complete ACTUAL WAL/history envelope. Current guards → Review → one atomic Apply for geometry+appearance+content+resource obligations. No second commit/prepare for marks. Failed final bind creates no ticket; failed actual-WAL validation rejects that ticket and retires only proved unadopted owned resources, retaining all unverified charges.

## Resource, meter and recovery rules

Carry normalized effective limits in Plan3 and bind its digest and the capacity governing-limits commitment. Actual source/capacity/preparation work remains monotonic. FinalBindUpperBound is only an unspent reservation; return actual final work and never reset/bypass1M,4M/6M, node, source, pack, allocation or view caps.

All source/admitted resource and geometry sets remain distinct. Every actual retained/introduced/released dependency and historical/redo/pending/export obligation is preserved. Same hash/frame is not a sharing attestation. Unknown keeps original same-ID recovery, full before/target and actual leases/debt, freezes writes, and cannot replay the command or GC blobs.

No new persisted discriminator is proposed. C0Command/Operation/Expected/Pin/Pack, WorkbenchDocument@3, Review@1, existing whole operation/pending envelopes and19bindings remain exact. A new ephemeral combined source identity binds the canonical command before derived public request construction; the actual persisted request remains the existing public repair request and existing bindings. If the final accepted Host requires extra persisted data, stop for a separately versioned/migration decision.

This bounded first proposal has edit-only input. Existing undo/redo whose geometry+appearance both change returns C2_COMBINED_HISTORY_UNAVAILABLE without changing current source/redo. Combined exact historical restore, actual-WAL retry/recovery and cold restart must be specified and accepted before any usable editor adoption. Do not reconstruct history as preset.place or manufacture a public repair request to masquerade as an original restore.

## Named refusals and review gates

C2_COMBINED_ROUTE_REQUIRED: attempted combined placement on Plan2/current B.
C2_COMBINED_HOST_UNBOUND: absent actual construction-time paired retained geometry-only preparation plus one candidate protocol.
C2_PUBLIC_RESULT_MISMATCH: actual public next.bundle/request/Expected/context differs from planned source-bound target.
C2_FRESH_ID_REMAP_REQUIRED: missing/extra/duplicate/conflicting explicit mark/layer/owner remaps.
C2_COMBINED_HISTORY_UNAVAILABLE: unsupported combined restore until its exact historical seam is frozen.
C2_GROUPING_UNAVAILABLE / C2_REANCHOR_UNAVAILABLE: Stage C is still refused.
Existing stale-source/context, budget, retirement/ledger, unknown-outcome and unsupported-source refusals remain.

Before implementation, Architect must freeze the new closed types/profile, the actual accepted C1 Host/internal retained seam and the prospective-data/public-result equivalence rule. Before adoption, require one-prepare/one-candidate/one-Apply proof, original-ID current guards, adverse native ownership/ABA/reentry/disposal cases, full real WAL/history capacity/refusals, complete save/portable pack parity, undo/redo and cold same-ID recovery, and actual source/built/installed/480 native+visual review.

For map authoring the combined route is preferred for accuracy and narrative: copied local graphics appear on the correctly prepared new geometry in one atomic result. A single fully charged candidate is preferred for efficiency over a second base/overlay construction; this is an architectural estimate, not a timing measurement. Keeping Plan2 geometry-free avoids claiming a route that its frozen contract cannot represent. No speed, native ownership or usability acceptance is asserted by this proposal.
