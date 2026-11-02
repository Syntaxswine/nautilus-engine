import {bindTileFinishView} from './finishes.js';import {choicesForProjection} from './fixtures.js';
import {plainCopy,refuse} from './data.js';
// Private appearance/presentation helper. Actual geometry/cells come only from
// the supplied public packages. The host's view coordinator owns aggregate use.
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
export function setStudyVisibility(view,{floors,selectedId,mode}){
 const table=plainCopy(floors);if(!Array.isArray(table)||table.length!==15||new Set(table.map(f=>f.id)).size!==15||!table.every(f=>typeof f.id==='string'&&Number.isFinite(f.elevationM))||!table.some(f=>f.id===selectedId)||!['selected','overview','cutaway'].includes(mode))refuse('ART_VISIBILITY','Supply the explicit 15-floor table, selected identity and named presentation mode.');
 const heights=new Map(table.map(f=>[f.id,f.elevationM])),selected=heights.get(selectedId),ids=view.projection.entries.filter(e=>{const id=e.placement.floorBindings.base;if(!heights.has(id)||e.placement.origin[2]!==heights.get(id))refuse('ART_FLOOR_BINDING','Presentation may not invent or shift floor elevations.');return mode==='overview'||mode==='cutaway'&&heights.get(id)<=selected||mode==='selected'&&id===selectedId;}).map(e=>e.instanceId);
 view.setResident(ids);return ids;
}
