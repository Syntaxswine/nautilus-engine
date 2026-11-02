// Actual encoded PNG + reviewed pure portable/d8 components, with synthetic
// source/session fixture. No native readiness, authoring attempt, Apply or WAL.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {harness,painted,pin,metadata,T,formFor} from './fixture.mjs';
import {createBuiltinByteOwner} from '../vendor/bytesd8/root/candidates/tile-authoring/host/builtin-dependency-prefix/index.mjs';
import {importTileContentPack} from '../vendor/core0597/root/candidates/tile-authoring/core/c2/portable.js';
const selected=pin(metadata.listSharedArtwork().find(r=>r.id==='artist.graphic.road-number-0'));
const png=new URL('../../../../../assets/artwork/local-graphics-v1/resources/road-marks-v1.png',import.meta.url);
function setup(document){
 let lease=null,reads=0;
 const selectedBytesBinding={resolve(){return lease?.bytes??null;}},h=harness({...(document?{document}:{}),options:{selectedBytesBinding}});
 const reader={async *open(blob){reads++;const bytes=fs.readFileSync(png);assert.equal(bytes.length,blob.byteLength);for(let i=0;i<bytes.length;i+=32768)yield new Uint8Array(bytes.subarray(i,i+32768));}};
 const owner=createBuiltinByteOwner({tiles:T,metadata,sourceOwner:h.bridge.sourceOwner,reader,portable:{importTileContentPack}});h.bridge.pairBuiltinOwner(owner);
 return{h,owner,get reads(){return reads;},async acquire(read){lease=await owner.acquireBuiltinBytes(read,selected);assert.equal(lease.status,'verified',JSON.stringify(lease));assert.equal(owner.observeByteScope(lease.bytes).editingWorkCredit,0);},close(){if(lease?.status==='verified')owner.release(lease.bytes);h.dispose();}};
}
test('actual encoded selected d8 prefix constructs one first-mark command DATA; native/meter remain UNBOUND',async t=>{
 const f=setup();t.after(()=>f.close());f.h.selectSurface();const read=f.h.select({kind:'artwork',artwork:selected}),form=f.h.touch(formFor(selected));assert.equal(f.reads,0);await f.acquire(read);
 const result=f.h.bridge.overlayPorts.constructOverlayCommand(read,form);assert.equal(result.status,'constructed',JSON.stringify(result));assert.deepEqual(result.command.operations.map(op=>op.kind),['content.import','surface.layers','decoration.add']);assert.equal(result.command.operations[0].body.pack.manifest.artwork.length,1);assert.deepEqual(result.command.operations[0].body.pack.manifest.artwork[0],metadata.sharedArtwork(selected));assert.equal(f.h.allocationCalls,1);assert.equal(f.reads,1);
 assert.equal(f.h.document.authoring.library.artwork.length,0);assert.equal(read.overlay.gates.review.enabled,false);assert.equal(read.overlay.gates.apply.enabled,false);assert.equal(f.owner.diagnostics().browserWideMeter,'UNBOUND');assert.equal(f.owner.diagnostics().native,false);
 const next=f.h.bridge.getSnapshot(),aliased=f.h.bridge.overlayPorts.constructOverlayCommand(next,form);assert.equal(aliased.status,'refused');assert.equal(aliased.diagnostics[0].code,'C2_BUILTIN_PREFIX_UNBOUND');assert.equal(f.h.allocationCalls,1);
});
test('actual retained selected byte owner constructs layers/add DATA without an import',async t=>{
 const d=painted(selected);d.authoring.decorations.surfaces=[];d.authoring.decorations.chunks=[];const f=setup(d);t.after(()=>f.close());f.h.selectSurface();const read=f.h.select({kind:'artwork',artwork:selected});await f.acquire(read);
 const result=f.h.bridge.overlayPorts.constructOverlayCommand(read,f.h.touch(formFor(selected,'retained')));assert.equal(result.status,'constructed',JSON.stringify(result));assert.equal(result.route,'retained-first-mark');assert.deepEqual(result.command.operations.map(op=>op.kind),['surface.layers','decoration.add']);assert.deepEqual(result.command.operations[1].body.mark.graphic,metadata.sharedArtworkDefaults(selected));assert.equal(f.h.allocationCalls,1);assert.equal(f.owner.diagnostics().native,false);
});
test('actual retained byte capability supports data-only add on the exact existing layer',async t=>{
 const f=setup(painted(selected));t.after(()=>f.close());const read=f.h.selectMark();await f.acquire(read);const form=f.h.touch({kind:'decoration.add',artwork:selected,layerId:read.overlay.selection.selectedLayerId,graphic:formFor(selected).graphic});
 const result=f.h.bridge.overlayPorts.constructOverlayCommand(read,form);assert.equal(result.status,'constructed',JSON.stringify(result));assert.equal(result.command.operations.length,1);assert.equal(result.command.operations[0].kind,'decoration.add');assert.equal(result.command.operations[0].body.mark.ordinal,1);assert.equal(result.command.operations[0].body.mark.layerId,'layer.seed.0');assert.equal(f.h.allocationCalls,1);assert.equal(f.h.document.authoring.decorations.chunks[0].marks.length,1);assert.equal(f.owner.diagnostics().browserWideMeter,'UNBOUND');
});
