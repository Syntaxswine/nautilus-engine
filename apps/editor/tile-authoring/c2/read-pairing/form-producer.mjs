// Explicit private continuation of fixed 5a7 forms. No serialized field, schema
// change or permission flag. The actual component passes its private dirty Set.
import {formFromFields as originalFormFromFields,valuesForMark as originalValuesForMark,fieldDefaults} from '../ui/forms.js';
import {failure,finiteUIData} from '../ui/contract.js';
import {sharedArtworkDefaults} from '../../../../../packages/assets/index.js';
export {fieldDefaults,gridCells,graphicFromFields,layersFromDraft,layerFields} from '../ui/forms.js';
const freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
const graphicInputs=Object.freeze({form:['form'],positionM:['u','v'],sizeM:['width','height'],rotationRad:['rotation'],mirrorU:['mirror'],pivotUV:['pivotU','pivotV'],opacity:['opacity'],tintLinearRGB:['red','green','blue'],mask:['mask','cells']});
export function valuesForMark(mark,artwork=null){
 if(mark||!artwork)return originalValuesForMark(mark);
 const defaults=sharedArtworkDefaults(artwork);
 if(defaults.mask.kind!=='all-surface')throw failure('C2_DEFAULT_MASK_UNAVAILABLE','The exact default mask needs an explicit future supported field representation.');
 return{...originalValuesForMark({graphic:defaults}),mask:'all-surface'};
}
export function createFormProducer(){
 const forms=new WeakMap();
 function formFromFields(read,values,actualDirty,kind){
  const dirty=new Set();let count=0;
  try{for(const key of Set.prototype.values.call(actualDirty)){if(++count>32||typeof key!=='string'||key.length>80)throw Error('Bounded input names required');dirty.add(key);}}
  catch{throw failure('C2_FORM_TOUCH_SOURCE','Use the actual bounded Set of explicit edited input names.');}
  let fields=finiteUIData(values);
  if(['first-mark','decoration.add'].includes(kind)){
   const defaults=valuesForMark(null,read.overlay.chosenArtwork);
   fields={...fields};
   // Seed individual untouched inputs, including the untouched member of a pair.
   // Never infer an edit because a placeholder differs from an original default.
   for(const names of Object.values(graphicInputs))for(const key of names)if(!dirty.has(key))fields[key]=defaults[key];
  }
  const form=freeze(originalFormFromFields(read,fields,dirty,kind));
  const touches=Object.freeze(Object.entries(graphicInputs).filter(([,names])=>names.some(key=>dirty.has(key))).map(([field])=>field));
  forms.set(form,touches);return form;
 }
 const formInputOwner=Object.freeze({touched(_read,form){return form&&typeof form==='object'?forms.get(form)??null:null;}});
 return Object.freeze({formFromFields,formInputOwner});
}
export const {formFromFields,formInputOwner}=createFormProducer();
