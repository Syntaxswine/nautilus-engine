# Owned current-read check

The baseline a4 folder, all its receipts, accepted d8 and frozen Root coordinator
remain unchanged. This follow-up derives one bridge owner from fixed a4 source.
The only behavioral addition to that owner is `withCurrentRead(current, original,
visit)`, plus its existing connection predicate exposed for the Root attachment.
The derivation and exact import relocations are reproducible and verified.

Both arguments must be actual reads in that SAME bridge's private WeakMap, with
their exact retained Basis references. Both must pass the original full-source,
connection, published version and selection checks. Their actual captured source
handle must be identical; source, floor, selection, chosen Pin and Expected must
remain unchanged. The synchronous callback is fenced before and after. Copied,
foreign, stale, scope-replaced or ABA reads cannot pass. This is a read check;
it creates no authoring attempt, IDs, ticket, cost credit, history or WAL.

The small adapter maps each actual UI read to its actual bridge read. Its explicit
`acquireSelected(read)` invokes real d8 on that canonical bridge read, validates
the actual returned capability through d8's original private read lookup and keeps
the original opaque source scope/observation. Fresh UI reads are checked against
that held original read inside the bridge owner. Source generations and actual
capability currentness are checked again. No equal SHA, copied DTO or arbitrary
capability can register a pairing; there is no public adoption/retag API.

Construction uses that checked original read for real d8's lookup and the existing
Core0597 constructor; form intent is resolved against the actual current UI read.
The result retains original Expected and allocates IDs once after validation.
No new coordinator/executor exists: Root's exact reviewed attachment performs
Stage and collection. Production session/native/meter readiness stays UNBOUND.
The test's service/action/source/preparation bindings are labelled protocol fixtures.

The host owns returned acquired lease references and releases/transfers them via
the actual d8 owner. The adapter never retires exposed references on selection,
unknown acceptance or disposal. A newly acquired reference rejected before being
returned is unadopted and may be released by its acquiring adapter. No PNG/texture
cache, eighth service verb or pending-preparation cancellation helper is added.
