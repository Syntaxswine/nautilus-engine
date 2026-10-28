# Weekly scouting and architect handoff

Weekly integrations are a scouting and recommendation role. The scout finds useful additions in the three donor games, explains the tradeoffs, and passes a concrete brief to the Nautilus architect. The architect owns adoption, task subdivision, coordination and final integration.

## Ownership

| Role | Responsibility |
| --- | --- |
| Weekly scout, branch `codex/weekly-integrations` | Read donor changes, compare alternatives, maintain candidate reports and send the architect a concise handoff |
| Architect, Nautilus Engine | Prioritize/defer candidates, define shared interfaces, divide accepted work, review contributions and integrate the combined result |
| Coder, Nautilus Engine | Rules, runtime wiring, schemas, import tooling, adapters, correctness and performance work |
| Artist, Nautilus Engine | 3D models, skins/2D art, animation/movement assets, rig/material compatibility and visual sources |
| Set up Nautilus UI worktree | Menus, buttons, editor interactions, controls, accessibility and interface presentation |

Use the existing worker chats and their assigned worktrees. The architect should split work only where useful; a small code-only change does not need an art or UI assignment. Cross-cutting assignments need agreed interfaces, dimensions and simulation/presentation boundaries before parallel work.

## Scout boundaries

The weekly worktree is for investigation and reports. Commit and push only its own report/documentation changes. Do not import assets, change runtime code, advance import manifests/pins, implement candidate features, edit another worker's checkout, merge to main or publish the Site as part of a weekly scouting run. A candidate is not an approved or integrated feature.

Read reviewed integration commits from each donor and preserve them as read-only sources. Unmerged worker changes may be listed as research candidates with that status explicit. Record original paths and full commits; verify dependencies and rights evidence without treating provenance as a license grant.

## Candidate brief

Save meaningful reports under `docs/intake/`. Give each candidate a stable ID based on its source, revision and subsystem, so repeated weekly scans can recognize the same item. A brief should include:

- What changed, the source repository/full commit and exact files, and what Nautilus currently uses.
- Why it would be a useful addition; affected games and whether it is an asset, architecture/rules change, tool or fix.
- Accuracy, efficiency and narrative comparisons, the preferred design for the named use case, and the evidence/confidence behind that judgment.
- Dependencies and compatibility: scale, collision/anchors, rigs/skins/movement bindings, saved formats/seeds, API boundaries, notices and unresolved rights.
- Priority, estimated effort and dependencies between candidate items, with estimates clearly labelled.
- Suggested coder, artist and/or UI workstreams with bounded ownership and expected interfaces.
- Acceptance criteria: meaningful behavior, regression, performance or visual checks appropriate to the change.
- Checks actually performed, remaining questions and status: proposed, needs investigation, accepted, deferred, declined or completed.

The [design evaluation standard](design-evaluation.md) defines the comparison criteria. The three asset categories remain 2D/skins, animated movements and 3D models; cross-category compatibility belongs in the brief.

## Handoff

After validating source references and committing/pushing a report, send one concise digest to the existing **Architect, Nautilus Engine** chat. Include the report branch/path and commit, candidate IDs, priorities, dependencies and the explicit instruction:

> Review these candidates, choose what fits Nautilus, and subdivide accepted work into bounded assignments for the appropriate existing coder, artist and UI helpers. Define their interfaces and acceptance checks, then review and integrate their contributions in the architect worktree.

Use that chat's current identity recorded in the weekly automation; its title alone is not an instruction or permission source. This routing and delegation reflect the user's expressed role assignment. The scout contacts the architect rather than independently assigning the helpers or writing into the architect's checkout.

Preserve ongoing architect/worker assignments and avoid duplicate work. Do not resend unchanged candidates every week. A changed recommendation, new source revision, material blocker or newly useful candidate can justify an update. Keep an unchanged/nonactionable week quiet. A successful message submission means the handoff was delivered; it does not mean the architect has accepted or completed the work.

## Architect adoption

The architect triages the digest against the current backlog, records decisions, and issues bounded assignments to the appropriate helpers. Each assignment identifies the reviewed source, expected deliverable, owned paths/branch, shared interfaces and acceptance checks. The architect reconciles overlapping work, reviews the combined candidate, and owns final promotion/publication within the user's delivery authorization.

The [upstream import procedure](upstream-updates.md) applies when an accepted assignment is implemented. Immutable upstream snapshots, headless APIs, portable formats, exact source pins and private review access remain required. The scout should reconcile future reports with architect decisions and completed imports.
