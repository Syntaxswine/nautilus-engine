# Artist C0 contract realignment

Fixed Artist base: `f5bfda9ec0f639018ccfee2415b1f70502e77cae`.
Fixed corrected Core: `43227894c50ec62b71806978195fff2c650eb388`.
Branch: `codex/tile-authoring-art-c0-alignment`.

This is CONTRACT/DESIGN ONLY. No custom renderer/decoder/shader, executor,
importer, command parser, material-pool implementation, saved-version migration,
public export/registry, package version, consumer pin or publication is added.
Actual B2 native-host review remains priority when its fixed source arrives.

## Fixed inputs and preserved assets

Core API, normative schema, thirty-row import mapping, full WorkbenchDocument@3
example and corrected mathematical vectors are byte-exact metadata snapshots
under `inputs/`, with full Git commit/path/byte hashes. Ordinary Node tests use
these copies, so shallow CI does not fetch a moving or missing worker branch.
The original efca coordinate wording is superseded; no mixed UV/pivot formula
is copied into the active packet contract. Mapping and document input bytes
remain identical across efca→432278.

Original PNGs, all thirty atlas frames, SVG master, prompt, provenance, manifest
and historical art examples are byte-preserved against f5bf. No bitmap is
regenerated, edited, decoded or copied. The original imported Artist identity
remains `nautilus.local-graphic-art-samples@1`, digest
`ef2daf8b205bae3ca14baa093be85fa46e46b769f645c95327a6bf72f2152d33`.
It is not renamed or restamped as a Core content pin.

## Aligned contracts

- Core pins are exactly `{id,revision,contentDigest}`. Artist
  `{id,version,digest}` remains a separate imported binding. Canonical Core
  ImageView/ResourceRef/WorkbenchDocument/Graphic/Layer/Mark types are imported,
  not redefined as a parallel command or saved grammar.
- Each immutable Core Artwork resolves its complete page-bound ImageView:
  frame ID/rect, alphaFloor8, sampler and exact resource descriptor/digest.
  All thirty Artist frames map explicitly. Durable ResourceRef remains closed
  pin+ImageView digest; no URI, readiness or live lease is added to it.
- Version-2 rendering packets are derived read-only views of a complete v3
  document. They retain whole-document/checkpoint/context bindings, current
  source-frame origin/basis, owner pose/D4, floor, geometry/resource epochs,
  lease-set digests and allocation-ledger identity. Serialized fixtures cannot
  issue actual host capabilities or liveness attestations.
- Complete ordered layer groups preserve Core headers, group opacity and
  ordinal-ordered full marks. Graphics carry linear saved tint, mirrorU,
  noncentral pivot, complete TRS and stamp/detail form+wrap. No flat mark list
  erases layer boundaries. Two alpha-.5 marks, then layer opacity .5, yield
  .375; attenuating each mark separately gives the invalid .4375.
- Image UV and pivot are top-left. Pixel Y is direct. Mark-local conversion is
  `position+R*[mirrorSign*(u-p_u)*width,(p_v-v)*height]`, then named surface
  origin/basis, CURRENT owner D4/origin once and native/render swap once.
  The corrected sixteen witnesses and inverse checks cover noncentral pivots,
  graphic mirroring/rotation and nonzero source origin. A local-up intermediate
  must also convert pivotV. Owner origin.h includes floor height already.
- Stamps are transparent outside finite frame support; details wrap all four
  taps within that frame, not the atlas page. Straight-sRGB PNG alphaFloor8 is
  applied before linear premultiplication/filtering; saved tint is already
  linear. Original organic floor2/road0 remain exact. WebP stays unbound without
  actual bounded decoder proof. No decoder/sampling/shader is implemented here.
- One opt-in host-owned combined kernel is proposed. Nonempty channels acquire
  a combined lease directly; no cached finish hook is mutated, cloned or
  chained. Empty channels retain the base-finish path with zero additional
  overlay material/texture/geometry/buffer allocations. Current registered
  finish ID/digest remain unchanged. The copied Core compatibility-finish
  fixture is explicitly not relabelled as the public finish library.
- One TOTAL64 owned appearance-material ceiling includes base finish caches and
  combined/acquiring/unverified-retiring materials across all views. Other
  unmeasured refusal caps remain 2 roots/50k triangles/1024 cells/1024 resident
  marks/32MiB decoded allocations including copies/32768 bin refs/4MiB derived/
  4 pages/8 contributors, plus stored 8 layers and 4096 marks per logical chunk.
  No separate extra64 compositor allowance or hash-only decoded deduplication.
- Initial proposed support is actual supported rectangles and isolated level
  line/arc/cubic paths. Holes/fields are unavailable without an actual accepted
  clip/base proof. No public geometry label grants overlay eligibility.

`c0/packet-example.json` derives one UNBOUND example from the unchanged complete
Core document. It truthfully retains that document's one borrowed-page mark,
compatibility finish and clean second owner. Separate thirty-frame Graphic
selection cases exercise every original imported pin, including full detail and
explicit per-mark mirror/noncentral-pivot/linear-tint overrides. They do not
pretend a Core operation was applied or alter immutable Artwork records.

## Evidence and usage

Run `node tools/art-tile-authoring-c0-fixtures.mjs` to reproduce static data,
`node tools/art-tile-authoring-c0-check.mjs` for fixture consistency, and
`node --test tests/art-tile-authoring-c0.test.mjs tests/art-tile-authoring-contract.test.mjs`.
Node type-stripping syntax checks cover the proposed declarations. These are
contract data/math/hash checks, not a production Core validator, actual decoder,
native/installed renderer proof, full JSON-schema implementation or a device
benchmark. The copied Core schema remains normative; no alternate parser exists.

Twelve new C0 checks plus eight original art checks pass. Negative fixtures
change actual pins, frame/sampler data, targets, source bindings, layer contents
and cap values; they do not flip expectation flags. Mathematical tests remain
inside the test file and are not exported as runtime samplers/projectors.

No preview, browser, server, watcher or retained helper is started for this
alignment. The earlier static art-preview receipts remain historical f5
evidence. Root owns contract reconciliation and the later C1/C2 implementation
handoff after stacked-main acceptance.

## Delivery checks

- `npm run check`: passed.
- `npm test`: 932 passed, zero failed.
- `npm run test:upstream`: 32 passed, zero failed.
- `npm run build`: passed; 519 module paths checked.
- Focused original-art plus C0 suite: 20 passed, including sixteen corrected D4/inverse mathematical witnesses.
- Both proposed declaration files pass Node type-stripping syntax checks.

`c0-source-manifest.json` records exact fixed-input/source hashes, preserved-art
Git-object comparisons, gate receipts, the actual public token dependency closure
and distribution exclusion. Reproduce that local Git-object audit with
`node tools/art-tile-authoring-c0-audit.mjs` after running its recorded gates;
it requires the two fixed source commits locally. Ordinary CI tests instead use
the byte-exact metadata snapshots and require no moving branch or extra fetch.

This branch has no deployment job. No helper remains running for C0.
