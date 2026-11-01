# Procedural tile contract decision

Architect approved the TileRecipe/RecipePort/TileLayout implementation direction
on 2026-10-31. This replaces the preliminary proposal. Fixed implementation and
root integration acceptance remain separate. The implemented record/API and
consumer checklist are in [the maintained guide](../procedural-tiles.md); four
generated schemas beside packages/tiles-core/index.js define structural v1.

The human requests broad reusable tiles/curves with AFT alignment as reference.
Architect coordinates one contract. Coder owns headless validation/resolution,
Artist owns later host-Three families, Editor/UI use the one pure resolver and
host-owned atomic history. Base is 5f3627cd9fc4d95f15b7f1eefafdfb1d6034475f.

Approved amendments now reflected in the guide:

- Preserve authored controls/dimensions exactly. Position quantum, dimensionless
  direction policy, exact UV mapping and approximation/work bounds are distinct.
- Include bounded cubic Bezier alongside line/arc/compound and full analytic
  identity; sparse coincident samples are not equality proof.
- Distinguish boundary parameter and route-flow tangents. Boundary material is
  independent of cosmetic skin. Direct joins are strict; transitions explicit.
- Keep fixed canonical borders across interior LOD; exact zero-positive plus
  explicit saddle/D4/complement does not grant point-contact traversal.
- Derive edge identity from world geometry, floor/profile/channel/layer; instance
  ownership is only a dedup hint. Resident matched interfaces gate skirts.
- State local/world frame/floor formulas, open/terminal/required policy, actual
  crossing clearance and alongside/transition semantics precisely.
- Preserve complete generated descriptors, pinned templates, anchors, controls,
  locks and seeds in a small separate bundle; caches/fragments are derived.
- Separate authored/resolved/presenter/query/support/navigation/consumer readiness.
  Discover old/new spatial dependencies and return exact IDs/tokens for one
  host-owned undo entry. There is no competing editor resolver/history.

Reviewed AFT remains 781246a668c723d5a4c5463e70534cc04b6a5641. Block profiles supply
canonical offsets, measured opposing features, exact seams and deterministic
generation; 24 m / one feature per side / six-metre roads remain unchanged legacy
compatibility. Shore/cliff supply shared corner/world fields, exact crop planes,
interior-only variation, welded patches before skirts and common heights/paint.
The [audit](../reviews/procedural-tiles/source-audit.json) records fixed hashes and
historical tests/newer identical Git-object evidence; no source repin/import.

Accuracy preference: explicit metre/height/grade/profile agreement and common
analytic world borders for the expanded tool; preserve old policies for exact
legacy compatibility. This is alignment, not physical calibration. Efficiency
preference: bounded whole-shape/border evaluation and useful caching rather than
a baked radius/material/rotation Cartesian product; these are code-based
expectations, not CPU/GPU benchmarks. Narrative preference is subjective: broader
painterly terrain/paving/path/waterfront/edge/height families serve reusable tools.
Building/roof, mesh and gameplay providers are staged. More jitter in the old
16 masks is not general curve coverage.

Root owns proposed ./tiles, four recipe/layout/bundle/compiled v1 registrations,
engine-only capability, whitelist/version/CI integration. Those stay unapplied
here; private overlay is partial availability. No renderer/editor adoption,
consumer pin, release, other worktree or private audience change is proposed.

Architect's focused correction approval, 2026-10-31: preserve the initial
4a027bf00019c0a8e9c2b862b47b17943ae32ee2 history and refuse unsupported ambiguous
field conditioning. Binary checkerboards have full path/barrier evidence across
both saddle choices, D4/complement and allowed variation; general non-checkerboard
values and wider analytic curves remain available. Include every original
compound start's deviation from the actual returned node and charge its work.
Carry only unchanged geometric contacts; revalidate each changed/new contact
against its actual finite joined boundary or measured relation, without pair-wide
waivers. Automatic join coverage is conservatively limited to proved straight
axis-aligned lateral spans/thickness; other valid joins receive actionable repair
refusals. The guide defines these limits. No new schema ID, capability or root
registration is part of this pass.
