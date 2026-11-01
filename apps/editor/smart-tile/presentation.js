import {fail} from './checkpoint.js';

// Actual public art/core/presenter namespaces are supplied by the host imports.
// The host's materials and scene are borrowed; only the returned provider owns
// its native geometry. No private tessellator or boundary matcher lives here.
export function createSmartTilePresentation({tiles,art,presenter,THREE,scene,materials,sectorSizeM}){
  if(!Number.isSafeInteger(sectorSizeM)||sectorSizeM<1)fail('SECTOR_BINDING','/presentation','Supply the real source-map sector size in native metres.');
  let floorId=null;const live=new Set();
  const reside=view=>{if(floorId!==null)view.setResident(view.projection.entries.filter(e=>e.placement.floorBindings.base===floorId).map(e=>e.instanceId));};
  return Object.freeze({
    acquire(bundle,{maxTriangles,maxCells,current}){
      const projection=art.prepareTileArt(tiles,bundle,{detail:0,maxInstances:32});
      let cellCount=0,derivedWork=0;const cells=[];
      for(const entry of projection.entries){
        const points=entry.loops.flat(),min=[0,1].map(k=>Math.floor(Math.min(...points.map(p=>p[k])))),max=[0,1].map(k=>Math.ceil(Math.max(...points.map(p=>p[k]))));
        const reservations=entry.inspected.reservations;
        // Keep the conservative path authoring envelope honest. It is a
        // reservation for this proof, never a collision or support body.
        if(points.some(p=>!reservations.some(r=>p.every((v,k)=>v>=r.min[k]/1e6-1e-6&&v<=r.max[k]/1e6+1e-6))))fail('ART_OUTSIDE_RESERVATION','/presentation','Keep the source controls; this envelope needs a reviewed reservation profile.');
        const count=(max[0]-min[0])*(max[1]-min[1]);if(count+cellCount>maxCells)fail('AGGREGATE_CELL_BUDGET','/presentation','The accepted/candidate/retiring derived windows exceed the proof budget.');
        if(count){if(derivedWork>=1000000)fail('DERIVED_WORK_LIMIT','/presentation','The complete derived view exhausted its work budget.');const derived=tiles.deriveTileCells(entry.source,{placement:entry.placement,floors:bundle.layout.floors,floorId:entry.placement.floorBindings.base,channel:'surface',layerId:'ground',boundaryProfile:{id:'border.flat',version:1},cellSizeM:1,window:{min,max},borderSegments:1,curveSampling:{segmentsPerPart:32,maxChordErrorM:.01,maxSegmentM:4,maxWork:65536},maxCells:maxCells-cellCount,maxWork:1000000-derivedWork,uv:entry.uv});derivedWork+=derived.work.units;cellCount+=derived.cells.length;cells.push(...derived.cells.map(c=>({ownerId:entry.instanceId,key:c.key,clip:c.clip,floorId:entry.placement.floorBindings.base,sector:[Math.floor(c.clip.min[0]/sectorSizeM),Math.floor(c.clip.min[1]/sectorSizeM)]})));}
      }
      if(!current())return null;
      const view=presenter.createTileArtProvider(THREE,projection,{maxTriangles,materialForInstance:({source})=>{
        const material=materials.skins[source.interior.skinId];if(!material)fail('UNBOUND_FINISH','/presentation','Bind the saved interior skin explicitly.');return material;
      },profileBindings:projection.entries.flatMap(e=>e.inspected.ports.map(p=>({profiles:p.profiles,boundaryMaterial:p.geometry.materialIntervals[0].material,material:materials.boundary}))),boundaryMaterial:materials.line,showBoundaries:true});
      const owned={...view,cellCount,cells,projection,dispose(){live.delete(owned);return view.dispose();}};live.add(owned);try{reside(owned);}catch(e){owned.dispose();throw e;}return owned;
    },
    attach(root,role){root.userData.smartTileRole=role;scene.add(root);},
    setFloor(id){floorId=id;for(const view of [...live])reside(view);}
  });
}
