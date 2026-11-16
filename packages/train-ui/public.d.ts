export {mountTrainControls} from './index.js';
export type {TrainControls} from './index.js';
export declare const TRAIN_CONTROLS_CARD: Readonly<{
  id: 'nautilus-train-controls'; version: 1; guide: string; entry: './trains/ui';
  styles: './trains/style.css'; types: string; sourceCommit: string;
  steamProfiles: readonly ['classic', 'compact-notched']; defaultSteamProfile: 'classic';
  connector: 'nautilus-drivable-trains'; connectorVersion: 1;
  ownsSimulation: false; ownsSavedState: false;
}>;
