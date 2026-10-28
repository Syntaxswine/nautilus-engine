# Shared character and rules core

Nautilus 0.2 adds a headless rules package alongside the map workshop. It keeps the established character math and makes different roll policies explicit. AFT and Farmyard have the same character-stat implementation after line-ending normalization. Tinderbox contributes the simulation/presentation boundary and fixed-time design, rather than a competing RPG sheet.

The [source comparison](reviews/2026-10-28-rules-foundation.md) records the decisions; the [source inventory](reviews/2026-10-28-rules-sources.json) records full commits and hashes. Existing immutable imports supply the reused algorithms. No donor game has been migrated or changed.

## Designs selected

| Area | Shared foundation | Game-owned policy |
| --- | --- | --- |
| Character sheet | Stable ID; six attributes and eight skills on a 1–100 scale; current HP/AP/stamina; skill points; versioned JSON | Cast, species, factions, personalities, equipment and starting balance |
| Derived values | Existing AFT/Farmyard formulas for resources, resistance, accuracy and effective medical/mechanical skills | Situational bonuses, progression rewards, resource recovery and timing |
| Skill checks | Existing AFT dialogue percentile formula, pure previews and explicit saved random state | Difficulty, minimum skill, contextual facts and consequences |
| Combat | Explicit Farmyard percentage or AFT firearm D20 profile; atomic AP/stamina costs; raw-impact resistance | Turns, AP charging policy, ammunition, visibility, cover queries, range, aim, projectile collision and casualty rules |
| Climbing | Original AFT route requirements, penalties, AP curve, risk and separate saved random stream | World routes, carried equipment and movement execution |
| Consequences | Structured result/event data; copied portable characters | Commit/save authority, duplicate-command prevention, animations, audio and UI |
| Real time | Rules have no internal clock; Tinderbox demonstrates fixed simulation ticks and snapshot/event presentation | Fixed-step scheduling, player/world clocks, fire and temporary drug effects |

The portable sheet has no DOM, renderer, portrait URL or asset loader. Model, skin and movement-set IDs belong to a consumer's presentation/content binding. Those three asset categories can change without changing character skills or combat balance.

## Character contract

```js
import {createCharacter, characterSheet, exportCharacter, openCharacter}
  from '@nautilus-engine/map-core/rules';

const actor = createCharacter({
  id: 'mechanic_01', name: 'Mechanic',
  stats: {mechanical: 80, intelligence: 70},
  skillPoints: 2
});
const sheet = characterSheet(actor); // ordered labelled rows and resource limits
const restored = openCharacter(exportCharacter(actor));
```

The existing package name and root map export stay compatible; `./rules`, `./rules/dialogue` and `./rules/aft` are new entry points. Browser consumers can import the matching `packages/rules-core/*.js` modules directly.

Attributes are strength, endurance, dexterity, agility, intelligence and perception. Skills are mechanical, medical, firearms, heavy weapons, explosives, leadership, sneak and climbing. All are integers from 1 to 100. Creation fills omitted stats from the neutral base; it never selects a named comrade or guard profile. Supplied invalid values and misspelled stat keys are rejected.

The portable schema is `{version:1,id,name,stats,resources:{hp,ap,stamina},skillPoints}`. Loading requires complete, valid data; unsupported versions, missing resources, unknown fields and impossible values fail. Loading does not refill an exhausted, injured or zero-health character. Legacy game saves need deliberate consumer migrations rather than automatic normalization into this new schema.

The retained formulas are:

- Maximum HP = `50 + strength`; maximum stamina = `50 + endurance`.
- Maximum AP = `4 + round(14 × (agility − 1) / 99)`.
- Per-hit endurance resistance = `ceil(endurance / 10)`.
- Weapon accuracy = `0.75 × weapon skill + 0.25 × dexterity`; unarmed/blade accuracy uses dexterity.
- Effective medical/mechanical skill = `min(100, skill + floor(intelligence / 10))`.

`trainCharacter(actor, stat)` spends one skill point for one stat point, stops at 100 and returns a copied character plus an event. Existing aliases shooting/firearms, vitality/strength, mobility/agility and stealth/sneak remain accepted. Training preserves current resources. Level thresholds, XP awards and species bonuses remain game content.

## Skill checks and saved attempts

```js
import {previewSkillCheck, resolveSkillCheck} from '@nautilus-engine/map-core/rules';
const check = {skill: 'mechanical', minimum: 40, difficulty: 65,
  modifiers: [{id: 'good_tools', add: 10}]};
const preview = previewSkillCheck(actor, check);
const result = resolveSkillCheck(actor, check, savedSkillSeed);
if (result.ok) savedSkillSeed = result.seed;
```

This preserves `dialogue-percentile-1`: chance = `clamp(round(50 + raw skill − difficulty + modifier), 1, 99)`, with total modifier limited to −20…20. A check is eligible only when minimum skill is met and chance is at least 20%. An eligible attempt draws an unbiased integer from 1 through 100 and succeeds at `roll <= chance`. Rolls 1 and 100 can select authored dialogue text; this does not create an extra global critical-effect rule. Intelligence's effective-skill bonus is explicit through `effectiveSkill`; the dialogue formula continues using raw stats.

The light wrapper accepts already-selected contextual modifiers. For authored conversations, use `./rules/dialogue`: `choicePreview`, `stageDialogue`, `validateDialogueState`, `createDialogueState` and related helpers retain original fact/variable conditions, content pins, stale-preview rejection and attempt receipts. Persist the staged `next` state before showing the committed result. Repeated attempts return their receipt. The light wrapper itself does not maintain an attempt ledger.

Previews consume no random values. Resolvers require a saved unsigned 32-bit seed; there is no implicit `Math.random()`. Keep separate saved streams for shots, skills and climbing so menu inspection or a new noncombat check cannot change a later shot. The full dialogue state also preserves its original domain-derived initial seed.

## Combat boundary

```js
import {CHECK_PROFILES, previewAttack, resolveAttack, applyDamage}
  from '@nautilus-engine/map-core/rules';

// The game supplies current turn/visibility/range/ammo permission and modifiers.
const specification = {
  profile: CHECK_PROFILES.farmyard,
  skill: 'firearms', permitted: true,
  modifiers: [{id: 'cover', add: -20}], costs: {ap: 6, stamina: 1}
};
const preview = previewAttack(actor, specification);
const action = resolveAttack(actor, specification, savedShotSeed);
if (action.ok) {
  // Stage actor resources, ammunition and RNG together in the game's command.
  // Trace the shot in the game world before calling applyDamage(target, rawDamage).
}
```

`farmyard-percent-1` compares one continuous percentage draw with chance. `aft-firearm-d20-1` consumes a D20 draw and an ordinary-accuracy draw: natural 20 succeeds, natural 1 fails, and ordinary accuracy is `(clamped chance − 5) / 90`. Both preserve the existing 5…95% attack band; the D20 bands are included in that probability once. `resolveAttackRoll` also accepts an already-computed 5…95 chance when a consumer retains its full existing preview formula.

`previewAttack` blends the selected weapon skill and dexterity, applies labelled numeric modifiers and rounds/clamps once. It is a shared calculation primitive; it does not reproduce either complete game's range/cover/stance formula. AFT's and Farmyard's distinct formulas remain consumer adapters. Weapon skill must be explicitly firearms, heavyWeapons, explosives or `null` for dexterity; unknown weapon IDs do not silently become firearms.

`resolveAttack` recomputes its preview from current inputs, validates all costs before spending any, advances RNG only for an accepted action, and returns a copied actor plus events. It never changes a target's HP. A successful probability roll still needs the game's projectile/impact result. `applyDamage` accepts raw confirmed-impact damage and applies endurance resistance once. Choose `{resistance:'none'}` for a game such as Tinderbox that currently has direct continuous damage. It clamps HP at zero and reports raw damage, reduction and actual HP lost. Death, bleeding, armour, burning and revival are separate policies.

Only AP and stamina costs are managed here. Ammunition, inventory, turn ownership, command IDs and persistence must be staged atomically by the consuming game; the portable combat functions do not provide duplicate-command protection or a complete encounter scheduler. Real-time consumers supply their approved resource costs rather than inheriting an AP turn loop.

`./rules/aft` exposes the original climbing and injury helpers on their original AFT unit/state shapes. It intentionally preserves carried-weight, fatigue, wound, rusty-ladder, route and RNG fields. It does not accept a portable character without an adapter.

## Adoption

The three games still use their own pinned implementations. Adopt one bounded consumer feature at a time: sheet projection, stat derivation, skill checks, then an attack adapter with parity tests. Keep existing saves, balance and scheduling until the consumer explicitly migrates them. A full RPG editor, shared inventory/effect registries, general encounter scheduler and character-sheet UI are later milestones. The current editor continues to author its existing AFT actor schema.

The executable [example](../packages/rules-core/example.js) demonstrates a repair check, resource-spending attack and confirmed impact without loading a game or renderer.
