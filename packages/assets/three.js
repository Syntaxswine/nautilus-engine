// Public visual asset facade. Hosts supply their existing Three and renderer.
import {loadGrossHousing,createGrossHouse} from '../../vendor/tinderbox-prefabs/6693bfa3fea2edec77649d830de5ac68ba4c1a50/src/art/gross-housing.js';
import {createOriginalBuildingProvider} from '../prefab-core/provider-original.js';
import {buildingAsset} from '../prefab-core/registry.js';
import {batchOriginal,batchPrefab} from '../prefab-core/display-batches.js';
// By default every create() builds an independent model, as before: the host owns its
// geometry, materials and view. With {shared: true} a design is built once and drawn
// from display batches (one draw per material per view); its instances are clones
// that share geometry and materials (treat them as read-only) and share one view per
// design, as the editor does. The last instance of a design releases it.
function sharedInstance(template) {
 const root=template.root.clone(true);template.users++;
 return {root,setView(view){template.setView(view);},dispose(){root.removeFromParent();if(--template.users===0)template.release();}};
}
export async function loadBuildingAssets(THREE,{renderer,providers=['original','gross'],loadTexture,shared=false}={}) {
 if(!THREE?.Group||!Array.isArray(providers)||!providers.length||providers.some(id=>!['original','gross'].includes(id))||new Set(providers).size!==providers.length)throw Error('Supply Three and distinct supported building providers.');
 if(typeof shared!=='boolean')throw Error('shared must be true or false.');
 const original=createOriginalBuildingProvider(THREE,loadTexture?{loadTexture}:{}),libraries=new Map(),instances=new Set(),templates=new Map();let disposed=false;
 const close=()=>{if(disposed)return;disposed=true;for(const instance of [...instances])instance.dispose();for(const library of libraries.values())library.dispose();libraries.clear();};
 try{for(const id of providers)libraries.set(id,await(id==='original'?original.load({renderer}):loadGrossHousing(THREE,{renderer})));}
 catch(error){close();throw error;}
 const build=(asset,key)=>asset.provider==='original'?original.create(libraries.get('original'),key):createGrossHouse(THREE,libraries.get('gross'),key);
 function template(asset,key){
  let entry=templates.get(key);
  if(!entry){
   const source=build(asset,key);let batch;
   try{batch=asset.provider==='original'?batchOriginal(THREE,source):batchPrefab(THREE,source);}catch(error){source.dispose();throw error;}
   // Copies share the batch geometry, so a view is one per design; each copy mirrors the template's node visibility.
   const nodes=[];batch.root.traverse(node=>nodes.push(node));
   entry={root:batch.root,users:0,
    setView(view){source.setView(view);batch.sync();for(const copy of entry.copies())copy.forEach((node,i)=>{node.visible=nodes[i].visible;});},
    copies:()=>[...instances].filter(instance=>instance.template===entry).map(instance=>instance.nodes),
    release(){templates.delete(key);batch.dispose();source.dispose();}};
   templates.set(key,entry);
  }
  return entry;
 }
 return {create(id){if(disposed)throw Error('Building assets have been disposed.');const key=typeof id==='string'&&id.startsWith('building:')?id.slice(9):id;const asset=buildingAsset(key);if(!asset||!libraries.has(asset.provider))throw Error('Building provider was not loaded for: '+id);
   const entry=shared?template(asset,key):null,source=entry?sharedInstance(entry):build(asset,key);let released=false;
   const result={root:source.root,setView(view={}){if(released)throw Error('Building instance is disposed.');source.setView(view);},dispose(){if(!released){released=true;instances.delete(result);source.dispose();}}};
   if(entry){result.template=entry;result.nodes=[];result.root.traverse(node=>result.nodes.push(node));}
   instances.add(result);return result;},dispose:close};
}
