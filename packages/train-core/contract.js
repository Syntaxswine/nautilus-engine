export const TRAIN_SESSION_CONTRACT = Object.freeze({
  id: 'nautilus-drivable-trains', version: 1, profile: 'bounded-rail-driver-v1',
  guide: 'docs/drivable-trains.md', types: 'packages/train-core/index.d.ts',
  units: 'metres, seconds, radians; ground {x,y}, feet height h; speed m/s',
  checkpoint: 'nautilus-train-checkpoint v1',
  inputPolicy: 'Exclusive non-reusable lease; exact-lease release bypasses stale revisions; restore revokes held input.'
});
