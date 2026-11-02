import test from 'node:test';
import assert from 'node:assert/strict';
import * as mapCore from '../packages/map-core/index.js';
import * as tiles from '../packages/tiles-core/index.js';
import * as examples from '../packages/tile-visuals/example.js';
import {createFloorNavigation} from '../packages/floor-navigation/index.js';
import {createSmartTileAuthority} from '../apps/editor/smart-tile/authority.js';
import {createSmartTileSession} from '../apps/editor/smart-tile/session.js';
import {createLegacyRecoveryFixtureHost} from '../candidates/tile-stack/editor/recovery-fixtures.js';
// Actual unchanged shared coordinator/core/authority/history. The resource-only
// presentation stand-in makes this a pure compatibility fixture, not v2/mesh proof.
const deps={mapCore,tiles,examples};
const harness=()=>createLegacyRecoveryFixtureHost(deps,{createSession:createSmartTileSession,createAuthority:createSmartTileAuthority,createFloors:createFloorNavigation});
async function finish(h){h.session.setDraft({tool:'finish',ownerId:'legacy-a',skinId:'skin.slate'});const r=await h.session.review();assert.equal(r.ok,true);return r;}
test('unchanged authority/session recover lost committed acknowledgement with original ID once',async t=>{
 const h=await harness();t.after(()=>h.close());const r=await finish(h);h.fault='after';assert.equal((await h.session.apply(r.reviewId)).committed,null);const pending=h.session.getSnapshot();assert.equal(pending.recoveryId,r.requestId);assert.equal(pending.phase,'recovery-required');assert.equal(h.session.save().ok,false);assert.equal((await h.session.undo()).ok,false);assert.equal((await h.session.recover('different-id')).ok,false);
 const writes=h.writes.length;h.fault=null;assert.equal((await h.session.recover(r.requestId)).committed,true);assert.equal(h.writes.length,writes);assert.equal(h.session.getSnapshot().history.undo,1);const saved=JSON.parse(h.session.save().checkpointJSON);assert.equal(saved.journal.receipts[0].id,r.requestId);assert.equal(saved.document.sourceJSON,h.initial.document.sourceJSON);assert.deepEqual(saved.document.tileBundle.layout.instances[0].anchorIds,[]);assert.equal((await h.session.recover(r.requestId)).ok,false);
});
test('cold pending v1 retains same ID and refuses unwritten commit without new history',async t=>{
 const h=await harness();t.after(()=>h.close());const r=await finish(h);h.fault='before';assert.equal((await h.session.apply(r.reviewId)).committed,null);assert.equal(JSON.parse(h.raw).journal.pending.id,r.requestId);await h.reopen();assert.equal(h.session.getSnapshot().recoveryId,r.requestId);assert.equal(h.session.save().ok,false);h.fault=null;assert.equal((await h.session.recover(r.requestId)).committed,false);const c=JSON.parse(h.session.save().checkpointJSON);assert.equal(c.journal.receipts[0].id,r.requestId);assert.equal(c.journal.receipts[0].outcome,'not-committed');assert.equal(h.session.getSnapshot().history.undo,0);assert.deepEqual(c.document,h.initial.document);
});
test('acknowledged state survives presentation retirement and retry does not replay write/history',async t=>{
 const h=await harness();t.after(()=>h.close());const r=await finish(h);h.fault='display';assert.equal((await h.session.apply(r.reviewId)).committed,true);assert.equal(h.session.getSnapshot().phase,'presentation-error');assert.equal(h.session.getSnapshot().history.undo,1);const text=h.session.save().checkpointJSON,writes=h.writes.length;h.fault=null;assert.equal((await h.session.retryPresentation()).ok,true);assert.equal(h.writes.length,writes);assert.equal(h.session.getSnapshot().history.undo,1);assert.equal(h.session.save().checkpointJSON,text);
});
