import {SHARED_ASSETS} from './catalogue.js';
import {bearAsset} from '../actors-bear/index.js';
export const SHARED_ASSET_CONTRACT=Object.freeze({version:1,metresPerUnit:1,status:'Visual reuse is independent of gameplay adoption.'});
export function listSharedAssets({category}={}) {return structuredClone([...SHARED_ASSETS,bearAsset()].filter(item=>!category||item.category===category));}
export function sharedAsset(id) {const asset=id==='people:bear'?bearAsset():SHARED_ASSETS.find(item=>item.id===id);if(!asset)throw Error('Unknown shared asset: '+id);return structuredClone(asset);}
