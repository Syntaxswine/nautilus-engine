// Working pure source/real-byte consumer; native ownership captures are synthetic.
import assert from 'node:assert/strict';
import {C,T,source,captureInput,save,originalEntries} from './tile-authoring-core-c2-stage-b-fixtures.mjs';
const current=source(),captured=C.captureTilePreset(T,captureInput(current.document)),saved=save(current.document,captured.preset);
const exported=C.exportTileContentPack(T,{document:saved.document,query:{kind:'content.export',presetRefs:[captured.pin],includeAllDependencies:true},manifestId:'library.c2-portable-thirty',entries:originalEntries()});
const reopened=C.importTileContentPack(T,{pack:exported.pack,entries:exported.entries});assert.deepEqual(reopened.pack,exported.pack);
console.log(JSON.stringify({status:'private-B-pure-source-real-byte-pass',nativeOwnershipProved:false,decoderRun:false,storageWrites:0,placementImplemented:false,records:reopened.pack.manifest.artwork.length,pages:reopened.entries.length,actualEncodedBytes:reopened.entries.reduce((n,x)=>n+x.bytes.length,0),work:{capture:captured.work.unitsCharged,save:saved.bound.costBounds.planning.unitsCharged,export:exported.work.unitsCharged,import:reopened.work.unitsCharged}}));
