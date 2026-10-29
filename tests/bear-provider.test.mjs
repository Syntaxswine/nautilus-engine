import test from 'node:test';
import assert from 'node:assert/strict';
import {createBearProvider} from '../packages/actors-bear/provider.js';
import {bearResources,BEAR_OUTFITS,BEAR_WEAPONS} from '../packages/actors-bear/index.js';
import {createWeaponModel} from '../packages/actors-bear/adapted/weapon-models.js';
import {createHash} from 'node:crypto';
import {fakeRenderer,jsonLoader,textureLoader,T} from './fixtures/bear/helpers.mjs';
const library=(options={})=>createBearProvider({renderer:fakeRenderer(),loadJSON:jsonLoader,loadTexture:textureLoader(),...options});
test('native bear provider creates both outfits with every declared equipment choice on the shared Three',async()=>{
  const renderer=fakeRenderer(),before=renderer.snapshot(),provider=library({renderer});
  try{for(const outfit of BEAR_OUTFITS)for(const weapon of BEAR_WEAPONS){const actor=await provider.create({outfit,weapon});try{assert.ok(actor.root instanceof T.Group);assert.equal(actor.selection.species,'bear');assert.equal(actor.selection.outfit,outfit);assert.equal(actor.worker.weapon.id,weapon);assert.deepEqual(actor.root.scale.toArray(),[1,1,1]);for(const contact of actor.worker.diagnostics().contacts)assert.ok(contact.error<1e-6,weapon+' hand contact');assert.ok(actor.bounds().body.max.every(Number.isFinite));assert.equal(actor.root.getObjectByName('fitted Red Hat cap')!==undefined,outfit==='red-hats');}finally{actor.dispose();actor.dispose();assert.equal(actor.diagnostics().ownedResources,0);}}assert.equal(provider.stats().actors,0);assert.deepEqual(renderer.snapshot(),before);}finally{provider.dispose();provider.dispose();await provider.whenIdle();}assert.equal(provider.stats().ownedResources,0);assert.equal(bearResources().length,8);
});
test('simultaneous bears keep native carry settings, skeletons, equipment and paint isolated',async()=>{
  const provider=library(),[first,second]=await Promise.all([provider.create({weapon:'hmg'}),provider.create({outfit:'red-hats',weapon:'rpg'})]);
  try{assert.notEqual(first.worker.skeleton,second.worker.skeleton);assert.notEqual(first.worker.parts[0].geometry,second.worker.parts[0].geometry);assert.notEqual(first.worker.parts[0].material,second.worker.parts[0].material);const carry=structuredClone(second.worker.weapon.carry);await first.setEquipment('pistol');assert.deepEqual(second.worker.weapon.carry,carry);first.dispose();second.pose('carry',90);assert.ok(second.worker.diagnostics().contacts.every(c=>c.error<1e-6));}finally{provider.dispose();}
});
test('borrowed HMG/RPG carry settings and parent transforms survive motion and release; concurrent loans reject',async()=>{
  const provider=library(),host=new T.Group(),weapon=createWeaponModel('hmg'),carry=weapon.carry;host.add(weapon.root);weapon.root.position.set(2,3,4);let disposed=0;const dispose=weapon.dispose;weapon.dispose=()=>{disposed++;dispose();};
  try{const actor=await provider.create({weapon:'hmg',borrowedWeapon:weapon});assert.notEqual(weapon.carry,carry);await assert.rejects(provider.create({weapon:'hmg',borrowedWeapon:weapon}),/already has a live actor/);const idle=actor.motion('idle');idle.sample(.5);await actor.setEquipment('rifle');assert.equal(weapon.carry,carry);assert.equal(weapon.root.parent,host);assert.deepEqual(weapon.root.position.toArray(),[2,3,4]);assert.equal(disposed,0);actor.dispose();}finally{provider.dispose();weapon.dispose();}assert.equal(disposed,1);
});
test('host-selected Three mismatch and unsupported selector combinations reject before loading',async()=>{
  assert.throws(()=>library({THREE:{}}),/shared Three/);let loads=0;const provider=library({loadJSON:async()=>{loads++;throw Error('unexpected');}});try{await assert.rejects(provider.create({outfit:'substitute'}),/supported bear/);assert.equal(loads,0);}finally{provider.dispose();}
});

const poseState=actor=>{const hash=createHash('sha256');for(const part of actor.worker.parts)for(const attribute of Object.values(part.geometry.attributes))hash.update(new Uint8Array(attribute.array.buffer,attribute.array.byteOffset,attribute.array.byteLength));return {surfaces:hash.digest('hex'),inverses:actor.worker.skeleton.boneInverses.flatMap(matrix=>matrix.elements),bones:actor.worker.bones.flatMap(bone=>[...bone.position.toArray(),...bone.quaternion.toArray(),...bone.scale.toArray()])};};
const samePose=(actual,expected,label)=>{assert.equal(actual.surfaces,expected.surfaces,label+' exact geometry');assert.deepEqual(actual.inverses,expected.inverses,label+' bind-space inverses');assert.equal(actual.bones.length,expected.bones.length);actual.bones.forEach((value,index)=>assert.ok(Math.abs(value-expected.bones[index])<1e-12,label+' joint '+index));};
test('host translation, yaw and parent transforms preserve native pose, equipment, local diagnostics and bounds',async()=>{
  const provider=library(),plain=await provider.create({outfit:'red-hats'}),placed=await provider.create({outfit:'red-hats'}),parent=new T.Group();
  parent.position.set(-12,3,24);parent.rotation.y=-.4;parent.add(placed.root);placed.root.position.set(100,6,-40);placed.root.rotation.y=.7;parent.updateMatrixWorld(true);const transform=placed.root.matrixWorld.clone();
  const equalNative=label=>{samePose(poseState(placed),poseState(plain),label);assert.deepEqual(placed.bounds(),plain.bounds(),label+' local bounds');assert.ok(placed.diagnostics().body.contacts.every(contact=>contact.error<1e-6));parent.updateMatrixWorld(true);assert.deepEqual(placed.root.matrixWorld.elements,transform.elements,label+' host placement');};
  try{
    for(const weapon of ['rifle','hmg','rpg','grenade','hands','flamethrower']){
      await plain.setEquipment(weapon);await placed.setEquipment(weapon);plain.pose('carry',35);placed.pose('carry',35);equalNative(weapon+' carry');
      const families=[['idle',.7],['walk',.39],['crawl',.2],['posture',{heading:0,distance:0,blend:0,pose:{prone:1}}],['ladder',.3],['roof-mantle',.5],['descent',.5],...(weapon==='rifle'?[['aim-fire',5]]:weapon==='grenade'?[['throw',2.1]]:weapon==='hands'?[['chair',4]]:weapon==='flamethrower'?[['fire',.7]]:[])];
      for(const [family,value]of families){let stage='origin constructor';try{const first=plain.motion(family);stage='placed constructor';const second=placed.motion(family);stage='samples';first.sample(value);second.sample(value);equalNative(weapon+' '+family);if(family==='aim-fire'){const local=new T.Vector3(...second.diagnostics().muzzle.origin),world=placed.worker.weapon.anchors.muzzle.getWorldPosition(new T.Vector3());assert.ok(placed.root.localToWorld(local).distanceTo(world)<1e-9);}first.dispose();second.dispose();equalNative(weapon+' '+family+' cleanup');}catch(error){error.message=weapon+' '+family+' '+stage+': '+error.message;throw error;}}
    }
  }finally{provider.dispose();}
});
test('supported motion families seek deterministically and restore native surfaces before the next playback',async()=>{
  const provider=library(),actor=await provider.create({weapon:'rifle'});const report=[];
  try{
    for(const [family,value,parameters]of [['idle',.7,{}],['walk',.39,{}],['posture',{heading:0,distance:0,blend:0,pose:{kneel:1}},{}],['posture',{heading:0,distance:0,blend:0,pose:{prone:1}},{}],['posture',{heading:0,distance:0,blend:0,pose:{down:.7}},{}],['crawl',.2,{}],['aim-fire',5,{}],['ladder',.3,{}],['roof-mantle',.5,{}],['descent',.5,{}]]){
      actor.pose('carry');const before=poseState(actor),motion=actor.motion(family);try{motion.sample(value,parameters);const first=poseState(actor);motion.sample(typeof value==='number'?0:{...value,pose:{}},parameters);motion.sample(value,parameters);samePose(poseState(actor),first,family+' seek/replay');if(family==='aim-fire'){const expected=actor.worker.weapon.anchors.muzzle.getWorldPosition(new T.Vector3()),actual=new T.Vector3(...motion.diagnostics().muzzle.origin);assert.ok(actual.distanceTo(expected)<1e-9);assert.ok(motion.diagnostics().contacts.every(contact=>contact.error<1e-6));}report.push(family);}finally{motion.dispose();}actor.pose('carry');samePose(poseState(actor),before,family+' restored surfaces');
    }
    const burn=actor.motion('burn',{points:[{x:0,y:0,z:0},{x:1,y:0,z:0}]});burn.sample(.7);burn.sample(3);const burnPose=poseState(actor);burn.sample(0);burn.sample(3);samePose(poseState(actor),burnPose,'burn seek');burn.dispose();assert.throws(()=>actor.motion('fire'),/Unsupported/);
    await actor.setEquipment('flamethrower');const fire=actor.motion('fire');fire.sample(.7);const firePose=poseState(actor);fire.sample(0);fire.sample(.7);samePose(poseState(actor),firePose,'fire seek');fire.dispose();
    await actor.setEquipment('hands');const chair=actor.motion('chair');chair.sample(4);chair.dispose();assert.throws(()=>actor.motion('aim-fire'),/Unsupported/);
    await actor.setEquipment('grenade');const thrown=actor.motion('throw');thrown.sample(1);thrown.sample(2.1);thrown.dispose();assert.throws(()=>actor.motion('chair'),/Unsupported/);assert.throws(()=>actor.motion('prone-aim'),/Unsupported/);assert.equal(report.length,10);
  }finally{provider.dispose();}assert.equal(provider.stats().ownedResources,0);
});
test('speaking is opt-in, uses its pinned mesh and restores the same jaw pose without gameplay effects',async()=>{
  const keys=[],provider=library({loadJSON:async(url,options)=>{keys.push(options.key);return jsonLoader(url);}}),actor=await provider.create({speaking:true});
  try{assert.ok(keys.includes('speakingHead'));actor.setJaw(.08);const first=actor.worker.root.getObjectByName('jaw').quaternion.toArray();actor.setJaw(0);actor.setJaw(.08);assert.deepEqual(actor.worker.root.getObjectByName('jaw').quaternion.toArray(),first);assert.ok(actor.capabilities().some(c=>c.id==='speaking'));assert.throws(()=>actor.motion('chair'),/Unsupported/);actor.motion('idle').sample(.4);}finally{provider.dispose();}
});
test('failing projection restores borrowed renderer state and closes partial actor resources; retry succeeds',async()=>{
  const renderer=fakeRenderer(),before=renderer.snapshot(),textures=[],provider=library({renderer,loadTexture:async()=>{const texture=await textureLoader()();let count=0;texture.addEventListener('dispose',()=>count++);textures.push({texture,count:()=>count});return texture;}});let fail=true;renderer.render=()=>{if(fail)throw Error('Projection failure');};
  try{await assert.rejects(provider.create(),/Projection failure/);assert.equal(provider.stats().actors,0);assert.deepEqual(renderer.snapshot(),before);fail=false;const actor=await provider.create();actor.dispose();assert.equal(provider.stats().actors,0);}finally{provider.dispose();}assert.ok(textures.every(item=>item.count()===1));
});
test('provider cancellation releases late textures once; per-actor cancellation preserves another live actor and borrowed atlas',async()=>{
  let finish;const borrowed=await textureLoader()();let borrowedDisposals=0;borrowed.addEventListener('dispose',()=>borrowedDisposals++);const provider=library({borrowedTextures:{weaponAtlas:borrowed}}),live=await provider.create();
  try{const controller=new AbortController(),cancelled=provider.create({outfit:'red-hats',signal:controller.signal});controller.abort();await assert.rejects(cancelled,error=>error.name==='AbortError');live.pose('carry');assert.equal(provider.stats().actors,1);}finally{provider.dispose();}assert.equal(borrowedDisposals,0);borrowed.dispose();
  const late=library({loadTexture:()=>new Promise(resolve=>finish=resolve)}),pending=late.create();while(!finish)await new Promise(resolve=>setTimeout(resolve,0));late.dispose();const texture=await textureLoader()();let count=0;texture.addEventListener('dispose',()=>count++);finish(texture);await assert.rejects(pending,error=>error.name==='AbortError');await late.whenIdle();assert.equal(count,1);assert.equal(late.stats().ownedResources,0);assert.equal(late.stats().actors,0);
});

test('all thirteen equipment bindings preserve native floor support and limb lengths through walk/crawl/traversal samples',async()=>{
  const provider=library();try{for(const weapon of BEAR_WEAPONS){const actor=await provider.create({weapon});try{const lengths=actor.worker.bones.map(bone=>bone.position.length());for(const [family,value]of [['walk',.39],['crawl',.2],['ladder',.3],['roof-mantle',.4],['descent',.5]]){const motion=actor.motion(family);motion.sample(value);assert.ok(actor.worker.bones.every((bone,index)=>bone.name==='hips'||Math.abs(bone.position.length()-lengths[index])<1e-7),weapon+' '+family+' native joints');if(family==='walk'||family==='crawl')assert.ok(actor.bounds().body.min[1]>=-.001,weapon+' '+family+' ground');motion.dispose();}assert.deepEqual(actor.root.scale.toArray(),[1,1,1]);}finally{actor.dispose();}}}finally{provider.dispose();}
});
test('owned skeleton/bone textures and geometry release once; cached textures/host renderer have distinct lifetimes',async()=>{
  const provider=library(),actor=await provider.create(),counts=[];actor.worker.skeleton.computeBoneTexture();
  for(const resource of new Set([actor.worker.skeleton.boneTexture,...actor.worker.parts.map(part=>part.geometry),actor.worker.parts[0].material])){const record={count:0};resource.addEventListener('dispose',()=>record.count++);counts.push(record);}
  const motion=actor.motion('aim-fire');motion.source.skeleton.computeBoneTexture();let motionBoneDisposals=0;motion.source.skeleton.boneTexture.addEventListener('dispose',()=>motionBoneDisposals++);motion.sample(5);motion.dispose();assert.equal(motionBoneDisposals,1);actor.dispose();actor.dispose();provider.dispose();assert.ok(counts.every(record=>record.count===1));assert.equal(motionBoneDisposals,1);assert.equal(provider.stats().ownedResources,0);
});
test('native body/visual/equipped clearance distinguishes the 2m kit from a lower prototype door and prone space',async()=>{
  const provider=library();try{for(const outfit of BEAR_OUTFITS){const actor=await provider.create({outfit,weapon:'hands'});const bounds=actor.bounds();assert.ok(bounds.body.max[1]>1.65,'standing body requires more than the old prototype 1.65m lintel');assert.ok(bounds.visual.max[1]<2,'native model has headroom under the 2m kit ceiling');assert.ok(bounds.visual.min[1]>=-.001);assert.ok(bounds.visual.max[2]-bounds.visual.min[2]<1);actor.root.position.set(100,6,-40);const moved=actor.bounds();bounds.body.min.forEach((value,index)=>assert.ok(Math.abs(value-moved.body.min[index])<1e-12));await actor.setEquipment('rpg');const equipped=actor.bounds();assert.ok(equipped.visual.max[0]-equipped.visual.min[0]>1,'RPG extends beyond a one-tile body reservation');await actor.setEquipment('rifle');const prone=actor.motion('posture');prone.sample({heading:0,distance:0,blend:0,pose:{prone:1}},{ground:true});assert.ok(actor.bounds().visual.max[1]<1,'named 1m prone clearance fixture');assert.ok(Math.abs(actor.bounds().body.min[1]-.012)<1e-6);actor.dispose();}}finally{provider.dispose();}
});
