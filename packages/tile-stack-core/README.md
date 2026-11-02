# Optional rectangle stacks

`@nautilus-engine/core/tiles/stack` plans finite edits over the existing public
`tiles` core. It has no DOM, renderer, storage, clock or ambient random source.
The core remains the matching and repair authority; the consumer retains its
own document, transaction, history and services.

```js
import * as tiles from '@nautilus-engine/core/tiles';
import {planTileStack} from '@nautilus-engine/core/tiles/stack';

const plan = planTileStack(tiles, {
  bundle: acceptedDocument.tileBundle,
  constraints: acceptedDocument.constraints,
  context: capturedContext,
  expected: capturedExpected,
  intent: finiteIntent,
  limits: capturedLimits
});
if (!plan.ok) return showDiagnostics(plan.diagnostics);
const prepared = retainedConsumer.prepare(plan.request);
if (!prepared.ok) return showDiagnostics(prepared.diagnostics);
// Review the actual prepared result. One host acceptance adopts BOTH
// prepared.next.bundle and plan.constraints under the captured source lease.
```

`planTileStack` returns an ordinary public-v1 repair request, next typed
constraints, exact source/next/profile/request bindings, obligations and bounded
work counts. Planning does not commit, prepare again or certify presentation.
`prepareTileStack` is a resource-free convenience for headless inspection; its
plain result is not a retained committable handle. A live host uses its existing
retained consumer once.

Supported affected geometry is level axis-aligned rectangular regions under D4
placements, with explicit conservative primary reservations and native floor
bindings. Positive-area projected overlaps require saved per-pair `cross`
relations; all additional reservations remain subject to public preparation.
Projected edge/near separation and unsupported affected geometry refuse with
named diagnostics. This module does not supply structural support, extrusion,
navigation, collision, fire or consumer adoption.

The host supplies a complete immutable floor table and captures its exact
profile, accepted constraints and context. Requested clearance applies to
changed pairs while retaining stronger saved and unrelated requirements. The
workspace minimum stays unchanged. Locks, source controls, original anchors,
seeds, manual relations and unused recipes are preserved.

Builder checklist:

- Bind the actual public core and predeclare native floor elevations; do not
  derive height from a label or ordinal.
- Capture the complete accepted source, floor/profile/catalogue and current
  context before planning. Keep proposed requirements separate from acceptance.
- Prepare the ordinary request through one retained consumer and bind the exact
  result plus next constraints to one full-document operation.
- Commit, Undo/Redo, save and recover both components together. Unknown outcomes
  freeze further writes until the original request identity is reconciled.
- Keep views and their budgets with the host. Hidden floors still count;
  reference accepted/candidate limits remain two roots, 50,000 triangles and
  1,024 cells. The fifteen-deck fixture uses 480 cells per view.
- Reject unsupported consumer features explicitly. A visible thin surface is
  not a playable floor or proof of physical clearance beyond declared envelopes.

The adjacent `api.d.ts` documents the data contract. Reviewed provenance and
integration evidence live in `docs/reviews/tile-stack/`. Capacity values are
reference ceilings and deterministic counts, not device performance claims.
