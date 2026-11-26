import test from 'node:test';import assert from 'node:assert/strict';
import {listMeleeEquipment,meleeEquipment,equipmentLoadout,openMeleeState,stageMeleeCommand} from '@nautilus-engine/map-core/melee';
import {fantasyEquipmentArt,listFantasyEquipmentArt} from '@nautilus-engine/map-core/fantasy-equipment-art';
import {fixture} from './fixtures/melee/host.mjs';
const twoHands=['blacksmith-hammer','pick','spear','halberd','bow','crossbow'];
test('public art/rules hand-use seam agrees for all accepted weapons; shield off grips are grasp aliases',()=>{
  assert.deepEqual(listMeleeEquipment().filter(r=>r.hands===2).map(r=>r.id).sort(),[...twoHands].sort());
  for(const art of listFantasyEquipmentArt()){
    const rules=meleeEquipment(art.id);assert.equal(art.units,'metres');
    if(twoHands.includes(art.id)){assert.equal(rules.hands,2,art.id);assert(art.grip.off,art.id);assert.notDeepEqual(art.grip.off.position,art.grip.main.position,art.id);assert.equal(art.grip.off.socket,'grip.off');assert.deepEqual(equipmentLoadout(art.id).off,null);}
    else if(rules.slot==='off'){assert.equal(rules.hands,1);assert.deepEqual(art.grip.off.position,art.grip.main.position);assert.deepEqual(art.grip.off.quaternion,art.grip.main.quaternion);}
    else{assert.equal(rules.hands,1);assert.equal(art.grip.off,null);}
  }
  assert.equal(fantasyEquipmentArt('pick').label,'Two-handed war pick');
});
test('pick plus shield refuses through MELEE_TWO_HANDS with no accepted command, costs or seed change',()=>{
  assert.throws(()=>equipmentLoadout('pick','round-wood-shield'),{code:'MELEE_TWO_HANDS'});
  const h=fixture(),before=h.save(),bad={main:{id:'pick',version:1},off:{id:'round-wood-shield',version:1}},result=stageMeleeCommand(h.state,{type:'equip',equipment:bad,commandId:'invalid-pick-shield',expectedRevision:h.state.revision,actorId:'player'},h.context());
  assert.equal(result.code,'MELEE_TWO_HANDS');assert.equal(result.committed,false);assert.deepEqual(h.save(),before);
  const saved=structuredClone(h.state);saved.actors[0].equipment=bad;assert.throws(()=>openMeleeState(saved),{code:'MELEE_TWO_HANDS'});
});
test('the valid two-handed pick still equips and commits one piercing attack',()=>{
  const h=fixture();h.bodies[1].position.x=1.25;h.bodies[1].revision++;
  assert(h.command({type:'equip',equipment:equipmentLoadout('pick')}).committed);const before=structuredClone(h.characters);
  assert(h.command({type:'attack',targetId:'target',modeId:'pick'}).committed);h.steps(9);const events=h.state.events.filter(e=>e.type==='melee-impact');assert.equal(events.length,1);assert(events[0].contact&&events[0].hpLost>0);assert.equal(events[0].damageType,'piercing');assert.equal(h.characters[0].resources.ap,before[0].resources.ap-2);assert.equal(h.characters[0].resources.stamina,before[0].resources.stamina-7);assert.equal(h.state.actors[0].equipment.off,null);
});
