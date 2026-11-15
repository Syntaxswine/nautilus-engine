// Focused baseline probe; no donor, preview or original geometry is mutated.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';
import {buildMountDoraContent} from '../mount-dora/content.mjs';
import {createMountDoraWorld,planDonnellyExterior} from '../../packages/mount-dora-core/index.js';
import {createSupportedWalkPolicy} from '../../packages/interactions/index.js';
const output=path.resolve('artifacts/donnelly-circulation');fs.mkdirSync(output,{recursive:true});
buildMountDoraContent(output+'/content',{engineURL:'../../../packages/'});const runtime=await import(pathToFileURL(output+'/content/headless.js')),project=JSON.parse(fs.readFileSync(runtime.projectURL)),fetcher=async u=>new Response(fs.readFileSync(fileURLToPath(u))),parts=planDonnellyExterior().parts;
const options={project,runtime,baseURL:runtime.baseURL,fetcher,presentation:{ordinary:'engine-muted-v1',donnelly:'photo-guided-v1',rail:'connected-study-v1'}};
const topAt=p=>Math.max(0,...parts.filter(s=>s.support&&s.points.every(Array.isArray)&&p.x>=Math.min(...s.points.map(p=>p[0]))-1e-8&&p.x<=Math.max(...s.points.map(p=>p[0]))+1e-8&&p.y>=Math.min(...s.points.map(p=>p[1]))-1e-8&&p.y<=Math.max(...s.points.map(p=>p[1]))+1e-8).map(s=>s.topH));
const records=[];
for(const seconds of [.01,1/60,.025,1/30,.05,.1])for(const policy of [createSupportedWalkPolicy(),createSupportedWalkPolicy({id:'mount-dora-source-deck-v1'})]){
 const world=await createMountDoraWorld({...options,position:{x:410.8,y:477.4,h:0},policy});const row={seconds,policy:policy.id,ascent:[],descent:[],firstFailure:null,maxRootBelowTread:0};
 try{for(const [name,x,goal]of [['ascent',-1,p=>p.h===.848&&p.x<405.7],['descent',1,p=>p.h===0&&p.x>408]]){
   let still=0;for(let i=0;i<500;i++){const before=world.read(),r=world.walking.request({version:1,actorId:'player',vector:{x,y:0},seconds}),after=world.read(),p=after.actor.position,tread=topAt(p);row.maxRootBelowTread=Math.max(row.maxRootBelowTread,tread-p.h);row[name].push({i,ok:r.ok,code:r.code,reason:r.reason,pose:p,travel:!!after.travel,tread});if(!r.ok){row.firstFailure={leg:name,...row[name].at(-1),before:before.actor.position};break;}if(goal(p))break;still=JSON.stringify(before.actor.position)===JSON.stringify(p)?still+1:0;if(still>5){row.firstFailure={leg:name,stalled:true,pose:p};break;}}
   if(row.firstFailure)break;
  }
 }finally{world.dispose();}records.push(row);
}
for(const [name,y,v]of [['diagonal-south',476.8,{x:-1,y:.2}],['diagonal-north',478,{x:-1,y:-.2}],['slow-analog',477.4,{x:-.2,y:0}]]){
 const n=Math.max(1,Math.hypot(v.x,v.y)),vector={x:v.x/n,y:v.y/n},world=await createMountDoraWorld({...options,position:{x:410.8,y,h:0}}),row={name,steps:[],firstFailure:null};try{for(let i=0;i<1500;i++){const r=world.walking.request({version:1,actorId:'player',vector,seconds:1/60}),state=world.read();row.steps.push({i,ok:r.ok,code:r.code,pose:state.actor.position,travel:!!state.travel});if(!r.ok){row.firstFailure=row.steps.at(-1);break;}if(state.actor.position.h===.848&&state.actor.position.x<405.7)break;}}finally{world.dispose();}records.push(row);
}
fs.writeFileSync(output+'/baseline.json',JSON.stringify({base:'0e527697121e2ce60e5ddf02919b4e49424bc62f',records},null,2));
console.log(JSON.stringify(records.map(r=>({seconds:r.seconds,policy:r.policy,name:r.name,firstFailure:r.firstFailure,maxRootBelowTread:r.maxRootBelowTread,steps:r.steps?.length,ascent:r.ascent?.length,descent:r.descent?.length})),null,2));
