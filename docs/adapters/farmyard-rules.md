# Farmyard rules adapter candidate

The first Farmyard seam implements the existing stat-v2 calculations through Nautilus's public rules API. It is a conformance candidate for Farmyard commit `279d2d34786b3e6e5c5baeeac6898e60030afdbe`, not a production dependency or game migration. No Farmyard files, saves or pins are changed. [Source evidence](../reviews/2026-10-29-farmyard-rules.sources.json) records exact Git objects and hashes; [blueprint tranche 1](../engine-blueprint.md#ordered-delivery-tranches) defines the adoption gate.

```js
import {
  deriveFarmyardStats, withFarmyardDerivedStats,
  farmyardWeaponAccuracy, farmyardEffectiveSkill,
  farmyardDamageAfterResistance
} from '@nautilus-engine/map-core/adapters/farmyard/rules';

const numbers = deriveFarmyardStats(hostActor); // Numeric projection only.
const candidate = withFarmyardDerivedStats(hostActor); // New host-shaped object.
const base = farmyardWeaponAccuracy(hostActor); // Unrounded weapon/stat blend.
const mechanical = farmyardEffectiveSkill(hostActor, 'mechanical');
const amount = farmyardDamageAfterResistance(hostActor, confirmedRawDamage);
// The game decides whether/when to commit candidate or apply amount to health.
```

The optional headless core distribution exposes the equivalent subpath beneath `@nautilus-engine/core`. The runtime module imports only `packages/rules-core/index.js`; it never imports a donor, editor, renderer, progression module, movement service or clock. The adapter starts no timer, fetch or random stream.

## Supported host shape

Each call requires a plain actor object with own enumerable data fields `statVersion: 2` and complete `stats`. All fourteen named stat values must already be integers from 1 through 100. Unknown fields inside the adopted stat dictionary reject. Current `hp`, `ap` and `stamina` are opaque host state: calculations never read or validate them, and they may be absent. Damaged, exhausted, fractional and epsilon-negative resources remain exact. Preserving a value does not establish that it is valid game or portable state. All other fields outside the adopted calculation inputs remain host-owned.

Known weapon IDs match the pinned game's fourteen `WEAPONS` entries, including `pistol-offhand`. Hands and knife use Dexterity; grenade uses Explosives; HMG, RPG, launcher and flamethrower use Heavy Weapons; the remaining supported weapons use Firearms. An explicit second argument to `farmyardWeaponAccuracy(actor, weapon)` queries another supported weapon without changing the actor.

The real `buildStats` menu projection omits actor ID and weapon. That shape remains supported: its missing weapon retains the source function's Firearms calculation, while neither field is invented. Unknown or null weapon IDs reject rather than silently using Firearms. Identity is irrelevant to these calculations; a fixed internal portable identity exists only inside a temporary rules projection and is never returned as a host ID. Numeric IDs, omitted IDs, names and species retain their original values. Named mercenary and guard starting balances remain Farmyard initialization choices.

## Results and preservation

`deriveFarmyardStats` returns exactly these cached calculation fields: `maxHp`, `maxAp`, `maxStamina`, `damageResistance`, `accuracy`, `medical`, `stealth`, `perception`. The calculation reads actual stats instead of trusting stale incoming caches. It does not change resource values, initialize missing stats, select cast defaults or award anything.

`withFarmyardDerivedStats` creates a new object and replaces only those eight fields. All other own field descriptors are preserved, including identity, resources, unknown host fields, symbols, hidden caches and accessors; unadopted accessors are not invoked. Present and absent resource properties remain present and absent, including explicit `undefined`, nonfinite values or read-only descriptors. Nested host objects, arrays, stats, maps, callbacks and services retain their references. This is a host-shaped shallow copy, not a deep clone or portable whole-game serializer. The source actor stays untouched, including when frozen. Inventory, ammunition, statuses, movement, AI plans, skill points and unadopted progression state are preserved without interpretation.

`farmyardWeaponAccuracy` uses the public attack preview's **unrounded `base`**, not its rounded/clamped `chance`. For example, Firearms 81 and Dexterity 40 produce 70.75, while the generic preview displays 71. Farmyard retains its complete aim, range, cover, stance, permission and final-rounding expression. The calculation does not authorize an attack, spend AP/ammunition or consume RNG.

`farmyardEffectiveSkill` retains the public skill calculation, including the Intelligence bonus to Medical/Mechanical and their 100 cap. `farmyardDamageAfterResistance` returns the resistance-adjusted amount **before** flooring against remaining HP, matching Farmyard's helper. Raw damage must be finite and within the public core's 0–1,000,000,000 range. It does not return actual HP lost, change health or trigger death/casualty rules; confirmed impact and committing damage stay with the game.

## Strict boundary and adoption

The original Farmyard `refreshStats` rounds/clamps stat values and can clamp or refill invalid/missing resources. This adapter rejects malformed or incomplete calculation stats but does not validate, initialize, migrate or heal host resource state. In particular, the pinned game can leave tiny negative AP after its epsilon-based affordability comparisons; this seam preserves that state exactly. It is not a `refreshStats` replacement, nor does it replace `initializeStats`, `migrateStats`, `migrateClimbing`, or `trainStat`. Legacy stat versions need a deliberate Farmyard-owned migration before selecting this seam. No new progression, balance, skill checks, combat profile or turn loop is activated.

This is pure stat math, not portable character loading. The temporary calculation character contains validated stats and local zero resources solely to call the public rules API; no host resource or identity is copied into it or returned from it. The public `openCharacter` portable-load contract remains strict and unchanged. Callers needing portable resource validation must use that contract separately.

`FarmyardRulesCompatibilityError` supplies a stable `code`, `path`, `diagnostics[]` and `toJSON()`. Diagnostics identify the unsupported stat/version, weapon, skill or damage argument and give an action. An unsupported actor weapon points to `/actor/weapon`; an explicit weapon override points to `/weapon`. Failed calculations cannot partially mutate the actor. Callers must handle rejection before replacing live state.

Tests exercise all six actual quickplay animal profiles against all fourteen current weapons, guard defaults, every stat query, unrounded bases, menu projections, damaged/dead/exhausted/fractional and epsilon-negative resources, absent resources, resource accessors that throw if read, exact identity/resource descriptors, host-field preservation, save-shaped JSON reload and explicit rejection. Three byte-preserved source modules form a closed test-only graph; the larger game module is hashed solely as actor-shape evidence. Neither the game runtime nor these fixtures is part of the adapter's shipped dependency closure.

For **accuracy**, numerical parity establishes compatibility with the game's abstraction, not physical calibration. For **efficiency**, this implementation validates fourteen stats and allocates temporary copied rules projections; no CPU improvement is claimed or measured. For **narrative**, prefer the narrow public calculation seam for Farmyard because it preserves its existing solo/phone experience and authored animal balances while leaving its continuous movement and mission policies intact. Production adoption still requires an exact installed dependency, game-side conformance/checks and a separately reviewed pin with a rollback path.
