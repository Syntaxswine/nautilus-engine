import {Budget,readData,corePort,fields,shape,fail,hash,equal,freeze} from './data.js';
import {jsonBytes} from './budget.js';
import {validateDocument,pin,recordDigest,validateRecord} from './model.js';
import {validateAppearanceDocument,validatePresetDefaults,supportedRecord} from './operations.js';
const unique=(a,path)=>{if(new Set(a).size!==a.length)fail('CAPTURE_REMAP_DUPLICATE',path,'Every source/template identity must occur once.');};
export function captureTilePreset(actual,input){
 const b=new Budget(),v=readData(input,b,b.limits.inputBytes),t=corePort(actual);
 fields(v,['document','identity','ownerId','layerRemaps','markRemaps','limits'],'/capture',['document','identity','ownerId','layerRemaps','markRemaps']);
 const effective=new Budget(v.limits??{});Object.assign(b.limits,effective.limits);b.take(0);
 if(b.inputBytes>b.limits.inputBytes||b.nodes>b.limits.nodes||(b.maxDepthObserved??0)>b.limits.depth)fail('AUTHORING_INPUT_LIMIT','/capture','Captured effective metadata limits exceeded.');b.take(Math.ceil(jsonBytes(v.document,b.limits.sourceBytes)/64));
 fields(v.identity,['id','revision','label'],'/capture/identity');shape(t,'id',v.ownerId,b);shape(t,'id',v.identity.id,b);
 const d=v.document,idx=validateDocument(t,d,b);validateAppearanceDocument(t,d,b);
 const owner=d.authoring.ownerPins.find(x=>x.ownerId===v.ownerId);if(!owner)fail('CAPTURE_OWNER_REQUIRED','/capture/ownerId','Capture an exact current placed definition.');
 const def=idx.resolve(owner.definition,'nautilus-recipe-definition');supportedRecord(t,def,b);
 const current=d.authoring.library.presets.filter(x=>x.id===v.identity.id),next=current.length?Math.max(...current.map(x=>x.revision))+1:1;
 if([...idx.all.values()].some(x=>x.id===v.identity.id&&x.kind!=='nautilus-tile-preset')||v.identity.revision!==next)fail('PRESET_REVISION','/capture/identity','Choose a preset identity and the exact next immutable revision.');
 if(!Array.isArray(v.layerRemaps)||v.layerRemaps.length>64||!Array.isArray(v.markRemaps)||v.markRemaps.length>4096)fail('CAPTURE_SELECTION_LIMIT','/capture','Finite explicit template remaps are required.');
 for(const x of v.layerRemaps){fields(x,['surfaceId','layerId','templateLayerId'],'/layerRemaps');for(const a of Object.values(x))shape(t,'id',a,b);}
 for(const x of v.markRemaps){fields(x,['markId','templateMarkId'],'/markRemaps');for(const a of Object.values(x))shape(t,'id',a,b);}
 unique(v.layerRemaps.map(x=>x.surfaceId+'|'+x.layerId),'/layerRemaps');unique(v.layerRemaps.map(x=>x.templateLayerId),'/layerRemaps');unique(v.markRemaps.map(x=>x.markId),'/markRemaps');unique(v.markRemaps.map(x=>x.templateMarkId),'/markRemaps');
 const defaultLayers=v.layerRemaps.map(x=>{
  b.take();const surface=d.authoring.decorations.surfaces.find(s=>s.ownerId===v.ownerId&&s.surfaceId===x.surfaceId),layer=surface?.layers.find(l=>l.id===x.layerId);
  if(!layer)fail('CAPTURE_LAYER_REQUIRED','/layerRemaps','Every source layer belongs to the exact selected owner/surface.');
  return {surfaceId:x.surfaceId,layer:{...layer,id:x.templateLayerId}};
 });
 const all=new Map(d.authoring.decorations.chunks.flatMap(c=>c.marks.map(m=>[m.id,m]))),records=[def];
 const defaultMarks=v.markRemaps.map(x=>{
  b.take();const m=all.get(x.markId);if(!m||m.target.ownerId!==v.ownerId)fail('CAPTURE_MARK_REQUIRED','/markRemaps','Every selected mark belongs to the exact owner.');
  if(m.groupId!==null)fail('C2_GROUPING_UNAVAILABLE','/markRemaps','Grouped capture remains Stage C.');
  const layer=v.layerRemaps.find(l=>l.surfaceId===m.target.surfaceId&&l.layerId===m.layerId);if(!layer)fail('CAPTURE_LAYER_REMAP_REQUIRED','/markRemaps','Selected marks need complete explicit layer remaps.');
  records.push(idx.resolve(m.graphic.artwork,'nautilus-tile-artwork'));
  return {id:x.templateMarkId,surfaceId:m.target.surfaceId,layerId:layer.templateLayerId,ordinal:m.ordinal,graphic:m.graphic};
 });
 const notices=new Map(),requires=new Set();
 for(const r of records){for(const req of r.body.requires)requires.add(req);for(const n of r.body.notices){const prior=notices.get(n.id);if(prior&&!equal(t,prior,n,b))fail('NOTICE_ID_CONFLICT','/capture','Different source notices cannot be silently replaced behind the same ID.');notices.set(n.id,n);}}
 const record={kind:'nautilus-tile-preset',version:1,id:v.identity.id,revision:v.identity.revision,body:{label:v.identity.label,definition:owner.definition,defaultLayers,defaultMarks,requires:[...requires].sort(),notices:[...notices.values()]}};
 record.contentDigest=recordDigest(t,record,b);validateRecord(t,record,b);validatePresetDefaults(t,record,idx,b);
 const result={preset:record,pin:pin(record),work:b.snapshot()};b.output(result);result.work=b.snapshot();return freeze(result);
}
