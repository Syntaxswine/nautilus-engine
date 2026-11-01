import {copyPlainData,recordSlots,arraySlots} from './data.js';
import {tileSurfaceMesh,surfaceVertex} from './mesh.js';
import {artRefusal} from './prepare.js';
import {createCleanup} from './cleanup.js';
const clone=v=>JSON.parse(JSON.stringify(v));
const profilesEqual=(a,b)=>['surface','edge','material','border'].every(k=>a?.[k]?.id===b?.[k]?.id&&a?.[k]?.version===b?.[k]?.version);


export function createTileArtProvider(T,projection,options={}){
 const values=recordSlots(options,'PRESENTATION_OPTIONS',['materialForInstance','profileBindings','boundaryMaterial','showBoundaries','fieldPalette','maxTriangles']),materialForInstance=values.materialForInstance,boundaryMaterial=Object.hasOwn(values,'boundaryMaterial')?values.boundaryMaterial:null,showBoundaries=Object.hasOwn(values,'showBoundaries')?values.showBoundaries:false,maxTriangles=Object.hasOwn(values,'maxTriangles')?values.maxTriangles:200000,slots=arraySlots(Object.hasOwn(values,'profileBindings')?values.profileBindings:[]).map(v=>recordSlots(v,'PRESENTATION_OPTIONS',['profiles','boundaryMaterial','material'])),data=copyPlainData({palette:Object.hasOwn(values,'fieldPalette')?values.fieldPalette:{positive:[.65,.83,.55],negative:[.45,.68,.81]},bindings:slots.map(v=>({profiles:v.profiles,boundaryMaterial:v.boundaryMaterial}))},{code:'PRESENTATION_OPTIONS'}),fieldPalette=data.palette,profileBindings=slots.map((v,i)=>({...data.bindings[i],material:v.material}));
 if(!T?.ShapeUtils||!T.BufferGeometry||!T.Float32BufferAttribute||!T.Material||typeof materialForInstance!=='function')artRefusal('HOST_PRESENTATION','Supply one host Three namespace and borrowed material bindings.');
 const inspected=copyPlainData(projection);if(!inspected||typeof inspected!=='object'||Array.isArray(inspected)||inspected.kind!=='nautilus-tile-art-projection'||inspected.version!==1||inspected.compiled?.mode!=='layout')artRefusal('PROJECTION_VERSION','Use the actual-core prepared surface projection.');
 if(!fieldPalette||typeof fieldPalette!=='object'||Array.isArray(fieldPalette)||typeof showBoundaries!=='boolean'||!Array.isArray(profileBindings)||!Number.isSafeInteger(maxTriangles)||maxTriangles<1||maxTriangles>200000||showBoundaries&&!(boundaryMaterial instanceof T.Material)||!['positive','negative'].every(k=>Array.isArray(fieldPalette[k])&&fieldPalette[k].length===3&&fieldPalette[k].every(v=>Number.isFinite(v)&&v>=0&&v<=1)))artRefusal('PRESENTATION_OPTIONS','Use bounded triangles, RGB palette and a borrowed boundary material when visible.');
 const root=new T.Group(),owned=new Set(),nodes=new Set([root]),instances=new Map(),interfaces=[];let disposed=false,rootReleased=false,operation=null,totalTriangles=0,quantizationLimitedRefinements=0;
 const borrowed=m=>{if(!(m instanceof T.Material))artRefusal('MISSING_MATERIAL','Every declared surface/profile needs a material from the supplied host Three.');return m;};
 const binding=p=>{const found=profileBindings.find(b=>profilesEqual(b.profiles,p.profiles)&&b.boundaryMaterial?.id===p.geometry.materialIntervals[0].material.id&&b.boundaryMaterial?.version===p.geometry.materialIntervals[0].material.version);if(!found)artRefusal('UNBOUND_PROFILE','Bind every complete canonical surface/edge/material/border profile and boundary material explicitly.');return borrowed(found.material);};
 const ownGeometry=(value,g)=>{owned.add(g);value.owned.add(g);return g;},ownNode=(value,node)=>{nodes.add(node);value.nodes.add(node);return node;};
 function retire(id,cleanup){
  const value=instances.get(id);if(!value)return false;
  const geometries=[...value.owned],retiringNodes=[...value.nodes];
  // Transfer ownership/counters before native listeners can re-enter. The
  // detached snapshot is always exhausted; retries cannot decrement twice.
  instances.delete(id);totalTriangles-=value.triangles;quantizationLimitedRefinements-=value.refinements;
  value.owned.clear();value.nodes.clear();for(const g of geometries)owned.delete(g);for(const node of retiringNodes)nodes.delete(node);
  for(let i=interfaces.length-1;i>=0;i--)if(interfaces[i].instanceId===id)interfaces.splice(i,1);
  cleanup.release(retiringNodes,geometries);return true;
 }
 function drain(cleanup){
  if(!disposed)return;
  for(const id of [...instances.keys()])retire(id,cleanup);
  if(!rootReleased){rootReleased=true;const remainingNodes=[...nodes],remainingGeometry=[...owned];nodes.clear();owned.clear();interfaces.length=0;cleanup.release(remainingNodes,remainingGeometry);}
 }
 function enter(){if(operation)artRefusal('REENTRANT_LIFECYCLE','Nested removeInstance and setResident are refused; dispose latches intent.');}
 function run(name,task){
  enter();const cleanup=createCleanup(name);operation={name,cleanup};let result,caught=false,primary;
  try{result=task(cleanup);}catch(error){caught=true;primary=error;}
  try{drain(cleanup);cleanup.repair();}finally{operation=null;}
  return cleanup.finish(result,caught,primary);
 }
 const construction=createCleanup('construct');operation={name:'construct',cleanup:construction};
 try{
  for(const entry of inspected.entries){
   if(instances.has(entry.instanceId))artRefusal('DUPLICATE_INSTANCE','One instance ID cannot own two resource records.');
   const value={group:null,owned:new Set(),nodes:new Set(),triangles:0,refinements:0};instances.set(entry.instanceId,value);
   const group=ownNode(value,new T.Group()),model=tileSurfaceMesh(T,entry,{maxTriangles}),interior=borrowed(materialForInstance({instanceId:entry.instanceId,recipeId:entry.recipeId,source:clone(entry.source)})),portMaterials=new Map(entry.inspected.ports.map(p=>[p.id,binding(p)])),buckets=new Map();value.group=group;group.name='tile:'+entry.instanceId;if(entry.field&&[interior,...portMaterials.values()].some(m=>!m.vertexColors&&!m.isShaderMaterial))artRefusal('FIELD_PAINT_BINDING','Bind a vertex-colour or explicit field shader material for binary field presentation.');
   value.refinements=model.quantizationLimitedRefinements||0;value.triangles=model.triangles.length;quantizationLimitedRefinements+=value.refinements;totalTriangles+=value.triangles;if(totalTriangles>maxTriangles)artRefusal('ART_TRIANGLE_LIMIT','The chunk exceeds the aggregate triangle budget.');
   for(const face of model.triangles){const material=face.port?portMaterials.get(face.port.id):interior;let bucket=buckets.get(material);if(!bucket)buckets.set(material,bucket={positions:[],normals:[],uvs:[],colors:[],fields:[]});for(const p of [face.points[0],face.points[2],face.points[1]]){const v=surfaceVertex(model,p);bucket.positions.push(v.position[0],v.position[2],v.position[1]);bucket.normals.push(v.normal[0],v.normal[2],v.normal[1]);bucket.uvs.push(...v.uv);const t=entry.field?Math.max(0,Math.min(1,.5+v.field*.5)):0;bucket.colors.push(...(entry.field?fieldPalette.negative.map((a,i)=>a+(fieldPalette.positive[i]-a)*t):[1,1,1]));bucket.fields.push(v.field);}}
   for(const [material,b]of buckets){const g=ownGeometry(value,new T.BufferGeometry());for(const [name,values,size]of [['position',b.positions,3],['normal',b.normals,3],['uv',b.uvs,2],['color',b.colors,3],['tileField',b.fields,1]])g.setAttribute(name,new T.Float32BufferAttribute(values,size));g.computeBoundingSphere();const mesh=ownNode(value,new T.Mesh(g,material));mesh.name='tile-surface:'+entry.instanceId;mesh.userData={role:'canonical-surface',instanceId:entry.instanceId,recipeId:entry.recipeId};group.add(mesh);}
   // Separate edge attributes retain parameter tangents even at a corner where
   // two boundary parameters share one surface position. They never substitute
   // for the canonical samples referenced by the actual triangles above.
   for(const p of entry.inspected.ports){const g=ownGeometry(value,new T.BufferGeometry());const vector=(values,divisor)=>values.flatMap(v=>[v[0]/divisor,v[2]/divisor,v[1]/divisor]);g.setAttribute('position',new T.Float32BufferAttribute(vector(p.geometry.positions,1e6),3));g.setAttribute('normal',new T.Float32BufferAttribute(vector(p.geometry.normals,1e12),3));g.setAttribute('parameterTangent',new T.Float32BufferAttribute(vector(p.geometry.tangents,1e12),3));g.setAttribute('uv',new T.Float32BufferAttribute(p.geometry.uv.flat(),2));const record=clone(p),edge={instanceId:entry.instanceId,record,geometry:g,sampleIds:p.geometry.positions.map((_,i)=>entry.instanceId+'/'+p.id+'/'+i)};interfaces.push(edge);if(boundaryMaterial){const line=ownNode(value,new T.Line(g,boundaryMaterial));line.name='tile-interface:'+entry.instanceId+':'+p.id;line.visible=showBoundaries;line.userData={role:'canonical-interface',record};group.add(line);}}
   group.userData={instanceId:entry.instanceId,recipeId:entry.recipeId,contentDigest:entry.inspected.contentDigest,approximation:clone(entry.approximation)};root.add(group);
  }
 }catch(error){disposed=true;try{drain(construction);}finally{operation=null;}return construction.finish(undefined,true,error);}
 operation=null;
 const removeInstance=id=>{enter();if(disposed)return false;return run('removeInstance',cleanup=>retire(id,cleanup));};
 return {root,interfaces,inspection:inspected.compiled,statuses:inspected.statuses,diagnostics:()=>({disposed,instances:instances.size,interfaces:interfaces.length,ownedGeometry:owned.size,triangles:totalTriangles,quantizationLimitedRefinements,scope:'Native flat surfaces only; body/support/gameplay unbound'}),setResident(ids){enter();if(disposed)return;return run('setResident',()=>{const values=arraySlots(ids,128,'RESIDENT_IDS');if(values.some(id=>typeof id!=='string'))artRefusal('RESIDENT_IDS','Use a plain list of instance ID strings.');const resident=new Set(values);for(const [id,value]of instances)value.group.visible=resident.has(id);});},removeInstance,dispose(){if(disposed)return;disposed=true;if(!operation)return run('dispose',()=>{});}};
}
