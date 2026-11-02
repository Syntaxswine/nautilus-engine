// Pure legacy compatibility host, not a production writer or v2 coordinator.
// The caller injects the unchanged actual authority/session/floor factories.
import {smartTileDigest} from '../../../apps/editor/smart-tile/checkpoint.js';
import {legacyRecoveryFixture} from './fixtures.js';
export async function createLegacyRecoveryFixtureHost(deps,{createSession,createAuthority,createFloors}){
  const initial=legacyRecoveryFixture(deps),floors=createFloors({floors:initial.document.floorBinding.floors,selectedId:'0'}),writes=[];
  let raw=JSON.stringify(initial),fault=null,session,ordinal=0;
  const authority=createAuthority(deps,{read:()=>raw,write(packet){
    writes.push({phase:packet.phase,id:packet.requestId});if(packet.phase==='commit'&&fault==='before')throw Error('before-write fixture');
    if(smartTileDigest(JSON.parse(raw))!==packet.expectedRecordDigest||!packet.canCommit())return false;
    raw=packet.nextJSON;
    if(packet.phase==='commit'&&fault==='after')throw Error('lost-ack fixture');
    if(packet.phase==='commit'&&fault==='display')session.cancel('post-write presentation retired');return true;
  }});
  const presentation={acquire(){let disposed=false;return {root:{visible:true},cellCount:1,diagnostics:()=>({triangles:disposed?0:2,disposed,ownedGeometry:disposed?0:1}),dispose(){disposed=true;}};},attach(){}};
  const options={authority,floorController:floors,presentation,newId:()=> 'fixture-'+(++ordinal)};session=await createSession(deps,options);
  return {initial,floors,authority,options,writes,get raw(){return raw;},get session(){return session;},set fault(v){fault=v;},async reopen(){session.dispose();session=await createSession(deps,options);},close(){session.dispose();floors.dispose();}};
}
