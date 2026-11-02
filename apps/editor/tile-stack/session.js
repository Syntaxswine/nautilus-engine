// This is a profile wrapper, not a second session/coordinator/history engine.
import {createSmartTileSession} from '../smart-tile/session.js';
import {createTileStackSessionProfile} from './profile.js';
import {nativeInspectionPort} from './presentation.js';
export function createTileStackSession(deps,{binding,finishCatalogue,...host}){
  const initialDocument=binding.codec.open(host.authority.read()).document;
  const profile=createTileStackSessionProfile(deps,{binding,initialDocument,finishCatalogue,inspection:nativeInspectionPort(host.presentation)});
  return createSmartTileSession(deps,{...host,codec:binding.codec,profile});
}
