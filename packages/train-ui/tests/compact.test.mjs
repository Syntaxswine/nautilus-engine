import test from 'node:test';
import assert from 'node:assert/strict';
import {COMPACT_NOTCHES,compactDetent,compactNotchOf} from '../compact-model.js';
import {createTrainYardHost} from '../../../examples/train-yard-host.js';

test('four fixed notches retain the donor direction/power policy',()=>{
  assert.deepEqual(COMPACT_NOTCHES.map(n=>[n.mark,n.direction,n.power]),[['F II','forward',1],['F I','forward',.5],['N','neutral',0],['R','reverse',.5]]);
  assert.ok(Object.isFrozen(COMPACT_NOTCHES)&&COMPACT_NOTCHES.every(Object.isFrozen));
});
test('62% hysteresis holds both sides of each detent and clamps a bounded input',()=>{
  for(let notch=0;notch<4;notch++) {
    for(const delta of [-.62,-.5,0,.5,.62])assert.equal(compactDetent(notch+delta,notch),notch);
    if(notch<3)assert.equal(compactDetent(notch+.621,notch),notch+1);
    if(notch>0)assert.equal(compactDetent(notch-.621,notch),notch-1);
  }
  assert.equal(compactDetent(-10,2),0);assert.equal(compactDetent(10,2),3);assert.equal(compactDetent(NaN,2),2);
});
test('confirmed brake and neutral render N; other controls retain donor notch mapping',()=>{
  assert.equal(compactNotchOf({direction:'reverse',power:.5,brake:1}),2);
  assert.equal(compactNotchOf({direction:'neutral',power:0,brake:0}),2);
  assert.equal(compactNotchOf({direction:'reverse',power:.5,brake:0}),3);
  assert.equal(compactNotchOf({direction:'forward',power:.5,brake:0}),1);
  assert.equal(compactNotchOf({direction:'forward',power:1,brake:0}),0);
});
function board(game) {const enter=game.connector.readForActor('player').actions.find(a=>a.enabled&&a.command.type==='enter');assert.ok(enter);assert.equal(game.connector.dispatch({...enter.command,commandId:'node/enter'}).committed,true);}
function shift(game,index,serial,leaseId='node/notch') {const s=game.connector.readForActor('player'),n=COMPACT_NOTCHES[index];return game.connector.dispatch({type:'drive',actorId:'player',trainId:s.trainId,commandId:'node/shift/'+serial,leaseId,expected:s.expected,direction:n.direction,power:n.power,brake:0});}
test('real retained authority persists power across ticks, permits coasting and refuses moving reverse without changing controls',()=>{
  const game=createTrainYardHost();try {
    board(game);assert.equal(shift(game,1,1).committed,true);game.advance(.25);game.advance(.25);
    const powered=game.connector.readForActor('player');assert.equal(powered.train.controls.leaseId,'node/notch');assert.equal(powered.train.controls.power,.5);assert.ok(powered.train.speedMps>0);
    const reverse=shift(game,3,2);assert.equal(reverse.committed,false);assert.match(reverse.code,/REVERSE/);
    assert.deepEqual(game.connector.readForActor('player').train.controls,powered.train.controls);
    assert.equal(shift(game,2,3).committed,true);game.advance(.1);const coast=game.connector.readForActor('player');assert.equal(coast.train.controls.brake,0);assert.equal(coast.train.controls.direction,'neutral');assert.ok(coast.train.speedMps>0&&coast.train.speedMps<powered.train.speedMps);
    const release=game.connector.dispatch({type:'release',actorId:'player',commandId:'node/release',leaseId:'node/notch'});assert.equal(release.committed,true);assert.deepEqual(game.connector.readForActor('player').train.controls,{direction:'neutral',power:0,brake:1,leaseId:null});
  }finally{game.dispose();}
});
test('real checkpoint restore revokes the latch and cannot resurrect its retired lease',()=>{
  const game=createTrainYardHost();let restored;try {
    board(game);assert.equal(shift(game,0,1).committed,true);game.advance(.3);restored=createTrainYardHost(game.save());
    const s=restored.connector.readForActor('player');assert.ok(s.train.speedMps>0);assert.deepEqual(s.train.controls,{direction:'neutral',power:0,brake:1,leaseId:null});
    assert.equal(shift(restored,1,2).committed,false);assert.equal(restored.connector.readForActor('player').train.controls.leaseId,null);
    assert.equal(shift(restored,1,3,'node/fresh').committed,true);
  }finally{restored?.dispose();game.dispose();}
});
