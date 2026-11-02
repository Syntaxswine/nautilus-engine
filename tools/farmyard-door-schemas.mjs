import fs from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
import {FARMYARD_DOOR_PROFILE as P,FARMYARD_DOOR_CONTRACT as C,WEAPON_RANGES} from '../packages/adapters/farmyard/doors/profile.js';
const ref=name=>({$ref:'#/$defs/'+name}),constant=value=>({const:value}),boolean={type:'boolean'},number=(minimum,maximum)=>({type:'number',minimum,maximum}),integer=(minimum,maximum)=>({type:'integer',minimum,maximum}),text=maxLength=>({type:'string',minLength:1,maxLength}),array=(items,maxItems)=>({type:'array',items,maxItems}),record=(properties,required=Object.keys(properties))=>({type:'object',additionalProperties:false,required,properties}),nullable=value=>({anyOf:[value,{type:'null'}]});
const sid={type:'string',pattern:'^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,95}(?![\\s\\S])',maxLength:96},id={anyOf:[sid,integer(Number.MIN_SAFE_INTEGER,Number.MAX_SAFE_INTEGER)]},xy=record({x:number(-10000,10000),y:number(-10000,10000)});
const control=record({actorId:id,phase:{enum:['explore','player','enemy','won','lost']},status:{enum:['active','extracted','lost']},engaged:boolean,round:integer(0,1e9),detected:{...array(id,128),uniqueItems:true}});
const context={
  world:record({bounds:record({x:number(-1000,1000),y:number(-1000,1000),w:number(1,240),h:number(1,240)}),grid:record({width:integer(1,240),height:integer(1,240)}),staticBoxes:array(record({id:sid,interactionId:nullable(sid),kind:{enum:['wall','crate','prop','part']},x0:number(-10000,10000),x1:number(-10000,10000),y0:number(-10000,10000),y1:number(-10000,10000),z0:number(0,100),height:number(0,100)}),C.boxes),seen:ref('fog'),visible:ref('fog'),fogAt:nullable(xy)}),
  doors:array(record({id:sid,name:text(160),x:number(-10000,10000),y:number(-10000,10000),edge:{type:'string',pattern:'^[es]:[0-9]+:[0-9]+(?![\\s\\S])'},swing:{enum:[-1,1]},range:constant(P.reachM),open:boolean}),C.doors),
  actors:array(record({id,name:text(96),team:{enum:['squad','guard']},species:text(96),stance:{enum:['standing','kneeling','prone']},sneaking:boolean,cone:nullable(number(-1e6,1e6)),x:number(-10000,10000),y:number(-10000,10000),z:constant(0),hp:number(0,1e6),ap:number(-P.epsilon,1e6),maxAp:number(0,1e6),weapon:{enum:Object.keys(WEAPON_RANGES)},heading:number(-1e6,1e6),isMoving:boolean,burningTurns:constant(0),alert:boolean,lastKnown:nullable(xy),alertAge:number(0,1e6)}),C.actors),
  control,queue:array(ref('data'),C.queue),support:record({...Object.fromEntries(['pairs','locks','difficulty','damage','vertical','windows','reactive'].map(key=>[key,constant(false)])),refresh:constant(P.refresh)})
};
const command={version:constant(1),id,expectedRevision:integer(0,C.maximumReceipts)};
const consequences=array({oneOf:[
  record({type:constant('stop-movement'),actorId:id}),
  record({type:constant('door-edge'),doorId:sid,edge:{type:'string'},kind:{enum:['door','closed-door']},open:boolean}),
  record({type:constant('log-door'),actorId:id,doorId:sid,name:text(160),open:boolean,cost:{enum:[0,1]}}),
  record({type:constant('invalidate-geometry-and-routes'),doorId:sid}),
  record({type:{enum:['log-contact','log-contact-broken']},actorId:id}),
  record({type:constant('refresh-visibility'),forceFog:constant(true)})
]},8);
export function farmyardDoorSchemas(){
  const schema={
    $schema:'https://json-schema.org/draft/2020-12/schema',$id:'urn:nautilus:schema:farmyard-door-state:1',
    title:'Farmyard single-ground-leaf endpoint state v1',
    description:'Structural contract. The headless loader additionally verifies descriptor-safe plain data, byte/node/depth budgets, unique identities, references, geometry consistency and complete deterministic journal replay.',
    ...record({kind:constant(C.schemaId),version:constant(1),id,profileId:constant(P.id),revision:integer(0,C.maximumReceipts),initial:ref('context'),...context,receipts:array({oneOf:[ref('actionReceipt'),ref('contextReceipt')]},C.maximumReceipts)}),
    $defs:{
      data:{anyOf:[{type:['null','boolean','number','string']},array(ref('data'),65536),{type:'object',propertyNames:{not:{enum:['__proto__','prototype','constructor']}},additionalProperties:ref('data')}]},
      fog:{...array({type:'string',pattern:'^(0|[1-9][0-9]*),(0|[1-9][0-9]*)(?![\\s\\S])'},65536),uniqueItems:true},
      context:record(context),action:record({...command,actorId:id,doorId:sid,action:{enum:['open','close']}}),checkpoint:record({...command,...context}),
      actionReceipt:record({id:text(512),type:constant('action'),command:ref('action'),revision:integer(1,C.maximumReceipts),cost:{enum:[0,1]},before:record({ap:number(-P.epsilon,1e6),open:boolean}),after:record({ap:number(-P.epsilon,1e6),open:boolean}),controlBefore:control,controlAfter:control,eventType:{enum:['door-opened','door-closed']},consequences}),
      contextReceipt:record({id:text(512),type:constant('context'),command:ref('checkpoint'),revision:integer(1,C.maximumReceipts)})
    }
  };
  const host={
    $schema:schema.$schema,$id:'urn:nautilus:schema:farmyard-door-host-save:1',title:'Complete retained Farmyard host + door save v1',
    description:'The executable loader also validates the closed published-source projection against a pure retained geometry query, exact context equality and the aggregate 8 MB / 500000 node / depth 24 budget before adoption.',
    ...record({kind:constant('nautilus-farmyard-door-host-save'),version:constant(1),profileId:constant(P.id),doorState:{$ref:schema.$id},source:{type:'object',required:['map','edges','units','interactables','phase','round','visible','seen','detected','log','revision','queue','solo'],additionalProperties:{$ref:schema.$id+'#/$defs/data'}},setFields:{type:'array',items:{enum:['seen','visible','detected']},maxItems:3,uniqueItems:true}})
  };
  return [{file:'door-state-v1.schema.json',schema},{file:'door-host-save-v1.schema.json',schema:host}];
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
  const base=new URL('../packages/adapters/farmyard/doors/',import.meta.url);
  for(const {file,schema}of farmyardDoorSchemas()){const filename=fileURLToPath(new URL(file,base)),source=JSON.stringify(schema,null,2)+'\n';if(process.argv.includes('--write'))fs.writeFileSync(filename,source);else if(fs.readFileSync(filename,'utf8')!==source)throw Error('Door schema drift: '+file);}
  console.log(process.argv.includes('--write')?'Wrote the two adjacent door candidate schemas.':'Verified the two adjacent door candidate schemas.');
}
