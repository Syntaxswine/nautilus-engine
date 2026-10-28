import {openCharacter, deriveStats} from './characters.js';
import {CHECK_PROFILES, resolveAttackRoll, validSeed} from './checks.js';
import {fields, finite, modifiers} from './validation.js';

function costs(value = {}) {
  fields(value, ['ap', 'stamina'], 'costs');
  return {ap: finite(value.ap ?? 0, 0, 1000000, 'AP cost'), stamina: finite(value.stamina ?? 0, 0, 1000000, 'stamina cost')};
}
export function previewCosts(character, value = {}) {
  const actor = openCharacter(character), cost = costs(value);
  const missing = Object.keys(cost).find(key => actor.resources[key] < cost[key]);
  return {ok: !missing, reason: missing ? 'Not enough ' + (missing === 'ap' ? 'AP' : 'stamina') + '.' : '', costs: cost};
}
export function spendResources(character, value = {}) {
  const actor = openCharacter(character), preview = previewCosts(actor, value);
  if (!preview.ok) return {...preview, character: actor, events: []};
  for (const key of Object.keys(preview.costs)) actor.resources[key] -= preview.costs[key];
  return {...preview, character: actor, events: [{type: 'resources-spent', actorId: actor.id, costs: preview.costs}]};
}

// Hosts explicitly provide permission and world modifiers (range, cover, aim,
// injury, stance, etc.). This module never makes a visibility or turn decision.
export function previewAttack(character, specification) {
  const actor = openCharacter(character);
  fields(specification, ['profile', 'skill', 'modifiers', 'costs', 'permitted', 'reason'], 'attack');
  const {profile, skill, permitted} = specification;
  if (![CHECK_PROFILES.farmyard, CHECK_PROFILES.aftFirearm].includes(profile)) throw new TypeError('Choose an explicit attack profile.');
  if (![null, 'firearms', 'heavyWeapons', 'explosives'].includes(skill)) throw new TypeError('Choose a weapon skill, or null for Dexterity.');
  if (typeof permitted !== 'boolean' || specification.reason !== undefined && typeof specification.reason !== 'string') throw new TypeError('The game must supply attack permission and a text reason.');
  const base = skill === null ? actor.stats.dexterity : actor.stats[skill] * 0.75 + actor.stats.dexterity * 0.25;
  const changes = modifiers(specification.modifiers), modifier = changes.reduce((sum, item) => sum + item.add, 0);
  const chance = Math.round(Math.max(5, Math.min(95, base + modifier)));
  const budget = previewCosts(actor, specification.costs);
  const reason = actor.resources.hp <= 0 ? 'Character has no health.' : !permitted ? specification.reason || 'The game blocked this attack.' : budget.reason;
  return {ok: !reason, reason, profile, skill, base, modifiers: changes, modifier, chance, costs: budget.costs};
}
export function resolveAttack(character, specification, seed) {
  validSeed(seed);
  const preview = previewAttack(character, specification);
  if (!preview.ok) return {ok: false, reason: preview.reason, preview, character: openCharacter(character), seed, events: []};
  const spent = spendResources(character, preview.costs), roll = resolveAttackRoll(preview.chance, preview.profile, seed);
  return {ok: true, preview, character: spent.character, ...roll,
    events: [...spent.events, {type: 'attack-rolled', actorId: spent.character.id, profile: preview.profile,
      chance: roll.chance, rolledHit: roll.rolledHit, critical: roll.critical,
      seedBefore: seed, seedAfter: roll.seed}]};
}

// Call only for a confirmed impact. Casualty, bleeding, fire and resurrection
// policies remain with the game; raw damage enters the resistance formula once.
export function applyDamage(character, rawDamage, {resistance = 'endurance'} = {}) {
  const actor = openCharacter(character);
  finite(rawDamage, 0, 1000000000, 'raw damage');
  if (!['endurance', 'none'].includes(resistance)) throw new TypeError('Unknown resistance profile.');
  const reduction = resistance === 'endurance' ? deriveStats(actor).damageResistance : 0;
  const damage = Math.max(0, rawDamage - reduction), before = actor.resources.hp;
  actor.resources.hp = Math.max(0, before - damage);
  const event = {type: 'damage-applied', targetId: actor.id, rawDamage, resistance: reduction,
    damage, applied: before - actor.resources.hp, hpBefore: before, hpAfter: actor.resources.hp};
  return {character: actor, ...event, events: [event]};
}
