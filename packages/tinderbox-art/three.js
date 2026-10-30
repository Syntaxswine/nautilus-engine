// Optional visual provider. The host supplies its one Three namespace and game state.
import {TINDERBOX_ART_ASSETS} from './catalogue.js';
const interiorSlots=['facade','ivory','trim','wood','woodDark','brass','velvet','linen','iron','glass','water','stone','foliage','soil','fruit','paper','ink','red','ochre'];
const waterfrontSlots=['facade','coping','paving','rail','ornament'];
const medicineSlots=['shirt','leather','brass','steel','ivory','dark','glass'];
function optionsFor(options,allowed,slots){
 if(!options||typeof options!=='object'||Array.isArray(options)||Object.keys(options).some(k=>!allowed.includes(k)))throw Error('Unknown or invalid Tinderbox art options.');
 for(const kind of ['materials','textures'])if(options[kind]!==undefined){
  const values=options[kind];if(!values||typeof values!=='object'||Array.isArray(values))throw Error('Expected '+kind+' slot bindings.');
  for(const [slot,value]of Object.entries(values))if(!slots.includes(slot)||!value?.[kind==='materials'?'isMaterial':'isTexture'])throw Error('Invalid '+kind+' binding: '+slot);
 }
 const {position=[0,0,0],quarterTurns=0}=options;
 if(!Array.isArray(position)||position.length!==3||!position.every(Number.isFinite)||!Number.isInteger(quarterTurns)||quarterTurns<0||quarterTurns>3)throw Error('Use a finite metre position and quarterTurns 0..3.');
}
export async function loadTinderboxArt(THREE,{families=['interior','waterfront','layout','medicine']}={}){
 if(!THREE?.Group||!THREE?.InstancedMesh||!THREE?.Box3)throw Error('Supply the host Three namespace.');
 if(!Array.isArray(families)||!families.length||families.some(f=>!['interior','waterfront','layout','medicine'].includes(f))||new Set(families).size!==families.length)throw Error('Select distinct supported art families.');
 const selected=new Set(families);
 const [interiors,waterfront,medicine]=await Promise.all([
  families.some(f=>f==='interior'||f==='layout')?import('./native/interiors.js'):null,
  selected.has('waterfront')?import('./native/waterfront.js'):null,
  selected.has('medicine')?import('./native/medicine.js'):null]);
 const instances=new Set();let disposed=false;
 const ensure=()=>{if(disposed)throw Error('Tinderbox art library is disposed.');};
 function retain(source){
  let retired=false;const live=()=>{ensure();if(retired)throw Error('Tinderbox art instance is disposed.');};
  const instance={root:source.root,bounds:source.bounds,metadata:source.metadata,
   diagnostics(){live();return source.diagnostics();},
   dispose(){if(retired)return;retired=true;source.dispose();source.root.removeFromParent();instances.delete(instance);}};
  for(const name of ['setTankDestroyed','getTankState','setAppearance'])if(typeof source[name]==='function')instance[name]=(...args)=>{live();return source[name](...args);};
  instances.add(instance);return instance;
 }
 return {
  create(id,options={}){
   ensure();const asset=TINDERBOX_ART_ASSETS.find(a=>a.id===id);if(!asset)throw Error('Unknown Tinderbox art ID: '+id);
   if(!selected.has(asset.family))throw Error('Art family was not loaded: '+asset.family);
   if(asset.family==='layout'){
    optionsFor(options,['materials','textures','position','quarterTurns','levels','sectionBounds','includeCeilings','destroyedTankIds'],interiorSlots);
    if(options.includeCeilings!==undefined&&typeof options.includeCeilings!=='boolean')throw Error('includeCeilings must be boolean.');
    return retain(interiors.createVenueInterior(THREE,{...options,venueId:asset.sourceId}));
   }
   if(asset.family==='waterfront'){
    optionsFor(options,['materials','textures','position','quarterTurns'],waterfrontSlots);
    return retain(waterfront.createWaterfrontTile(THREE,{...options,type:asset.sourceId}));
   }
   if(asset.family==='medicine'){
    optionsFor(options,['materials','textures','position','quarterTurns'],medicineSlots);
    return retain(medicineProp(THREE,medicine,asset.sourceId,options));
   }
   optionsFor(options,['materials','textures','position','quarterTurns','destroyed'],interiorSlots);
   const {position=[0,0,0],quarterTurns=0,...nativeOptions}=options;
   const source=interiors.createInteriorProp(THREE,{...nativeOptions,assetId:asset.sourceId});
   source.root.position.fromArray(position);source.root.rotation.y=quarterTurns*Math.PI/2;source.root.updateMatrixWorld(true);source.bounds.setFromObject(source.root);
   return retain(source);
  },
  plan(venueId){ensure();if(!selected.has('layout'))throw Error('Layout family was not loaded.');return structuredClone(interiors.getInteriorPlan(venueId));},
  dispose(){if(disposed)return;for(const instance of [...instances])instance.dispose();disposed=true;}
 };
}
export function medicineProp(THREE,medicine,kind,{materials={},textures={},position=[0,0,0],quarterTurns=0}={}){
 const source=medicine.createMedicinePickups(THREE,{materials,textures});
 try{source.update([{id:kind,kind,x:0,y:0,radius:.3}]);source.root.position.fromArray(position);source.root.rotation.y=quarterTurns*Math.PI/2;source.root.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(source.root);
  return{...source,bounds,metadata:Object.freeze({assetId:kind,version:1,units:'metres',origin:'Ground centre; +Y up, record x/y maps to X/Z. Radius is host metadata and never scales the prop.',bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()}}),diagnostics(){let triangles=0;source.root.traverse(o=>{if(o.isMesh)triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;});return{...source.diagnostics(),triangles};}};
 }catch(e){source.dispose();throw e;}
}
// Snapshot provider can be loaded without any interior/landmark module.
export async function loadTinderboxMedicine(THREE,options={}){
 if(!THREE?.Group||!THREE?.Mesh)throw Error('Supply the host Three namespace.');
 optionsFor(options,['materials','textures'],medicineSlots);
 const medicine=await import('./native/medicine.js');return medicine.createMedicinePickups(THREE,options);
}
