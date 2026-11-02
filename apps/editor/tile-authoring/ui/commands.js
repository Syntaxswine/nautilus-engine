// UI assembly only. The host must supply the actual public namespaces.
// This module never implements a record hash, rectangle producer or executor.
export const TILE_AUTHORING_EXPECTED_FIELDS = Object.freeze([
  'workspaceRevision','workspaceDigest','hostDocumentDigest','hostAuthorityToken',
  'authorityContextToken','contentDigest','decorationDigest','resourceSetDigest',
  'floorProfileDigest','stackConstraintsDigest','tileLayoutDigest','tileCatalogueDigest'
]);
const digest = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const problem = (code, message) => Object.assign(new TypeError(code + ': ' + message), {code});
export function finiteUIData(value) {
  let visits = 0;
  const copy = (input, depth) => {
    if (++visits > 200000 || depth > 64) throw problem('UI_DATA_BOUND', 'Use bounded finite JSON data.');
    if (input === null || typeof input === 'string' || typeof input === 'boolean') return input;
    if (typeof input === 'number' && Number.isFinite(input)) return input;
    if (!input || typeof input !== 'object') throw problem('UI_FINITE_DATA', 'No undefined, functions, symbols or nonfinite numbers.');
    const array = Array.isArray(input), proto = Object.getPrototypeOf(input);
    if (!array && proto !== Object.prototype && proto !== null) throw problem('UI_FINITE_DATA', 'Use plain data.');
    const keys = Reflect.ownKeys(input);
    if (array && (keys.length !== input.length + 1 || !keys.includes('length'))) throw problem('UI_FINITE_DATA', 'Use dense arrays without extra properties.');
    const output = array ? [] : {};
    for (const key of keys) {
      if (array && key === 'length') continue;
      const item = Object.getOwnPropertyDescriptor(input, key);
      if (typeof key !== 'string' || !item?.enumerable || !Object.hasOwn(item, 'value')) throw problem('UI_FINITE_DATA', 'Accessors and hidden fields are not data.');
      if (array && !/^(0|[1-9][0-9]*)$/.test(key)) throw problem('UI_FINITE_DATA', 'Use ordinary array indices.');
      Object.defineProperty(output, key, {value:copy(item.value, depth + 1), enumerable:true, configurable:false, writable:false});
    }
    return Object.freeze(output);
  };
  return copy(value, 0);
}
export function tileAuthoringPin(record) {
  if (!record || typeof record.id !== 'string' || !record.id || !Number.isSafeInteger(record.revision) || record.revision < 1 || !digest(record.contentDigest)) throw problem('UI_PIN_REQUIRED', 'Use the full immutable id/revision/contentDigest pin.');
  return Object.freeze({id:record.id, revision:record.revision, contentDigest:record.contentDigest});
}
export function tileAuthoringExpected(snapshot) {
  const value = finiteUIData(snapshot);
  if (value.document?.kind !== 'nautilus-tile-workbench-document' || value.document.version !== 3) throw problem('UI_V3_REQUIRED', 'Bind the explicit full-v3 Editor connection.');
  const expected = value.expected;
  if (!expected || Object.keys(expected).length !== TILE_AUTHORING_EXPECTED_FIELDS.length ||
      TILE_AUTHORING_EXPECTED_FIELDS.some(key => !Object.hasOwn(expected, key)) ||
      !Number.isSafeInteger(expected.workspaceRevision) || expected.workspaceRevision < 0 ||
      TILE_AUTHORING_EXPECTED_FIELDS.slice(1).some(key => !digest(expected[key]))) throw problem('UI_EXPECTED_REQUIRED', 'Use the current twelve-field Expected supplied by Editor.');
  return expected;
}
const identity = (value, name) => {
  if (typeof value !== 'string' || !value || value.length > 96) throw problem('UI_EXPLICIT_ID', 'Supply an explicit ' + name + ' of at most 96 characters.');
  return value;
};
export function createTileAuthoringCommands({tiles, authoring}) {
  if (!tiles || typeof authoring?.createRectangleDefinition !== 'function' || typeof authoring?.sealTileContentRecord !== 'function') throw problem('UI_CONSTRUCTION_UNBOUND', 'Supply the reviewed public tiles and tiles/authoring exports. No C0 fallback is available.');
  const envelope = ({snapshot, requestId, operations}) => finiteUIData({
    kind:'nautilus-tile-authoring-command', version:1,
    requestId:identity(requestId, 'request ID'), expected:tileAuthoringExpected(snapshot),
    operations, budgetProfile:'authoring-reference-proposal-v1'
  });
  const op = (opId, kind, body) => ({opId:identity(opId, 'operation ID'), kind, body});
  return Object.freeze({
    rectangle({snapshot, requestId, opId, kind, spec, base = null}) {
      if (!['recipe.create','recipe.clone','recipe.revise'].includes(kind)) throw problem('UI_RECTANGLE_OPERATION', 'Choose create, clone or revise.');
      tileAuthoringExpected(snapshot);
      const result = authoring.createRectangleDefinition(tiles, finiteUIData(spec));
      const definition = finiteUIData(result.definition), pin = tileAuthoringPin(result.pin);
      if (JSON.stringify(pin) !== JSON.stringify(tileAuthoringPin(definition))) throw problem('UI_PRODUCER_PIN', 'The public producer must return its exact definition pin.');
      const body = kind === 'recipe.create' ? {definition} : {base:tileAuthoringPin(base), definition};
      return envelope({snapshot, requestId, operations:[op(opId, kind, body)]});
    },
    preset({snapshot, requestId, opId, input}) {
      tileAuthoringExpected(snapshot);
      const result = authoring.sealTileContentRecord(tiles, finiteUIData(input));
      const record = finiteUIData(result.record), pin = tileAuthoringPin(result.pin);
      if (record.kind !== 'nautilus-tile-preset' || JSON.stringify(pin) !== JSON.stringify(tileAuthoringPin(record))) throw problem('UI_SEALER_PIN', 'Use the public sealer result for a complete preset.');
      if (record.body.defaultLayers.length || record.body.defaultMarks.length) throw problem('UI_C1_DEFAULTS_UNAVAILABLE', 'C1 presets have explicit empty decoration defaults.');
      return envelope({snapshot, requestId, operations:[op(opId, 'preset.save', {preset:record})]});
    },
    place({snapshot, requestId, opId, preset, placements}) {
      const copies = finiteUIData(placements);
      if (!copies.length || copies.some(item => item.freshMarkIds.length || item.freshLayerIds.length)) throw problem('UI_C1_DEFAULTS_UNAVAILABLE', 'Use explicit fresh placements with empty decoration remaps.');
      if (new Set(copies.map(item => item.ownerId)).size !== copies.length) throw problem('UI_DISTINCT_OWNERS', 'Each independent placement needs its own explicit owner ID.');
      return envelope({snapshot, requestId, operations:[op(opId, 'preset.place', {preset:tileAuthoringPin(preset), placements:copies, defaults:'empty'})]});
    },
    upgrade({snapshot, requestId, opId, ownerId, from, to, anchorIds}) {
      identity(ownerId, 'selected owner ID');
      const safeSnapshot = finiteUIData(snapshot);tileAuthoringExpected(safeSnapshot);
      const marks = safeSnapshot.document.authoring?.decorations?.chunks?.flatMap(chunk => chunk.marks) ?? [];
      if (marks.some(mark => mark.target.ownerId === ownerId)) throw problem('UI_C1_ANCHOR_DECISIONS_UNAVAILABLE', 'This owner has decoration decisions outside the C1 controls. Retain it unchanged.');
      return envelope({snapshot, requestId, operations:[op(opId, 'placement.upgrade', {
        ownerIds:[ownerId], from:tileAuthoringPin(from), to:tileAuthoringPin(to), anchorDecisions:[],
        newRecipeAnchorIds:[{ownerId, anchorIds:finiteUIData(anchorIds)}]
      })]});
    }
  });
}
