import {failure,validateUIShape,finiteUIData} from './contract.js';
export const fieldDefaults=Object.freeze({u:'0',v:'0',width:'1',height:'1',rotation:'0',pivotU:'0.5',pivotV:'0.5',mirror:false,red:'1',green:'1',blue:'1',opacity:'1',form:'stamp',mask:'all-surface',cells:'0,0',firstLayerLabel:'Paint',firstLayerOpacity:'1'});
const number=(value,name,min,max)=>{if(typeof value!=='string'||value.trim()==='')throw failure('C2_FIELD_REQUIRED','Enter '+name+'.');const n=Number(value);if(!Number.isFinite(n)||Object.is(n,-0)||n<min||n>max)throw failure('C2_FIELD_BOUND','Use a finite '+name+' from '+min+' to '+max+', without negative zero.');return n;};
export function gridCells(text){
  if(typeof text!=='string'||text.length>100000)throw failure('C2_MASK_BOUND','Use a bounded grid-cell list.');
  const lines=text.split(/\r?\n/).filter(s=>s.trim()!=='');if(!lines.length||lines.length>4096)throw failure('C2_MASK_BOUND','Enter 1 through 4096 grid cells, one i,j pair per line.');
  const seen=new Set();return lines.map(line=>{const parts=line.trim().split(/\s*,\s*/);if(parts.length!==2||parts.some(x=>!/^[-+]?\d+$/.test(x)))throw failure('C2_MASK_CELL','Use integer i,j pairs.');const i=number(parts[0],'grid i',-65536,65535),j=number(parts[1],'grid j',-65536,65535),key=i+','+j;if(seen.has(key))throw failure('C2_MASK_DUPLICATE','Select each grid cell once.');seen.add(key);return{i,j};});
}
export function valuesForMark(mark){
  if(!mark)return{...fieldDefaults};const g=mark.graphic,t=g.transform;return{...fieldDefaults,u:String(t.positionM[0]),v:String(t.positionM[1]),width:String(t.sizeM[0]),height:String(t.sizeM[1]),rotation:String(t.rotationRad),pivotU:String(t.pivotUV[0]),pivotV:String(t.pivotUV[1]),mirror:t.mirrorU,red:String(g.tintLinearRGB[0]),green:String(g.tintLinearRGB[1]),blue:String(g.tintLinearRGB[2]),opacity:String(g.opacity),form:g.form,mask:'unchanged'};
}
export function graphicFromFields(v,{allowUnchangedMask=false}={}){
  const transform={positionM:[number(v.u,'U (m)',-1e6,1e6),number(v.v,'V (m)',-1e6,1e6)],sizeM:[number(v.width,'width (m)',0.000001,100000),number(v.height,'height (m)',0.000001,100000)],rotationRad:number(v.rotation,'rotation (rad)',-Math.PI,Math.PI),mirrorU:v.mirror,pivotUV:[number(v.pivotU,'pivot U',0,1),number(v.pivotV,'pivot V',0,1)]};
  const mask=v.mask==='all-surface'?{kind:'all-surface'}:v.mask==='grid-cells'?{kind:'grid-cells',cells:gridCells(v.cells)}:allowUnchangedMask&&v.mask==='unchanged'?null:undefined;
  if(mask===undefined)throw failure('C2_MASK_REQUIRED','Choose an explicit mask alternative.');
  const out={form:v.form,transform,opacity:number(v.opacity,'opacity',0,1),tintLinearRGB:[number(v.red,'linear red',0,1),number(v.green,'linear green',0,1),number(v.blue,'linear blue',0,1)],mask:mask??{kind:'all-surface'}};
  validateUIShape('GraphicDraft',out);return{graphic:out,mask};
}
export function formFromFields(read,values,dirty,kind){
  const s=read.overlay.selection,artwork=read.overlay.chosenArtwork;if(!s)throw failure('C2_SELECTION_REQUIRED','Select an authored surface.');
  if(kind==='decoration.remove'){if(!s.selectedMark)throw failure('C2_MARK_REQUIRED','Select a retained mark to erase.');return validateUIShape('Form',{kind,markIds:[s.selectedMark.id]});}
  const {graphic,mask}=graphicFromFields(values,{allowUnchangedMask:kind==='decoration.update'});
  let form;
  if(kind==='first-mark'){
    const entry=read.overlay.palette.find(r=>r.artwork.id===artwork?.id&&r.artwork.revision===artwork.revision&&r.artwork.contentDigest===artwork.contentDigest);
    form={kind,dependency:entry?.origin==='builtin-offer'?'builtin-import':'retained',artwork,layer:{label:values.firstLayerLabel,opacity:number(values.firstLayerOpacity,'layer opacity',0,1)},graphic};
  }else if(kind==='decoration.add')form={kind,artwork,layerId:s.selectedLayerId,graphic};
  else if(kind==='decoration.update'){
    const old=s.selectedMark;if(!old)throw failure('C2_MARK_REQUIRED','Select a retained mark to edit.');
    const changes=[],add=(field,value,names=[field])=>{if(names.some(n=>dirty.has(n)))changes.push({field,value});};
    add('artwork',artwork);add('layerId',s.selectedLayerId);add('form',graphic.form);add('positionM',graphic.transform.positionM,['u','v']);add('sizeM',graphic.transform.sizeM,['width','height']);add('rotationRad',graphic.transform.rotationRad,['rotation']);add('mirrorU',graphic.transform.mirrorU,['mirror']);add('pivotUV',graphic.transform.pivotUV,['pivotU','pivotV']);add('opacity',graphic.opacity);add('tintLinearRGB',graphic.tintLinearRGB,['red','green','blue']);if(mask&&(['mask','cells'].some(n=>dirty.has(n))))changes.push({field:'mask',value:mask});
    if(!changes.length)throw failure('C2_PATCH_EMPTY','Edit at least one field; unedited values stay unchanged.');
    form={kind,markId:old.id,expectedRevision:old.revision,changes};
  }else throw failure('C2_FORM_KIND','Use an explicit appearance form.');
  return validateUIShape('Form',form);
}
export function layersFromDraft(read,rows,confirmErase){
  const source=read.overlay.selection?.layers;if(!source)throw failure('C2_SELECTION_REQUIRED','Select an authored surface.');
  const kept=new Set(rows.filter(r=>r.kind==='existing').map(r=>r.value.id));
  const removedLayerMarkIds=source.filter(l=>!kept.has(l.value.id)).flatMap(l=>l.markIds);
  if(removedLayerMarkIds.length&&!confirmErase)throw failure('C2_LAYER_ERASE_CONFIRM','Explicitly confirm erasing the marks in removed layers.');
  const form={kind:'surface.layers',layers:rows.map((r,order)=>r.kind==='existing'?{kind:'existing',value:{...r.value,order}}:{kind:'new',label:r.label,order,opacity:r.opacity}),removedLayerMarkIds};
  return validateUIShape('Form',form);
}
export function layerFields(label,opacity){const value=finiteUIData({label,opacity:number(opacity,'layer opacity',0,1)});if([...label].length>120)throw failure('C2_LAYER_LABEL','Use at most 120 Unicode characters.');return value;}
