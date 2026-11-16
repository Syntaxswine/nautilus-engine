import {createGroundHost} from './host.js';
import {goldenRecipe,fixtureById} from './registry.js';
import {clone,canonical} from './data.js';

export function runStealthFixture(recipe,record) {
  const f=fixtureById('golden-foliage-stealth'),r=goldenRecipe(f,recipe),hosts=[];
  try {
    const make=y=>{const h=createGroundHost({recipe:r,spawn:{x:11.5,y:16.5+y,h:0}});hosts.push(h);return h;},bare=make(4),brush=make(11),quiet=make(4);
    const authored=record.executionSource?.authoredFoliage?.map;
    if(authored){for(const h of hosts){const map=clone(authored);if(h!==brush)delete map.foliage;const candidate=h.prepareFoliage(map);if(!candidate.ok)throw Error(candidate.reason);const r=candidate.commit();if(!r.ok)throw Error(r.reason);}}
    quiet.actions.request('stealth/mode',quiet.actions.read().context);
    const baseline=hosts.map(h=>h.read()),commands=[];
    for(let i=0;i<30;i++)for(const h of hosts){const receipt=h.walking.request({version:1,actorId:'player',vector:{x:1,y:0},seconds:.05});if(!receipt.ok)throw Error(receipt.code+': '+receipt.reason);h.advance(.05);commands.push({actor:h===bare?'bare':h===brush?'brush':'quiet',receipt});}
    const observed=hosts.map(h=>({state:h.read(),queries:h.readStealth()})),checks=[],failures=[];
    const expect=(name,expected,actual)=>{const ok=canonical(expected)===canonical(actual);checks.push({name,expected,observed:clone(actual),ok});if(!ok)failures.push(name);};
    expect('brush reduces confirmed awareness',record.objective.expected.brushReducesAwareness,(observed[0].queries.state.contacts[0]?.score??0)>(observed[1].queries.state.contacts[0]?.score??0));
    expect('sneak reduces confirmed heard events',record.objective.expected.sneakReducesHeardEvents,observed[0].queries.heard.length>observed[2].queries.heard.length);
    expect('bare and brush travel equal distances',true,Math.abs(observed[0].queries.pose.travelM-observed[1].queries.pose.travelM)<1e-8);
    expect('all health preserved',true,observed.every((o,i)=>o.state.resources.health===baseline[i].resources.health));
    expect('all AP preserved in explicit realtime profile',true,observed.every((o,i)=>o.state.resources.ap===baseline[i].resources.ap));
    expect('all accepted travel spends stamina',record.objective.expected.resourcesNeverRefilled,observed.every((o,i)=>o.state.resources.stamina<baseline[i].resources.stamina));
    expect('distinct hearing events',true,observed.every(o=>new Set(o.queries.heard.map(e=>e.eventId)).size===o.queries.heard.length));
    return {...record,status:failures.length?'failed':'passed',missionComplete:!failures.length,reason:failures.join('; ')||null,baseline,observed,checks,failures,command:{steps:30,secondsPerStep:.05,commands},evidence:{scope:'Deterministic public authority replay. Actual keyboard/touch and native phase restore are separate browser evidence.'}};
  } catch(error){return {...record,status:'failed',missionComplete:false,reason:error.message,checks:[],failures:[error.message],command:null};} finally {hosts.forEach(h=>h.dispose());}
}
