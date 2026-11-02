import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {readAuthoringDiscovery,projectAuthoringDiscovery} from '../candidates/tile-authoring/ui/discovery.js';
const base=new URL('../candidates/tile-authoring/ui/',import.meta.url);
const read=file=>JSON.parse(fs.readFileSync(new URL(file,base),'utf8'));
const specimen=()=>read('examples/discovery.json');
const change=mutate=>{const value=specimen();mutate(value);return value;};

test('UI controls and agents retain identical service command identities, schemas, availability and bindings',()=>{
  const source=specimen(),projected=projectAuthoringDiscovery(source);
  assert.deepEqual(projected.agentDiscovery,source);
  assert.deepEqual(projected.binding,source.binding);
  const seen=[];
  for(const panel of projected.panels)for(const {command,control} of panel.controls){
    assert.equal(command,projected.agentDiscovery.commands.find(row=>row.id===command.id));
    assert.equal(control,command.controls.find(row=>row.id===control.id));
    seen.push(control.id);
  }
  assert.equal(seen.length,source.commands.flatMap(row=>row.controls).length);
  assert.equal(new Set(seen).size,seen.length);
  const bytes=fs.readFileSync(new URL('examples/payload-schema-specimen.json',base));
  assert.ok(source.commands.every(row=>row.schema.sha256===createHash('sha256').update(bytes).digest('hex')));
  assert.equal(JSON.parse(bytes).notARegisteredSchema,true);
});

test('new service command IDs appear in both paths without adding a UI command registry',()=>{
  const source=specimen(),extra=structuredClone(source.commands[0]);
  extra.id='editor.future-reviewed-name';extra.controls=[{...extra.controls[0],id:'future-control',order:0}];source.commands.push(extra);
  const projected=projectAuthoringDiscovery(source);
  assert.equal(projected.panels.find(row=>row.id==='workbench').controls[0].command.id,extra.id);
  assert.deepEqual(projected.agentDiscovery.commands.at(-1),extra);
});

test('frozen detached discovery cannot be mutated through either UI or agent projection',()=>{
  const source=specimen(),projected=projectAuthoringDiscovery(source),original=source.commands[0].label;
  source.commands[0].label='Changed after capture';source.binding.contextToken='another-floor';
  assert.equal(projected.agentDiscovery.commands[0].label,original);
  assert.notEqual(projected.binding.contextToken,source.binding.contextToken);
  assert.throws(()=>{projected.agentDiscovery.commands[0].available=false;},TypeError);
  assert.throws(()=>{projected.panels[0].controls[0].command.schema.sha256='0'.repeat(64);},TypeError);
  assert.deepEqual(projectAuthoringDiscovery(specimen()),projectAuthoringDiscovery(specimen()));
});

test('ordinary paint cannot silently acquire preset or definition mutation scope',()=>{
  for(const badDefault of ['preset','definition','selected-instances']){
    const source=change(value=>{const row=value.commands.find(row=>row.target==='decoration');row.scopes.default=badDefault;row.scopes.allowed=[...new Set([...row.scopes.allowed,badDefault])];row.scopes.confirmation='Explicit reusable scope, still invalid for ordinary paint.';});
    assert.throws(()=>readAuthoringDiscovery(source),TypeError);
  }
  const stroke=read('examples/stroke-draft.json'),preset=read('examples/preset-draft.json');
  assert.equal(stroke.scope,'instance');assert.deepEqual(stroke.targets,[{ownerId:'deck-west',surfaceId:'top',floorId:'F03'}]);
  assert.equal(stroke.payload.commitOnPointerUp,false);
  assert.equal(preset.scope,'preset');assert.equal(preset.payload.includeDecorationDefaults,false);
  assert.equal(preset.payload.updatePlacedInstances,false);
  assert.ok(specimen().commands.filter(row=>['preset','recipe'].includes(row.target)).every(row=>row.scopes.confirmation));
  assert.throws(()=>readAuthoringDiscovery(change(value=>{value.commands.find(row=>row.target==='preset').scopes.confirmation=null;})),TypeError);
});

test('missing provider and physical-effect reasons reach both audiences without inferred permissions',()=>{
  const source=specimen(),projected=projectAuthoringDiscovery(source);
  for(const row of source.commands.filter(row=>!row.available)){
    const projectedRow=projected.panels.flatMap(panel=>panel.controls).find(entry=>entry.command.id===row.id).command;
    assert.equal(projectedRow.available,false);assert.deepEqual(projectedRow.diagnostics,row.diagnostics);
    assert.ok(row.diagnostics.every(reason=>reason.code&&reason.message&&reason.action&&reason.path));
  }
  assert.ok(projected.agentDiscovery.notices.some(row=>row.requiredCapability==='physical-terrain-edit'));
  assert.ok(projected.agentDiscovery.notices.some(row=>row.requiredCapability==='physical-prop'));
  assert.throws(()=>readAuthoringDiscovery(change(value=>{value.commands.find(row=>!row.available).diagnostics=[];})),TypeError);
  assert.throws(()=>readAuthoringDiscovery(change(value=>{value.commands.find(row=>!row.available).available=true;})),TypeError);
});

test('finite edits describe one history entry, with no per-mark commit affordance',()=>{
  const source=specimen();
  assert.equal(source.commands.find(row=>row.id==='tile.pack.export').effect,'read');
  assert.equal(source.commands.find(row=>row.id==='tile.pack.export').history,'none');
  assert.ok(source.commands.filter(row=>row.effect==='edit').every(row=>row.history==='one-entry'));
  assert.ok(source.commands.filter(row=>row.effect==='read').every(row=>row.history==='none'));
  assert.throws(()=>readAuthoringDiscovery(change(value=>{value.commands.find(row=>row.target==='decoration').history='per-mark';})),TypeError);
  const code=fs.readFileSync(new URL('specimen.js',base),'utf8');
  assert.doesNotMatch(code,/\b(?:stage|apply|review|save|undo|redo|recover)\s*\(/);
  assert.doesNotMatch(code,/(?:pointerup|pointerdown|keydown|localStorage|sessionStorage|indexedDB)/);
  assert.match(code,/input\.disabled=true/);
});

test('ambiguous identities, unsupported discovery versions and malformed field hints refuse as a whole',()=>{
  for(const mutate of [
    value=>{value.version=2;},
    value=>{value.commands.push(structuredClone(value.commands[0]));},
    value=>{value.commands[1].controls[0].id=value.commands[0].controls[0].id;},
    value=>{delete value.binding.floorTableToken;},
    value=>{value.commands[0].schema.sha256='moving-url';},
    value=>{value.commands[0].controls[0].argumentPath='/implicit';},
    value=>{value.commands[0].extraAuthority=true;},
    value=>{value.commands=Array.from({length:65},()=>value.commands[0]);}
  ])assert.throws(()=>readAuthoringDiscovery(change(mutate)),TypeError);
});

test('source-local specimen is explicit about missing artwork, payload grammar and runtime support',()=>{
  const stroke=read('examples/stroke-draft.json');
  assert.equal(stroke.payload.notAnImplementedPayloadSchema,true);
  assert.equal(stroke.payload.artwork.sha256,null);
  assert.equal(stroke.payload.anchorProfile,'proposed-owner-local-flat-surface-v1');
  assert.deepEqual(stroke.payload.marks[0].localM,[0.5,0.5]);
  assert.doesNotMatch(JSON.stringify(stroke),/triangleIndex|gpuInstance|chunkAddress|derivedCell/);
  const html=fs.readFileSync(new URL('specimen.html',base),'utf8');
  assert.match(html,/Contract \/ design only/);assert.match(html,/No live service/);
  assert.match(html,/Releasing the pointer never applies/);
});
