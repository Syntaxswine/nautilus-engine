import {serializeSmartTileCheckpoint,smartTileDigest,fail} from './checkpoint.js';
import {createSmartTileAuthority} from './authority.js';

// One complete localStorage record: pending WAL, accepted bundle and receipts
// share the native synchronous write. There is no second autosave/history key.
export function createSmartTileStorage(deps,{storage,key,initialCheckpoint,beforeWrite=()=>{},afterWrite=()=>{}}){
  if(typeof key!=='string'||!key.startsWith('nautilus-smart-tile-editor-')||key.length>160)fail('STORAGE_KEY','/storage','Use an isolated Editor-local checkpoint key.');
  if(storage.getItem(key)===null)storage.setItem(key,serializeSmartTileCheckpoint(deps,initialCheckpoint));
  return createSmartTileAuthority(deps,{
    read(){const raw=storage.getItem(key);if(raw===null)fail('CHECKPOINT_MISSING','/storage','The authoritative record was removed. Preserve the current session for recovery.');return raw;},
    write(packet){
      beforeWrite(packet);
      const raw=storage.getItem(key);if(raw===null||smartTileDigest(JSON.parse(raw))!==packet.expectedRecordDigest)return false;
      // Last host fence: no callback or asynchronous boundary before setItem.
      if(!packet.canCommit())return false;
      storage.setItem(key,packet.nextJSON);afterWrite(packet);return true;
    }
  });
}
