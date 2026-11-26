import {prepareNativeActor} from './three.js';
import {createFantasyEquipmentModel} from '../fantasy-equipment-art/three.js';
import {createNativeMeleeEquipmentView} from './melee-equipment-view.js';

/** Optional native-goat presentation. The game retains all combat authority. */
export async function prepareNativeMeleeActor({readPresentation,model='goat',...options}={}){
  if(model!=='goat'||options.motion==='native-crawl-v1')throw Error('MELEE_VIEW_PROFILE: this optional hand adapter supports the native standing goat rig.');
  if(typeof readPresentation!=='function')throw Error('MELEE_VIEW_QUERY: supply a confirmed retained-host presentation query.');
  const native=await prepareNativeActor({...options,model});
  try{return createNativeMeleeEquipmentView({native,actorId:options.actorId,readPresentation,createModel:createFantasyEquipmentModel});}
  catch(error){try{native.dispose();}catch(cleanup){throw new AggregateError([error,cleanup],'Native melee preparation and cleanup failed.');}throw error;}
}
