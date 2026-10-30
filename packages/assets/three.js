// Public visual asset facade. Hosts supply their existing Three and renderer.
import {loadGrossHousing,createGrossHouse} from '../../vendor/tinderbox-prefabs/6693bfa3fea2edec77649d830de5ac68ba4c1a50/src/art/gross-housing.js';
import {createOriginalBuildingProvider} from '../prefab-core/provider-original.js';
import {buildingAsset} from '../prefab-core/registry.js';
// Original buildings share one built template per design: each instance is a
// clone (shared geometry and materials, its own nodes) whose view is applied on
// the template and copied node for node, so instances keep independent views.
// The last instance of a design releases the template. Gross houses stay one
// model per instance: their cutaways clip through per-house wall materials.
function originalInstance(template) {
 const root=template.model.root.clone(true),nodes=[];root.traverse(node=>nodes.push(node));
 nodes.forEach((node,i)=>{node.visible=template.initial[i];});template.users++;
 return {root,setView(view){template.model.setView(view);nodes.forEach((node,i)=>{node.visible=template.nodes[i].visible;});},dispose(){root.removeFromParent();if(--template.users===0)template.release();}};
}
export async function loadBuildingAssets(THREE,{renderer,providers=['original','gross'],loadTexture}={}) {
 if(!THREE?.Group||!Array.isArray(providers)||!providers.length||providers.some(id=>!['original','gross'].includes(id))||new Set(providers).size!==providers.length)throw Error('Supply Three and distinct supported building providers.');
 const original=createOriginalBuildingProvider(THREE,loadTexture?{loadTexture}:{}),libraries=new Map(),instances=new Set(),templates=new Map();let disposed=false;
 const close=()=>{if(disposed)return;disposed=true;for(const instance of [...instances])instance.dispose();for(const library of libraries.values())library.dispose();libraries.clear();};
 try{for(const id of providers)libraries.set(id,await(id==='original'?original.load({renderer}):loadGrossHousing(THREE,{renderer})));}
 catch(error){close();throw error;}
 function template(key){
  let entry=templates.get(key);
  if(!entry){const model=original.create(libraries.get('original'),key),nodes=[];model.root.traverse(node=>nodes.push(node));entry={model,nodes,initial:nodes.map(node=>node.visible),users:0,release(){templates.delete(key);model.dispose();}};templates.set(key,entry);}
  return entry;
 }
 return {create(id){if(disposed)throw Error('Building assets have been disposed.');const key=typeof id==='string'&&id.startsWith('building:')?id.slice(9):id;const asset=buildingAsset(key);if(!asset||!libraries.has(asset.provider))throw Error('Building provider was not loaded for: '+id);
   const source=asset.provider==='original'?originalInstance(template(key)):createGrossHouse(THREE,libraries.get('gross'),key);let released=false;
   const result={root:source.root,setView(view={}){if(released)throw Error('Building instance is disposed.');source.setView(view);},dispose(){if(!released){released=true;source.dispose();instances.delete(result);}}};instances.add(result);return result;},dispose:close};
}
