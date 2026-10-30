// Executable ABI/conformance data, not a reviewed art kit or a game adoption.
import {createWorld} from '../world-core/state.js';
import {fields} from '../world-core/validation.js';
import {PARTS_CONTRACT,partsInput,createPartsDocument,failParts} from './data.js';
const numeric=(id,value,min,max)=>({id,type:'number',default:value,min,max,unit:'metres'}),flag=(id,value)=>({id,type:'boolean',default:value}),p=parameter=>({parameter,scale:1,offset:0}),on=parameter=>({parameter});
const origin={x:0,y:0,h:0},source={project:'Nautilus Engine conformance',commit:null,path:'packages/parts-core/fixtures.js',notice:'NOTICE.md',guide:'docs/functional-parts.md'};
function definition(id,label,parameters,floors,parts){return {kind:PARTS_CONTRACT.definitionSchemaId,version:1,id:'conformance:'+id,contentVersion:'1',label,profileId:PARTS_CONTRACT.definitionProfileId,parameters,floors,parts,source:{...source}};}
function instance(id,type,x=0,y=0,h=0,quarterTurns=0,parameters={}){return {id,definition:{id:'conformance:'+type,version:'1'},transform:{x,y,h,quarterTurns},parameters,initial:[],mode:'functional',children:[]};}
export function partsConformanceFixture(options={}){
  const configuration=partsInput(options);fields(configuration,['variant'],'/options',[]);const variant=Object.hasOwn(configuration,'variant')?configuration.variant:'single';if(!['single','transformed','second-layout'].includes(variant))failParts('UNKNOWN_FIXTURE','/variant','Choose a declared conformance fixture variant.');
  const level=[{id:'level',elevationM:0}],material='conformance:painted-plaster',definitions=[
    definition('assembly','Conformance assembly',[],[],[]),
    definition('slab','Shared slab',[numeric('widthM',8,8,12),numeric('depthM',6,6,8),flag('stairHole',false)],level,[{id:'deck',type:'slab',floorId:'level',material:'conformance:timber',bounds:{min:{x:0,y:0,h:-.12},max:{x:p('widthM'),y:p('depthM'),h:0}},holes:[{id:'stairwell',enabled:on('stairHole'),rect:{min:{x:2.2,y:2.35},max:{x:6.35,y:3.65}}}]}]),
    definition('wall','Shared wall',[numeric('lengthM',8,1,12),numeric('doorOffsetM',1,0,10),flag('hasDoor',false)],level,[{id:'wall',type:'wall',floorId:'level',material,axis:'x',origin,lengthM:p('lengthM'),heightM:2,thicknessM:.12,openings:[{id:'entry',enabled:on('hasDoor'),offsetM:p('doorOffsetM'),widthM:1,heightM:1.85,bottomM:0}]}]),
    definition('door','Shared hinged door',[],level,[{id:'leaf',type:'door',floorId:'level',material:'conformance:door-wood',portalId:null,axis:'x',origin,hand:'start',hingeInsetM:.03,leaf:{widthM:.94,heightM:1.85,thicknessM:.04,offsetM:0,bottomM:0},swing:-1,reachM:1.6,initial:{open:false,locked:false}}]),
    definition('stairs','Shared route stair',[],[{id:'lower',elevationM:0},{id:'upper',elevationM:2.12}],[{id:'flight',type:'stairs',floorId:'lower',material:'conformance:stair-wood',from:{floorId:'lower',surfaceId:null,position:{x:2,y:3,h:0}},to:{floorId:'upper',surfaceId:null,position:{x:7.1,y:3,h:2.12}},path:[{x:2,y:3,h:0},{x:5.8,y:3,h:2.12},{x:7.1,y:3,h:2.12}],widthM:1.2,clearanceM:2,bidirectional:true,reachM:.75}]),
    definition('roof','Shared roof box',[numeric('widthM',8,8,12),numeric('depthM',6,6,8)],level,[{id:'roof',type:'solid',floorId:'level',material:'conformance:roof',bounds:{min:{x:0,y:0,h:2},max:{x:p('widthM'),y:p('depthM'),h:2.12}}}])
  ];
  const world=createWorld({id:'parts-conformance-yard',name:'Two-story ABI conformance',widthM:32,depthM:32,floorCount:2,storyHeightM:2.12,groundHeightM:0,heightM:8,minHeightM:-.12});world.surfaces.push({id:'yard',floorId:'floor-0',role:'floor',bounds:{min:{x:0,y:0,h:0},max:{x:32,y:32,h:0}},supports:true,supportFloorId:'floor-0'});
  const roots=[],connections=[];
  function assembly(prefix,x,y,turns,width=8,doorOffset=1){
    const root=instance(prefix,'assembly',x,y,0,turns);root.children.push(instance(prefix+'-ground','slab',0,0,0,0,{widthM:width}),instance(prefix+'-upper','slab',0,0,2.12,0,{widthM:width,stairHole:true}),instance(prefix+'-roof','roof',0,0,2.12,0,{widthM:width}));
    for(const [suffix,h]of [['g',0],['u',2.12]])root.children.push(instance(prefix+'-'+suffix+'-front','wall',0,0,h,0,{lengthM:width,hasDoor:suffix==='g',doorOffsetM:doorOffset}),instance(prefix+'-'+suffix+'-back','wall',0,6,h,0,{lengthM:width}),instance(prefix+'-'+suffix+'-left','wall',0,0,h,1,{lengthM:6}),instance(prefix+'-'+suffix+'-right','wall',width,0,h,1,{lengthM:6}));
    root.children.push(instance(prefix+'-door','door',doorOffset,0),instance(prefix+'-stairs','stairs'));roots.push(root);
    connections.push({id:prefix+'-entry',kind:'door-aperture',from:{instanceId:prefix+'-door',partId:'leaf'},to:{instanceId:prefix+'-g-front',partId:'entry'}},{id:prefix+'-stair-from',kind:'stair-from',from:{instanceId:prefix+'-stairs',partId:'flight'},to:{instanceId:prefix+'-ground',partId:'deck'}},{id:prefix+'-stair-to',kind:'stair-to',from:{instanceId:prefix+'-stairs',partId:'flight'},to:{instanceId:prefix+'-upper',partId:'deck'}});
  }
  assembly('a',3,3,0);if(variant!=='single')assembly('b',22,5,1);if(variant==='second-layout')assembly('c',22,24,2,10,3);
  return {status:'conformance-only',definitions:definitions.map(value=>structuredClone(value)),document:createPartsDocument({world,instances:roots,connections}),bodyProfile:{radiusM:.25,heightM:1.7}};
}
