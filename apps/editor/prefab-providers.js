import {loadGrossHousing,createGrossHouse} from '../../vendor/tinderbox-prefabs/6693bfa3fea2edec77649d830de5ac68ba4c1a50/src/art/gross-housing.js';
import {createOriginalBuildingProvider} from '../../packages/prefab-core/provider-original.js';
import {batchPrefab} from './prefab-batches.js';
export function createPrefabProviders(T) {
  return new Map([
    ['gross',{
      load:({renderer})=>loadGrossHousing(T,{renderer}),
      create(library,id) {
        const source=createGrossHouse(T,library,id);let batch;
        try {batch=batchPrefab(T,source);}catch(error){source.dispose();throw error;}
        let disposed=false;
        return {root:batch.root,setView(view,options){source.setView(view);batch.sync(options);},dispose(){if(!disposed){disposed=true;batch.dispose();source.dispose();}}};
      }
    }],
    ['original',createOriginalBuildingProvider(T)]
  ]);
}
