import {plain,canonical} from './data.js';
import {openInteractionState,openInteractionActor} from '../interactions/index.js';
const same=(a,b)=>canonical(a)===canonical(b),fail=()=>{throw Error('HOUSE_CHECKPOINT_INVALID: restore the complete exact scene, door animation, actor, resources and travel.');};
const keys=(o,names)=>{if(!o||typeof o!=='object'||Array.isArray(o)||Object.keys(o).sort().join()!==[...names].sort().join())fail();};
export function openDoorMotions(value,state){const motions=plain(value);if(!motions||typeof motions!=='object'||Array.isArray(motions))fail();for(const [id,m]of Object.entries(motions)){keys(m,['from','to','elapsed','duration']);const d=state.doors.find(d=>d.id===id);if(!d||m.to!==(d.open?1:0)||m.from!==1-m.to||m.duration!==.42||!Number.isFinite(m.elapsed)||m.elapsed<0||m.elapsed>=m.duration)fail();}if(Object.keys(motions).length>1)fail();return motions;}
export function openHouseCheckpoint(input,{identity,geometryKey,sceneId,interactions,actorId,modelHeightM}){
 const c=plain(input);keys(c,['kind','version','content','geometryKey','sceneId','interactions','actors','resources','travels','nativeMaps','doorMotions']);
 if(c.kind!=='nautilus-mount-dora-world'||c.version!==2||!same(c.content,identity)||c.geometryKey!==geometryKey||c.sceneId!==sceneId)fail();
 const s=openInteractionState(c.interactions);if(s.worldId!=='mount-dora'||s.stairs.length||s.doors.length!==interactions.doors.length)fail();
 for(const d of s.doors){const expected=interactions.doors.find(e=>e.id===d.id);if(!expected||!same({...d,open:expected.open,locked:expected.locked},expected))fail();}
 if(!Array.isArray(c.actors)||c.actors.length!==1)fail();const a=openInteractionActor(c.actors[0]);if(a.id!==actorId||a.radiusM!==.23||a.heightM!==modelHeightM||a.speedMps!==7.2||a.traversal!==null)fail();
 keys(c.resources,[actorId]);keys(c.resources[actorId],['health','ap','stamina','inventory']);const r=c.resources[actorId];for(const k of ['health','ap','stamina'])if(!Number.isFinite(r[k])||r[k]<0||r[k]>1e9)fail();if(!Array.isArray(r.inventory)||r.inventory.length>1024)fail();for(const row of r.inventory){keys(row,['id','count']);if(typeof row.id!=='string'||!row.id||row.id.length>96||!Number.isInteger(row.count)||row.count<1||row.count>1e9)fail();}
 if(!c.travels||typeof c.travels!=='object'||Array.isArray(c.travels)||Object.keys(c.travels).some(id=>id!==actorId)||!c.nativeMaps||typeof c.nativeMaps!=='object'||Array.isArray(c.nativeMaps))fail();openDoorMotions(c.doorMotions,s);return c;
}
