import {createSmartTileCheckpointCodec,smartTileDigest,fail} from './checkpoint.js';
import {createSmartTileAuthority} from './authority.js';

// One complete localStorage record: pending WAL, accepted bundle and receipts
// share the native synchronous write. There is no second autosave/history key.
export function createSmartTileStorage(deps,{storage,key,initialCheckpoint,beforeWrite=()=>{},afterWrite=()=>{},codec=createSmartTileCheckpointCodec(deps),keyPolicy=null}){
  if(typeof key!=='string'||key.length>160||(keyPolicy?!keyPolicy(key):!key.startsWith('nautilus-smart-tile-editor-')))fail('STORAGE_KEY','/storage','Use an isolated Editor-local checkpoint key.');
  if(!keyPolicy&&codec.formats.checkpointVersion===1&&key.startsWith('nautilus-smart-tile-editor-stack-v2:'))fail('STORAGE_KEY','/storage','A v1 workspace cannot initialize the separate v2 stack namespace.');
  if(storage.getItem(key)===null)storage.setItem(key,codec.serialize(initialCheckpoint));
  return createSmartTileAuthority(deps,{
    read(){const raw=storage.getItem(key);if(raw===null)fail('CHECKPOINT_MISSING','/storage','The authoritative record was removed. Preserve the current session for recovery.');return raw;},
    write(packet){
      beforeWrite(packet);
      const raw=storage.getItem(key);if(raw===null||smartTileDigest(JSON.parse(raw))!==packet.expectedRecordDigest)return false;
      // Last host fence: no callback or asynchronous boundary before setItem.
      if(!packet.canCommit())return false;
      storage.setItem(key,packet.nextJSON);afterWrite(packet);return true;
    }
  },{codec});
}
