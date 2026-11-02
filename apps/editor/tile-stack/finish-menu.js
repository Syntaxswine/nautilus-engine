// UI projection shape only. Actual catalogue/resource identity and availability
// must come from the fixed Artist binding, not from this plain-data validator.
import {smartTileData,fields,id,fail} from '../smart-tile/checkpoint.js';
export function validateFinishMenuProjection(input,binding){
  const c=smartTileData(input),b=smartTileData(binding);fields(b,['id','version','digest'],'/finishBinding');fields(c,['id','version','digest','entries'],'/finishCatalogue');
  if(c.id!==b.id||c.version!==b.version||c.digest!==b.digest||c.version!==1||typeof c.digest!=='string'||c.digest.length!==64||!/^[a-f0-9]+$/.test(c.digest))fail('STACK_FINISH_MENU_BINDING','/finishCatalogue','Use the fixed workspace catalogue identity; this does not verify resource provenance.');id(c.id,'/finishCatalogue/id');
  if(!Array.isArray(c.entries)||!c.entries.length||c.entries.length>64)fail('STACK_FINISH_MENU_LIMIT','/finishCatalogue/entries','Use a bounded menu of explicitly bound or unavailable choices.');
  const ids=new Set();for(const [i,e]of c.entries.entries()){
    const path='/finishCatalogue/entries/'+i;fields(e,['id','version','label','available','reason'],path);id(e.id,path+'/id');
    if(ids.has(e.id))fail('STACK_FINISH_DUPLICATE_ID',path,'One active version per stable finish ID; multiple versions require a later explicit contract.');ids.add(e.id);
    if(!Number.isSafeInteger(e.version)||e.version<1||typeof e.label!=='string'||!e.label||e.label.length>128||typeof e.available!=='boolean'||(e.available?e.reason!==null:typeof e.reason!=='string'||!e.reason||e.reason.length>4000))fail('STACK_FINISH_MENU_ENTRY',path,'Show the active version and an honest unavailable reason when unbound.');Object.freeze(e);
  }
  Object.freeze(c.entries);return Object.freeze(c);
}
