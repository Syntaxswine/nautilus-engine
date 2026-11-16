import {VEHICLE_BODIES,VEHICLE_FINISHES,roadVehicle} from '../vehicle-core/catalogue.js';
import {loadVehicleSkin} from './skin.js';
const source='../../vendor/nautilus-road-vehicles/5d8962e7764bce3fcfff8f4dfd4883bfec97b0ee/packages/vehicle-visuals/skins/';
const abortError=()=>Object.assign(Error('Vehicle preparation cancelled.'),{name:'AbortError'});
export const vehicleTextureURL=(id,profile)=>new URL(profile==='full'?source+id+'.png':'./skins/game/'+id+'.png',import.meta.url).href;
export function createLegacyRoadVehicleKit(T,options={}){let kit,disposed=false;const ready=import('./legacy.js').then(module=>{if(disposed)throw abortError();kit=module.createRoadVehicleKit(T,options);return kit.ready;}).catch(e=>{kit?.dispose();throw e;});ready.catch(()=>{});const create=(...args)=>{if(!kit||disposed)throw Error('VEHICLE_NOT_READY: await legacy kit.ready.');return kit.create(...args);};return {ready,create,build:create,get skinsAvailable(){return kit?.skinsAvailable||false;},compatibility:'all-bodies-v1',dispose(){disposed=true;kit?.dispose();}};}
function decode(text,Type){const raw=atob(text),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);return new Type(bytes.buffer);}
function reduced(T,row){const parts=new Map();for(const [name,data]of Object.entries(row)){const g=new T.BufferGeometry();for(const [key,size]of [['position',3],['normal',3],['uv',2]])g.setAttribute(key,new T.BufferAttribute(decode(data[key],Float32Array),size));g.setIndex(new T.BufferAttribute(decode(data.index,Uint16Array),1));g.computeBoundingBox();g.computeBoundingSphere();parts.set(name,g);}return parts;}
/** Partition disconnected approved gear surfaces, preserving every triangle and
 * shared position/normal/UV buffers. Arches/mirrors/chassis remain fixed.
 */
export function splitRunningGear(T,geometry,body){
 const p=geometry.attributes.position,index=geometry.index.array,parent=Array.from({length:p.count},(_,i)=>i),find=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;},union=(a,b)=>{parent[find(a)]=find(b);};
 for(let i=0;i<index.length;i+=3){union(index[i],index[i+1]);union(index[i],index[i+2]);}
 const components=new Map();for(const v of index){const key=find(v);if(!components.has(key))components.set(key,new Set());components.get(key).add(v);}
 const wheelSpecs=body.axlesM.flatMap((z,axle)=>[-1,1].map(side=>({id:'wheel-'+axle+'-'+side,pivot:[side*(body.widthM/2-.102),body.wheelRadiusM,z],front:axle===1,indices:[]}))),assignment=new Map();
 for(const [key,vertices]of components){const wheel=wheelSpecs.find(w=>[...vertices].every(i=>Math.abs(p.getX(i)-w.pivot[0])<=.131&&Math.hypot(p.getY(i)-w.pivot[1],p.getZ(i)-w.pivot[2])<=body.wheelRadiusM+.001));assignment.set(key,wheel?.id||'fixed');}
 const rows=new Map([['fixed',[]],...wheelSpecs.map(w=>[w.id,w.indices])]);for(let i=0;i<index.length;i+=3)rows.get(assignment.get(find(index[i]))).push(index[i],index[i+1],index[i+2]);
 const pieces=new Map();for(const [name,indices]of rows){if(!indices.length)throw Error('VEHICLE_WHEEL_PARTITION: missing '+name+' for '+body.id);const g=new T.BufferGeometry();for(const [key,a]of Object.entries(geometry.attributes))g.setAttribute(key,a);g.setIndex(indices);g.computeBoundingBox();g.computeBoundingSphere();pieces.set(name,g);}
 return {pieces,wheels:wheelSpecs.map(({id,pivot,front})=>({id,pivot,front})),triangles:index.length/3};
}
/** Selected-body, asynchronous presentation. The kit owns resources; instances
 * borrow them. A cancelled/failed candidate cannot dispose another accepted kit.
 * Empty options preserves the reviewed all-body legacy API explicitly.
 */
export function createRoadVehicleKit(T,options){
 if(!T||['BufferGeometry','BufferAttribute','MeshStandardMaterial','Mesh','Group','Texture','Color'].some(k=>typeof T[k]!=='function'))throw Error('VEHICLE_RENDERER: supply the shared Three namespace before preparing resources.');
 if(!options||options.compatibility==='all-bodies-v1')return createLegacyRoadVehicleKit(T,options);
 const {bodies,purpose='gameplay',profile=purpose==='authoring'?'full':'game',geometry=profile==='full'?'sculpt':'game',signal,loadSkin=(url,options)=>loadVehicleSkin(T,url,options),loadMesh=async(url,{signal})=>{const r=await fetch(url,{signal});if(!r.ok)throw Error('Vehicle mesh '+r.status);return r.json();}}=options;
 if(!Array.isArray(bodies)||!bodies.length||bodies.some(id=>!VEHICLE_BODIES.some(b=>b.id===id))||!['full','game'].includes(profile)||!['sculpt','game'].includes(geometry))throw Error('VEHICLE_SELECTION: select approved bodies and an explicit supported profile.');
 const selected=[...new Set(bodies)],controller=new AbortController(),owned=new Set(),disposedTextures=new WeakSet(),templates=new Map(),instances=new Set(),requests=[];let disposed=false,status='loading',failure=null;
 const disposeTexture=t=>{if(disposedTextures.has(t))return;disposedTextures.add(t);t.dispose();t.image?.close?.();};
 const own=o=>{owned.add(o);return o;},check=()=>{if(disposed||controller.signal.aborted)throw abortError();};
 const cleanup=()=>{const errors=[],resources=[...owned],roots=[...instances];owned.clear();instances.clear();for(const close of [...resources.map(o=>()=>o.isTexture?disposeTexture(o):o.dispose()),...roots.map(r=>()=>r.removeFromParent())])try{close();}catch(e){errors.push(e.message);}return errors;};
 const cancel=()=>{if(disposed)return;disposed=true;status='cancelled';controller.abort();cleanup();};signal?.addEventListener('abort',cancel,{once:true});if(signal?.aborted)cancel();
 async function texture(id){check();const url=vehicleTextureURL(id,profile);requests.push({kind:'texture',id,profile,url});const t=await loadSkin(url,{signal:controller.signal,id,profile});if(!t?.isTexture){t?.dispose?.();throw Error('VEHICLE_TEXTURE: loader must return an owned Three texture.');}if(disposed||controller.signal.aborted){disposeTexture(t);throw abortError();}own(t);t.colorSpace=T.SRGBColorSpace;t.needsUpdate=true;return t;}
 function material(map,finish){const m=own(new T.MeshStandardMaterial({map,roughness:.84,metalness:0,side:T.DoubleSide}));if(finish){const colour=new T.Color(finish.colour);m.onBeforeCompile=shader=>{shader.uniforms.vehicleFinish={value:colour};shader.fragmentShader='uniform vec3 vehicleFinish;\n'+shader.fragmentShader.replace('#include <map_fragment>','vec4 paintedSkin = texture2D(map, vMapUv);\ndiffuseColor.rgb *= paintedSkin.rgb * mix(vec3(1.0), vehicleFinish, paintedSkin.a);');};m.customProgramCacheKey=()=> 'nautilus-painted-vehicle-skin-v2';}return m;}
 const ready=(async()=>{try{
   check();const gear=await texture('running-gear');const gearMaterial=material(gear);
   await Promise.all(selected.map(async id=>{const skin=await texture(id);check();let parts;
     if(geometry==='sculpt'){const module=await import('./sculpt.js');check();parts=module.sculptRoadVehicle(T,id);}
     else{const url=new URL('./meshes/'+id+'.json',import.meta.url).href;requests.push({kind:'mesh',id,profile:geometry,url});const data=await loadMesh(url,{signal:controller.signal,id});check();parts=reduced(T,data);}
     for(const g of parts.values())own(g);const body=VEHICLE_BODIES.find(b=>b.id===id),rig=splitRunningGear(T,parts.get('details'),body);for(const g of rig.pieces.values())own(g);
     const paints=new Map(VEHICLE_FINISHES.map(f=>[f.id,material(skin,f)]));templates.set(id,{parts,rig,paints,gearMaterial});
   }));check();status='ready';return {profile,geometry,bodies:selected};
 }catch(e){failure={name:e.name,message:e.message};if(status!=='cancelled')status=e.name==='AbortError'?'cancelled':'failed';disposed=true;controller.abort();cleanup();throw e;}finally{signal?.removeEventListener('abort',cancel);}})();
 ready.catch(()=>{});
 function create(id,{driving=false}={}){if(status!=='ready'||disposed)throw Error('VEHICLE_NOT_READY: await the selected kit.ready.');const row=roadVehicle(id),template=templates.get(row.form);if(!template)throw Error('VEHICLE_NOT_SELECTED: '+row.form);const root=new T.Group();root.name=row.id;root.userData.vehicle={id:row.id,body:row.form,finish:row.finish,profile,geometry,driving};
   root.add(new T.Mesh(template.parts.get('body'),template.paints.get(row.finish)));if(!driving)root.add(new T.Mesh(template.parts.get('details'),template.gearMaterial));
   else{root.add(new T.Mesh(template.rig.pieces.get('fixed'),template.gearMaterial));const wheels=[];for(const w of template.rig.wheels){const pivot=new T.Group(),mesh=new T.Mesh(template.rig.pieces.get(w.id),template.gearMaterial);pivot.name=w.id;pivot.position.set(...w.pivot);mesh.position.set(...w.pivot.map(n=>-n));pivot.add(mesh);root.add(pivot);wheels.push({pivot,front:w.front});}root.userData.updateDriving=state=>{for(const w of wheels)w.pivot.rotation.set(state.wheelAngleRad,w.front?state.steeringRad:0,0,'YXZ');};}
   instances.add(root);const dispose=()=>{instances.delete(root);root.removeFromParent();};return {root,dispose,update:state=>root.userData.updateDriving?.(state)};
 }
 return Object.freeze({ready,create,createDriving:(id)=>create(id,{driving:true}),read:()=>({status,failure:failure?{...failure}:null,profile,geometry,bodies:[...selected],requests:requests.map(r=>({...r})),ownedResources:owned.size,instances:instances.size,submissionsPerInstance:{parked:2,driving:6}}),dispose(){if(disposed)return;disposed=true;status='disposed';controller.abort();signal?.removeEventListener('abort',cancel);return cleanup();}});
}
