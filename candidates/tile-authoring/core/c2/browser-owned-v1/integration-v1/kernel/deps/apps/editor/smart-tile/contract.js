// Editor-local contract, not a public engine registry/schema or gameplay service.
export const SMART_TILE_INTERFACE=Object.freeze({version:1,base:'0fbc5c3630e257dfcd7a6ea82027634dfe6989b6',checkpoint:'nautilus-smart-tile-editor-checkpoint',journal:'nautilus-smart-tile-editor-journal',operation:'nautilus-smart-tile-editor-operation',tools:Object.freeze(['rectangle','path','finish']),phases:Object.freeze(['idle','draft','preparing','review','applying','recovery-required','presentation-error','disposed']),methods:Object.freeze(['getSnapshot','subscribe','setTool','selectOwner','setDraft','review','apply','cancel','undo','redo','save','open','recover','retryPresentation','dispose'])});
export const SMART_TILE_LIMITS=Object.freeze({sourceBytes:4_000_000,bundleBytes:4_000_000,checkpointBytes:16_000_000,nodes:1_000_000,depth:40,receipts:128,historyEntries:64,historyBytes:16_000_000,owners:32,recipes:32,derivedCells:1024,triangles:50_000,repairSteps:256,repairClosure:32,spatialTests:100_000,geometryWork:100_000,viewRoots:2});
// Additive declarations; the required own-method adapter remains interface v1.
export const SMART_TILE_OPTIONAL_METHODS=Object.freeze(['lockOwner']);
export const SMART_TILE_READINESS_KEYS=Object.freeze(['authoring','shape','visual','query','support','navigation','fire','water','game']);
export const SMART_TILE_RESOURCE_FIELDS=Object.freeze(['accepted','candidate','acquiring','retiring','roots','triangles','cells','maxRoots','maxTriangles','maxCells']);
export const SMART_TILE_VISUAL_STATES=Object.freeze(['accepted','candidate','pending','failed','unconfirmed']);

// The single UI action gate. Input/camera/floor routing belongs to the existing
// controller/UI adapter; this function installs no handlers or floor authority.
export function smartTileActions({phase,manual=true,selected=false,hasDraft=false,undo=0,redo=0}={}) {
  if(!SMART_TILE_INTERFACE.phases.includes(phase))throw new TypeError('Unknown Smart Tile action phase.');
  const settled=['idle','draft','review'].includes(phase),editing=settled&&manual,unknown=phase==='recovery-required';
  return Object.freeze({setTool:editing,selectOwner:editing,setDraft:editing,review:editing&&hasDraft,apply:phase==='review'&&manual,cancel:['draft','preparing','review'].includes(phase),undo:editing&&undo>0,redo:editing&&redo>0,save:!['applying','recovery-required','disposed'].includes(phase),open:!['applying','recovery-required','disposed'].includes(phase),recover:unknown,retryPresentation:phase==='presentation-error',finish:editing&&selected,exportLegacy:false,sendToGame:false});
}

export function assertSmartTileAdapter(adapter) {
  for(const name of SMART_TILE_INTERFACE.methods){const slot=Object.getOwnPropertyDescriptor(adapter,name);if(!slot||!Object.hasOwn(slot,'value')||typeof slot.value!=='function')throw new TypeError('Smart Tile interface v1 requires own method '+name);}
  return adapter;
}
