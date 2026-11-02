# Basic character development

Nautilus 0.7 adds the optional public entry `@nautilus-engine/map-core/rules/progression`. It uses the existing six attributes and eight skills, all integer values from 1 to 100. Species/class perks, perk trees and additional cast content are deferred.

## Growth policy

Each level gained awards **15 assignable stat points**. A player can increase three stats by five points or choose another allocation, within the existing cap. These are points on the sheet: derived accuracy and resource formulas still use the existing rules. Practice is a separate, slower source of stat growth; it never grants character XP or allocation points.

The initial immutable basic profile requires `100 * L` additional XP to advance from current level L to L+1. Thus level 2 starts at 100 total XP, level 3 at 300, level 4 at 600 and level 5 at 1000. Rewards can cross multiple levels and retain overflow. This is illustrative tuning for playtests, not a measured balance result or an inherited level 10 ceiling.

The first practice sources are useful sustained running (Endurance), explicit firearm/heavy-weapon practice (the appropriate weapon skill), and useful bandaging (Medical). Running maps to Endurance because that attribute governs stamina in the retained rules; Agility governs AP. The consumer establishes actual exertion, useful attempts/confirmed impacts, wound improvement and reasonable repeat limits. A rendered frame, a preview, a repeated pellet, opening treatment UI or an unproductive bandage is not evidence of a new qualifying outcome.

The engine accepts only the supported stat/source combinations and bounded integer grants. The immutable `basic-progression-v1` profile uses `1000 + 100 * (current stat - 1)` practice credits for the next point and accepts at most 1000 credits per grant. Credits are abstract training units, not seconds or a physical measurement. At mastery, further practice cannot raise the stat past 100 or turn into spare allocation points. Useful failed attempts can be recognized by a consumer's explicit training policy; successful probability rolls must not masquerade as confirmed projectile impacts.

## Save and commit boundary

Progression has its own strict, versioned bundle with the unchanged portable character-v1, cumulative XP, level, banked points, practice progress, revision and saved receipts. `openProgression` validates it, and `serializeProgression` writes its canonical representation. Do not put these new fields into character-v1 or a portable map/block. Do not call donor initialization when loading; that can reset advancement and refill resources.

The bundle also saves baseline stats/points so loading can recompute the complete journal. Every accepted reward or allocation is staged from the latest authoritative state. The host atomically compares/commits the complete canonical source returned in `result.expected`, together with character resources, command/reward identities and any corresponding world outcome. Revision alone cannot detect resource-only edits. Updating character resources elsewhere requires the same transaction/authority; a progression snapshot must never overwrite newer combat damage or spent AP/stamina. Preview results are explanatory candidates, not commit authorization.

Retrying the original complete command returns its original receipt with the current state, without repeating the reward or restoring an old snapshot. A new command ID claiming an already-used `(source, sourceId)` rejects even when its amount is unchanged. Reusing an identity with a conflicting reward/allocation fails. Old receipts must not be pruned in a way that reopens rewards; reaching the 4096-receipt capacity requires deliberate archival/migration rather than silent deletion. There is no archival operation in this tranche. Rejected and stale commands leave the entire state unchanged.

Increasing Strength, Endurance or Agility recomputes maximum resources but preserves current HP/AP/stamina, including zero. Gaining a level does not heal, revive or recover a character. No renderer, DOM, storage, internal clock or implicit random stream participates in these calculations.

## API example

```js
import {createCharacter} from '@nautilus-engine/map-core/rules';
import {createProgression, stageProgression, previewAllocation,
  serializeProgression, openProgression} from '@nautilus-engine/map-core/rules/progression';

let state = createProgression(createCharacter({id:'operative_01'}));
const earned = stageProgression(state, {id:'reward_01', expectedRevision:0,
  type:'xp', source:'objective', sourceId:'mission_01:exit', amount:100});
if (earned.ok) state = earned.next; // host must compare/commit earned.expected atomically
const preview = previewAllocation(state, {medical:5, endurance:5, firearms:5});
// preview.next is unchanged; preview.preview.character contains hypothetical effects.
const assigned = stageProgression(state, {id:'allocation_01',
  expectedRevision:state.revision, type:'allocate',
  allocation:{medical:5, endurance:5, firearms:5}});
if (assigned.ok) state = assigned.next;
const restored = openProgression(serializeProgression(state));
```

Creation explicitly starts XP at 0/level 1 while preserving supplied stats and banked points. It does not infer campaign history from an old character; existing campaign progression needs a deliberate consumer migration. `progressionSheet` supplies display rows. `previewAllocation` is pure, and only accepted `stageProgression` results are candidates for a host transaction.

## Player interface and reference host

The built `/examples/character-development.html` demonstrates level/XP, banked points, every stat's practice meter and current/maximum resources. Allocation is staged with undo/reset, exact derived-effect preview and an explicit confirm. Closing the panel banks points. Save export/import preserves rewards and practice and reports invalid data without resetting the current character.

The reference host has clearly labelled sample committed outcomes. It does not prove movement, injuries, combat or objective adoption in a donor game. No new character models or fabricated species/classes are introduced. The interface follows Nautilus's existing Farmyard-derived visual direction and can be reviewed without WebGL.

## Compatibility and adoption

Schema `nautilus-progression` version1 and capability `nautilus-basic-progression-v1` describe the optional contract. Consumers negotiate both before enabling it. `schemaDocuments()` returns the package-relative structural schema; the runtime opener additionally validates arithmetic and receipt relationships. Unsupported versions, profiles and fields reject. Profile/curve changes need an explicit reviewed migration; no forward conversion is guessed.

The old `trainCharacter`, character-v1, roll profiles, RNG streams, map/block formats and game pins remain unchanged. AFT's existing rewards are a compatibility reference, not silently replaced game behavior. All three games can adopt this entry deliberately with their own eligibility, mission/squad participation and pacing policy.

The [design review](reviews/2026-10-29-basic-progression.md) records accuracy, efficiency, narrative and release acceptance. The [source inventory](reviews/2026-10-29-basic-progression.sources.json) identifies the read-only donor reference; the new progression implementation is engine-owned.
