import {BUILDING_CONTRACT as C} from '../../packages/building-catalog/index.js';

// Acceptance intentions only; NOT part definitions, an authored parts envelope
// or hand-entered compiler outputs. Artist/Coder pins replace the pending refs.
export function functionalPartsAuthoringIntent() {
  return {
    scope:'04f915dd8b16c242d47b1e054b2406aedcbdefc8',baseline:'78d37b6cd3ba5de5c25d4922b4ba301b13491caa',
    status:'editor preparation; public parts ABI, kit and UI binder pending',
    native:{metresPerUnit:1,wallHeightM:C.wallHeight,slabThicknessM:C.slab,slabBottomM:-C.slab,
      occupiedFloorHeightsM:[0,C.floorSpacing],doorWidthM:C.doorWidth,doorHeightM:C.doorHeight},
    recipeReference:'Await the reviewed Artist kit and exact Coder definition versions',
    actorBinding:{reference:'Await a measured, native-scale shared actor',maximumStandingHeightAtNativeDoorM:C.doorHeight,oversizedControlHeightM:1.7,debugProxyIsVisualAcceptance:false},
    placements:[
      {case:'first-structure',positionM:{x:4,y:4,h:0},quarterTurns:0,mode:'functional'},
      {case:'second-instance',positionM:{x:24,y:8,h:0},quarterTurns:1,mode:'functional'},
      {case:'second-layout',positionM:{x:8,y:22,h:0},quarterTurns:2,mode:'functional'}
    ],
    transactions:['place','move','quarter-turn','copy','delete','initial-settings','decorative-mode'].map(action=>({action,expectedHistoryDelta:1})),
    invariants:[
      'Derived geometry, door state, floor/support endpoints and render bindings come from the same public compiler result.',
      'Copy gives every authored child a fresh identity and remaps internal links; external links follow an explicit policy.',
      'Failure/stale preparation preserves accepted text, compiled snapshot and undo/redo.',
      'Incomplete authoring is recoverable; actual compiler readiness controls play/profile export.',
      'Native authoring save/export/reload preserves identities and initial settings; legacy export refuses without truncation.',
      'UI package-4 binder owns rendering/player controls. No second renderer or kernel.'
    ]
  };
}
