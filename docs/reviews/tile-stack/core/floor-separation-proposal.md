# Deferred floor-separation contract (design only)

Status: unimplemented, unregistered proposal for projected edge/radius-only cases public v1 cannot prove. The current helper refuses these contacts. This document grants no new relation kind, annotation interpretation, public export or C2a height support.

## Representation and compatibility

Prefer a new explicitly negotiated, versioned layout/contact capability over redefining `cross` or `alongside`. The exact public version number is reserved for Architect's future compatibility review; private C2a's current version numbers must not be repurposed by this proposal. Existing v1 records load and keep their current positive-area crossing/actual lateral adjacency meanings. Old consumers must reject a new required capability while retaining complete unsupported source; no downgrade by dropping relations.

An illustrative proposed relation is `{id,kind:'floor-separated',version:1,a:{instanceId,primaryReservationId},b:{instanceId,primaryReservationId},minimumClearanceM,projectionProfile:'rect-intervals-q1e6-v1',coverage:'all-relevant-source-and-reservations'}`. These fields are descriptive proposal data, not valid v1 source. The source stores requirements and stable references, never a cached pass/fail flag. Canonical profile/table/catalogue/geometry/context and saved requirement digests bind evaluation and preparation.

## Obligations and closure

Require supported native source with conservative named envelopes. Generate independently identifiable obligations for every relevant original geometry pair and every additional reservation pair, including projected positive overlap, edge overlap and radius-only proximity with at least one positive lateral interval. The operation supplies a finite explicit discovery radius; it is not inferred from mesh visibility or floor labels. A future corner-only policy needs a separately named definition.

Measure vertical interval clearance in canonical integer units for each obligation; accept only when its saved positive minimum holds. Check actual declared floor/elevation binding as well as intervals. Different IDs with the same elevation cannot waive overlap; same-floor lateral joins retain existing interface checks. Tall extras and changed controls invalidate the entire atomic candidate. A successful separation relation would cover only the specific proven obligations, never the entire owner pair by name or transitivity.

Discover from old and new geometry, all reservations and semantic links, without height filtering. Include unchanged reservation-free neighbours and ports. Unsupported possibly affected source refuses; preserve distant/unused valid source. Every retained requirement is rechecked from actual source, even if fingerprints are unchanged. Proposed changes and saved stronger minima cannot be silently lowered.

## Budgets, transactions and evidence

Use the existing finite core prepare and retained host CAS/history. Separate budget accounting for source bounds, interval/contact enumeration, pair proof, record allocation and complete serialization. Reject before allocating above captured limits; no cap increase, selection retry, hidden-floor exclusion or second resolver. Preserve the existing aggregate view allocation policy.

Required evidence before adoption: positive edge/radius examples, exact-boundary and cap-minus-one cases, same-plane and zero-gap negatives, tall-extra and missing-obligation mutations, old/new move/removal closure, unsupported reservation-free neighbours, every D4 pose, original-control/anchor-subset preservation, deterministic source/actual-installed parity, independent integer oracle, frozen public-v1 regression, and real atomic history/unknown-ack recovery in the host. No support/traversal/extrusion/game claim follows from clearance.

## Recommendation under the three design criteria

**Accuracy:** Explicit native interval measurements and every-contact proof are preferable for Nautilus authoring to a floor-label waiver or permissive annotation. They represent authoring clearance, not physical load or safety. Real-world structural/physical calibration remains absent.

**Efficiency:** Keep current v1 crossings for positive overlap now, and add the generalized interval capability only after core review. This reuses one repair/transaction authority. Pairwise work remains quadratic in owners and multiplies by reservation counts; bounds reduce candidate discovery but never erase obligations. This is a code-based estimate, not a timing benchmark. A compact aggregate syntax could reduce saved bytes later, but must expand/prove the same obligations within finite budgets.

**Narrative:** A later explicit separation capability would let builders place staggered floors and nearby upper paths while preserving readable reasons for refusal. This is a subjective authoring preference. AFT/Farmyard tactical scenes may retain simpler level policies; Tinderbox's richer physical/fire/support decisions remain consumer-owned.

**Provisional choice:** Keep strict v1 refusal for this tranche and prefer a versioned all-obligations interval extension for the later named use case. Evidence needed to finalize it is the above independent proof plus real integration/performance review. Preserve the named AFT compatibility profile and other explicit nonuniform profiles.
