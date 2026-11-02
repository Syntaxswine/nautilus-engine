import test from 'node:test';import assert from 'node:assert/strict';
import {createFloorNavigation} from '../packages/floor-navigation/index.js';
import {tileStackIntent,tileFinishIntent,readTileStackUISnapshot,workspaceUIBinding} from '../candidates/tile-stack/ui/contract.js';
import {createTileStackUIFixture,compatibilityFloors,nonuniformFloors} from '../candidates/tile-stack/ui/fixture-adapter.js';
import {mountTileStackUI} from '../candidates/tile-stack/ui/panel.js';
const rectangle=()=>({tool:'rectangle',ownerId:null,origin:[.12345678901234567,-2.5],widthM:8,depthM:4,seed:4294967295,finishId:'skin.painterly'});
const base=()=>({rectangle:rectangle(),floorIds:['F00','F14'],minimumClearanceM:2});
test('candidate UI is inert without DOM/storage/renderer and imports only borrowed floor presentation',()=>assert.equal(typeof mountTileStackUI,'function'));
test('closed v2 stack preserves original planar intent, finish and exact requested minimum without relations',()=>{
 const source=rectangle(),before=structuredClone(source),result=tileStackIntent({rectangle:source,floorIds:[...compatibilityFloors].reverse().map(floor=>floor.id),minimumClearanceM:'2.123456789012345'},compatibilityFloors);
 assert.deepEqual(result,{...source,tool:'stack',floorIds:compatibilityFloors.map(floor=>floor.id),minimumClearanceM:2.123456789012345,lockPolicy:'all-except-highest'});assert.deepEqual(source,before);assert.equal(Object.hasOwn(result,'relations'),false);
});
test('real fifteen-floor window keeps explicit nonuniform heights and named IDs rather than deriving elevations',()=>{
 const nav=createFloorNavigation({floors:nonuniformFloors,selectedId:'F00'});try{nav.select('F07');assert.deepEqual(nav.visibleFloors.map(floor=>floor.label),['6','7','8','9','10']);assert.equal(nav.state.floors[7].elevationM,18.6);nav.select('F14');assert.equal(nav.visibleFloors.length,5);assert.equal(nav.state.floors.at(-1).elevationM,42.7);}finally{nav.dispose();}
});
test('unknown/duplicate/insufficient members, missing v2 finish and invalid minima refuse without object coercion',()=>{
 for(const patch of [{rectangle:{...rectangle(),finishId:undefined}},{floorIds:[]},{floorIds:['F00']},{floorIds:['unknown','F14']},{floorIds:['F00','F00']},{minimumClearanceM:''},{minimumClearanceM:0},{minimumClearanceM:-1},{minimumClearanceM:Infinity}])assert.throws(()=>tileStackIntent({...base(),...patch},compatibilityFloors));
 let calls=0;assert.throws(()=>tileStackIntent({...base(),minimumClearanceM:{valueOf(){calls++;return 1;}}},compatibilityFloors));assert.equal(calls,0);
});
test('finish uses its fixed ID mapping, displays version separately and emits only the closed v2 finish intent',()=>{
 const entry={id:'finish.stone',version:7,label:'Stone flags',available:true,reason:null};assert.deepEqual(tileFinishIntent({ownerId:'whole.owner',finishId:entry.id},{entries:[entry]}),{tool:'finish',ownerId:'whole.owner',finishId:'finish.stone'});
 assert.throws(()=>tileFinishIntent({ownerId:'whole.owner',finishId:'absent'},{entries:[entry]}));assert.throws(()=>tileFinishIntent({ownerId:'whole.owner',finishId:entry.id},{entries:[{...entry,available:false,reason:'Unsupported source.'}]}),/Unsupported source/);
});
test('fixed catalogue refuses two active versions of one ID and mapping changes have a different UI binding',()=>{
 const nav=createFloorNavigation({floors:compatibilityFloors,selectedId:'F00'}),f=createTileStackUIFixture(nav,'aft-native-fifteen');try{const s=f.peek(),changed=structuredClone(s);changed.finishCatalogue.entries[0].version++;assert.notEqual(workspaceUIBinding(s),workspaceUIBinding(changed));const duplicate=structuredClone(s);duplicate.finishCatalogue.entries.push({...duplicate.finishCatalogue.entries[0],version:99});assert.throws(()=>readTileStackUISnapshot(duplicate,nav.state),/one active version/);}finally{nav.dispose();}
});
test('explicit v2 snapshot retains floor provenance and honest unbound gameplay without manufactured subjects',()=>{
 const nav=createFloorNavigation({floors:compatibilityFloors,selectedId:'F00'}),f=createTileStackUIFixture(nav,'aft-native-fifteen');try{const s=readTileStackUISnapshot(f.peek(),nav.state);assert.equal(s.interface.version,2);assert.equal(s.floors[2].source.kind,'legacy-layer');assert.equal(s.floors[3].source.kind,'authored-tile');for(const service of ['query','support','navigation','fire','water','game'])assert.equal(s.readiness[service].state,'unbound');assert.equal(nav.state.character,null);assert.equal(nav.state.contact,null);}finally{nav.dispose();}
});
test('v1, malformed owner/catalogue or stale actual floor cannot authorize v2 UI actions',()=>{
 const nav=createFloorNavigation({floors:compatibilityFloors,selectedId:'F00'}),f=createTileStackUIFixture(nav,'aft-native-fifteen');try{const s=f.peek();for(const patch of [{version:1},{interface:{kind:s.interface.kind,version:1}},{owners:[null]},{floor:{...s.floor,elevationM:99}},{finishCatalogue:{...s.finishCatalogue,entries:[{...s.finishCatalogue.entries[0],available:true,reason:'not-null'}]}}])assert.throws(()=>readTileStackUISnapshot({...s,...patch},nav.state));}finally{nav.dispose();}
});
test('unknown outcome disables the reused edit flags and retains exact original recovery identity',()=>{
 const nav=createFloorNavigation({floors:compatibilityFloors,selectedId:'F00'}),f=createTileStackUIFixture(nav,'aft-native-fifteen');try{f.patch({phase:'recovery-required',recoveryId:'original-request'});const s=f.peek();for(const action of ['stack','setDraft','finish','apply','review','cancel','save','open'])assert.equal(s.actions[action],false);assert.equal(s.actions.recover,true);assert.equal(s.recoveryId,'original-request');}finally{nav.dispose();}
});
test('requested draft clearance never overwrites the read-only accepted minimum in the fixture',()=>{
 const nav=createFloorNavigation({floors:compatibilityFloors,selectedId:'F00'}),f=createTileStackUIFixture(nav,'aft-native-fifteen');try{f.patch({acceptedMinimumClearanceM:2});f.adapter.setDraft(tileStackIntent({...base(),minimumClearanceM:3.125},nav.state.floors));assert.equal(f.peek().draft.minimumClearanceM,3.125);assert.equal(f.peek().acceptedMinimumClearanceM,2);}finally{nav.dispose();}
});
