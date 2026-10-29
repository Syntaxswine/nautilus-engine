// Public visual asset facade. Hosts supply their existing Three and renderer.
import {loadGrossHousing,createGrossHouse} from '../../vendor/tinderbox-prefabs/6693bfa3fea2edec77649d830de5ac68ba4c1a50/src/art/gross-housing.js';
import {createOriginalBuildingProvider} from '../prefab-core/provider-original.js';
import {buildingAsset} from '../prefab-core/registry.js';
export async function loadBuildingAssets(THREE,{renderer,providers=['original','gross'],loadTexture}={}) {
 if(!THREE?.Group||!Array.isArray(providers)||!providers.length||providers.some(id=>!['original','gross'].includes(id))||new Set(providers).size!==providers.length)throw Error('Supply Three and distinct supported building providers.');
 const original=createOriginalBuildingProvider(THREE,loadTexture?{loadTexture}:{}),libraries=new Map(),instances=new Set();let disposed=false;
 const close=()=>{if(disposed)return;disposed=true;for(const instance of [...instances])instance.dispose();for(const library of libraries.values())library.dispose();libraries.clear();};
 try{for(const id of providers)libraries.set(id,await(id==='original'?original.load({renderer}):loadGrossHousing(THREE,{renderer})));}
 catch(error){close();throw error;}
 return {create(id){if(disposed)throw Error('Building assets have been disposed.');const key=typeof id==='string'&&id.startsWith('building:')?id.slice(9):id;const asset=buildingAsset(key);if(!asset||!libraries.has(asset.provider))throw Error('Building provider was not loaded for: '+id);
   const source=asset.provider==='original'?original.create(libraries.get('original'),key):createGrossHouse(THREE,libraries.get('gross'),key);let released=false;
   const result={root:source.root,setView(view={}){if(released)throw Error('Building instance is disposed.');source.setView(view);},dispose(){if(!released){released=true;source.dispose();instances.delete(result);}}};instances.add(result);return result;},dispose:close};
}
