import test from 'node:test';
import assert from 'node:assert/strict';
import {createStealthReference} from '../examples/shared-stealth/host.mjs';

const action=(h,id)=>h.actions.request(id,h.actions.read().context);
const steps=(h,count,x=1)=>{for(let i=0;i<count;i++){h.walking.request({version:1,actorId:'goat',vector:{x,y:0},seconds:.05});h.advance(.05);}};
test('one public contract map supplies bare and authored-brush routes; walk is louder/faster than sneak',()=>{
  const bare=createStealthReference(),brush=createStealthReference({route:'brush'}),sneak=createStealthReference();
  try{assert.equal(bare.read().observation.concealment,0);assert.equal(brush.read().observation.concealment,10.4);action(sneak,'mode');steps(bare,60);steps(brush,60);steps(sneak,60);
    assert(Math.abs(bare.read().actor.position.x-14.8)<1e-8);assert(Math.abs(sneak.read().actor.position.x-9.4)<1e-8);
    assert(bare.read().firstHeardSeconds!==null);assert.equal(sneak.read().firstHeardSeconds,null);assert(bare.read().stealth.contacts[0].score>brush.read().stealth.contacts[0].score);
    assert.equal(bare.read().resources.hp,37);assert.equal(bare.read().resources.ap,3);assert.equal(brush.read().resources.hp,37);
    const before=brush.read().observation;assert(action(brush,'brush').ok);assert.equal(brush.read().mapRevision,1);assert.equal(brush.read().observation.concealment,0);assert(brush.read().observation.rate>before.rate);action(brush,'brush');assert.equal(brush.read().mapRevision,2);assert(brush.read().observation.concealment>0);
  }finally{bare.dispose();brush.dispose();sneak.dispose();}
});
test('standard collision refuses blocked input without costs/travel; complete reference saves resume deterministically',()=>{
  const h=createStealthReference();let restored;
  try{action(h,'stance');steps(h,22);const saved=h.checkpoint();restored=createStealthReference({checkpoint:JSON.parse(JSON.stringify(saved))});assert.deepEqual(restored.readPose(),h.readPose());assert.deepEqual(restored.read().resources,h.read().resources);
    steps(h,10,-1);steps(restored,10,-1);assert.deepEqual(restored.checkpoint(),h.checkpoint());
    action(h,'stance');steps(h,140);const before=h.read(),pose=h.readPose();steps(h,10);assert.deepEqual(h.read().resources,before.resources);assert.equal(h.readPose().travelM,pose.travelM);assert.deepEqual(h.readPose().position,pose.position);
    assert(h.read().stealth.receipts.length<=3,'durable per-stream high water stays bounded');
  }finally{restored?.dispose();h.dispose();}
});
