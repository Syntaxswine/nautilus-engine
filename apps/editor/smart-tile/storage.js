// PRIVATE C2 shared-runtime prototype. Exact0e7 default algorithm; optional instrumentation only.
import {createSmartTileCheckpointCodec,smartTileDigest,fail} from './checkpoint.js';
import {createSmartTileAuthority} from './authority.js';

const originalStorageDigest=smartTileDigest;
// One complete localStorage record: pending WAL, accepted bundle and receipts
// share the native synchronous write. There is no second autosave/history key.
export function createSmartTileStorage(deps,{storage,key,initialCheckpoint,beforeWrite=()=>{},afterWrite=()=>{},codec=createSmartTileCheckpointCodec(deps),keyPolicy=null}){
  const observed=codec.privateObservation??null,smartTileDigest=observed?.utilities.digest??originalStorageDigest;
  const JSON=observed?{parse:observed.utilities.parse}:globalThis.JSON;
  if(typeof key!=='string'||key.length>160||(keyPolicy?!keyPolicy(key):!key.startsWith('nautilus-smart-tile-editor-')))fail('STORAGE_KEY','/storage','Use an isolated Editor-local checkpoint key.');
  if(!keyPolicy&&codec.formats.checkpointVersion===1&&key.startsWith('nautilus-smart-tile-editor-stack-v2:'))fail('STORAGE_KEY','/storage','A v1 workspace cannot initialize the separate v2 stack namespace.');
  const getItem=()=>observed?observed.observer.run('storage.getItem',()=>observed.observer.opaque('storage.getItem',key,()=>storage.getItem(key))):storage.getItem(key);
  const setItem=value=>observed?observed.observer.run('storage.setItem',()=>observed.observer.opaque('storage.setItem',value,()=>storage.setItem(key,value))):storage.setItem(key,value);
  if(getItem()===null)setItem(codec.serialize(initialCheckpoint));
  return createSmartTileAuthority(deps,{
    read(){const raw=getItem();if(raw===null)fail('CHECKPOINT_MISSING','/storage','The authoritative record was removed. Preserve the current session for recovery.');return raw;},
    write(packet){
      beforeWrite(packet);
      const raw=getItem();if(raw===null||smartTileDigest(observed?codec.open(raw):JSON.parse(raw))!==packet.expectedRecordDigest)return false;
      // Last host fence: no callback or asynchronous boundary before setItem.
      if(!packet.canCommit())return false;
      setItem(packet.nextJSON);afterWrite(packet);return true;
    }
  },{codec});
}
