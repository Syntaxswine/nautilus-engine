import {requiredMapFeatures, parseMap} from './roof-maps.js';
import {validateBlock} from './roof-blocks.js';
import {SCHEMA_IDS} from './contract-manifest.js';
import {CompatibilityError,assertRequirements} from './requirements.js';
export {CompatibilityError,assertRequirements,negotiateCapabilities} from './requirements.js';

const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const diagnostic=(code,path,message,action)=>({code,path,message,action});
export function blueprintRequirements(map) {
  if (!record(map)) throw new TypeError('Pass a portable map or block object.');
  const block = map.kind === 'red-shift-block';
  try { if (block) validateBlock(map); else parseMap(JSON.stringify(map), {allowDisconnected: true}); }
  catch (error) { throw new CompatibilityError([diagnostic('INVALID_BLUEPRINT', '/', error.message, 'Correct the blueprint before negotiating consumer capabilities.')]); }
  const required = requiredMapFeatures(map).map(id => ({id, minVersion: 1, maxVersion: 1}));
  return {schema: {id: block ? SCHEMA_IDS.block : SCHEMA_IDS.map, version: map.version}, required, optional: []};
}
export function assertBlueprintCompatible(map, manifest) {
  assertRequirements(blueprintRequirements(map), manifest); return map;
}
