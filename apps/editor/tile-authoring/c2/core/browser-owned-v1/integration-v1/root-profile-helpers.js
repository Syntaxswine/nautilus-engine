// Actual Root helper calls under the constructor's registered observer.
// Internal only: no consumer callback/observer runner is exported by index.js.
import {smartTileData as originalData,smartTileDigest as originalDigest,fields as originalFields,fail} from '../../../../../smart-tile/checkpoint.js';
import {readAuthoringJSON as originalReader} from '../../../../jsonl.js';
export {fail};let active=null;
const ctx=()=>{if(!active)fail('C2_ROOT_PROFILE_SOURCE_UNBOUND','/profile','Call only the actual source-created Root profile.');return active;};
export function invokeRootProfileSource(context,name,fn,args=[]){const previous=active;if(previous&&previous.observer!==context.observer)fail('C2_ROOT_PROFILE_REENTRY','/profile','One actual observer context.');active=context;try{return context.observer.run('profile.'+name,fn,...args);}finally{active=previous;}}
export const smartTileData=value=>originalData(value,ctx().observer);
export const smartTileDigest=value=>originalDigest(value,ctx().observer);
export const fields=(value,keys,path,required=keys)=>originalFields(value,keys,path,required,ctx().observer);
export const readAuthoringJSON=(value,options={})=>originalReader(value,{...options,observer:ctx().observer});
export const tileHash=value=>{const {observer,tiles}=ctx();return observer.opaque('frozen.tiles.hash',value,()=>tiles.tileLayoutToken(value));};
