import {openRock,serializeRock} from './state.js';
import {fields,id,integer,fail} from './validation.js';
export const outcome=(rock,expected,extra={})=>({ok:true,rock,events:[],inventoryDelta:[],expected,reason:'',code:null,...extra});
export function transact(input,stage){
  let original,expected=null;
  try{original=openRock(input);expected=serializeRock(original);return stage(structuredClone(original),expected);}
  catch(error){return {ok:false,rock:original||null,events:[],inventoryDelta:[],expected,reason:error instanceof Error?error.message:String(error),code:error.code||'invalid-input'};}
}
export function command(rock,value,additional){
  const keys=['commandId','rockId','expectedRevision','actorId',...additional];fields(value,keys,undefined,'rock command');
  id(value.commandId,'command ID');id(value.actorId,'actor ID');id(value.rockId,'rock ID');integer(value.expectedRevision,0,1e9,'expected revision');
  if(value.rockId!==rock.id)fail('wrong-rock','Command identifies a different rock instance.');
  if(value.expectedRevision!==rock.revision)fail('stale-rock','Command was staged against another rock revision.');
}
export function advanceRevision(rock){if(rock.revision>=1e9)fail('revision-limit','Rock revision limit reached.');rock.revision++;}
