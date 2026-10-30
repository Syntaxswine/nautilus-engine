import {loadGrossHousing,createGrossHouse} from '../../vendor/tinderbox-prefabs/6693bfa3fea2edec77649d830de5ac68ba4c1a50/src/art/gross-housing.js';
import {createOriginalBuildingProvider} from '../../packages/prefab-core/provider-original.js';
import {batchPrefab,batchOriginal} from './prefab-batches.js';
// Both collections draw from display batches; each source model still decides visibility.
function batched(source,batch){
  let disposed=false;
  return {root:batch.root,setView(view,options){source.setView(view,options);batch.sync(options);},dispose(){if(!disposed){disposed=true;batch.dispose();source.dispose();}}};
}
export function createPrefabProviders(T,{original=createOriginalBuildingProvider(T)}={}) {
  return new Map([
    ['gross',{
      load:({renderer})=>loadGrossHousing(T,{renderer}),
      create(library,id) {
        const source=createGrossHouse(T,library,id);let batch;
        try {batch=batchPrefab(T,source);}catch(error){source.dispose();throw error;}
        return batched({setView:view=>source.setView(view),dispose:()=>source.dispose()},batch);
      }
    }],
    ['original',{
      load:options=>original.load(options),
      create(library,id) {
        const source=original.create(library,id);let batch;
        try {batch=batchOriginal(T,source);}catch(error){source.dispose();throw error;}
        return batched(source,batch);
      }
    }]
  ]);
}
