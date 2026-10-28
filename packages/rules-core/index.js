// Headless rules boundary. No UI, renderer, storage, clock or implicit random.
export {CHARACTER_VERSION, STAT_DEFINITIONS, DEFAULT_STATS, createCharacter,
  openCharacter, exportCharacter, deriveStats, effectiveSkill, characterSheet, trainCharacter} from './characters.js';
export {CHECK_PROFILES, nextRandom, previewSkillCheck, resolveSkillCheck, resolveAttackRoll} from './checks.js';
export {previewCosts, spendResources, previewAttack, resolveAttack, applyDamage} from './combat.js';
export const RULES_CONTRACT = Object.freeze({version: 1, characterVersion: 1, statMinimum: 1, statMaximum: 100,
  attributes: 6, skills: 8, randomness: 'explicit-saved-uint32', damageInput: 'raw-confirmed-impact'});
