import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../packages/render-effects/three.js';
import {createNativeCrawlBody} from '../packages/native-actors/crawl-three.js';
import {createCrawlCursor} from '../packages/native-actors/crawl.js';
const surface={kind:'flat-plane',floorId:'yard',heightM:0};
const data=()=>JSON.parse(fs.readFileSync(new URL('../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/goat-10k-data.json',import.meta.url),'utf8'));
const sample=(extra={})=>({kind:'nautilus-native-crawl-sample',version:1,actorId:'goat',revision:0,mode:'on-foot',position:{x:2,y:4,h:0},heading:0,stance:'standing',action:'locomotion',travelM:900,floorId:'yard',...extra});
const transforms=body=>[...body.root.position.toArray(),...body.worker.root.position.toArray(),...body.worker.root.quaternion.toArray(),...body.worker.bones.flatMap(b=>[...b.position.toArray(),...b.quaternion.toArray()])];
function bounds(root){const box=new T.Box3(),v=new T.Vector3();root.traverse(mesh=>{if(!mesh.isMesh)return;for(const i of new Set(mesh.geometry.index?.array??Array.from({length:mesh.geometry.attributes.position.count},(_,i)=>i))){mesh.getVertexPosition(i,v);box.expandByPoint(v.applyMatrix4(mesh.matrixWorld));}});return box;}

test('crawl cursor seeds counters and follows confirmed forward/reverse travel only',()=>{
  const c=createCrawlCursor({actorId:'goat',surface,equipment:'hands'});let p=sample();const apply=p=>{const s=c.stage(p);s.commit();return s.next;};
  assert.equal(apply(p).signedDistanceM,0);p={...p,revision:1,stance:'prone'};apply(p);
  p={...p,revision:2,position:{...p.position,x:2.3},travelM:900.3};assert(Math.abs(apply(p).signedDistanceM-.3)<1e-8);
  const moving=c.read();apply(p);assert.deepEqual(c.read(),moving,'same confirmed revision cannot settle a durable moving blend');
  for(const heading of [90,-90,180,0]){p={...p,revision:p.revision+1,heading};assert(Math.abs(apply(p).signedDistanceM-.3)<1e-8);}
  p={...p,revision:p.revision+1,position:{...p.position,x:2.1},travelM:900.5};assert(Math.abs(apply(p).signedDistanceM-.1)<1e-8);
  const before=c.read();assert.throws(()=>apply({...p,revision:p.revision+1,travelM:0}),/accepted straight/);assert.deepEqual(c.read(),before);
  assert.throws(()=>apply({...p,position:{...p.position,h:.1},revision:p.revision+1}),/flat ground/);
  assert.throws(()=>createCrawlCursor({actorId:'goat',surface,model:'donkey'}),/goat/);
  const staged=c.stage({...p,revision:p.revision+1}),fresh=c.stage({...p,revision:p.revision+2});fresh.commit();const retained=c.read();assert.throws(()=>staged.commit(),/stale/);fresh.commit();assert.deepEqual(c.read(),retained);
});

for(const equipment of ['hands','rifle'])test('actual native goat '+equipment+' has ground clearance and restores the exact moving pose',()=>{
  const options={model:'goat',actorId:'goat',data:data(),crawl:{surface,equipment}},body=createNativeCrawlBody(options);let restored;
  try{
    let p=sample();body.update(p);p={...p,revision:1,stance:'prone'};body.update(p);
    let minimumBody=Infinity,minimumWeapon=Infinity;
    for(let i=0;i<56;i++){
      const direction=i<28?1:-1,step=.025;p={...p,revision:p.revision+1,position:{...p.position,x:p.position.x+step*direction},travelM:p.travelM+step};const result=body.update(p);
      assert.equal(result.role,'crawl');assert(body.worker.root.position.length()<1e-10,'study root compensated once');
      if(equipment==='rifle')assert(result.gripErrorM<1e-8,'actual native hand/weapon contact');
      const box=bounds(body.worker.root);minimumBody=Math.min(minimumBody,box.min.y);
      if(equipment==='rifle')minimumWeapon=Math.min(minimumWeapon,bounds(body.worker.weapon.root).min.y);
      if(i===19){
        const checkpoint=body.checkpoint(),before=transforms(body);restored=createNativeCrawlBody({...options,data:data(),checkpoint:JSON.parse(JSON.stringify(checkpoint))});restored.update(p);
        const after=transforms(restored);assert.equal(before.length,after.length);before.forEach((n,j)=>assert(Math.abs(n-after[j])<1e-10,'exact restored native bone '+j));
        const next={...p,revision:p.revision+1,position:{...p.position,x:p.position.x+.02},travelM:p.travelM+.02};const a=body.update(next),b=restored.update(next);assert.deepEqual(a,b);transforms(body).forEach((n,j)=>assert(Math.abs(n-transforms(restored)[j])<1e-10));p=next;restored.dispose();restored=null;
      }
    }
    assert(minimumBody>=-1e-5,'actual mesh below ground: '+minimumBody);
    if(equipment==='rifle')assert(minimumWeapon>=.005,'native rifle ground clearance: '+minimumWeapon);
    const phase=body.update(p).phase;p={...p,revision:p.revision+1};const stopped=body.update(p);assert.equal(stopped.phase,phase);
    p={...p,revision:p.revision+1,heading:90};assert.equal(body.update(p).phase,phase);
    const before=transforms(body),saved=body.checkpoint();assert.throws(()=>body.update({...p,revision:p.revision+1,floorId:'upstairs'}),/floor/);assert.deepEqual(transforms(body),before);assert.deepEqual(body.checkpoint(),saved);
    p={...p,revision:p.revision+1,action:'other'};assert.equal(body.update(p).poseOwner,'host-action');
    const hand=body.worker.bones.find(b=>b.name==='hand1');hand.rotation.z=.24;const lent=hand.quaternion.toArray();p={...p,revision:p.revision+1};body.update(p);assert.deepEqual(hand.quaternion.toArray(),lent,'suspended crawl cannot overwrite the other pose owner');
    p={...p,revision:p.revision+1,action:'locomotion'};assert.equal(body.update(p).phase,phase);
    p={...p,revision:p.revision+1,stance:'standing'};assert.equal(body.update(p).role,'idle');
    if(equipment==='rifle')assert(body.worker.weapon.root.visible,'equipped native carry remains visible while standing');
    console.log(JSON.stringify({equipment,minimumBody,minimumWeapon:equipment==='rifle'?minimumWeapon:null}));
  }finally{restored?.dispose();body.dispose();body.dispose();}
});
