# Action animation update review · 10 November 2026

Start with Tinderbox's sidearm draw and AFT's grounded crawl. Follow with Farmyard Fighters' flamethrower and burn reactions. These are changes to motion and presentation. Use the existing native scale, models and skins for the draw and first crawl. Treat the flame atlas as a separate 2D resource with its own review.

| Published comparison | Full tip |
| --- | --- |
| Nautilus main | `433ee2b1f741d4a45b80638418a6819a9d0b6000` |
| AFT main | `25d0e91858be0fa5ea7d54132a4a642624bd9aa7` |
| Farmyard Commando main | `4a0bd292ee09abb7f61e743289f5a40f09655b2c` |
| Farmyard Commando Real Time main | `da33a458345cde8d8f9ea20361be0137b045dbc0` |
| Farmyard Fighters main | `7cd3d56e62a8087133a9fdf2f521cf92d310d6fd` |
| Tinderbox master | `4fc97bb5d14fe4f5b5557e0bc3ceee57bb2d1eee` |

Nautilus already has an optional native horse grenade presenter. Its public main also has AFT weapon spread and trace endpoints. The open Farmyard firearm-feedback PR already presents aiming, recoil and cues for committed rounds. Seven core rig, gait and weapon files in Fighters match that PR's Real Time source pin. Preserve the firearm assignment and use actual trace endpoints as the host's input. Fighters' later 20 ms adjustment to AK and SMG auto cadence is game balance. AFT's published grenade preparation adds the bear release to the earlier roster. That belongs with the already queued bear/roster work. [Farmyard firearm PR](https://github.com/Syntaxswine/nautilus-engine/pull/43) · [AFT weapon spread PR](https://github.com/Syntaxswine/nautilus-engine/pull/46) · [Architect queue](2026-10-30-architect-queue.md) · [Source ledger](2026-11-10-action-animations.sources.json)

## TB-03d08b3-sidearm-draw · P1 · Recommended

Tinderbox's published Bell & Alder trial includes the reviewed draw at `03d08b35694093e202d01700af42ac8fda620522`. `src/reuse/patrol-pistol.js` brings the existing TT-33 from the native goat's belt into the right palm, then raises it to the host's aim. `src/content/patrol-pistol.js` supplies the reference muzzle and `src/reuse/civilians.js` binds the goat. The presenter matches the reviewed source at current master. The pistol and the borrowed arm-fit reference trace back to AFT and Farmyard Fighters. [Tinderbox pose and source review](https://github.com/Syntaxswine/tinderbox/blob/4fc97bb5d14fe4f5b5557e0bc3ceee57bb2d1eee/docs/engineering/bell-and-alder-witness.md)

- **Accuracy.** Prefer the staged draw for a stowed sidearm. The palm reaches the grip before the lift, the native limb lengths are retained, and the full-aim muzzle and bore agree with the ballistic reference in the tested goat pose. The earlier aiming/recoil module remains the right layer once a weapon is ready. Tinderbox's 1.2 s draw is a named game timing.
- **Efficiency.** The draw solves one two-link arm for the active actor and reuses one gun instance. It adds transform work compared with showing a ready weapon immediately. Sample only active draws. The comparison is from code, with frame cost unmeasured.
- **Narrative.** Subjectively, a visible reach and draw makes the officer's escalation readable and gives the player a chance to take cover. Similar tactical games gain a visible equipment transition.

**Work and proof.** Coder and Artist start with the native standing goat and one belt sidearm. Define named belt/grip/muzzle sockets, an explicit action progress sample and handoff to the existing firearm pose. Tinderbox parents the stowed gun to the hip. PR #43 expects its equipped gun directly under the worker root. Agree on a single owner and preserve world pose through the parent/frame transition. UI uses the host's confirmed action state where useful. Check reach, full-aim bore, rotated/translated rigs, repeated frames, cancel/reholster, mid-draw restore, and one committed shot with one cue. Use the host's action duration, combat and clock. **Effort estimate** 1–2 builder days for the first profile.

## AFT-25d0e91-grounded-crawl · P1 · Recommended

AFT main publishes the reviewed motion study introduced in `aa61ffa11c36c21aaa53b7ee48a4f24e4ccc5d4b`. `dist/tactics/{crawl-motion.js,crawl-state.js,crawl-equipment.js,hen-crawl-motion.js}` provide a signed-distance cycle, support contacts and weapon-specific carries. Battle still uses its existing prone presentation. Treat the selected motion as a bounded slice of `AFT-25d0e91-completed-roster`. The horse and goat model data match Nautilus's current pinned bytes. [AFT crawl integration review](https://github.com/Syntaxswine/animal-factory-tactics-3d/blob/25d0e91858be0fa5ea7d54132a4a642624bd9aa7/docs/tactics/CRAWLING-INTEGRATION-REVIEW-2026-10-24.md)

- **Accuracy.** Prefer the dedicated crawl over a held prone pose translated across the floor. Alternating planted forearms and feet explain the pull, and weapon-specific carries clear the posed body and ground in the donor tests. The demonstrated support is flat and fixed-heading. Turning, ramps and action blends need their own acceptance.
- **Efficiency.** A held pose is cheaper by inspection. The donor fits skinned surfaces and snapshots mesh attributes when creating the controller. Fit once per compatible rig/loadout and reuse it. Measure bind and pose sampling separately before expanding the roster.
- **Narrative.** Subjectively, the low silhouette, weight transfer and tucked rifle read as deliberate movement through cover. Choose this for live prone travel in AFT-style and Farmyard stealth. Use a held prone pose while stationary or where a host cannot yet supply the required state.

**Work and proof.** Coder and Artist start with one current horse rig on flat ground, empty hands and rifle. Drive phase from signed, accepted travel and use the host's root transform once. Own and restore instance-only skin, gear and bone changes. Connect enter/exit prone, stop, reverse, rejected motion, cancel and save/restore without changing gameplay. Check contacts, stock and floor clearance, hose or alternate rigs when later offered, and ordinary game zoom. Farmyard's separate presentation cursor is a useful reference for continuity over mode changes and counter resets. Its half-rate Run deliberately slides at the faster pace, so use actual committed travel for planted crawl. **Effort estimate** 2–4 builder days for the first playable path. [Farmyard movement review](https://github.com/Syntaxswine/farmyard-commando/blob/4a0bd292ee09abb7f61e743289f5a40f09655b2c/sites/tactical-animal/movement-runtime.md)

## FF-033485a-fire-actions · P2 · Recommended

Farmyard Fighters published `033485ab1986f3735230da0ff30089794984e33c` and retains the changes in `7cd3d56e62a8087133a9fdf2f521cf92d310d6fd`. `sites/tactical-animal/dist/{field-view.js,flame-effects.js,burn-effects.js}` connect the earlier AFT-derived poses to real-time committed fire events. Reuse only this presentation seam. Tinderbox's separate heat profile owns the simulation side where needed. [Fighters integration](https://github.com/Syntaxswine/farmyard-fighters/commit/033485ab1986f3735230da0ff30089794984e33c)

- **Accuracy.** Prefer the full brace for the supported stationary pose, a restrained overlay while moving, and a shroud that follows downed rigs. Continue using the committed muzzle, traced limits and burn state. Only the supported standing rig receives the authored collapse.
- **Efficiency.** Prefer lazy shared atlas loading, bounded effect slots and pose fallback over allocating new geometry per burst or forcing a full-body solve on every victim. Source limits and tests establish bounded allocation and cleanup. CPU and GPU cost in Nautilus remain unmeasured.
- **Narrative.** Subjectively, the brace makes the heavy tool read clearly in a tactical fight. A burning actor can keep its actual pose, and the reduced-motion fallback preserves the cue.

**Work and proof.** Coder owns the committed action, pose-layer and renderer-lifecycle binding. Artist verifies nozzle, hose, wall clipping, supported stances and existing atlas provenance. UI checks reduced motion where appropriate. Exercise one stationary shot, movement during the shot, a downed victim, wall clipping, late textures, reset and once-only retirement. Preserve host damage, movement, time, and saved-state ownership. **Effort estimate** 2–4 builder days after the shared action/pose interface.

## AFT-26d37e8-traversal · Hold

The draft at `26d37e892a81993581aff4a39563dceed4c95ff0` has better planted contacts than the earlier floating traversal. Its latest author audit still reports window and high-wall balance exceptions, remaining clipping and species-specific cases. The fit/preparation is heavier than the current lightweight presentation. Its shoulder rolls and side vaults are visually clearer when the body clears the opening and makes contact. Keep this as an unmerged candidate. Revisit the smallest reviewed clip when it passes its contact, clearance, loadout and runtime-cost gates. A new low-wall profile also needs an authored geometry contract. [AFT draft PR #12](https://github.com/Syntaxswine/animal-factory-tactics-3d/pull/12)

## Evidence and delivery boundary

The scout ran 16 AFT crawl/loadout, 15 Tinderbox patrol/witness, 17 Fighters fire/pose and 5 Farmyard timing tests from exact Git archives. All 53 passed. The AFT sequence board and the Tinderbox reviewer’s stowed and firing frames were inspected. These checks cover the donor rigs and fixtures. The installed Nautilus bindings, sustained runtime performance and game-zoom transition review are builder acceptance work.

Nautilus main's current post-merge failure is in the tile editor browser workflow. The scout kept its previously validated base for this documentation delivery and used published main for the comparison. Reuse the existing optional renderer and shared Three, preserve package-safe sources, and record unresolved donor code, image and atlas rights before distributing any new resource. [Current main CI](https://github.com/Syntaxswine/nautilus-engine/actions/runs/42733273984) · [Nautilus notices](../../NOTICE.md) · [Component handoff standard](../component-handoffs.md)
