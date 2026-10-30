export const WINDOW_GEOMETRY_CONTRACT=Object.freeze({
  kind:'nautilus-window-geometry',version:1,
  profileId:'farmyard-quarter-turn-first-hit-pane-v1',
  sourceCommit:'251bf8094b5f9ebe44208443084c1a6d6658512a',
  sourceVersion:'industrial-windows/2',maximumPlacements:1024,
  status:'accepted immutable compile/query foundation; live pane services are negotiated separately',
  purposes:Object.freeze(['walk','sight','projectile','flame'])
});
export const WINDOW_PANE_CONTRACT=Object.freeze({kind:'nautilus-window-pane-state',version:1,capability:'nautilus-window-panes-v1',maximumReceipts:128,status:'implemented bounded headless profile; six explicit v1 host services required'});
export const WINDOW_HOST_SERVICES=Object.freeze([
  ['fixed-window-definitions-v1','Bind the exact fixed definition lookup.'],
  ['complete-window-query-composition-v1','Compose current world, members and actors before confirming the nearest impact.'],
  ['confirmed-impact-authority-v1','Bind the trusted successful-roll/confirmed-impact boundary; observations cannot authorize breaks.'],
  ['atomic-window-context-commit-v1','Compare complete host/state/context and check the final active write fence atomically.'],
  ['window-geometry-invalidation-v1','Invalidate routes/current geometry and publish acknowledged observations.'],
  ['complete-window-save-staging-v1','Validate the complete prospective retained save without repairing resources or losing receipts.']
].map(([id,action])=>Object.freeze({id,version:1,minVersion:1,maxVersion:1,action})));
