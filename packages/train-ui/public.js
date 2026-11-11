// Integrated engine entry. The reviewed input/view implementation is retained.
export {mountTrainControls} from './index.js';
export const TRAIN_CONTROLS_CARD = Object.freeze({
  id: 'nautilus-train-controls', version: 1, guide: 'docs/train-controls.md',
  entry: './trains/ui', styles: './trains/style.css', types: 'packages/train-ui/public.d.ts',
  sourceCommit: 'e898cd60a023577fffc4c5b26c318c0be220b13f',
  connector: 'nautilus-drivable-trains', connectorVersion: 1,
  ownsSimulation: false, ownsSavedState: false
});
