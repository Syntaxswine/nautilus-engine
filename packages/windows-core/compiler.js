import {partIdentity} from '../parts-core/identity.js';
import {sha256} from '../parts-core/hash.js';
import {WINDOW_GEOMETRY_CONTRACT as C} from './contract.js';
import {data,fields,plain,finite,integer,id,bool,list,canonical,clone,freeze,fail} from './data.js';
const snapshots=new WeakMap(),EPS=1e-7;
const hash=value=>sha256(canonical(value));
export function windowEdges(placement,width){
  const horizontal=(placement.rotation??0)%180===0,along=horizontal?placement.x:placement.y,across=horizontal?placement.y:placement.x,start=along-(width-1)/2;
  if(!Number.isInteger(start)||!Number.isInteger(across-.5))fail('UNALIGNED_WINDOW','/placements','Windows must cover complete sector edges.');
  return Array.from({length:width},(_,i)=>horizontal?`s:${start+i}:${across-.5}`:`e:${across-.5}:${start+i}`);
}
function edgeId(edge,path){
  if(typeof edge!=='string'||! /^(s|e):-?(0|[1-9][0-9]*):-?(0|[1-9][0-9]*)$/.test(edge))fail('INVALID_EDGE',path,'Use a canonical ground s:x:y or e:x:y edge.');
  const [axis,x,y]=edge.split(':');integer(Number(x),-240,240,path);integer(Number(y),-240,240,path);
  if(edge!==`${axis}:${Number(x)}:${Number(y)}`)fail('INVALID_EDGE',path,'Noncanonical edge.');return edge;
}
function semantic(fact,path,hasEdge=true){
  fields(fact,hasEdge?['edge','semantic','locked','sourceKind','underlay']:['semantic','locked','sourceKind'],path,hasEdge?['edge','semantic','locked']:['semantic','locked']);
  if(hasEdge)edgeId(fact.edge,path+'/edge');if(!['empty','wall','door','window'].includes(fact.semantic))fail('INVALID_EDGE_FACT',path+'/semantic','Explicit semantic occupancy is required.');bool(fact.locked,path+'/locked');
  if(fact.sourceKind!==undefined)id(fact.sourceKind,path+'/sourceKind');if(hasEdge&&fact.underlay!==undefined)semantic(fact.underlay,path+'/underlay',false);
}
function vector(value,path){list(value,3,path);if(value.length!==3)fail('INVALID_BOUNDS',path,'Use three local coordinates.');value.forEach((n,i)=>finite(n,path+'/'+i));}
function definition(spec,request,path){
  fields(spec,['sourceCommit','version','id','joins','dimensions','width','height','bounds','panes','solids'],path);
  if(spec.sourceCommit!==C.sourceCommit||spec.version!==C.sourceVersion||spec.id!==request.id)fail('DEFINITION_MISMATCH',path,'Fixed definition identity/version must match.');
  fields(spec.joins,['left','right'],path+'/joins');for(const key of ['left','right'])if(spec.joins[key]!== (request.joins?.[key]??false))fail('DEFINITION_MISMATCH',path+'/joins','Definition must retain requested joins.');
  if(spec.dimensions!==null){fields(spec.dimensions,['width','height'],path+'/dimensions');if(spec.dimensions.width!==spec.width||spec.dimensions.height!==spec.height)fail('DEFINITION_MISMATCH',path+'/dimensions','Dimensions must match bounds.');}
  if(request.dimensions&&canonical(request.dimensions)!==canonical(spec.dimensions))fail('DEFINITION_MISMATCH',path+'/dimensions','Definition must retain requested metre dimensions.');
  integer(spec.width,1,240,path+'/width');finite(spec.height,path+'/height');fields(spec.bounds,['min','max'],path+'/bounds');vector(spec.bounds.min,path+'/bounds/min');vector(spec.bounds.max,path+'/bounds/max');
  if(spec.height<=0||Math.fround(spec.height)<=0||spec.bounds.min[1]!==0||spec.bounds.max[1]!==spec.height||Math.abs(spec.bounds.max[0]-spec.bounds.min[0]-spec.width)>EPS||spec.bounds.min.some((n,i)=>n>=spec.bounds.max[i]))fail('INVALID_BOUNDS',path+'/bounds','Use positive ground-anchored native bounds.');
  list(spec.panes,6,path+'/panes');list(spec.solids,8,path+'/solids');if(!spec.panes.length)fail('INVALID_DEFINITION',path+'/panes','At least one pane is required.');
  const ids=new Set(['passage']);
  for(const [group,parts] of [['panes',spec.panes],['solids',spec.solids]])for(const [index,part]of parts.entries()){
    const p=path+'/'+group+'/'+index;fields(part,group==='panes'?['id','min','max']:['id','role','min','max'],p);id(part.id,p+'/id',32);
    if(ids.has(part.id)||group==='panes'&&!/^r[01]c[012]$/.test(part.id)||group==='solids'&&!['frame','sill','mullion','lower-wall'].includes(part.role))fail('INVALID_MEMBER',p,'Member IDs must be unique with native pane IDs and solid roles.');ids.add(part.id);vector(part.min,p+'/min');vector(part.max,p+'/max');
    if(part.min.some((n,i)=>n>=part.max[i]||n<spec.bounds.min[i]-EPS||part.max[i]>spec.bounds.max[i]+EPS))fail('INVALID_BOUNDS',p,'Every member must be inside its native bounds.');
  }
}
export function transformBox(p,part){
  const r=(p.rotation??0)*Math.PI/180,c=Math.round(Math.cos(r)),s=Math.round(Math.sin(r)),points=[];
  for(const x of [part.min[0],part.max[0]])for(const z of [part.min[2],part.max[2]])points.push([p.x+c*x+s*z,p.y-s*x+c*z]);
  return {x0:Math.min(...points.map(v=>v[0])),x1:Math.max(...points.map(v=>v[0])),y0:Math.min(...points.map(v=>v[1])),y1:Math.max(...points.map(v=>v[1])),z0:part.min[1],height:part.max[1]};
}
function optionsData(options){
  if(!plain(options))fail('INVALID_OPTIONS','/options','Pass explicit definitions, world and semantic edge facts.');
  const descriptors=Object.getOwnPropertyDescriptors(options),keys=Reflect.ownKeys(descriptors);
  if(keys.length!==3||keys.some(key=>!['definitions','world','edgeFacts'].includes(key)||!Object.hasOwn(descriptors[key],'value')||!descriptors[key].enumerable))fail('INVALID_OPTIONS','/options','Use three own data properties.');
  const provider=descriptors.definitions.value;
  if(!plain(provider))fail('MISSING_DEFINITIONS','/definitions','Bind a fixed definition service.');
  const own=Object.getOwnPropertyDescriptors(provider);
  if(Reflect.ownKeys(own).length!==3||['sourceCommit','version','resolve'].some(key=>!own[key]||!Object.hasOwn(own[key],'value')||!own[key].enumerable)||own.sourceCommit.value!==C.sourceCommit||own.version.value!==C.sourceVersion||typeof own.resolve.value!=='function')fail('MISSING_DEFINITIONS','/definitions','Use the exact supported fixed source/version and resolve callback.');
  return {resolve:own.resolve.value,world:data(descriptors.world.value),edgeFacts:data(descriptors.edgeFacts.value)};
}
export function compileWindowPlacements(input,options){
  const document=data(input),{resolve,world,edgeFacts}=optionsData(options);
  fields(document,['kind','version','id','profileId','queryRevision','placements','bindings','observedBroken'],'');
  if(document.kind!=='nautilus-window-placement-document'||document.version!==1||document.profileId!==C.profileId)fail('UNSUPPORTED_WINDOW_PROFILE','/profileId','Use the version-1 bounded source placement document.');
  id(document.id,'/id');integer(document.queryRevision,0,Number.MAX_SAFE_INTEGER,'/queryRevision');
  fields(world,['id','floorId','grid'],'/world');id(world.id,'/world/id');if(world.floorId!=='ground')fail('UNSUPPORTED_FLOOR','/world/floorId','Only ground-anchored windows are supported.');fields(world.grid,['width','height'],'/world/grid');for(const k of ['width','height'])integer(world.grid[k],1,240,'/world/grid/'+k);
  list(edgeFacts,65536,'/edgeFacts');const facts=new Map();for(const [i,fact]of edgeFacts.entries()){semantic(fact,'/edgeFacts/'+i);if(facts.has(fact.edge))fail('DUPLICATE_EDGE_FACT','/edgeFacts/'+i,'An edge must have one current semantic fact.');facts.set(fact.edge,fact);}
  list(document.placements,C.maximumPlacements,'/placements');list(document.bindings,C.maximumPlacements,'/bindings');
  const bindings=new Map(),visuals=new Set();for(const [i,b]of document.bindings.entries()){fields(b,['placementId','engineInstanceId'],'/bindings/'+i);id(b.placementId,'/bindings/'+i+'/placementId');id(b.engineInstanceId,'/bindings/'+i+'/engineInstanceId',24);partIdentity(b.engineInstanceId,'visual','pane:r0c0');if(bindings.has(b.placementId)||visuals.has(b.engineInstanceId))fail('DUPLICATE_BINDING','/bindings/'+i,'Use distinct explicit source and visual bindings.');bindings.set(b.placementId,b.engineInstanceId);visuals.add(b.engineInstanceId);}
  if(!plain(document.observedBroken))fail('INVALID_BROKEN_MASK','/observedBroken','Supply an explicit host-observed broken-pane map, even when empty.');
  const ids=new Set(),covered=new Set(),content=[],members=[],resolvedDefinitions=[];
  for(const [i,p]of document.placements.entries()){
    const path='/placements/'+i;fields(p,['id','definitionId','x','y','z','rotation','joins','dimensions','finish','wall'],path,['id','definitionId','x','y']);id(p.id,path+'/id');id(p.definitionId,path+'/definitionId');finite(p.x,path+'/x');finite(p.y,path+'/y');
    if(!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,95}(?![\s\S])/.test(p.id))fail('INVALID_ID',path+'/id','Preserve a native source placement ID without slash aliases.');
    if(ids.has(p.id))fail('DUPLICATE_PLACEMENT',path+'/id','Placement IDs must be unique.');ids.add(p.id);
    if(p.z!==undefined&&p.z!==0)fail('UNSUPPORTED_FLOOR',path+'/z','Source z is a layer; only zero is supported.');
    if(p.rotation!==undefined&&![0,90,180,270].includes(p.rotation))fail('UNSUPPORTED_ROTATION',path+'/rotation','Use source quarter turns without scaling, tilt or reflection.');
    if(p.finish!==undefined&&!['steel','sage','ivory'].includes(p.finish)||p.wall!==undefined&&!['brick','concrete','corrugated'].includes(p.wall))fail('UNSUPPORTED_APPEARANCE',path,'Unsupported native finish/wall metadata.');
    if(p.joins!==undefined){fields(p.joins,['left','right'],path+'/joins',[]);for(const k of Object.keys(p.joins))bool(p.joins[k],path+'/joins/'+k);}
    if(p.dimensions!==undefined){fields(p.dimensions,['width','height'],path+'/dimensions');integer(p.dimensions.width,1,240,path+'/dimensions/width');finite(p.dimensions.height,path+'/dimensions/height');if(p.dimensions.height<=0)fail('UNSUPPORTED_DIMENSIONS',path+'/dimensions/height','Height must be positive.');}
    const engineInstanceId=bindings.get(p.id);if(!engineInstanceId)fail('MISSING_BINDING',path+'/id','Keep the original placement ID and provide a separate explicit short visual binding.');
    const request={id:p.definitionId,...(p.joins!==undefined?{joins:p.joins}:{}),...(p.dimensions!==undefined?{dimensions:p.dimensions}:{})};
    const spec=data(resolve(clone(request)));definition(spec,request,path+'/definition');resolvedDefinitions.push(spec);
    const edges=windowEdges(p,spec.width);for(const edge of edges){
      if(covered.has(edge))fail('OVERLAPPING_WINDOWS',path,'Covered edges cannot overlap.');covered.add(edge);
      const fact=facts.get(edge);if(!fact)fail('MISSING_EDGE_FACT',path,'Supply semantic occupancy for '+edge+'.');
      if(fact.semantic==='door'||fact.locked||fact.underlay?.semantic==='door'||fact.underlay?.locked)fail('WINDOW_DOOR_CONFLICT',path,'Covered edges/underlays cannot contain any door family or lock.');
      if(fact.semantic==='window')fail('WINDOW_EDGE_CONFLICT',path,'A different retained window occupies this edge.');
    }
    const footprint=transformBox(p,spec.bounds);if(footprint.x0<-.61||footprint.y0<-.61||footprint.x1>world.grid.width-.39||footprint.y1>world.grid.height-.39)fail('WINDOW_OUTSIDE_WORLD',path,'Native bounds exceed the source map margin.');
    // The reviewed definition digest uses this ordered compact wire shape,
    // independently of property insertion order in a provider's loan.
    const compact={sourceCommit:spec.sourceCommit,version:spec.version,id:spec.id,joins:{left:spec.joins.left,right:spec.joins.right},dimensions:spec.dimensions===null?null:{width:spec.dimensions.width,height:spec.dimensions.height},width:spec.width,height:spec.height,bounds:{min:spec.bounds.min,max:spec.bounds.max},panes:spec.panes.map(part=>({id:part.id,min:part.min,max:part.max})),solids:spec.solids.map(part=>({id:part.id,role:part.role,min:part.min,max:part.max}))};
    const definitionDigest=sha256(JSON.stringify(compact)),broken=Object.hasOwn(document.observedBroken,p.id)?document.observedBroken[p.id]:[];
    list(broken,6,'/observedBroken/'+p.id);if(new Set(broken).size!==broken.length||broken.some(pane=>!spec.panes.some(v=>v.id===pane)))fail('UNKNOWN_PANE','/observedBroken/'+p.id,'Broken masks must name distinct current panes.');
    content.push({placementId:p.id,definitionId:p.definitionId,definitionDigest,engineInstanceId,coveredEdges:edges,panes:spec.panes.map(pane=>({paneId:pane.id,visualId:partIdentity(engineInstanceId,'visual','pane:'+pane.id)})),solids:spec.solids.map(part=>({partId:part.id,role:part.role})),bounds:spec.bounds});
    const add=(part,kind)=>members.push({id:JSON.stringify(['window-member-v1',document.id,p.id,part.id]),placementId:p.id,partId:part.id,paneId:kind==='glass'?part.id:null,kind,role:part.role??null,definitionDigest,sourceOrder:members.length,bounds:transformBox(p,part)});
    add({id:'passage',role:'window-passage',min:[spec.bounds.min[0],0,-.08],max:[spec.bounds.max[0],spec.height,.08]},'prop');
    spec.solids.forEach(part=>add(part,'wall'));spec.panes.filter(part=>!broken.includes(part.id)).forEach(part=>add(part,'glass'));
  }
  if(bindings.size!==ids.size||[...bindings.keys()].some(key=>!ids.has(key)))fail('UNKNOWN_BINDING','/bindings','Every binding must name exactly one placement.');
  for(const key of Object.keys(document.observedBroken))if(!ids.has(key))fail('UNKNOWN_PLACEMENT','/observedBroken/'+key,'Broken masks must name a current placement.');
  const contentDigest=hash({profileId:C.profileId,sourceCommit:C.sourceCommit,grid:world.grid,placements:document.placements,content});
  const geometryDigest=hash({contentDigest,document,world,edgeFacts,members});
  // Aggregate prospective snapshot budget, before any handle can be accepted.
  data({kind:'nautilus-window-geometry-snapshot',version:1,document,world,edgeFacts,resolvedDefinitions,contentDigest,geometryDigest});
  const compiled=Object.freeze({kind:C.kind,version:1,sceneId:document.id,worldId:world.id,profileId:C.profileId,contentDigest,geometryDigest,queryRevision:document.queryRevision});
  snapshots.set(compiled,freeze({document,world,edgeFacts,resolvedDefinitions,content,members,coveredEdges:[...covered]}));return compiled;
}
export function readCompiled(compiled){const snapshot=snapshots.get(compiled);if(!snapshot)fail('INVALID_COMPILED_GEOMETRY','/compiled','Use a handle returned by compile/open in this module instance.');return snapshot;}
export function inspectWindowGeometry(compiled){return clone({...compiled,...readCompiled(compiled)});}
export function serializeWindowGeometry(compiled){const s=readCompiled(compiled);return JSON.stringify({kind:'nautilus-window-geometry-snapshot',version:1,document:s.document,world:s.world,edgeFacts:s.edgeFacts,resolvedDefinitions:s.resolvedDefinitions,contentDigest:compiled.contentDigest,geometryDigest:compiled.geometryDigest});}
export function openWindowGeometry(input,options){
  if(!plain(options))fail('INVALID_OPTIONS','/options','Bind the fixed definition service for prospective validation.');
  const descriptors=Object.getOwnPropertyDescriptors(options);
  if(Reflect.ownKeys(descriptors).length!==1||!descriptors.definitions||!descriptors.definitions.enumerable||!Object.hasOwn(descriptors.definitions,'value'))fail('INVALID_OPTIONS','/options','Use one own definitions data property.');
  const definitions=descriptors.definitions.value;
  const s=data(input);fields(s,['kind','version','document','world','edgeFacts','resolvedDefinitions','contentDigest','geometryDigest'],'');if(s.kind!=='nautilus-window-geometry-snapshot'||s.version!==1)fail('UNSUPPORTED_SNAPSHOT','/kind','Use a complete geometry snapshot v1.');
  const compiled=compileWindowPlacements(s.document,{definitions,world:s.world,edgeFacts:s.edgeFacts});
  if(s.contentDigest!==compiled.contentDigest||s.geometryDigest!==compiled.geometryDigest||canonical(s.resolvedDefinitions)!==canonical(readCompiled(compiled).resolvedDefinitions))fail('CONTENT_MISMATCH','/','Prospective definitions, geometry and digest must agree before adoption.');return compiled;
}
