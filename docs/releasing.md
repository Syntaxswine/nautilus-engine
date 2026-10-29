# Release promotion

`main` is Nautilus's canonical integrated source. Worker and architect feature branches contain candidates until their reviewed changes are merged. A pushed branch, an asset handoff or a green worker test run is not a complete engine release.

Start new assignments from a reviewed main commit. Keep active work and prior handoffs intact; do not reset or rewrite unrelated worker branches to move their base. The architect can integrate selected full commits and resolve their composition without importing uncommitted files or moving branch heads.

## Promote a candidate

1. Review the exact contribution commits, source notices and dependency closure. Separate immutable donor bytes from engine-owned adapters, and record deferred work and consumer limits.
2. Combine accepted changes in the architect's branch. Update version/schema/capability/catalogue identities when their contracts require it. Preserve saved identities and existing release tags.
3. Run `npm run check`, `npm test`, `npm run test:upstream` and `npm run build`, plus installed-package, browser and visual checks affected by the change. Record exact commits and evidence. Do not promote a failing or unreviewed candidate.
4. Open or update a pull request to `main`, attach it to the architect chat and inspect the checks on its exact head. Merge the reviewed head with its provenance history preserved. Do not leave an accepted release only on a side branch.
5. Verify the merged main tree and post-merge CI. Check a deployment when one exists; do not change hosting audience or publish a Site as an implicit part of source promotion.
6. Tag the reviewed release commit only when it is reachable from `main`, and record the version, source SHA, changelog and compatibility evidence. A feature branch's newer art does not acquire the tag merely because it contains that release as an ancestor. Never move an existing tag to different content.
7. Fast-forward the clean primary main checkout when appropriate so local readers see the canonical source. Preserve local changes and stop if branch/ref state is unexpected; never reset or force-push to accomplish this.

## Consumer pins and asset candidates

Each game adopts an exact release tag, full commit or package integrity in its own reviewed change. Do not make a consumer follow a moving engine branch, or change another game's pin as a side effect of engine promotion.

A consumer can deliberately review a small asset closure from an unreleased full commit. Its inventory must identify the exact source, imported files and hashes, candidate status and supported behavior. This is asset borrowing, not a claim that the whole engine or every asset on that source branch is integrated. Keep the exception explicit and reconcile the corresponding engine intake before presenting it as part of a release.

For example, version 0.5.0 is source `12ad8c9b1c96637cd05c8e344692063bfde385f3`, now an ancestor of main merge `581258aa506798dca3909bfd41ec39d3ee23b550` with an identical tree. The centered window kit at `90054d07134116a5d9661f8318a76fe68f922aad`, H-plan apartments and later measured buildings remain separate candidate intakes; they do not silently belong to 0.5.0. Current [intake decisions](intake/2026-10-28-asset-decisions.md) state their status.
