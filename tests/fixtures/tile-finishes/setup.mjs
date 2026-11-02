// Pinned test setup from Artist 6df9c11fc6cf7fabf0e7a7d0e8acc4ee753e6c03.
// No private planner/provider/renderer implementation is copied here. The path
// helper adds conservative fixture reservations; the composition helper invokes
// the supplied actual public core/art/provider and Root finish APIs. Its combined
// disposal is fixture composition, not a newly registered host coordinator.
import {bindTileFinishView} from '../../../packages/tile-finishes/finishes.js';
import {plainCopy} from '../../../packages/tile-finishes/data.js';
export function pathStudyRecipe(examples,id,kind){
 const r=examples.pathRecipe(id,kind);const p=r.shape.path,pad=r.shape.widthM*4;
 const min=p.kind==='arc'?[p.center[0]-p.radius,p.center[1]-p.radius]:[0,1].map(k=>Math.min(...(p.kind==='line'?[p.a,p.b]:p.points).map(q=>q[k]))),max=p.kind==='arc'?[p.center[0]+p.radius,p.center[1]+p.radius]:[0,1].map(k=>Math.max(...(p.kind==='line'?[p.a,p.b]:p.points).map(q=>q[k])));
 r.reservations=[{id:'body',floorSlot:'base',channel:'surface',layerId:'ground',min:[min[0]-pad,min[1]-pad,0],max:[max[0]+pad,max[1]+pad,.12]}];return r;
}
export function choicesForProjection(projection){return Object.fromEntries(projection.entries.map(e=>[e.instanceId,{skinId:e.source.interior.skinId,version:1,variantSeed:e.source.interior.variantSeed}]));}

export function createArtStudyView({tiles,art,presenter,THREE,bundle,pool,base,boundary=base,detail=0,current=()=>true,maxTriangles=50000,maxCells=1024,finishChoices=null}){
 const projection=art.prepareTileArt(tiles,bundle,{detail,maxInstances:32});let cellCount=0,derivedWork=0;
 for(const e of projection.entries){const points=e.loops.flat(),min=[0,1].map(k=>Math.floor(Math.min(...points.map(p=>p[k])))),max=[0,1].map(k=>Math.ceil(Math.max(...points.map(p=>p[k]))));
  if(points.some(p=>!e.inspected.reservations.some(r=>p.every((v,k)=>v>=r.min[k]/1e6-1e-6&&v<=r.max[k]/1e6+1e-6))))throw Object.assign(Error('Actual surface exceeds its declared reservation.'),{code:'ART_OUTSIDE_RESERVATION'});
  if((max[0]-min[0])*(max[1]-min[1])+cellCount>maxCells)throw Object.assign(Error('Complete derived view exceeds cell budget.'),{code:'AGGREGATE_CELL_BUDGET'});
  const d=tiles.deriveTileCells(e.source,{placement:e.placement,floors:bundle.layout.floors,floorId:e.placement.floorBindings.base,channel:'surface',layerId:'ground',boundaryProfile:{id:'border.flat',version:1},cellSizeM:1,window:{min,max},borderSegments:1,curveSampling:{segmentsPerPart:32,maxChordErrorM:.01,maxSegmentM:4,maxWork:65536},maxCells:maxCells-cellCount,maxWork:1000000-derivedWork,uv:e.uv});cellCount+=d.cells.length;derivedWork+=d.work.units;
 }
 if(!current())return null;
 const choices=plainCopy(finishChoices??choicesForProjection(projection));
 let view,appearance;try{view=presenter.createTileArtProvider(THREE,projection,{maxTriangles,materialForInstance:()=>base,profileBindings:projection.entries.flatMap(e=>e.inspected.ports.map(p=>({profiles:p.profiles,boundaryMaterial:p.geometry.materialIntervals[0].material,material:boundary})))});appearance=bindTileFinishView({view,projection,choices,pool,current});}
 catch(primary){const errors=[primary];for(const action of [()=>appearance?.dispose(),()=>view?.dispose()])try{action();}catch(e){errors.push(e);}if(errors.length>1)throw new AggregateError(errors,'Study acquisition and retirement failed.');throw primary;}
 let disposed=false;return {...view,projection,choices,cellCount,derivedWork,appearance,dispose(){if(disposed)return;disposed=true;const errors=[];for(const fn of [()=>appearance.dispose(),()=>view.dispose()])try{fn();}catch(e){errors.push(e);}if(errors.length)throw new AggregateError(errors,'Study resources were exhausted with observer failures.');}};
}