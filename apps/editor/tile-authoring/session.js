// Thin profile composition; the shared session owns all asynchronous state.
import {createSmartTileSession} from '../smart-tile/session.js';
import {createTileAuthoringSessionProfile} from './profile.js';
import {tileAuthoringInspectionPort} from './presentation.js';

export function createTileAuthoringSession(deps,{binding,finishCatalogue,resourcePorts,...host}){
  const profile=createTileAuthoringSessionProfile(deps,{binding,finishCatalogue,resourcePorts,inspection:tileAuthoringInspectionPort(host.presentation)});
  return createSmartTileSession(deps,{...host,codec:binding.codec,profile});
}
