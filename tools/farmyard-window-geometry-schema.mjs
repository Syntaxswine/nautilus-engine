import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const ref=name=>({$ref:'#/$defs/'+name}),constant=value=>({const:value}),array=(items,maxItems)=>({type:'array',items,maxItems}),record=(properties,required=Object.keys(properties))=>({type:'object',additionalProperties:false,required,properties}),integer=(minimum,maximum)=>({type:'integer',minimum,maximum}),number={type:'number'},boolean={type:'boolean'};
const sid={type:'string',minLength:1,maxLength:96,pattern:'^[A-Za-z0-9][A-Za-z0-9_.:/-]*(?![\\s\\S])'},edge={type:'string',pattern:'^(s|e):-?(0|[1-9][0-9]*):-?(0|[1-9][0-9]*)(?![\\s\\S])'},joins=record({left:boolean,right:boolean},[]),dimensions=record({width:integer(1,240),height:{type:'number',exclusiveMinimum:0}}),vec={type:'array',minItems:3,maxItems:3,items:number},bounds=record({min:vec,max:vec}),semantic={enum:['empty','wall','door','window']},baseFact={semantic,locked:boolean,sourceKind:sid};
export function windowGeometrySchema(){return {
  $schema:'https://json-schema.org/draft/2020-12/schema',$id:'urn:nautilus:candidate:window-geometry:1',title:'Bounded window geometry snapshot v1 (compile/query candidate)',
  description:'Geometry observations only; no impact authority, receipts or complete-game save. The executable loader also checks finite float headroom, aggregate budgets, semantic conflicts, identity/reference uniqueness and recomputed exact content/geometry digests.',
  ...record({kind:constant('nautilus-window-geometry-snapshot'),version:constant(1),document:ref('document'),world:ref('world'),edgeFacts:array(ref('edgeFact'),65536),resolvedDefinitions:array(ref('definition'),1024),contentDigest:ref('digest'),geometryDigest:ref('digest')}),
  $defs:{
    digest:{type:'string',pattern:'^[a-f0-9]{64}(?![\\s\\S])'},
    document:record({kind:constant('nautilus-window-placement-document'),version:constant(1),id:sid,profileId:constant('farmyard-quarter-turn-first-hit-pane-v1'),queryRevision:integer(0,Number.MAX_SAFE_INTEGER),placements:array(ref('placement'),1024),bindings:array(record({placementId:sid,engineInstanceId:{...sid,maxLength:24}}),1024),observedBroken:{type:'object',propertyNames:sid,additionalProperties:{...array({type:'string',pattern:'^r[01]c[012](?![\\s\\S])'},6),uniqueItems:true}}}),
    placement:record({id:{...sid,pattern:'^[A-Za-z0-9][A-Za-z0-9._:-]{0,95}(?![\\s\\S])'},definitionId:sid,x:number,y:number,z:constant(0),rotation:{enum:[0,90,180,270]},joins,dimensions,finish:{enum:['steel','sage','ivory']},wall:{enum:['brick','concrete','corrugated']}},['id','definitionId','x','y']),
    world:record({id:sid,floorId:constant('ground'),grid:record({width:integer(1,240),height:integer(1,240)})}),
    edgeFact:record({edge,...baseFact,underlay:record(baseFact,['semantic','locked'])},['edge','semantic','locked']),
    definition:record({sourceCommit:constant('251bf8094b5f9ebe44208443084c1a6d6658512a'),version:constant('industrial-windows/2'),id:sid,joins:record({left:boolean,right:boolean}),dimensions:{anyOf:[dimensions,{type:'null'}]},width:integer(1,240),height:{type:'number',exclusiveMinimum:0},bounds,panes:{...array(record({id:{type:'string',pattern:'^r[01]c[012](?![\\s\\S])'},min:vec,max:vec}),6),minItems:1},solids:array(record({id:{...sid,maxLength:32},role:{enum:['frame','sill','mullion','lower-wall']},min:vec,max:vec}),8)})
  }
};}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
  const file=new URL('../packages/windows-core/window-geometry-v1.schema.json',import.meta.url),text=JSON.stringify(windowGeometrySchema(),null,2)+'\n';if(process.argv.includes('--write'))fs.writeFileSync(file,text);else if(fs.readFileSync(file,'utf8')!==text)throw Error('Candidate window geometry schema drift.');
  if(process.argv.includes('--cases')){
    const {compileWindowPlacements,serializeWindowGeometry}=await import('../packages/windows-core/index.js'),{FARMYARD_WINDOW_DEFINITIONS:definitions}=await import('../packages/adapters/farmyard/windows.js'),document={kind:'nautilus-window-placement-document',version:1,id:'schema-yard',profileId:'farmyard-quarter-turn-first-hit-pane-v1',queryRevision:0,placements:[{id:'a',definitionId:'window.full.clear.1m',x:4,y:4.5}],bindings:[{placementId:'a',engineInstanceId:'view-a'}],observedBroken:{}},options={definitions,world:{id:'world',floorId:'ground',grid:{width:16,height:16}},edgeFacts:[{edge:'s:4:4',semantic:'wall',locked:false}]},snapshot=()=>JSON.parse(serializeWindowGeometry(compileWindowPlacements(document,options))),good=snapshot(),cases=[{label:'complete geometry',valid:true,value:good}];
    document.observedBroken={a:['r0c0']};document.queryRevision=3;cases.push({label:'observed hole',valid:true,value:snapshot()});
    for(const [label,change]of [['missing mask',s=>delete s.document.observedBroken],['unknown field',s=>s.document.extra=1],['tilt',s=>s.document.placements[0].rotation=45],['null rotation',s=>s.document.placements[0].rotation=null],['wrong version',s=>s.version=2],['bad pane',s=>s.document.observedBroken={a:['r0c9']}],['short digest',s=>s.contentDigest='abc'],['bad vector',s=>s.resolvedDefinitions[0].bounds.min.pop()]]){const value=structuredClone(good);change(value);cases.push({label,valid:false,value});}
    const folder=new URL('../artifacts/farmyard-windows/',import.meta.url);fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(new URL('schema-cases.json',folder),JSON.stringify(cases,null,2)+'\n');
  }
  console.log('Verified unregistered geometry-only candidate schema.');
}
