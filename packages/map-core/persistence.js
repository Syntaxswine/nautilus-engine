import {EditingDocument} from './roof-document.js';
import {parseMap} from './roof-maps.js';
import {ENGINE_VERSION, ENGINE_MANIFEST, SCHEMA_IDS} from './contract-manifest.js';
import {blueprintRequirements, assertRequirements, CompatibilityError} from './capabilities.js';

const MAX_BYTES = 4000000;
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const escape = text => text.replaceAll('~', '~0').replaceAll('/', '~1');
function jsonValue(value, path = '', ancestors = new Set(), depth = 0) {
  if (depth > 64) throw Error('Plain JSON nesting exceeds 64 levels at ' + (path || '/') + '.');
  if (value === null || typeof value === 'string' || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))) return;
  if (typeof value !== 'object' || ancestors.has(value) || (!Array.isArray(value) && ![Object.prototype, null].includes(Object.getPrototypeOf(value))))
    throw Error('Expected finite, acyclic plain JSON data at ' + (path || '/') + '.');
  for (const key of Reflect.ownKeys(value)) {
    if (Array.isArray(value) && key === 'length') continue;
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (typeof key !== 'string' || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value') ||
        (Array.isArray(value) && (!/^(0|[1-9][0-9]*)$/.test(key) || Number(key) >= value.length)))
      throw Error('Expected enumerable plain JSON data fields at ' + (path || '/') + '.');
  }
  ancestors.add(value);
  if (Array.isArray(value)) for (let i = 0; i < value.length; i++) { if (!Object.hasOwn(value, i)) throw Error('Sparse JSON array at ' + path + '.'); jsonValue(value[i], path + '/' + i, ancestors, depth + 1); }
  else for (const key of Object.keys(value)) jsonValue(value[key], path + '/' + escape(key), ancestors, depth + 1);
  ancestors.delete(value);
}
function inputData(input) {
  let value = input;
  if (typeof input === 'string') {
    if (new TextEncoder().encode(input).length > MAX_BYTES) throw Error('Portable documents are limited to 4,000,000 UTF-8 bytes.');
    value = JSON.parse(input);
  }
  jsonValue(value);
  if (!record(value)) throw Error('Expected a portable JSON object.');
  if (new TextEncoder().encode(JSON.stringify(value)).length > MAX_BYTES) throw Error('Portable documents are limited to 4,000,000 UTF-8 bytes.');
  return structuredClone(value);
}
export class BlueprintError extends Error {
  constructor(message, code = 'INVALID_BLUEPRINT', path = '/') {
    super(message); this.name = 'BlueprintError'; this.code = code;
    this.diagnostics = [{code, path, message, action: code === 'MIGRATION_REQUIRED' ? 'Call migrateBlueprint explicitly, review the result, then save it.' : 'Correct the document before loading or handing it to a game.'}];
  }
}
export function loadBlueprint(input) {
  try {
    const raw = inputData(input), block = raw.kind === 'red-shift-block';
    if(raw.kind==='nautilus-appearance-document')throw new BlueprintError('This document requires the appearance schema and negotiated nautilus-bear-appearance-v1 support; use the appearance API.', 'UNSUPPORTED_APPEARANCE', '/kind');
    if (!block && raw.version === 1) throw new BlueprintError('Legacy map version 1 needs an explicit migration.', 'MIGRATION_REQUIRED', '/version');
    if (raw.version !== (block ? 1 : 2)) throw new BlueprintError('Unsupported ' + (block ? 'block' : 'map') + ' schema version.', 'UNSUPPORTED_SCHEMA', '/version');
    const document = new EditingDocument().open(JSON.stringify(raw));
    // Use the editor to validate, not to normalize persistence. Return the
    // original copied JSON, including opaque fields and unfilled resources.
    return raw;
  } catch (error) { if (error instanceof BlueprintError || error instanceof CompatibilityError) throw error; throw new BlueprintError(error.message); }
}
export function validateBlueprint(input) { try { loadBlueprint(input); return []; } catch (error) { return error.diagnostics || [{code: 'INVALID_BLUEPRINT', path: '/', message: error.message, action: 'Correct the blueprint.'}]; } }
export function migrateBlueprint(input) {
  const raw = inputData(input);
  if (raw.version === 2 || raw.kind === 'red-shift-block') return {blueprint: loadBlueprint(raw), migrations: []};
  if (raw.version !== 1) throw new BlueprintError('No migration exists for this map schema version.', 'UNSUPPORTED_SCHEMA', '/version');
  // The inherited v1 conversion copied only these geometry fields. Reject other
  // functional data rather than quietly dropping it during the one-way expansion.
  const allowed = new Set(['version', 'width', 'height', 'name', 'terrain', 'edges', 'starts', 'guards', 'exits', 'metadata']);
  for (const key of Object.keys(raw)) if (!allowed.has(key)) throw new BlueprintError('Legacy migration cannot preserve field: ' + key, 'UNSUPPORTED_MIGRATION_FIELD', '/' + escape(key));
  const blueprint = parseMap(JSON.stringify(raw), {allowDisconnected: true});
  if (raw.metadata !== undefined) blueprint.metadata = structuredClone(raw.metadata);
  return {blueprint: loadBlueprint(blueprint), migrations: [{id: 'aft-map-1-to-2', from: {id: SCHEMA_IDS.map, version: 1}, to: {id: SCHEMA_IDS.map, version: 2}}]};
}
function checkedRequirements(data, requirements) {
  const actual = blueprintRequirements(data);
  assertRequirements(requirements, ENGINE_MANIFEST);
  if (requirements.schema.id !== actual.schema.id || requirements.schema.version !== actual.schema.version)
    throw new BlueprintError('Save requirements and payload schema disagree.', 'SCHEMA_MISMATCH', '/requirements/schema');
  for (const needed of actual.required) if (!requirements.required.some(item => item.id === needed.id && item.minVersion <= needed.minVersion && item.maxVersion >= needed.maxVersion))
    throw new BlueprintError('The save omits required authored feature: ' + needed.id, 'MISSING_REQUIRED_FEATURE', '/requirements/required');
}
export function createSave(input, {metadata = {}, required = [], optional = []} = {}) {
  const data = loadBlueprint(input), requirements = blueprintRequirements(data);
  requirements.required.push(...structuredClone(required)); requirements.optional.push(...structuredClone(optional));
  checkedRequirements(data, requirements);
  const save = {schema: SCHEMA_IDS.save, version: 1, engine: {id: 'nautilus-engine', version: ENGINE_VERSION},
    requirements, payload: {schema: requirements.schema.id, version: data.version, data}, metadata};
  return inputData(save);
}
export function parseSave(input, {consumer = ENGINE_MANIFEST} = {}) {
  const save = inputData(input);
  if (save.schema !== SCHEMA_IDS.save || save.version !== 1) throw new BlueprintError('Expected nautilus-save schema version 1.', 'UNSUPPORTED_SAVE_SCHEMA', '/version');
  if (!record(save.engine) || save.engine.id !== 'nautilus-engine' || typeof save.engine.version !== 'string' || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(save.engine.version))
    throw new BlueprintError('A semantic engine version stamp is required.', 'INVALID_ENGINE_STAMP', '/engine');
  if (!record(save.payload) || !record(save.payload.data)) throw new BlueprintError('A saved blueprint payload is required.', 'INVALID_SAVE_PAYLOAD', '/payload');
  const data = loadBlueprint(save.payload.data), actual = blueprintRequirements(data);
  if (save.payload.schema !== actual.schema.id || save.payload.version !== actual.schema.version) throw new BlueprintError('Payload schema stamp does not describe its blueprint.', 'SCHEMA_MISMATCH', '/payload');
  checkedRequirements(data, save.requirements); assertRequirements(save.requirements, consumer);
  assertRequirements(actual, consumer);
  // Preserve unknown JSON fields at their original paths. Unknown behavior must
  // instead be declared as a required capability, which fails closed above.
  save.payload.data = data; return save;
}
function ordered(value) { if (Array.isArray(value)) return value.map(ordered); if (record(value)) return Object.fromEntries(Object.keys(value).sort().map(key => [key, ordered(value[key])])); return value; }
export function serializeSave(input) { return JSON.stringify(ordered(parseSave(input)), null, 2) + '\n'; }
