import test from 'node:test';
import assert from 'node:assert/strict';
import {createReverseIntent,opposesTravel} from '../reverse-intent.js';
import {COMPACT_NOTCHES} from '../compact-model.js';
import {createTrainYardHost} from '../../../examples/train-yard-host.js';

const context=s=>JSON.stringify([s.actorId,s.mode,s.trainId,s.carId,s.entranceId,s.cabFacing,s.expected.occupancyRevision]);
function rig({schedule=queueMicrotask,completion='accept'}={}) {
  const game=createTrainYardHost(),commands=[],results=[],invalidations=[];let serial=0;
  const read=()=>game.connector.readForActor('player');
  const enter=read().actions.find(a=>a.enabled&&a.command.type==='enter');assert.equal(game.connector.dispatch({...enter.command,commandId:'reverse/enter'}).committed,true);
  const owner={id:'reverse/lease',actorId:'player',trainId:read().trainId,accepted:true};
  const send=controls=>{const s=read(),command={type:'drive',actorId:'player',trainId:s.trainId,commandId:'reverse/drive/'+(++serial),leaseId:owner.id,expected:s.expected,...controls};commands.push(command);const result=game.connector.dispatch(command);results.push(result);return result;};
  const view=()=>({snapshot:read(),owner,context:context(read()),active:true});
  const intent=createReverseIntent({schedule,readFresh:view,complete:(pending,fresh)=>{
    assert.equal(fresh.snapshot.train.stopped,true);assert.equal(intent.notch,null);
    if(completion==='throw')throw Error('Unavailable transport');
    if(completion==='refuse'){commands.push({refused:true});return;}
    const n=COMPACT_NOTCHES[pending.notch];assert.equal(send({direction:n.direction,power:n.power,brake:0}).committed,true);
  },invalidated:(pending,reason)=>invalidations.push(reason)});
  const unsubscribe=game.connector.subscribe(()=>intent.observe(view()));
  return {game,owner,read,send,view,intent,commands,results,invalidations,
    queue(notch){assert.equal(opposesTravel(read(),notch),true);assert.equal(send({direction:'neutral',power:0,brake:1}).committed,true);assert.equal(intent.arm({notch,owner,context:context(read())},view()),true);},
    dispose(){intent.dispose();unsubscribe();game.dispose();}
  };
}
async function advanceUntil(r,predicate) {for(let i=0;i<80&&!predicate(r.read());i++){r.game.advance(.05);await Promise.resolve();}assert.ok(predicate(r.read()));}

test('opposite travel follows signed cab-relative speed and ignores neutral/stopped requests',()=>{
  const s={cabFacing:1,train:{signedSpeedMps:2,stopped:false}};
  assert.equal(opposesTravel(s,3),true);assert.equal(opposesTravel(s,0),false);assert.equal(opposesTravel(s,2),false);
  s.cabFacing=-1;assert.equal(opposesTravel(s,3),false);assert.equal(opposesTravel(s,1),true);
  s.train.stopped=true;assert.equal(opposesTravel(s,1),false);
});
test('actual retained forward motion brakes at full power and reverses on the same owner without another input',async()=>{
  const r=rig();try {
    r.send({direction:'forward',power:1,brake:0});r.game.advance(.5);
    const raw=r.send({direction:'reverse',power:.5,brake:0});assert.equal(raw.code,'STOP_BEFORE_REVERSE');
    r.queue(3);assert.deepEqual(r.read().train.controls,{direction:'neutral',power:0,brake:1,leaseId:r.owner.id});
    assert.equal(r.intent.notch,3);const before=r.commands.length;
    await advanceUntil(r,s=>s.train.controls.direction==='reverse');assert.equal(r.intent.notch,null);assert.equal(r.commands.length,before+1);assert.ok(r.results.every(result=>result.code!=='SESSION_BUSY'));
    r.game.advance(.1);assert.ok(r.read().train.signedSpeedMps<0);assert.equal(r.read().train.controls.leaseId,r.owner.id);
  }finally{r.dispose();}
});
test('actual retained reverse motion symmetrically brakes then engages the selected forward notch',async()=>{
  const r=rig();try {r.send({direction:'reverse',power:.5,brake:0});r.game.advance(.5);r.queue(0);await advanceUntil(r,s=>s.train.controls.direction==='forward');assert.equal(r.read().train.controls.power,1);r.game.advance(.1);assert.ok(r.read().train.signedSpeedMps>0);}finally{r.dispose();}
});
test('repeated stopped notifications schedule one job and consume intent before its committed notifications',()=>{
  const jobs=[],r=rig({schedule:job=>jobs.push(job)});try {
    r.send({direction:'forward',power:1,brake:0});r.game.advance(.5);r.queue(3);
    for(let i=0;i<12;i++)r.game.advance(.1);assert.equal(jobs.length,1);const before=r.commands.length;
    jobs[0]();jobs[0]();for(let i=0;i<5;i++)r.game.advance(0);
    assert.equal(r.commands.length,before+1);assert.equal(r.read().train.controls.direction,'reverse');assert.equal(jobs.length,1);
  }finally{r.dispose();}
});
test('cancelling a scheduled token prevents stale callbacks from affecting a replacement intent',()=>{
  const jobs=[],r=rig({schedule:job=>jobs.push(job)});try {
    r.send({direction:'forward',power:1,brake:0});r.game.advance(.5);r.queue(3);for(let i=0;i<8;i++)r.game.advance(.1);
    const old=jobs[0];r.intent.cancel();const before=r.commands.length;old();assert.equal(r.commands.length,before);assert.equal(r.intent.notch,null);
    assert.equal(r.intent.arm({notch:1,owner:r.owner,context:context(r.read())},r.view()),true);old();assert.equal(r.intent.notch,1);jobs[1]();assert.equal(r.read().train.controls.direction,'forward');
  }finally{r.dispose();}
});
test('revocation and a new real source owner cannot be taken over by a queued callback',()=>{
  const jobs=[],r=rig({schedule:job=>jobs.push(job)});try {
    r.send({direction:'forward',power:1,brake:0});r.game.advance(.5);r.queue(3);for(let i=0;i<8;i++)r.game.advance(.1);
    r.game.connector.dispatch({type:'release',actorId:'player',leaseId:r.owner.id,commandId:'reverse/revoke'});
    const s=r.read();assert.equal(r.game.connector.dispatch({type:'drive',actorId:'player',trainId:s.trainId,expected:s.expected,commandId:'reverse/other',leaseId:'other/owner',direction:'forward',power:.5,brake:0}).committed,true);
    jobs[0]();assert.equal(r.intent.notch,null);assert.equal(r.read().train.controls.leaseId,'other/owner');assert.equal(r.read().train.controls.direction,'forward');
  }finally{r.dispose();}
});
test('a failed completion is consumed once and leaves confirmed full braking',()=>{
  for(const completion of ['refuse','throw']) {
    const jobs=[],r=rig({schedule:job=>jobs.push(job),completion});try {r.send({direction:'forward',power:1,brake:0});r.game.advance(.5);r.queue(3);for(let i=0;i<8;i++)r.game.advance(.1);jobs[0]();jobs[0]();for(let i=0;i<5;i++)r.game.advance(0);assert.equal(jobs.length,1);assert.equal(r.intent.notch,null);assert.equal(r.read().train.controls.brake,1);assert.equal(r.read().train.controls.power,0);}finally{r.dispose();}
  }
});
test('checkpoint reload and disposal never reconstruct or execute an old local direction intent',()=>{
  const jobs=[],r=rig({schedule:job=>jobs.push(job)});let restored;try {
    r.send({direction:'forward',power:1,brake:0});r.game.advance(.5);r.queue(3);const save=r.game.save();for(let i=0;i<8;i++)r.game.advance(.1);r.intent.dispose();jobs[0]();
    restored=createTrainYardHost(save);for(let i=0;i<8;i++)restored.advance(.1);const s=restored.connector.readForActor('player');assert.deepEqual(s.train.controls,{direction:'neutral',power:0,brake:1,leaseId:null});
    const fresh=createReverseIntent({schedule:job=>jobs.push(job),readFresh:()=>({snapshot:s}),complete(){throw Error('Restored intent');}});fresh.observe({snapshot:s});assert.equal(fresh.notch,null);assert.equal(jobs.length,1);fresh.dispose();
  }finally{restored?.dispose();r.dispose();}
});
