# Custom tile workbench: UI contract and design

Status: **proposed contract/design, no live binding**. This checkpoint starts at requirements
`b850e20e2fdd85435d33f16327482b80380af728`. It preserves stacked UI
`5b0d06ce93977addd438d3ad43f887fcd3278817` on its separate branch. It changes
only this role's candidate, test, tool and review paths. There is no shared runtime,
host, export, schema registration, workspace migration, consumer pin or publication change.

[Usage card](usage-card.json) · [source record](source.json) ·
[proposed interfaces](../../../../candidates/tile-authoring/ui/contract.d.ts) ·
[design specimen](../../../../candidates/tile-authoring/ui/specimen.html) ·
[complete discovery example](../../../../candidates/tile-authoring/ui/examples/discovery.json).

## Reviewable result

The specimen shows Create/Edit, a versioned preset library, local brush/layers, complete
Review/Apply and readiness/content-pack controls. It renders only shared discovery
metadata through a small headless projection. The same descriptors, command versions,
schema hashes, scope declarations and diagnostics remain visible to agents. It does
not contain an alternate UI command registry, authoring validator, planner, prepare,
permission table, persistence, renderer or input router.

Every specimen editing control is disabled: no authoring service is bound. Example
availability values illustrate the contract, not installed capabilities. The illustrative
layer list and empty preview do not prove overlay rendering or real source geometry.
The example payload-schema reference hashes an explicitly **unimplemented specimen
document**, not a Coder schema. Stroke/preset JSON files are annotated design drafts;
the null artwork hash must refuse before a real prepare. They are not importable
tile packs. No raster artwork is generated or supplied here.

Run the headless metadata example from the repository root:

```sh
node --input-type=module -e "import fs from 'node:fs'; import {projectAuthoringDiscovery} from './candidates/tile-authoring/ui/discovery.js'; const x=projectAuthoringDiscovery(JSON.parse(fs.readFileSync('candidates/tile-authoring/ui/examples/discovery.json'))); console.log(JSON.stringify(x));"
node --test tests/ui-tile-authoring-contract.test.mjs
node tools/ui-tile-authoring-review.mjs
```

This portable, local-JSON metadata example needs no DOM, donor checkout, absolute asset
path, remote URL or storage. A real content-pack consumer remains Coder/Editor work.

## Proposed shared seam

`contract.d.ts` proposes one Editor service with `discover/getSnapshot/subscribe`,
`stage/review/apply/cancel/recover` and borrowed history/save/open/presentation retry.
Both humans and agents call that same service directly. Exact method/command names
are review questions, not a promised public API.

Discovery provides each command's identity/version, strict payload-schema reference,
effect/history boundary, allowed/default scopes, confirmation wording, availability,
diagnostics and ordered UI field hints. The projection only groups hints; it neither
rewrites descriptors nor guesses availability. Missing or malformed metadata refuses
the complete read. Labels and diagnostics are rendered as text. Unknown discovery
versions require a reviewed binding; names alone never imply support.

Editor captures the workspace/context/policy/floor/content/resource bindings and
discovery token. UI passes the captured finite command identity and explicit targets.
Core validates the strict payload; `unknown` at the UI type boundary means opaque
validated source, not a saved extension bag. Stage owns the draft; Review performs
the real preparation once. Apply uses that exact current review/request token;
Editor obtains its final lease and commits. UI cannot mint a lease, prepare a second
time or reconstruct authority from a phase name.

Action flags and reasons come from the current **successfully rendered stable**
snapshot. A malformed, failed, superseded or reentrant read authorizes nothing.
An error callback cannot repair a snapshot and retroactively authorize the same click.
A discovery or binding change retires the prior draft/review before another command.
Request IDs originate once with the shared request builder and survive retries.
Unknown acceptance freezes edits, Undo/Redo and save/open until reconciliation of
the original ID; a new ID is not a recovery strategy.

## Panels, scope and workflows

| Panel | Visible source and controls | Scope/commit rule |
| --- | --- | --- |
| Workbench | Create supported primitive; clone reviewed recipe; original dimensions/curve controls, seed/detail, floor/profile, finish and canonical connections from the schema; source/version/hash and live diagnostics | Create/clone/revise makes immutable source. Editing placement source is explicit copy-on-write plus rebinding only named editable owners in one operation. |
| Library | Search personal/project entries; inspect exact recipe/preset versions, dependencies, notices and required features; place pinned preset | Library membership and references use the same workspace authority. New stamps get fresh instance IDs and deterministic reference remapping. |
| Save as preset | Name/new version; source pin; explicit include-decoration-defaults checkbox, initially off; chosen mark list and new-stamp preview | Reusable scope is named prominently. Creates a new immutable preset; never updates existing copies. |
| Upgrade selected placements | Old/new pins, all target IDs/locks, local marks and reanchor/refusal diagnostics | Separate explicit operation. Never follows a moving preset, changes unselected copies or discards local marks. |
| Surface tools | Source-owner/surface/floor selection; artwork pin, local position, rotation/size, authored grid/mask; preview/select/move/rotate/scale/erase | Default is **this placed instance**. Multi-owner painting requires explicit targets on one floor, visible shared phase/group identity and all lock results. |
| Layers | Base finish separately; ordered local layers/marks, reorder, opacity/tint, blend and artwork identity | Stable order is source data. UI order is labelled; changing base finish preserves marks. Selected marks only; no implicit recipe mutation. |
| Review | Complete source diff, new definitions/rebindings, targets/locks, anchor impact, required capabilities/resources and aggregate cost bounds | One bounded command, one Review, one Apply, one Undo entry. Any invalid/stale/locked target refuses the entire batch and preserves accepted state and redo. |
| Requirements / pack | Missing capabilities and actionable remedies; full manifest/resource dependencies, notices, export/import | Whole-pack validation/adoption, with explicit required-feature refusals. Thumbnails are derived; moving URLs and sibling paths are not portable resources. |

Keep the current selection scope beside the tool AND beside Review. Use owner IDs and
versions, not only names or colour. Definition and preset changes require explicit
scope wording. Do not switch to preset editing because a surface happens to be shared.
Do not infer that a field applies to every grammar: an original arc/cubic/compound
control is not a fitted rectangle or a refit from samples. Optional snapping changes
a proposed control only, never normalizes loaded source.

The library's new-version workflow preserves referenced old definitions, locks,
dependencies and exact original source. “Edit this placement” needs the atomic
copy-on-write command; it is unavailable until bound. A preset upgrade that would
orphan a decoration must preserve/refuse or include explicit reanchor/delete choices
in the same transaction. No silent transfer, stretch or drop is allowed.

## Brush, floor and input contract

The existing Editor input owner converts ray/derived hits to stable source targets
before staging. Persisted targets are owner ID + semantic surface ID + floor ID,
owner-local metres and the declared source surface/grid frame. Authored cell origin,
size/version and integer cells or bounded masks are independent of sampling, meshes,
LOD and chunk residency. UI never saves triangle/GPU/chunk/derived-cell identities.

A stroke captures one explicit floor and bounded target set, then previews a finite
group of local records. Pointer release **ends collection only**. Review and Apply
remain separate explicit actions. An eventual continuous-paint mode requires another
reviewed input contract. Multi-owner seams use one declared shared graphic phase and
one atomic group; locked neighbours are shown and refuse, rather than being omitted.
The provider must clip to actual surfaces/holes/masks. UI cannot claim clipping from
a rectangle hover outline.

Selection, camera routing and pointer capture remain with the existing owner. Cancel
on Escape, blur/visibility loss, capture loss, floor/mode changes, owner/source changes,
tool replacement and disposal. Retire the owned gesture/review before changing the
drawing plane. Quarantine held input until all-up and require a fresh primary action;
late pointer events cannot revive the stroke. No broad document/window keyboard hook
or second capture owner is introduced.

Borrow the existing floor controller/widget: fifteen declared floors, five visible
labels, native explicit elevations and existing key/wheel/form/dialog/IME/repeat
guards. Canvas wheel stays zoom. Never derive height from ordinal or 2.12 m.
Follow/contact controls require real bindings and reasons when absent. Overview/
cutaway remains inspection only and does not establish support/navigation.

At implementation, preserve native button Enter/Space and repeat suppression,
owned focus restoration only, cancellation/disposal, and the actual UI/agent parity
browser regressions. Re-rendering must not steal external focus from a same-named
field. Phone design targets are at least 44 CSS px, with scope and diagnostic text
in normal reading order. The specimen reviews layout only; it does not retest these
live controls, which remain a Gate B requirement.

## Fixed stacked compatibility and open interface questions

Approved Coder `45ecaef16bb39424c8b885d53acb4371654b4fa0` is a separate
public-v1 planner, not UI authority. Its ordinary repair request, next typed
constraints and complete target must enter Editor's one retained prepare/transaction.
Accepted workspace minimum, proposed request minimum and stronger saved pair
requirements remain separate. A larger request does not change the saved global
minimum or unrelated accepted pair requirements. Preserve all extra reservations.
Unsupported projected edge/near separation retains the named
`STACK_FLOOR_SEPARATION_UNSUPPORTED` diagnostic and required capability.

The historical Editor snapshot `cfd5a3226a687b9b166e240666a34c75ef3e7972`
was provisional; it is **not** a newly approved dependency. No fixed replacement policy
was relayed with this addendum. The preserved UI checkpoint is reference evidence,
not imported runtime. Reconcile each fixed input separately before implementation.

Architect questions and provisional recommendations:

1. **Fixed Editor authority and discovery.** Which reviewed Editor commit/policy is
   authoritative now? Freeze the shared service method names and ownership of discovery/
   schema refs/UI hints. Recommend Editor publishes one immutable discovery read,
   Core owns strict payloads, and UI/CLI consume it unchanged; no button-click agent API.
   Also freeze the read-only inspect/export invocation and result path: these commands
   produce no Undo entry and must not be sent through a mutating Apply. The declared
   Review/Apply seam describes edits; a read-execution signature remains an open interface.
2. **Workspace/content version.** Choose a new typed workspace/module envelope and
   exact before/target, receipts, resource adoption and same-ID recovery fields.
   Recommend one complete checkpoint operation covering source/bundle/constraints/
   definitions/presets/decorations/resource refs; preserve old workshop/receipts.
   No v1/v2 metadata bag, silent migration or separate overlay journal.
3. **Stable surfaces and transform grammar.** Freeze first surface IDs/frames, authored
   mask/grid grammar, D4 rules, seam group/phase, holes/clipping and orphan policy.
   Recommend local flat source surfaces only initially; world-fixed/path/wall/roof
   anchors unavailable until explicitly profiled. Need a real ray-hit-to-source adapter.
4. **Preset defaults and instance editing.** Freeze atomic copy-on-write + selected-owner
   upgrade operations and the explicit default-capture fields. Recommend include-defaults
   off initially, fresh IDs/remapping on stamps, preserve old pins/local marks and locks.
5. **Appearance/resource discovery.** Freeze artwork manifest/resource readiness,
   layer order, alpha/colour-space, allowed blend/tint, local scale/pivot and provider
   diagnostics. Recommend display supplied units/order verbatim; never infer alpha or
   eligibility from PNG/WebP filenames or an artwork family label.
6. **Budgets and gesture limits.** Which reviewed command/brush limits and resource
   accounting fields should UI expose? Recommend finite source batches with all targets
   and aggregate accepted/candidate/acquiring/unverified-retiring counts. Keep 8 layers,
   4,096 stored marks/chunk, 1,024 resident marks and 32 MiB as proposed/unmeasured
   reference ceilings until independent PC/phone evidence accepts a profile.

These questions block live integration, not this authorized contract/design delivery.

## Ownership, persistence and adoption

UI owns only candidate metadata projection/specimen and, eventually, its DOM and
subscriptions. Editor owns selection/draft, authoritative workspace, history, storage,
resource reference adoption and recovery. Core owns source grammar/validation/planning.
Artist owns immutable artwork metadata and the optional borrowed-Three clipped
provider. The retained host owns decode/storage/render pools and its floor/input/
selection services. Dispose only owned DOM/listeners; never dispose borrowed services.

Resource preparation can acquire blobs before commit. Failed preparation releases only
verified unadopted resources; unknown acceptance retains potentially adopted resources
until same-ID recovery. Positive acknowledgement followed by display failure is still
committed: retry presentation only. No library import, preview success, cancelled UI or
cleanup routine may independently adopt or delete potentially committed references.

Graphics are appearance only: blood/scorch does not reaward damage, spend AP, ignite or
advance time; apparent craters do not alter height, flat plants do not create obstacles.
A game may borrow data/provider under its own authority without the Editor/history.
Its adapter supplies stable owner/floor mapping, confirmed-event IDs, permissions,
runtime save/expiry policy, clocks and capability validation. Static marks have no hidden
clock/RNG. Physical/gameplay effects need their own provider and proof.

For Farmyard's tactical editor and shared content workbench, prefer per-instance sparse
layers plus explicit reusable presets. **Accuracy:** source-local frames, floors and
original controls preserve authored meaning; graphics convey no physical proof.
**Efficiency:** sparse records and shared artwork avoid mandatory per-cell blank images;
this is a design/code assessment, not a measured CPU/GPU saving. Material compositing,
atlas batching and clipped geometry require Artist/Architect comparison. **Narrative:**
local wear lets repeated parts tell distinct stories while explicit presets support reuse;
this is a subjective UI preference. Each game retains its style/blood/fire/vegetation policy.

## Builder checklist and evidence

- [x] Isolated candidate and fixed-reference provenance, adjacent usage card/notice,
  portable headless metadata example and explicit missing bindings.
- [x] Node contract checks cover unchanged human/agent descriptors, new command IDs,
  frozen captured reads, local-vs-preset scope, named unavailable reasons, finite atomic
  history hints, malformed discovery and honest specimen limits.
- [ ] Architect fixes the six interface questions and exact peer source commits.
- [ ] Coder/Editor implement reviewed strict payloads and one complete workspace authority;
  replace specimen refs, including every null/missing artwork hash.
- [ ] Bind actual existing floor/input/selection owners and approved native preview.
- [ ] Prove real Create → preset → two stamps; edit one copy; explicit selected upgrade;
  overlays/masks/D4/nonuniform floors/holes/LOD; local copies remain independent.
- [ ] Prove whole-workspace Undo/Redo, save/reopen, portable pack bytes/hashes, malformed/
  unsupported content, budget boundaries, locks/cancellation and same-ID recovery.
- [ ] Review real source AND installed UI/agent workflows and PC/phone rendering/costs;
  retain accessibility/focus/input regressions and exact helper cleanup evidence.
- [ ] Architect owns any Gate B host edits, public registration/distribution, versions,
  pins and publication. No candidate inclusion in ordinary installed distributions.

Current design-layout evidence and actual repository gates are in
[validation.json](validation.json). No live authority, installed workflow or physical
device proof is implied. Browser helpers are disposable and their receipts are
retained beside the report; none are intended to remain running.

Design review: all six metadata/layout checks passed at four emulated widths (1440,
768, 390 and 320); all 17 discovered controls retain their command identity and reasons.
Desktop and 320 px full/top captures were visually inspected. All four repository gates
passed: 920 engine tests, 32 upstream tests and 519 build module paths. All fifteen
protected host files match the base. Three browser/server pairs exited; exact lifetime
and released-port checks are in [cleanup verification](evidence/cleanup-verification.json).
Earlier disposable-review source revisions are archived as nonruntime text in the
restart-input bundle; no helper remains running.
