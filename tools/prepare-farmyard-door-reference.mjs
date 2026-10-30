import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import * as Source from '../vendor/farmyard-grenades/251bf8094b5f9ebe44208443084c1a6d6658512a/sites/tactical-animal/dist/solo-game.js';
import {projectFarmyardDoorContext} from '../packages/adapters/farmyard/doors.js';
const pin='251bf8094b5f9ebe44208443084c1a6d6658512a',donor=process.argv[2];
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const host=Source.createSoloGame({...Source.DEFAULT_BUILD,utility:'grenade'},1947);host.map=Array.from({length:10},()=>Array(10).fill('yard'));host.worldBounds={x:1,y:1,w:8,h:8};host.edges={};
for(let y=1;y<=8;y++)host.edges['e:4:'+y]=[4,5].includes(y)?'closed-door':'wall';
host.interactables=[{id:'reference-gate',kind:'door',name:'Timber gate',x:4.5,y:4,edge:'e:4:4',swing:1,range:1.65,open:false,inventory:[]},{id:'reference-store',kind:'door',name:'Store door',x:4.5,y:5,edge:'e:4:5',swing:1,range:1.65,open:false,inventory:[]}];
host.props=[];host.obstacles=[];host.windows=[];host.seen=new Set(Array.from({length:64},(_,i)=>(1+i%8)+','+(1+Math.floor(i/8))));host.visible=new Set();host.detected=new Set();host.fogAt=null;host.phase='explore';host.engaged=false;host.queue=[];
const hero=Source.hero(host);Object.assign(hero,{x:3.75,y:4,heading:0,hp:37,ap:12,stamina:.125});hero.ammo.pistol=3;host.solo.dressings=0;
const guard=host.units.find(value=>value.team==='guard');Object.assign(guard,{x:5.75,y:4,heading:180,alert:false,lastKnown:null,alertAge:0,hp:Math.max(1,guard.hp)});host.units=[hero,guard];
const fresh=structuredClone(host);Source.refresh(fresh,{forceFog:true});const geometry=Source.geometry(fresh),context=projectFarmyardDoorContext(fresh,{geometry});
const source=JSON.parse(JSON.stringify(fresh,(key,value)=>value instanceof Set?[...value]:value));
const fixture={kind:'nautilus-farmyard-door-reference',version:1,sourcePin:pin,source,setFields:['seen','visible','detected'],context,geometry};
fs.writeFileSync('examples/farmyard-door-reference.fixture.json',JSON.stringify(fixture,null,2)+'\n');
const previousManifest=fs.existsSync('docs/ui/farmyard-door-reference.sources.json')?JSON.parse(fs.readFileSync('docs/ui/farmyard-door-reference.sources.json')):{};
const manifest={sourceRepository:'https://github.com/Syntaxswine/farmyard-commando',sourceCommit:pin,apiCommit:'48a0192777a8a5ade0448b313123418398ce044a',fixture:{path:'examples/farmyard-door-reference.fixture.json',sha256:hash(fs.readFileSync('examples/farmyard-door-reference.fixture.json')),method:'Generated with the immutable 22-module published-source subset and projectFarmyardDoorContext. Fixed 10x10 ground reference layout, two source leaves, one injured squad actor and one guard. Runtime consumes this plain fixture, not donor game modules.'},sources:[],...(previousManifest.controls?{controls:previousManifest.controls}:{})};
if(donor){
 const paths=['sites/tactical-animal/dist/interaction-view.js','sites/tactical-animal/dist/aft/assets/environment/hybrid-surfaces/wood-factory-v2.png'];
 for(const path of paths){const bytes=execFileSync('git',['-c','safe.directory='+donor.replaceAll('\\','/'),'-C',donor,'show',pin+':'+path],{windowsHide:true,maxBuffer:8*1024*1024});const dest='vendor/farmyard-door-view/'+pin+'/'+(path.endsWith('.png')?'wood-factory-v2.png':'interaction-view.js.source');fs.mkdirSync(dest.slice(0,dest.lastIndexOf('/')),{recursive:true});fs.writeFileSync(dest,bytes);if(path.endsWith('.png'))fs.writeFileSync('examples/farmyard-door-reference.wood.png',bytes);manifest.sources.push({path,stored:dest,bytes:bytes.length,sha256:hash(bytes),gitBlob:execFileSync('git',['-c','safe.directory='+donor.replaceAll('\\','/'),'-C',donor,'rev-parse',pin+':'+path],{encoding:'utf8',windowsHide:true}).trim(),role:path.endsWith('.png')?'Unmodified source timber texture; identical static-reference delivery copy in examples/farmyard-door-reference.wood.png':'Unmodified source leaf recipe and endpoint pose evidence; not imported at runtime'});}
}
fs.mkdirSync('docs/ui',{recursive:true});fs.writeFileSync('docs/ui/farmyard-door-reference.sources.json',JSON.stringify(manifest,null,2)+'\n');
console.log('Prepared source-shaped reference fixture and '+manifest.sources.length+' exact source presentation records.');
