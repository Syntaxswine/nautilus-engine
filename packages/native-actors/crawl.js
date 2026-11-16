// Durable presentation state only. Movement, clocks, resources and actions stay
// with the host. This does not deserialize Fighters' temporary samples cache.
const copy=value=>structuredClone(value);
const canonical=v=>v&&typeof v==='object'?Array.isArray(v)?v.map(canonical):Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const equal=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
const fail=message=>{throw Object.assign(Error(message),{code:'UNSUPPORTED_NATIVE_CRAWL'});};
const record=v=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
function keys(v,list){if(!record(v)||Object.keys(v).length!==list.length||Object.keys(v).some(k=>!list.includes(k)))fail('Use the complete versioned native crawl record.');}
function finite(v,min,max){if(!Number.isFinite(v)||v<min||v>max)fail('Native crawl values are outside the supported bounds.');}
export const NATIVE_CRAWL_CONTRACT=Object.freeze({id:'nautilus-native-goat-crawl-v1',version:1,models:Object.freeze(['goat']),equipment:Object.freeze(['hands','rifle']),units:'metres-seconds-degrees',heading:'0=+x,90=+y; world {x,y,h}',surface:'one explicit horizontal plane; no slopes/stairs/other floors',owner:'confirmed host travel only; one mutually exclusive pose owner'});
export function crawlSurface(input){keys(input,['kind','floorId','heightM']);if(input.kind!=='flat-plane'||typeof input.floorId!=='string'||!input.floorId.length||input.floorId.length>128)fail('Declare a named flat plane for native crawl.');finite(input.heightM,-1000,1000);return copy(input);}
export function confirmedCrawlSample(input,surface){
  keys(input,['kind','version','actorId','revision','mode','position','heading','stance','action','travelM','floorId']);
  if(input.kind!=='nautilus-native-crawl-sample'||input.version!==1||typeof input.actorId!=='string'||!input.actorId.length||input.actorId.length>128||!Number.isSafeInteger(input.revision)||input.revision<0||input.mode!=='on-foot'||!['standing','prone'].includes(input.stance)||!['locomotion','other'].includes(input.action)||input.floorId!==surface.floorId)fail('Unsupported native crawl actor, action, stance or floor.');
  keys(input.position,['x','y','h']);for(const axis of ['x','y','h'])finite(input.position[axis],-1e6,1e6);finite(input.heading,-180,180);finite(input.travelM,0,1e9);
  if(Math.abs(input.position.h-surface.heightM)>1e-8)fail('Native crawl requires the declared flat ground height.');
  return copy(input);
}
export function createCrawlCursor({actorId,model='goat',equipment='hands',surface,checkpoint}={}){
  surface=crawlSurface(surface);
  if(model!=='goat'||!['hands','rifle'].includes(equipment)||typeof actorId!=='string'||!actorId.length||actorId.length>128)fail('This crawl binding supports a bounded actor ID and native goat with hands or rifle only.');
  let state={kind:'nautilus-native-crawl-cursor',version:1,actorId,model,equipment,surface,signedDistanceM:0,walkDistanceM:0,blend:0,last:null},seeded=false,epoch=0;
  if(checkpoint!==undefined){const c=copy(checkpoint);keys(c,Object.keys(state));if(c.kind!==state.kind||c.version!==1||c.actorId!==actorId||c.model!==model||c.equipment!==equipment||!equal(c.surface,surface))fail('Incompatible native crawl checkpoint.');finite(c.signedDistanceM,-1e9,1e9);finite(c.walkDistanceM,0,1e9);finite(c.blend,0,1);if(c.last!==null){c.last=confirmedCrawlSample(c.last,surface);if(c.last.actorId!==actorId)fail('Restored crawl actor differs.');}else if(c.signedDistanceM!==0||c.walkDistanceM!==0||c.blend!==0)fail('Unseeded native crawl checkpoint has nonzero motion.');state=c;seeded=!!c.last;}
  return Object.freeze({read:()=>copy(state),
    stage(input){const sample=confirmedCrawlSample(input,surface),prior=state.last;
      if(sample.actorId!==actorId)fail('Native crawl identity differs from the retained actor.');
      if(seeded&&!equal(sample,prior))fail('Restored native crawl sample differs from the retained host.');
      if(prior&&sample.revision<prior.revision)fail('Native crawl requires monotonic confirmed revisions.');
      if(prior&&sample.revision===prior.revision&&!equal(sample,prior))fail('A confirmed revision cannot change its pose.');
      const dx=prior?sample.position.x-prior.position.x:0,dy=prior?sample.position.y-prior.position.y:0,step=Math.hypot(dx,dy),travel=prior?sample.travelM-prior.travelM:0;
      if(travel<0||step>2||Math.abs(step-travel)>1e-6)fail('Native crawl requires one accepted straight host segment (at most 2 m), with matching travel.');
      if(prior&&(sample.stance!==prior.stance||sample.action!==prior.action)&&step>1e-7)fail('Commit posture/action changes at a stationary host boundary.');
      const crawl=sample.stance==='prone'&&sample.action==='locomotion',advances=step>1e-7&&!seeded,
        signed=advances&&crawl&&prior?.stance==='prone'&&prior.action==='locomotion'?(dx*Math.cos(sample.heading*Math.PI/180)+dy*Math.sin(sample.heading*Math.PI/180)<0?-travel:travel):0;
      const repeat=!!prior&&sample.revision===prior.revision;
      const next={...state,signedDistanceM:state.signedDistanceM+signed,walkDistanceM:state.walkDistanceM+(advances&&sample.stance==='standing'&&sample.action==='locomotion'?travel:0),blend:seeded||repeat?state.blend:advances?1:0,last:sample};
      finite(next.signedDistanceM,-1e9,1e9);finite(next.walkDistanceM,0,1e9);
      const expectedEpoch=epoch;let committed=false;
      return {next:copy(next),restoring:seeded,repeat,commit(){if(committed)return;if(epoch!==expectedEpoch)fail('Native crawl sample became stale; stage against the current confirmed cursor.');state=next;seeded=false;epoch++;committed=true;}};
    }
  });
}
