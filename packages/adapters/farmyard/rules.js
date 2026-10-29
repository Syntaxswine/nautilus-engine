// Farmyard's stat-v2 calculation seam. Gameplay, cast and save authority stay in the host.
import {STAT_DEFINITIONS, openCharacter, deriveStats, effectiveSkill, previewAttack,
  applyDamage, CHECK_PROFILES} from '../../rules-core/index.js';

const statKeys = STAT_DEFINITIONS.map(stat => stat.key);
const weapons = Object.freeze(['hands', 'knife', 'pistol', 'pistol-offhand', 'rifle', 'assault', 'smg', 'hmg', 'shotgun', 'sniper', 'grenade', 'launcher', 'rpg', 'flamethrower']);
const derivedFields = Object.freeze(['maxHp', 'maxAp', 'maxStamina', 'damageResistance', 'accuracy', 'medical', 'stealth', 'perception']);
export const FARMYARD_RULES_ADAPTER = Object.freeze({
  id: 'nautilus.farmyard.stat-v2', version: '1.0.0', statVersion: 2,
  sourceCommit: '279d2d34786b3e6e5c5baeeac6898e60030afdbe',
  supportedWeapons: weapons, derivedFields, resourcePolicy: 'host-owned-uninspected',
  adoption: 'conformance-candidate'
});
export class FarmyardRulesCompatibilityError extends TypeError {
  constructor(code, path, message, action, details = {}) {
    super(message); this.name = 'FarmyardRulesCompatibilityError'; this.code = code; this.path = path;
    this.diagnostics = [{code, path, message, action, ...details}];
  }
  toJSON() { return {name: this.name, diagnostics: structuredClone(this.diagnostics)}; }
}
function fail(code, path, message, action = 'Review or explicitly migrate the Farmyard actor before selecting this adapter; no values were changed.', details) {
  throw new FarmyardRulesCompatibilityError(code, path, message, action, details);
}
function plain(value) { return !!value && typeof value === 'object' && [Object.prototype, null].includes(Object.getPrototypeOf(value)); }
function data(object, key, path, optional = false) {
  const descriptor = Object.getOwnPropertyDescriptor(object, key);
  if (!descriptor && optional) return undefined;
  if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) fail('UNSUPPORTED_ACTOR_SHAPE', path, 'Expected an own, enumerable data field at ' + path + '.');
  return descriptor.value;
}
function prepare(actor) {
  if (!plain(actor)) fail('UNSUPPORTED_ACTOR_SHAPE', '/actor', 'Farmyard rules require a plain actor object.');
  const version = data(actor, 'statVersion', '/actor/statVersion');
  if (version !== 2) fail('UNSUPPORTED_STAT_VERSION', '/actor/statVersion', 'The adapter requires an explicitly initialized Farmyard statVersion 2 actor.', undefined, {supportedVersions: [2]});
  const supplied = data(actor, 'stats', '/actor/stats');
  if (!plain(supplied)) fail('UNSUPPORTED_ACTOR_SHAPE', '/actor/stats', 'Farmyard stats must be a complete plain stat-v2 object.');
  for (const key of Reflect.ownKeys(supplied)) if (typeof key !== 'string' || !statKeys.includes(key)) fail('UNSUPPORTED_STAT_FIELD', '/actor/stats/' + String(key), 'The adopted stat schema supports only its fourteen named fields.');
  const stats = {};
  for (const key of statKeys) {
    const value = data(supplied, key, '/actor/stats/' + key);
    if (!Number.isInteger(value) || value < 1 || value > 100) fail('INVALID_STAT', '/actor/stats/' + key, 'Farmyard stat values must be integers from 1 to 100; the adapter does not round or clamp them.');
    stats[key] = value;
  }
  // A local calculation projection avoids assigning portable identities, names or
  // progression balances to a host actor (menu stat previews have no actor ID).
  const projection = {version: 1, id: 'farmyard-calculation', name: '', stats,
    resources: {hp: 0, ap: 0, stamina: 0}, skillPoints: 0};
  const character = openCharacter(projection);
  // Host resource fields are opaque: math needs only the validated stats.
  return {character, derived: deriveStats(character)};
}
const label = value => typeof value === 'string' ? JSON.stringify(value) : value === null ? 'null' : typeof value;
function weaponSkill(actor, override) {
  const weapon = override === undefined ? data(actor, 'weapon', '/actor/weapon', true) : override;
  // The pinned buildStats menu projection omits weapon. Its source calculation
  // uses Firearms in that exact case; this does not add a weapon to the actor.
  if (weapon === undefined) return 'firearms';
  if (!weapons.includes(weapon)) fail('UNSUPPORTED_WEAPON', override === undefined ? '/actor/weapon' : '/weapon', 'Unsupported Farmyard weapon ID: ' + label(weapon), 'Bind a weapon from the pinned Farmyard allowlist or review a new adapter version.', {supportedWeapons: [...weapons]});
  if (weapon === 'hands' || weapon === 'knife') return null;
  if (weapon === 'grenade') return 'explosives';
  return ['hmg', 'rpg', 'launcher', 'flamethrower'].includes(weapon) ? 'heavyWeapons' : 'firearms';
}
function accuracy(character, actor, weapon) {
  // The base is unrounded and unclamped. Farmyard retains its range/aim/cover
  // expression and rounds the final chance itself; no attack is authorized here.
  return previewAttack(character, {profile: CHECK_PROFILES.farmyard, skill: weaponSkill(actor, weapon),
    modifiers: [], costs: {}, permitted: true}).base;
}
export function deriveFarmyardStats(actor) {
  const {character, derived} = prepare(actor);
  return {maxHp: derived.maxHp, maxAp: derived.maxAp, maxStamina: derived.maxStamina,
    damageResistance: derived.damageResistance, accuracy: accuracy(character, actor),
    medical: derived.medical, stealth: derived.stealth, perception: derived.perception};
}
export function withFarmyardDerivedStats(actor) {
  const derived = deriveFarmyardStats(actor), descriptors = Object.getOwnPropertyDescriptors(actor);
  // Preserve host-only fields, references, symbols, nonenumerable fields and
  // accessors without invoking or serializing them. Only derived fields change.
  for (const [key, value] of Object.entries(derived)) descriptors[key] = {value, enumerable: true, configurable: true, writable: true};
  return Object.create(Object.getPrototypeOf(actor), descriptors);
}
export function farmyardWeaponAccuracy(actor, weapon) {
  return accuracy(prepare(actor).character, actor, weapon);
}
export function farmyardEffectiveSkill(actor, skill) {
  if (!statKeys.includes(skill)) fail('UNSUPPORTED_SKILL', '/skill', 'Unsupported Farmyard skill: ' + label(skill), 'Select a named stat from the pinned fourteen-stat schema.', {supportedSkills: [...statKeys]});
  return effectiveSkill(prepare(actor).character, skill);
}
export function farmyardDamageAfterResistance(actor, rawDamage) {
  if (!Number.isFinite(rawDamage) || rawDamage < 0 || rawDamage > 1000000000) fail('INVALID_DAMAGE', '/rawDamage', 'Confirmed raw damage must be finite and between 0 and 1,000,000,000.');
  // Return the pre-HP-floor damage amount, not the core's actual HP loss. The
  // host still owns confirmed impact, HP commit, casualty and death behavior.
  return applyDamage(prepare(actor).character, rawDamage).damage;
}
