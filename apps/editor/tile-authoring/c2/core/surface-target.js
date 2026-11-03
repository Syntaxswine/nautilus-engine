// Private data-only first-surface producer frozen by Architect from 6d30535.
// No surface insertion, operation, retained authority or presentation work.
import grammar from './surface-target.schema.json' with {type:'json'};
import {Budget,readData,corePort,fields,shape,fail,hash,equal,freeze,compileSource} from './data.js';
import {jsonBytes} from './budget.js';
import {validateDocument} from './model.js';
import {documentLimits} from './stage-b-limits.js';
import {validateAppearanceDocument,supportedRecord,sourceSurface} from './operations.js';
const schema=freeze(grammar);
const inputFields=['document','expectedSource','selection','limits'];
const limitFields=['sourceBytes','outputBytes','inputBytes','plannerUnits','nodes','depth'];
function finish(data,b){
 const tooLarge=()=>fail('AUTHORING_OUTPUT_LIMIT','/surfaceTarget','The complete final returned data and work exceed effective output bytes.');
 const measure=value=>{try{return jsonBytes(value,b.limits.outputBytes);}catch(e){if(e.code==='AUTHORING_BYTES_LIMIT')tooLarge();throw e;}};
 const fixedBytes=measure({...data,work:null})-4;
 let output=0,charge=0;
 for(let attempt=0;attempt<16;attempt++){
  b.take();
  const work={...b.snapshot(),unitsCharged:b.units+charge,outputBytes:output};
  const nextOutput=fixedBytes+measure(work),nextCharge=Math.ceil(nextOutput/64);
  if(nextOutput>b.limits.outputBytes)tooLarge();
  if(nextOutput===output&&nextCharge===charge){b.take(charge);b.outputBytes=output;return freeze({...data,work:b.snapshot()});}
  output=nextOutput;charge=nextCharge;
 }
 fail('SURFACE_TARGET_OUTPUT_ACCOUNTING','/surfaceTarget','The finite final output/work accounting did not stabilize.');
}
export function deriveTileSurfaceTarget(actual,input){
 // Inspect descriptors through the existing strict reader before touching data.
 fields(input,inputFields,'/surfaceTarget',['document','expectedSource','selection']);
 const b=new Budget(),v=readData(input,b,b.limits.inputBytes),t=corePort(actual);
 fields(v.limits??{},limitFields,'/limits',[]);
 Object.assign(b.limits,new Budget(v.limits??{}).limits);b.take(0);b.input(0);
 if(b.nodes>b.limits.nodes||(b.maxDepthObserved??0)>b.limits.depth)fail('AUTHORING_NODE_LIMIT','/surfaceTarget','Effective input nodes/depth exceeded.');
 b.take(Math.ceil(jsonBytes(v.document,b.limits.sourceBytes)/64));
 shape(t,'SurfaceTargetInput',v,b,schema);
 const d=v.document,sourceDocumentDigest=hash(t,d,b);
 if(sourceDocumentDigest!==v.expectedSource.hostDocumentDigest||d.contentRevision!==v.expectedSource.workspaceRevision)fail('SURFACE_TARGET_STALE_SOURCE','/expectedSource','The complete document/revision differs from the captured source.');
 const idx=validateDocument(t,d,b);documentLimits(d,b);validateAppearanceDocument(t,d,b);
 for(const record of idx.all.values()){b.take();supportedRecord(t,record,b);}
 const find=(items,test)=>{for(const item of items){b.take();if(test(item))return item;}return null;};
 const selected=v.selection,o=find(d.tileBundle.layout.instances,x=>x.id===selected.ownerId),ownerPin=find(d.authoring.ownerPins,x=>x.ownerId===selected.ownerId);
 if(!o||!ownerPin)fail('SURFACE_TARGET_UNSUPPORTED','/selection/ownerId','Select one actual placed owner with its current immutable definition pin.');
 if(!equal(t,ownerPin.definition,selected.definition,b))fail('SURFACE_TARGET_STALE_PIN','/selection/definition','The selected definition pin is not the exact current owner pin.');
 if(o.locked)fail('LOCK_CONFLICT','/selection/ownerId','The whole owner is locked.');
 const def=idx.resolve(ownerPin.definition,'nautilus-recipe-definition'),surface=find(def.body.surfaces,x=>x.id===selected.surfaceId);
 if(!surface)fail('SURFACE_TARGET_UNSUPPORTED','/selection/surfaceId','The exact selected semantic source surface is absent.');
 const primary=def.body.recipe.reservations[0],floorId=o.floorBindings[surface.floorSlot],floor=find(d.floorBinding.floors,x=>x.id===floorId);
 if(surface.floorSlot!==primary.floorSlot||Object.keys(o.floorBindings).length!==1||!floor||o.origin[2]!==floor.elevationM||surface.floorOffsetM!==0||surface.originM[2]!==0)fail('SURFACE_TARGET_UNSUPPORTED','/selection','Use the current supported level rectangle surface and its exact native floor/elevation.');
 if(compileSource(t,def.body.recipe,b).contentDigest!==o.contentDigest)fail('SURFACE_TARGET_STALE_PIN','/selection/definition','The placed instance must bind the complete current compiled recipe.');
 const domain={ownerId:o.id,surfaceId:surface.id,floorId,geometryDigest:surface.geometryDigest,frameDigest:surface.frameDigest,gridDigest:hash(t,surface.grid,b)};
 const target={ownerId:o.id,surfaceId:surface.id,floorId,bindingDigest:hash(t,domain,b)};
 const {binding}=sourceSurface(t,d,target,b,{editable:true});
 const existingBinding=find(d.authoring.decorations.surfaces,x=>x.ownerId===o.id&&x.surfaceId===surface.id&&x.floorId===floorId);
 let bindingSeed=binding;
 if(existingBinding){const {layers,...savedSeed}=existingBinding;if(!equal(t,savedSeed,binding,b))fail('SURFACE_TARGET_UNSUPPORTED','/surfaceTarget','Preserve the exact validated existing binding.');bindingSeed=savedSeed;}
 const result={kind:'nautilus-tile-authoring-surface-target',version:1,ok:true,committable:false,sourceDocumentDigest,workspaceRevision:d.contentRevision,surface,bindingSeed,target,grid:{id:surface.grid.id,version:surface.grid.version,digest:domain.gridDigest},state:existingBinding?'existing':'prospective',existingBinding,work:b.snapshot()};
 shape(t,existingBinding?'ExistingSurfaceTarget':'ProspectiveSurfaceTarget',result,b,schema);
 const {work,...data}=result;return finish(data,b);
}
