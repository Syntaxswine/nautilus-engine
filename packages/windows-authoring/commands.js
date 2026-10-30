import {WINDOW_GEOMETRY_CONTRACT as C} from '../windows-core/index.js';
import {FARMYARD_WINDOW_DEFINITIONS,farmyardStoreysToMetres} from '../adapters/farmyard/windows.js';
import {boundedData,fields,finite,integer,fail} from './data.js';
import {openWindowAuthoring,readPrepared,protectCoveredBaseEdges} from './prepare.js';

export function createWindowAuthoring(input) {
  const options=boundedData(input);fields(options,['id','worldId','baseBlueprint','placements','bindings'],'/options',['id','worldId','baseBlueprint']);
  return openWindowAuthoring({kind:'nautilus-window-authoring',version:1,id:options.id,worldId:options.worldId,profileId:C.profileId,definitions:{sourceCommit:C.sourceCommit,version:C.sourceVersion},baseBlueprint:options.baseBlueprint,placements:Object.hasOwn(options,'placements')?options.placements:[],bindings:Object.hasOwn(options,'bindings')?options.bindings:[]});
}
export function windowAuthoringDimensions(width,height,unit='metres') {
  integer(width,1,240,'/width');finite(height,'/height');if(height<=0||!['metres','storeys'].includes(unit))fail('AUTHORING_INVALID_DIMENSIONS','/height','Use positive height with explicit metres or storeys.');
  const result={width,height:unit==='storeys'?farmyardStoreysToMetres(height):height};
  FARMYARD_WINDOW_DEFINITIONS.resolve({id:'window.full.borderless',dimensions:result});return result;
}
export function windowPlacementAtEdge(input) {
  const request=boundedData(input);fields(request,['id','definitionId','edge','rotation','dimensions','joins','finish','wall'],'',['id','definitionId','edge']);
  const match=/^([es]):(0|[1-9][0-9]*):(0|[1-9][0-9]*)(?![\s\S])/.exec(request.edge);
  if(!match)fail('AUTHORING_INVALID_EDGE','/edge','Use a canonical ground s:x:y or e:x:y edge.');
  const [,axis,xs,ys]=match,x=Number(xs),y=Number(ys),rotation=Object.hasOwn(request,'rotation')?request.rotation:axis==='s'?0:90;
  if(![0,90,180,270].includes(rotation)||(rotation%180===0)!==(axis==='s'))fail('AUTHORING_UNSUPPORTED_ROTATION','/rotation','The explicit quarter turn must follow the chosen edge axis.');
  const spec=FARMYARD_WINDOW_DEFINITIONS.resolve({id:request.definitionId,...(request.dimensions!==undefined?{dimensions:request.dimensions}:{}),...(request.joins!==undefined?{joins:request.joins}:{})});
  const {edge,...metadata}=request;return {...metadata,x:x+(axis==='s'?(spec.width-1)/2:.5),y:y+(axis==='e'?(spec.width-1)/2:.5),rotation};
}
export function commandCandidate(previous,input) {
  const command=boundedData(input),source=readPrepared(previous).document,next=structuredClone(source);
  if(!command||typeof command!=='object')fail('AUTHORING_INVALID_COMMAND','/command','Supply an explicit authoring command.');
  const index=()=>{const found=next.placements.findIndex(p=>p.id===command.placementId);if(found<0)fail('AUTHORING_UNKNOWN_PLACEMENT','/command/placementId','Select an existing placement.');return found;};
  if(command.kind==='place') {
    fields(command,['kind','placement','engineInstanceId'],'/command');next.placements.push(command.placement);next.bindings.push({placementId:command.placement.id,engineInstanceId:command.engineInstanceId});
  } else if(command.kind==='remove') {
    fields(command,['kind','placementId'],'/command');next.placements.splice(index(),1);next.bindings=next.bindings.filter(b=>b.placementId!==command.placementId);
  } else if(command.kind==='move') {
    fields(command,['kind','placementId','x','y'],'/command');finite(command.x,'/command/x');finite(command.y,'/command/y');Object.assign(next.placements[index()],{x:command.x,y:command.y});
  } else if(command.kind==='quarter-turn') {
    fields(command,['kind','placementId','turns','pivot'],'/command');integer(command.turns,1,3,'/command/turns');fields(command.pivot,['x','y'],'/command/pivot');finite(command.pivot.x,'/command/pivot/x');finite(command.pivot.y,'/command/pivot/y');
    const placement=next.placements[index()],dx=placement.x-command.pivot.x,dy=placement.y-command.pivot.y;
    const [x,y]=command.turns===1?[dy,-dx]:command.turns===2?[-dx,-dy]:[-dy,dx];
    Object.assign(placement,{x:command.pivot.x+x,y:command.pivot.y+y,rotation:((placement.rotation??0)+command.turns*90)%360});
  } else if(command.kind==='copy') {
    fields(command,['kind','placementId','newPlacementId','engineInstanceId','x','y','rotation'],'/command',['kind','placementId','newPlacementId','engineInstanceId','x','y']);
    finite(command.x,'/command/x');finite(command.y,'/command/y');const placement={...next.placements[index()],id:command.newPlacementId,x:command.x,y:command.y};if(command.rotation!==undefined)placement.rotation=command.rotation;
    next.placements.push(placement);next.bindings.push({placementId:command.newPlacementId,engineInstanceId:command.engineInstanceId});
  } else if(command.kind==='configure') {
    const keys=['dimensions','joins','finish','wall'];fields(command,['kind','placementId',...keys],'/command',['kind','placementId']);
    if(!keys.some(key=>Object.hasOwn(command,key)))fail('AUTHORING_EMPTY_COMMAND','/command','Specify a supported dimension, join or appearance setting.');
    const placement=next.placements[index()];for(const key of keys)if(Object.hasOwn(command,key))placement[key]=command[key];
  } else if(command.kind==='replace-base') {
    fields(command,['kind','baseBlueprint'],'/command');protectCoveredBaseEdges(previous,command.baseBlueprint);next.baseBlueprint=command.baseBlueprint;
  } else fail('AUTHORING_UNSUPPORTED_COMMAND','/command/kind','Use place, remove, move, quarter-turn, copy, configure or protected replace-base.');
  return next;
}
