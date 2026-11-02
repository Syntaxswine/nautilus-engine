# Authentic private Host construction

This component separates producer identity from runtime readiness. An actual
same-owner Core Kernel, actual authority and original Root profile can produce
an opaque Host composition even when the Native phase and final binder remain
unavailable. Constructing that handle does not make an edit committable, reserve
work, create a writer, replace history or prove a Native resource release.

`createPrivateC2HostComposition({owner,kernel,authority,profile,bootstrap?})`
calls the fixed Core source-private
`kernelConstructionSourceForHost(kernel,{owner,authority,profile})` verifier.
The exact handle is recorded only in this module's private WeakMap. Frozen
objects, equivalent documents, callback predicates and copied handles cannot
replace membership in either producer's WeakMaps.

Core calls `hostCompositionSourceForKernel(handle)`. It returns the same frozen
record with exactly `kernel`, `owner`, `authority`, `profile`, `c2Host` and
`c2PhasePorts`. The verifier rechecks Core membership before returning it. The
canonical `profile` field names the original authenticated Root profile. Core
owns composing that profile and registering its composed identity before
entering the original single Session constructor.

The frozen Host has the original 45 required methods and the three explicit
Root construction/acquisition seams. The phase record has exactly four fields:
`kind`, `version`, `prepare` and `restore`. These methods are owned by this
producer. Supplying a caller-made phase object or success predicate is not an
alternative construction route. A missing actual Native, source, history or
final-bind operation refuses at its real method call with its own `UNBOUND`
code; it never fabricates a successful preparation, WAL or release.

The optional bootstrap token is an already-started Core-owned bootstrap scope.
The Host rechecks the actual authority, codec, owner token, purpose, original
null request ID, active source phase and nonterminal state when Session needs
it. The Host starts no second budget and allocates no authoring request ID.
Current authority, source, context and Native fences still belong to their
actual operations; constructor authentication cannot substitute for them.

Core source pin `2810b3c333187eadb428a88c83d98a8256f0fa56` is review-only.
Its verifier and equality guards require the actual owner to have an active
source scope. The equality guards recognize Core's internal actual authority,
codec and original/composed profile, and deliberately reject their opaque
external handles. Core2810 has not yet imported this Host producer into its
Session constructor, so this checkpoint proves genuine construction and the
single current-source journal, rather than a live Session boot. No raw internal
object is exposed merely to make a test pass.

The original single history site passes
`constructActualJournal({checkpoint,options:historyOptions})`. The Core safe
port validates that exact current settled checkpoint, original document text
and unchanged 64-entry/16MB/16MB limits, then returns the actual
`{journal,historyRead}` pair. It rejects a second construction even through
another genuine Host composition. This semantic callsite adjustment is
recorded in `kernel-single-journal.patch`; it is not applied to fixed Core bytes.

This is the preferred browser-editor construction seam because it exposes the
specific missing operation while preserving ownership. It adds only small
WeakMap/closure records and shares existing handles; no map, history array,
resource bytes or renderer allocation is copied at construction. That is a
code-based cost estimate, not a measured performance result. Live Native
admission, empty-editor C1 construction followed by painting, recovery,
presentation retry and strict final commit remain separate integration proofs.
