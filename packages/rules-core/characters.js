import * as original from './upstream.js';
import {fields, integer, finite} from './validation.js';

export const CHARACTER_VERSION = 1;
export const STAT_DEFINITIONS = Object.freeze(original.STAT_DEFINITIONS.map(([key, label], index) =>
  Object.freeze({key, label, kind: index < 6 ? 'attribute' : 'skill'})));
export const DEFAULT_STATS = Object.freeze({...original.BASE_STATS});
const keys = STAT_DEFINITIONS.map(stat => stat.key);
const resources = ['hp', 'ap', 'stamina'];

function validateStats(stats, complete) {
  fields(stats, keys, 'stats');
  for (const key of complete ? keys : Object.keys(stats)) integer(stats[key], 1, 100, key);
}
function identity(character) {
  if (typeof character.id !== 'string' || !/^[a-zA-Z][a-zA-Z0-9_.:-]{0,95}$/.test(character.id)) throw new TypeError('A stable character ID is required.');
  if (typeof character.name !== 'string' || character.name.length > 100) throw new TypeError('Character name must be at most 100 characters.');
  integer(character.skillPoints, 0, 1000000, 'skill points');
}
function derived(stats) {
  const unit = original.refreshStats({stats: {...stats}});
  return {maxHp: unit.maxHp, maxAp: unit.maxAp, maxStamina: unit.maxStamina,
    damageResistance: unit.damageResistance, medical: unit.medical,
    mechanical: original.effectiveSkill(unit, 'mechanical'), perception: unit.perception, stealth: unit.stealth};
}

// Creation fills omitted fields. Loading never fills or repairs saved resources.
export function createCharacter({id, name = '', stats = {}, resources: current = {}, skillPoints = 0} = {}) {
  validateStats(stats, false);
  fields(current, resources, 'resources');
  const character = {version: CHARACTER_VERSION, id, name, stats: {...DEFAULT_STATS, ...stats}, resources: {}, skillPoints};
  identity(character);
  const maximum = derived(character.stats);
  for (const key of resources) character.resources[key] = finite(Object.hasOwn(current, key) ? current[key] : maximum['max' + key[0].toUpperCase() + key.slice(1)], 0,
    maximum['max' + key[0].toUpperCase() + key.slice(1)], key);
  return character;
}

export function openCharacter(input) {
  const value = typeof input === 'string' ? JSON.parse(input) : input;
  fields(value, ['version', 'id', 'name', 'stats', 'resources', 'skillPoints'], 'character');
  if (value.version !== CHARACTER_VERSION) throw new TypeError('Unsupported character version.');
  identity(value); validateStats(value.stats, true); fields(value.resources, resources, 'resources');
  const maximum = derived(value.stats);
  for (const key of resources) finite(value.resources[key], 0, maximum['max' + key[0].toUpperCase() + key.slice(1)], key);
  return structuredClone(value);
}
export function exportCharacter(character) {return JSON.stringify(openCharacter(character));}
export function deriveStats(character) {return derived(openCharacter(character).stats);}
export function effectiveSkill(character, skill) {
  if (!keys.includes(skill)) throw new TypeError('Unknown skill: ' + skill);
  return original.effectiveSkill(openCharacter(character), skill);
}
export function characterSheet(character) {
  const value = openCharacter(character), maximum = derived(value.stats);
  return {id: value.id, name: value.name, skillPoints: value.skillPoints,
    stats: STAT_DEFINITIONS.map(stat => ({...stat, value: value.stats[stat.key]})),
    resources: Object.fromEntries(resources.map(key => [key, {current: value.resources[key], max: maximum['max' + key[0].toUpperCase() + key.slice(1)]}])),
    damageResistance: maximum.damageResistance};
}
export function trainCharacter(character, skill) {
  const value = openCharacter(character);
  const aliases = {shooting: 'firearms', vitality: 'strength', mobility: 'agility', stealth: 'sneak'};
  const key = Object.hasOwn(aliases, skill) ? aliases[skill] : skill;
  if (!keys.includes(key)) throw new TypeError('Unknown skill: ' + skill);
  const unit = {...value.resources, stats: {...value.stats}, skillPoints: value.skillPoints};
  const before = value.stats[key];
  if (!original.trainStat(unit, key)) return {ok: false, reason: value.skillPoints < 1 ? 'No skill points available.' : 'Stat is already 100.', character: value, events: []};
  value.stats = unit.stats; value.skillPoints = unit.skillPoints;
  value.resources = Object.fromEntries(resources.map(key => [key, unit[key]]));
  return {ok: true, character: value, events: [{type: 'stat-trained', actorId: value.id, stat: key, from: before, to: value.stats[key]}]};
}
