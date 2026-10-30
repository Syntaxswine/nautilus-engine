# Farmyard window geometry candidate

Status: **compile/query checkpoint for Architect review**. Based on canonical main
`e8a66b1f4ead9a6f56c5609bd2a881caceb66b32`, preserving the approved proposal
`0f5bc5be84e813feb9e70c34dcf4ebd9ff3287ba` through an ordinary merge. This
implements the compile/query-first option. Confirmed-impact transactions, durable
receipts and complete-game save staging are the **next required gate**.

| Builder field | Contract |
| --- | --- |
| Candidate entries | `./windows`, `./adapters/farmyard/windows`; proposed root exports remain unregistered. The offline proof installs a clearly named private candidate overlay. |
| API/geometry version | `WINDOW_GEOMETRY_CONTRACT`, `nautilus-window-geometry` v1; source version remains `industrial-windows/2`. No full-pane capability or host-service promise is advertised. |
| Profile | `farmyard-quarter-turn-first-hit-pane-v1`: ground layer, source quarter turns, native metre bounds, transparent sight glass, intact first-hit shot/flame glass, permanent walking reservation. |
| Source | Fixed Farmyard `251bf8094b5f9ebe44208443084c1a6d6658512a`, including reviewed `3c29604bdfb4210864910369ec09c59095249e8a`; [original hashes/closure/notices](../reviews/farmyard-windows/source-audit.json). |
| Discovery | `FARMYARD_WINDOW_CATALOGUE`: 39 distinct presets plus the explicit-dimension template `window.full.borderless`; no decorative bay substitution. |
| Inputs | Closed placement document; fixed synchronous definition provider; world ID/ground/grid; complete semantic facts for every covered edge. All plain data is detached before provider calls. |
| Output | Immutable opaque geometry handle, stable content/member/visual references, explicit query revision, content and geometry SHA-256 digests. Inspection and queries return detached data. |
| Schema | [Candidate geometry snapshot v1](../../packages/windows-core/window-geometry-v1.schema.json). Closed structural schema; the loader additionally checks budgets, identities, references, semantic conflicts, bounds and recomputed digests. |
| Whole-game authority | Retained by the host. No AP/ammo, rolls, actors, turn clocks, mover, journal, gameplay command or live commit is created here. |
| Limits | 1,024 placements; whole-metre widths 1–240; at most 6 panes/8 solids/1 reservation per placement. Aggregate snapshot: 8 MB, 500,000 nodes, depth 24. Explicit capacity refusal; no truncation. |

`compileWindowPlacements(document,{definitions,world,edgeFacts})` accepts a
`nautilus-window-placement-document` v1 with `id`, `profileId`, `queryRevision`,
`placements`, `bindings` and an explicit `observedBroken` map, including `{}` when
intact. Source placement fields are `id`, `definitionId`, `x`, `y`, optional zero
`z`, quarter-turn `rotation`, boolean `joins`, metre `dimensions`, and native
`finish`/`wall` metadata. Unsupported authoring fields are refused. Keep the
retained authoring document/underlay separately; this geometry document is not an
Editor import/export or history format.

`world` is `{id,floorId:'ground',grid:{width,height}}`; grid dimensions are 1–240.
`edgeFacts` entries are `{edge,semantic,locked,sourceKind?,underlay?}`. The semantic
enum is `empty|wall|door|window`; an optional underlay has the same semantic/lock
facts without another edge. These are **trusted host classifications**, never
guesses from a string prefix. The caller must classify every donor/custom door
family, including jail doors, and preserve original authoring underlays. Any
covered door or lock, including an underlay, returns `WINDOW_DOOR_CONFLICT`.
Missing facts refuse; duplicate/overlapping/occupied windows refuse. Success
does not mutate the host or claim its covered walls were already removed.

Bind each full 1–96-character native placement ID through a separate explicit
`{placementId,engineInstanceId}`. Existing parts identity grammar limits the visual
instance alias to 24 characters. IDs are never shortened, hashed or substituted.
Pane IDs remain `r{row}c{column}`; member identity is the JSON tuple
`['window-member-v1',sceneId,placementId,partId]`. Visual handles use existing
`partIdentity(engineInstanceId,'visual','pane:'+paneId)` without changing the
closed parts-v1 kinds.

Native local `[X,Y,Z]` maps to world `{x,y,h}` with the approved +Y quarter turn:
`x=p.x+c*X+s*Z`, `y=p.y-s*X+c*Z`, `h=Y`. Framed height is 2 m; full glass starts
at .055 m, waist glass at .90 m. Borderless presets are 2.12 m high. Explicit
template dimensions mean metres: 20×5 means 5 m high. Explicit
`farmyardStoreysToMetres(5)` yields 10.6 m using the source 12-significant-digit
rounding. Tall sheets still contain one pane. There is no invented storey cap;
positive finite float-buffer headroom is required. Borderless metadata may retain
a finish, but there is no frame to finish and a later UI must disable that control.

`contentDigest` follows the exact approved canonical
`{profileId,sourceCommit,grid,placements,content}` contract and matches the source
fixture. The definition digest uses the reviewed ordered compact native spec.
`geometryDigest` additionally binds the full document (including observation mask
and query revision), world, edge facts and current members. Changed placement,
bindings or definitions changes content; changed mask/revision changes geometry.
The caller must retain the associated current host tokens and reject stale
candidates in its later trusted transaction boundary.

`queryWindowSegment(compiled,{purpose,floorId:'ground',from,to})` accepts explicit
`{x,y,h}` endpoints. It returns ordered intervals, `tEnter`/`tExit`, entry point,
axis normal, source order and placement/member/pane IDs, plus exact geometry
tokens. `nearest` means nearest **window member** only. The caller must compose
all retained world, dynamic geometry and actors before confirming any impact.
Candidates retain positive entry `t > 1e-7` through the endpoint `t = 1`;
the host applies its final sight/movement endpoint rules and full purpose policy.
The [installed proof](../../tests/fixtures/farmyard-windows-queries/package-proof.mjs)
shows a nearer retained world wall winning, then a pane preceding a farther wall,
then the farther wall through a host-observed hole. It performs no gameplay hit.

| Purpose | Exact selected source policy |
| --- | --- |
| `walk` | 2D segment footprints, regardless of member height; sill/frame can precede the permanent passage reservation. This is not a body sweep, route executor, vault or support-floor query. |
| `sight` | Only structural wall members, using their real height; glass/reservation excluded. |
| `projectile` / `flame` | Structural members plus unbroken panes, reservation excluded. Source EPS `1e-7`, positive entry and stable source ordering on ties; no penetration, blast cascade or multiple-impact policy. |

Projectile/flame origins on or inside any current relevant member explicitly
refuse with `EMBEDDED_PROJECTILE_ORIGIN`; actors are never relocated. Queries
scan at most 15,360 native AABB members. That bound is a code estimate; no FPS or
host navigation benchmark is claimed. A host broadphase may index this same data
later while preserving exact narrowphase and source order.

`clipWindowLegacyWall(compiled,wall)` accepts only explicitly proven
`{provider:'farmyard-legacy-wall-v1',edge,floorId:'ground',bounds}`. Bounds use
`x0/x1/y0/y1/z0/height`, where height is the **absolute top**. The wall must have
the source edge-centred 1.12 m span. Covered edges return null and adjacent
overhang clips at the half-cell seam. No native/curved-wall heuristic is applied.
The host must actually remove covered opaque walls and use the clipped adjacent
walls in its complete query/render scene; this helper only returns prospective
data. A drawn transparent sheet over an unchanged wall fails integration.

`serializeWindowGeometry` / `openWindowGeometry(input,{definitions})` round-trip
the complete **geometry observation snapshot**. Open resolves fixed definitions
again and validates the entire prospective document, facts, masks and digests
before returning a new handle. Missing masks are not defaulted to intact. This
is not a complete-game save, content epoch, command receipt journal or an adoption
API. No normalization, healing, relocation or effect replay occurs.

Accuracy preference for this named FC use case remains the approved native
member geometry: height-sensitive openings and masks match source meshes.
Efficiency: eight engine-owned runtime modules, reused pure hash/identity helpers,
no donor game/renderer import; raw sizes are measured by the closure checker,
not a processor benchmark. Narrative preference is subjective: source first-hit
glass and stable silhouettes preserve the game's tactical readability. Keep
legacy profiles/refusals, and reserve physical penetration/traversal or Tinderbox
heat/fire behavior for separately reviewed profiles.

Architect acceptance checklist:

- Review fixed source proof, native IDs/scale, all-preset/join/rotation and query parity.
- Review explicit semantic/underlay trust boundary, actual covered-wall replacement,
  borrowed callback/copy ownership, immutable tokens and strict refusal diagnostics.
- Review local package overlay and rights notice; decide actual export/schema/file
  registration without advertising pane transactions or the six host promises.
- Keep released Farmyard door and planar grenade profiles rejecting windows before
  costs. No consumer pins or other games change in this checkpoint.
- Require the next gate: trusted confirmed-impact staging; typed/epoch-scoped durable
  receipts and exact retry/conflict behavior; final-fenced atomic state/context/host
  commit, invalidation and complete prospective-game save/load. Bind all six v1
  host services from the approved proposal before claiming connected live panes.
- Keep renderer/shared-Three, effects/audio, Artist visual acceptance, Editor/UI,
  guard AI and other game adoption behind their separate integration reviews.

Reproduce with `node --test tests/farmyard-windows-queries.test.mjs`,
`node tools/check-farmyard-window-queries.mjs --write`,
`node tools/farmyard-window-geometry-schema.mjs`, and
`node tools/test-farmyard-window-queries-package.mjs`. Fixed Git-object audit:
`node tools/audit-farmyard-windows.mjs --source-repository ABSOLUTE_READ_ONLY_FARMYARD_REPOSITORY`.
For independent structural validation, generate cases with
`node tools/farmyard-window-geometry-schema.mjs --cases`, then run
`python -B tools/verify-window-geometry-schema.py` with `jsonschema==4.23.0`.
An isolated dependency directory can be passed with `--dependencies PATH`.
The installed proof removes its temporary stage/consumer in `finally`; it starts
no server, browser or watcher. Root owns release/package metadata and promotion.
