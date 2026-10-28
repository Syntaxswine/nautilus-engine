// Immutable donor algorithms. Keep game-specific names and cast defaults private.
export {
  STAT_DEFINITIONS, BASE_STATS, normalizeStats, refreshStats, trainStat,
  effectiveSkill, weaponAccuracy, damageResistance
} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/character-stats.js';
export {checkChance, percentile, percentileOutcome, DIALOGUE_FORMULA}
  from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/dialogue-state.js';
export {rollFirearmShot}
  from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/helicoid-shot.js';
