// Setup adapter only. Actual PRIVATE session, actual accepted C1 profile and
// native presentation ports. No replacement history, validator or authority.
import {createSmartTileSession} from '../../../candidates/tile-authoring/editor/c2-shared-runtime-prototype/runtime/apps/editor/smart-tile/session.js';
import {createTileAuthoringSessionProfile} from '../../../apps/editor/tile-authoring/profile.js';
import {tileAuthoringInspectionPort} from '../../../apps/editor/tile-authoring/presentation.js';
export function createTileAuthoringSession(deps,{binding,finishCatalogue,resourcePorts,privateHooks,...host}){
 const original=createTileAuthoringSessionProfile(deps,{binding,finishCatalogue,resourcePorts,inspection:tileAuthoringInspectionPort(host.presentation)});
 const profile=privateHooks?Object.freeze({...original,...privateHooks(original,{deps,binding,finishCatalogue,resourcePorts,...host})}):original;
 return createSmartTileSession(deps,{...host,codec:binding.codec,profile});
}
