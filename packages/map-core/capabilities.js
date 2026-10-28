import {requiredMapFeatures, parseMap} from './roof-maps.js';
import {validateBlock} from './roof-blocks.js';
import {ENGINE_MANIFEST, SCHEMA_IDS} from './contract-manifest.js';

const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const integer = value => Number.isSafeInteger(value) && value >= 1;
const diagnostic = (code, path, message, action, extra = {}) => ({code, path, message, action, ...extra});
export class CompatibilityError extends Error {
  constructor(diagnostics) {
    super(diagnostics.map(item => item.message).join(' '));
    this.name = 'CompatibilityError'; this.code = 'NAUTILUS_COMPATIBILITY'; this.diagnostics = structuredClone(diagnostics);
  }
}
function requirementsErrors(requirements) {
  if (!record(requirements)) return [diagnostic('INVALID_REQUIREMENTS', '/', 'Expected a capability requirements object.', 'Supply schema, required and optional fields.')];
  const errors = [], schema = requirements.schema;
  if (!record(schema) || typeof schema.id !== 'string' || !schema.id || !integer(schema.version))
    errors.push(diagnostic('INVALID_SCHEMA_REQUIREMENT', '/schema', 'A stable schema ID and positive integer version are required.', 'Read the blueprint schema before selecting an adapter.'));
  const ids = new Set();
  for (const group of ['required', 'optional']) {
    if (!Array.isArray(requirements[group])) { errors.push(diagnostic('INVALID_FEATURE_LIST', '/' + group, 'Expected a ' + group + ' capability array.', 'Declare an empty array when no features are requested.')); continue; }
    requirements[group].forEach((feature, i) => {
      const path = '/' + group + '/' + i;
      if (!record(feature) || typeof feature.id !== 'string' || !feature.id || !integer(feature.minVersion) || !integer(feature.maxVersion) || feature.maxVersion < feature.minVersion)
        errors.push(diagnostic('INVALID_FEATURE_RANGE', path, 'Capabilities require an ID and inclusive integer minVersion/maxVersion.', 'Use a bounded supported version interval.'));
      else if (ids.has(feature.id)) errors.push(diagnostic('DUPLICATE_FEATURE', path, 'Capability appears more than once: ' + feature.id, 'Declare each capability once, as required or optional.', {feature: feature.id}));
      else ids.add(feature.id);
    });
  }
  return errors;
}
function manifestErrors(manifest) {
  if (!record(manifest) || typeof manifest.id !== 'string' || !manifest.id || manifest.contractVersion !== 1)
    return [diagnostic('INVALID_CONSUMER_MANIFEST', '/consumer', 'A consumer needs an ID and contractVersion 1.', 'Publish an explicit manifest for the adapter build.')];
  const errors = [];
  for (const field of ['schemas', 'capabilities']) {
    if (!Array.isArray(manifest[field])) { errors.push(diagnostic('INVALID_CONSUMER_MANIFEST', '/consumer/' + field, 'Expected a ' + field + ' array.', 'Declare exact supported integer versions.')); continue; }
    const ids = new Set();
    manifest[field].forEach((entry, i) => {
      const path = '/consumer/' + field + '/' + i;
      if (!record(entry) || typeof entry.id !== 'string' || !entry.id || !Array.isArray(entry.versions) || !entry.versions.length || entry.versions.some(version => !integer(version)) || new Set(entry.versions).size !== entry.versions.length || ids.has(entry.id))
        errors.push(diagnostic('INVALID_CONSUMER_MANIFEST', path, 'Invalid or duplicate supported schema/capability versions.', 'Give each stable ID one nonempty list of distinct integer versions.'));
      else ids.add(entry.id);
    });
  }
  return errors;
}
export function blueprintRequirements(map) {
  if (!record(map)) throw new TypeError('Pass a portable map or block object.');
  const block = map.kind === 'red-shift-block';
  try { if (block) validateBlock(map); else parseMap(JSON.stringify(map), {allowDisconnected: true}); }
  catch (error) { throw new CompatibilityError([diagnostic('INVALID_BLUEPRINT', '/', error.message, 'Correct the blueprint before negotiating consumer capabilities.')]); }
  const required = requiredMapFeatures(map).map(id => ({id, minVersion: 1, maxVersion: 1}));
  return {schema: {id: block ? SCHEMA_IDS.block : SCHEMA_IDS.map, version: map.version}, required, optional: []};
}
export function negotiateCapabilities(requirements, manifest = ENGINE_MANIFEST) {
  const errors = [...requirementsErrors(requirements), ...manifestErrors(manifest)], warnings = [], accepted = [];
  if (errors.length) return {ok: false, errors, warnings, accepted};
  const schema = manifest.schemas.find(entry => entry.id === requirements.schema.id);
  if (!schema?.versions.includes(requirements.schema.version)) errors.push(diagnostic('UNSUPPORTED_SCHEMA', '/schema',
    manifest.id + ' does not support ' + requirements.schema.id + ' version ' + requirements.schema.version + '.',
    'Choose a compatible adapter or perform an explicit reviewed schema migration.', {schema: requirements.schema, supportedVersions: schema?.versions || []}));
  for (const group of ['required', 'optional']) requirements[group].forEach((feature, i) => {
    const available = manifest.capabilities.find(entry => entry.id === feature.id)?.versions || [];
    const matches = available.filter(version => version >= feature.minVersion && version <= feature.maxVersion);
    if (matches.length) accepted.push({id: feature.id, version: Math.max(...matches), required: group === 'required'});
    else {
      const item = diagnostic(group === 'required' ? 'UNSUPPORTED_REQUIRED_FEATURE' : 'UNSUPPORTED_OPTIONAL_FEATURE', '/' + group + '/' + i,
        manifest.id + ' does not support ' + feature.id + ' versions ' + feature.minVersion + '–' + feature.maxVersion + '.',
        group === 'required' ? 'Use an adapter implementing this feature; do not discard the authored data.' : 'Preserve the optional data without enabling its behavior.',
        {feature: feature.id, minVersion: feature.minVersion, maxVersion: feature.maxVersion, supportedVersions: available});
      (group === 'required' ? errors : warnings).push(item);
    }
  });
  return {ok: errors.length === 0, errors, warnings, accepted};
}
export function assertRequirements(requirements, manifest = ENGINE_MANIFEST) {
  const result = negotiateCapabilities(requirements, manifest);
  if (!result.ok) throw new CompatibilityError(result.errors);
  return result;
}
export function assertBlueprintCompatible(map, manifest) {
  assertRequirements(blueprintRequirements(map), manifest); return map;
}
