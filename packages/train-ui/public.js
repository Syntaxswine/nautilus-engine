// Integrated engine entry. The reviewed input/view implementation is retained.
export {mountTrainControls} from './index.js';
export const TRAIN_CONTROLS_CARD = Object.freeze({
  id: 'nautilus-train-controls', version: 1, guide: 'docs/train-controls.md',
  entry: './trains/ui', styles: './trains/style.css', types: 'packages/train-ui/public.d.ts',
  sourceCommit: 'd99fcf85256c90474cf570185159669caaed8070',
  steamProfiles: Object.freeze(['classic', 'compact-notched']), defaultSteamProfile: 'classic',
  connector: 'nautilus-drivable-trains', connectorVersion: 1,
  ownsSimulation: false, ownsSavedState: false
});
