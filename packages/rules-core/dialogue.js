// The full existing receipt/staging boundary; accepts the original dialogue and
// speaker formats. Persist a staged next state before presenting its outcome.
export {
  DIALOGUE_FORMULA, createDialogueState, checkChance, choicePreview,
  getDialogueRecord, stageDialogue, validateDialogueState, percentile, percentileOutcome
} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/dialogue-state.js';
export {validateDialogue}
  from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/dialogue-schema.js';
