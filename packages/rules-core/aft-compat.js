// Original AFT unit/state shapes, not the portable character schema. These
// adapters preserve weight, fatigue, wounds, route gates and saved climb RNG.
export {CLIMBS, climbingSkill, climbingPenalty, climbingPreview, rollClimb, climbRiskText}
  from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/climbing.js';
export {turnAP, injuryMovement, accuracyPenalty, roundChance}
  from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/combat-state.js';
