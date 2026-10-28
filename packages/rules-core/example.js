import {createCharacter, characterSheet, resolveSkillCheck, resolveAttack, applyDamage, CHECK_PROFILES} from './index.js';

export function exampleEncounter() {
  const mechanic = createCharacter({id: 'mechanic', name: 'Mechanic', stats: {mechanical: 80, intelligence: 70, firearms: 65, dexterity: 60}});
  const guard = createCharacter({id: 'guard', name: 'Guard', stats: {endurance: 50}});
  const repair = resolveSkillCheck(mechanic, {skill: 'mechanical', difficulty: 60}, 42);
  const attack = resolveAttack(mechanic, {profile: CHECK_PROFILES.farmyard, skill: 'firearms', permitted: true,
    modifiers: [{id: 'cover', add: -20}], costs: {ap: 6, stamina: 1}}, 42);
  // A game traces the attack against its world. This example supplies a clear
  // impact after a successful roll; a blocked shot would apply no damage.
  const impact = attack.rolledHit ? applyDamage(guard, 30) : null;
  return {mechanic: characterSheet(attack.character), guard: characterSheet(impact?.character ?? guard), repair, attack, impact};
}
