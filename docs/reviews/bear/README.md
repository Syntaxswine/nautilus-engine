# Bear: independent pinned-source reference

The source reference is prepared. **Integrated Nautilus visual acceptance is pending an architect-supplied provider/editor checkpoint.** This branch adds artist evidence and repeatable review tools; it imports no runtime assets, changes no shared APIs, and accepts no release. The completed Coldwell map remains on `codex/coldwell-map` at `82da2ccccbba20619059bef5000783bd685153fd`.

| Reference | Full immutable commit |
| --- | --- |
| AFT bear source | `4f5f53917990ec03b2f14c65f067e4b99ec8fcaa` |
| Nautilus runtime baseline, v0.8.0 | `8c4670450cb2b38c1e1abd811d633c22de9e2b7c` |
| Architect's intake proposal | `1115871def96e8a9e5ddc239bf4ad5a5a7ff9829` |
| Integrated candidate | Not supplied for this stage |

Original blobs were read through `git cat-file` from the fixed donor commit. [The manifest](source-manifest.json) records all 59 cached files, their Git object IDs, SHA-256 hashes and 16,695,637 bytes. Original bytes and notices remain in an ignored, task-local reference cache. Inspection-only sources are explicitly separated from the executable bench roots. This is not Coder's production dependency closure or a proposed replacement for Nautilus's existing AFT pin.

## Evidence and scope

[Measurements](source-measurements.json) cover both outfits and all thirteen declared equipment choices, with 260 fixed carry, idle, kneeling, prone and crawl samples. Bounds use indexed live skinned vertices and respect hidden ancestors. Body excludes the cap and props; visual adds the native fitted cap; equipped adds carried equipment. Roots remain at native scale `[1,1,1]`, with the original foot origin and a 2.12 m kit datum. Cameras move and zoom independently of the animal.

[The browser report](source-browser-review.json) contains 44 paired captures: both paintings in four turnaround views, all thirteen carries, selected HMG/RPG/rifle/flamethrower postures and idle, four HMG crawl phases, three locomotion distances, six rifle sequence phases and four close views. Edge `156.0.4314.50`, source Three r180, Node `v24.15.0`, 1600 × 1100, isolated software WebGL. Zero browser errors and failed resource requests. No donor self-review was used as acceptance; donor tests/reports are retained only as context.

| Native measurement | Result |
| --- | --- |
| Author / game body | 27,298 / 10,050 triangles |
| Additional fitted cap | 700 triangles |
| Normal carry body top | 1.670845 m |
| Red Hat carry visual top | 1.691898 m |
| Carry feet / floor | Lowest body vertices at 0 m |
| Largest measured hand-contact error | Less than `5e-16` m; tolerance 0.001 m |
| HMG carry lateral equipped width | 0.994638 m |
| RPG idle at 4.2 s lateral width | 1.098322 m |
| Sniper crawl at phase 0 lateral width | 1.127401 m |

Contact alignment alone does not establish floor, collision, weapon clearance or motion quality. [Structured findings](source-findings.json) keep those conclusions separate.

## Findings for integration

**The raw prone composition needs an equipment-specific path.** Reproduce with a fresh bear and selected prop: `createBattlePosture(worker, BEAR_PROFILE)`, `worker.pose('carry')`, `posture.apply({heading:0, distance:0, blend:0, pose:{prone:1}})`, then `posture.ground()`. Both outfits keep their body above the floor and hand anchors aligned, while parts of seven equipment choices extend below it. RPG reaches −0.528707 m; HMG reaches −0.236243 m. [RPG](source-prone-rpg.jpg) and [HMG](source-prone-hmg.jpg) captures show this directly. This diagnoses that source-helper composition, not a fixed Nautilus provider or every donor game path. Do not expose this composition as fully supported prone equipment. Prefer the appropriate fitted presentation family or explicitly reject the combination until reviewed; keep native weapon dimensions and bone lengths.

**A one-metre reservation is not clearance proof.** A centred HMG carry has only 5.362 mm total lateral spare width before any motion. RPG idle and sniper crawl exceed the opening. The bare bear and fitted cap fit below a 2 m ceiling in these sampled standing views, but an equipped stance can have a different envelope. These are conservative AABB estimates, not swept doorway tests. Keep metre scale, preserve body/visual/equipped envelopes, and check the host's actual opening, ceiling and prone route.

**Preserve the native paint and cap fit.** The regular work clothes and Red Hat uniform remain visually distinct across the equipment board. Native cuffs, short tail, muzzle and cap are captured in [the turnaround](source-turnaround-painted.jpg) and close views. The front eye painting reads soft/squinting at extreme close range; garment registration edges and the correction below the tail remain visible in close captures. Those are source-reference observations, not newly introduced import defects. No repaint or sculpt replacement is justified by this intake stage. A future close-camera cleanup should be reviewed separately against these same views.

**Keep equipment and motion restrictions explicit.** This bench measures all thirteen carries, idle and crawl choices, but its direct `createMammalMotion` sequence uses the donor's internal rifle. Other weapons are not silently posed as a rifle. The separate `createProneMotion` study explicitly rejects bear and remains horse-only. Grenade, traversal, casualty/fire, chair and speaking require review through the provider's declared families at the fixed integrated checkpoint. Chair presentation must remain unarmed. Do not infer host movement, combat, fire or traversal execution from an animation.

**Resource and ownership boundaries remain Coder acceptance work.** `createRedHatCap` fetches document-relative pig-foreman cap data, and paint paths are document-relative. This bench deliberately serves the pinned donor layout; it does not prove installed-package resolution. The bare bear disposes its base skeleton, while motion wrappers can own another skeleton and restore the original binding. Stop motion first and keep exactly-once disposal explicit in the provider. Native HMG/RPG carry changes borrow the prop: release must restore its original carry object. The headless reference verifies that restoration, but does not replace concurrent-instance, failure/late-load and borrowed-texture lifecycle tests.

## Design assessment

**Accuracy:** prefer the actual bear body, original paintings, native cap fit and authored anchors over stretching another animal. This retains the source's silhouette and measured hand fits. Biological realism, combat hit volumes and a one-tile reservation are separate concerns. The concrete prone failure means body contact and equipment grounding must be reviewed together.

**Efficiency:** the reduced body is 10,050 triangles, compared with 27,298 in the author mesh; the cap adds 700. The two-bear bench's last rendered Red Hat viewport reports 10 draw calls / 10,750 triangles unarmed without the doorway, and 101 calls / 14,013 triangles for HMG carry with the doorway. These counts include visible scene helpers and prop meshes, not frame-time measurements. Prefer a separate lazy provider and review its resource/package cost; do not replace the full old AFT snapshot. Weapon batching could be investigated if a measured target-device budget requires it. No phone or CPU/GPU speed improvement is claimed.

**Narrative:** prefer both native outfits for AFT/Farmyard-style presentation. Their colour, cap and tailoring read consistently at the review distance; generic uniform painting would lose that identity. Tinderbox can borrow the visuals through its own host binding without acquiring factions or turn rules. Keep optional presentation families useful and honest about unsupported combinations.

## Reproduce and next checkpoint

From this artist branch, with a read-only AFT repository containing the fixed object:

```powershell
node docs/reviews/bear/source-snapshot.mjs --repo '<read-only AFT repository>'
node docs/reviews/bear/source-measure.mjs
node docs/reviews/bear/source-review.mjs
./docs/reviews/bear/verify-cleanup.ps1
node docs/reviews/bear/source-evidence.mjs
```

The browser helper owns an isolated browser and localhost server, closes both in `finally`, and has a real five-minute expiry. [Cleanup](source-helper-cleanup.json) verifies all recorded PID/creation-time/executable identities ended and their ports were released. No preview remains running.

[Local checks](checks.json) passed: `npm run check`, 357 repository tests, 32 pinned upstream regressions and `npm run build` with 382 module paths verified. The source-only HTML/JavaScript bench lives in `art/bear-review`; its cached donor resources and execution code are excluded from the deployed editor. A real-browser smoke check passed after that separation. These passing repository checks do not resolve the recorded visual findings or establish integrated bear support.

The next review requires full architect-supplied provider and Editor commits. Repeat comparable views through the installed provider and real editor, exercise its declared optional families, measure equipment/stance clearance and verify concurrent ownership and failure paths. Preserve Guard/NPC identity, outfit, weapon, heading and authored data through editing, history, save/reload, map/block export/import. Include an existing animal and an unsupported consumer. Only those fixed-candidate checks can produce integrated acceptance.
