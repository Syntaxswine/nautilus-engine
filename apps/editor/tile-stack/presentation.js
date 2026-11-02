import {smartTileData,fields,fail} from '../smart-tile/checkpoint.js';

// The capability is issued only by this actual native presenter. A resource-only
// headless view fixture cannot accidentally advertise native inspection.
const inspectionPorts=new WeakMap();
export const nativeInspectionPort=presentation=>inspectionPorts.get(presentation)??null;
const clone=structuredClone;
export function createTileStackPresentation({tiles,art,presenter,finishes,finishMetadata,THREE:T,scene,floors,sectorSizeM,atlasLease,baseLease}){
 if(!Number.isSafeInteger(sectorSizeM)||sectorSizeM<1||!Array.isArray(floors)||floors.length!==15||new Set(floors.map(f=>f.id)).size!==15)fail('STACK_PRESENTATION_BINDING','/presentation','Supply the actual fifteen native floors and source-map sector size.');
 const table=smartTileData(floors),atlas=atlasLease?.value,base=baseLease?.value,proof=smartTileData(atlasLease?.proof),catalogue=finishMetadata.tileFinishCatalogue();
 if(proof.id!==catalogue.atlas.id||proof.path!==catalogue.atlas.path||proof.sha256!==catalogue.atlas.sha256||proof.bytes!==catalogue.atlas.bytes||![atlasLease,baseLease].every(l=>typeof l?.release==='function'&&typeof l?.diagnostics==='function'&&l.diagnostics().released===false))fail('STACK_RESOURCE_LEASE','/presentation','Bind verified atlas bytes and live host-owned atlas/base leases.');
 const pool=finishes.createTileFinishPool({THREE:T,atlas,maxMaterials:64}),live=new Set(),retirementErrors=[];
 let drawingFloorId=table[0].id,inspection={mode:'selected-floor',cutawayFloorId:null},closing=false,atlasReleased=false,baseReleased=false,poolAttempted=false,poolRetiring=false,poolUnverified=false,poolReservation=0;
 const report=e=>{if(retirementErrors.length<32)retirementErrors.push(typeof e?.code==='string'?e.code:'STACK_PRESENTATION_CLEANUP');};
 const chargePool=()=>{poolReservation=Math.max(poolReservation,pool.diagnostics().ownedMaterials);};
 const poolSnapshot=()=>{const d=pool.diagnostics(),pending=poolRetiring||d.closed&&[...live].some(view=>view.appearanceRetiring);return poolUnverified||pending?{...d,disposed:false,ownedMaterials:Math.max(d.ownedMaterials,poolReservation),logicalOwnedMaterials:d.ownedMaterials,...(poolUnverified?{unverifiedMaterials:poolReservation}:{retiringMaterials:poolReservation})}:d;};
 function drain(){
  if(!closing||poolRetiring||[...live].some(view=>!view.retiring))return;
  // A retiring view can remain charged after its logical counters reach zero.
  // Still exhaust the pool, but never turn a thrown/no-op disposal into a
  // settlement receipt or release the borrowed dependencies behind that debt.
  if(!poolAttempted){chargePool();poolAttempted=true;poolRetiring=true;try{pool.dispose();}catch(e){poolUnverified=true;report(e);}finally{poolRetiring=false;}}
  const d=pool.diagnostics();if(live.size||poolUnverified||!d.disposed||d.leases!==0||d.ownedMaterials!==0)return;
  for(const [lease,released,mark]of [[atlasLease,atlasReleased,()=>{atlasReleased=true;}],[baseLease,baseReleased,()=>{baseReleased=true;}]])if(!released){try{lease.release();if(lease.diagnostics().released===true)mark();else report({code:'STACK_LEASE_RELEASE_UNVERIFIED'});}catch(e){report(e);}}
 }
 const visibleFloor=id=>inspection.mode==='overview'||inspection.mode==='selected-floor'&&id===drawingFloorId||inspection.mode==='cutaway'&&table.find(f=>f.id===id).elevationM<=table.find(f=>f.id===inspection.cutawayFloorId).elevationM;
 const reside=view=>{if(!view.retiring)view.native.setResident(view.projection.entries.filter(e=>visibleFloor(e.placement.floorBindings.base)).map(e=>e.instanceId));};
 function validateInspection(input){
  const next=smartTileData(input);fields(next,['mode','cutawayFloorId'],'/inspection');
  if(!['selected-floor','overview','cutaway'].includes(next.mode)||(next.mode==='cutaway'?!table.some(f=>f.id===next.cutawayFloorId):next.cutawayFloorId!==null))fail('STACK_INSPECTION','/inspection','Choose an explicit selected-floor, overview, or declared cutaway floor.');
  return Object.freeze(next);
 }
 function acquire(bundle,{maxTriangles,maxCells,current}){
  if(closing)fail('STACK_PRESENTATION_RETIRED','/presentation','The native presenter is retiring.');
  const projection=art.prepareTileArt(tiles,bundle,{detail:0,maxInstances:32});let cellCount=0,derivedWork=0;const cells=[];
  for(const entry of projection.entries){
   const points=entry.loops.flat(),min=[0,1].map(k=>Math.floor(Math.min(...points.map(p=>p[k])))),max=[0,1].map(k=>Math.ceil(Math.max(...points.map(p=>p[k]))));
   if(points.some(p=>!entry.inspected.reservations.some(r=>p.every((v,k)=>v>=r.min[k]/1e6-1e-6&&v<=r.max[k]/1e6+1e-6))))fail('ART_OUTSIDE_RESERVATION','/presentation','Retain original source controls; the actual rendered envelope requires a reviewed reservation.');
   const count=(max[0]-min[0])*(max[1]-min[1]);if(count+cellCount>maxCells)fail('AGGREGATE_CELL_BUDGET','/presentation','All accepted/candidate/retiring native windows share the same cell budget.');
   if(count){if(derivedWork>=1000000)fail('DERIVED_WORK_LIMIT','/presentation','The complete native view exhausted its derived-work allowance.');
    const derived=tiles.deriveTileCells(entry.source,{placement:entry.placement,floors:bundle.layout.floors,floorId:entry.placement.floorBindings.base,channel:'surface',layerId:'ground',boundaryProfile:{id:'border.flat',version:1},cellSizeM:1,window:{min,max},borderSegments:1,curveSampling:{segmentsPerPart:32,maxChordErrorM:.01,maxSegmentM:4,maxWork:65536},maxCells:maxCells-cellCount,maxWork:1000000-derivedWork,uv:entry.uv});
    derivedWork+=derived.work.units;cellCount+=derived.cells.length;cells.push(...derived.cells.map(c=>({ownerId:entry.instanceId,key:c.key,clip:c.clip,floorId:entry.placement.floorBindings.base,sector:[Math.floor(c.clip.min[0]/sectorSizeM),Math.floor(c.clip.min[1]/sectorSizeM)]})));
   }
  }
  if(!current())return null;
  const native=presenter.createTileArtProvider(T,projection,{maxTriangles,materialForInstance:()=>base,profileBindings:projection.entries.flatMap(e=>e.inspected.ports.map(p=>({profiles:p.profiles,boundaryMaterial:p.geometry.materialIntervals[0].material,material:base}))),showBoundaries:false});
  const reservation=native.diagnostics();let appearance=null,constructionError=null,retiring=false,appearanceUnverified=false,geometryUnverified=false,appearanceSettled=false,geometrySettled=false;
  const owned={native,root:native.root,cellCount,cells,projection,get retiring(){return retiring;},get appearanceRetiring(){return retiring&&!appearanceSettled&&!appearanceUnverified;},
   diagnostics(){
    // Return the resource record even when binding failed: the one coordinator
    // first adopts it, then exhausts and verifies both retirement domains.
    if(constructionError&&!retiring)throw constructionError;
    const geometry=native.diagnostics(),paint=appearance?.diagnostics()??{disposed:true,owners:0,bindings:0};
    const unverified=appearanceUnverified||geometryUnverified,settled=retiring&&!unverified&&appearanceSettled&&geometrySettled;
    return {...geometry,disposed:settled,appearance:paint,retirement:{appearance:appearanceUnverified?'unverified':appearanceSettled?'settled':retiring?'retiring':'active',geometry:geometryUnverified?'unverified':geometrySettled?'settled':retiring?'retiring':'active',reservedGeometry:retiring&&!geometrySettled?reservation.ownedGeometry:geometry.ownedGeometry,reservedTriangles:retiring&&!settled?reservation.triangles:geometry.triangles,reservedCells:retiring&&!settled?cellCount:0}};
   },
   dispose(){
    if(retiring)return;retiring=true;const errors=[];
    chargePool();
    try{appearance?.dispose();appearanceSettled=!appearance||appearance.diagnostics().disposed===true;if(!appearanceSettled)appearanceUnverified=true;}catch(e){appearanceUnverified=true;if(pool.diagnostics().closed)poolUnverified=true;errors.push(e);report(e);}
    try{native.dispose();const d=native.diagnostics();geometrySettled=d.disposed===true&&d.ownedGeometry===0;if(!geometrySettled)geometryUnverified=true;}catch(e){geometryUnverified=true;errors.push(e);report(e);}
    // Failure flags are monotonic. Public logical counters and a later no-op
    // dispose do not attest delivery of native cleanup listeners/receipts.
    if(appearanceSettled&&geometrySettled&&!appearanceUnverified&&!geometryUnverified)live.delete(owned);drain();
    if(errors.length)throw new AggregateError(errors,'Native appearance and geometry cleanup were both attempted.');
   }
  };
  live.add(owned);
  try{
   if(projection.entries.length){const choices=Object.fromEntries(projection.entries.map(e=>[e.instanceId,{skinId:e.source.interior.skinId,version:1,variantSeed:e.source.interior.variantSeed}]));appearance=finishes.bindTileFinishView({view:native,projection,choices,pool,current});}
   reside(owned);
  }catch(e){constructionError=e;}
  return owned;
 }
 const api=Object.freeze({acquire,
  attach(root,role){if(closing)fail('STACK_PRESENTATION_RETIRED','/presentation','A retiring presenter cannot attach.');root.userData.smartTileRole=role;scene.add(root);},
  setFloor(id){if(!table.some(f=>f.id===id))fail('UNKNOWN_FLOOR','/presentation/floorId','Select one declared native drawing floor.');drawingFloorId=id;for(const view of live)reside(view);},
  hitOwner(raycaster){for(const view of live)if(!view.retiring&&view.root.visible&&view.root.userData.smartTileRole==='accepted'){const meshes=view.root.children.filter(g=>g.visible).flatMap(g=>g.children.filter(n=>n.isMesh)),hit=raycaster.intersectObjects(meshes,false)[0];if(hit){const id=hit.object.userData.instanceId,entry=view.projection.entries.find(e=>e.instanceId===id),floorId=entry.placement.floorBindings.base;if(view.cells.some(c=>c.ownerId===id&&c.floorId===floorId&&hit.point.x>=c.clip.min[0]-1e-6&&hit.point.x<=c.clip.max[0]+1e-6&&hit.point.z>=c.clip.min[1]-1e-6&&hit.point.z<=c.clip.max[1]+1e-6))return id;}}return null;},
  bounds(){const box=new T.Box3();for(const view of live)if(!view.retiring&&view.root.visible)for(const group of view.root.children)if(group.visible)box.expandByObject(group);return box;},
  snapshot(){return clone({drawingFloorId,inspection,pool:poolSnapshot(),resources:{closing,atlasReleased,baseReleased,retirementErrors},views:[...live].map(v=>({role:v.root.userData.smartTileRole,visible:v.root.visible,retiring:v.retiring,provider:v.diagnostics(),cellCount:v.cellCount,cells:v.cells,instances:v.root.children.map(g=>({id:g.userData.instanceId,visible:g.visible,recipeId:g.userData.recipeId,floorId:v.projection.entries.find(e=>e.instanceId===g.userData.instanceId).placement.floorBindings.base,finishId:v.projection.entries.find(e=>e.instanceId===g.userData.instanceId).source.interior.skinId,meshes:g.children.filter(n=>n.isMesh).map(m=>{const positions=m.geometry.attributes.position;let lo=Infinity,hi=-Infinity;for(let i=0;i<positions.count;i++){const h=positions.getY(i);lo=Math.min(lo,h);hi=Math.max(hi,h);}return {vertices:positions.count,heightRangeM:[lo,hi],materialType:m.material.type,finishId:m.material.userData?.skinId??null};})}))}))});},
  dispose(){if(closing)return;closing=true;for(const view of [...live])try{view.dispose();}catch(e){report(e);}drain();}
 });
 inspectionPorts.set(api,Object.freeze({isLive:()=>!closing,validate:validateInspection,get:()=>clone(inspection),set(next){if(closing)fail('STACK_PRESENTATION_RETIRED','/inspection','A retiring presenter cannot inspect.');inspection=validateInspection(next);for(const view of live)reside(view);}}));return api;
}
