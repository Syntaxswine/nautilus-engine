// Stable engine-owned data boundary; no renderer, browser, storage or requests.
import {FORMS,SKINS,CONTENTS,specification,LIBRARY_VERSION} from '../../vendor/farmyard-furniture/fb6e20aa6e7d0cfe8793b4b7f693552d69a3a18b/sites/tactical-animal/dist/art/library/catalog.js';

const pin='fb6e20aa6e7d0cfe8793b4b7f693552d69a3a18b';
const own=(object,key)=>Object.hasOwn(object,key);
const options=(value,allowed)=>{if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!allowed.includes(key)))throw new TypeError('Unsupported furniture options.');return value;};
const idFor=(form,finish,contents)=>`furniture:library.${form}.${finish}.${contents}`;
const ids=new Map(FORMS.flatMap(form=>SKINS.flatMap(finish=>CONTENTS.map(contents=>[idFor(form.id,finish.id,contents),[form,finish,contents]]))));
const axis=(front,rotation)=>({'+Z':['+Z','+X','-Z','-X'],'+X':['+X','-Z','-X','+Z']})[front][rotation/90];

export function furnitureAsset(id,settings={}) {
  options(settings,['rotation']);const rotation=own(settings,'rotation')?settings.rotation:0;
  if(typeof id!=='string'||!ids.has(id))throw new TypeError('Unsupported furniture ID: '+String(id));
  if(![0,90,180,270].includes(rotation))throw new TypeError('Furniture rotation must be 0, 90, 180 or 270 degrees.');
  const [form,finish,contents]=ids.get(id),source=specification(form.id,finish.id,contents,rotation),sourceFrontAxis=form.frontAxis||'+Z';
  return {id,name:`${form.name} · ${finish.name} · ${contents==='books'?'Books':'Empty'}`,form:form.id,finish:finish.id,finishName:finish.name,swatch:finish.swatch,contents,units:'metres',rotation,
    size:[...source.size],sizeMeaning:'Declared body/contents envelope, not exact rendered bounds.',tiles:[...source.tiles],navigationFootprint:[...source.navigationFootprint],placementOffset:[...source.placementOffset],
    origin:'Footprint centre at ground Y=0; add placementOffset to the first reserved cell centre.',frontAxis:axis(sourceFrontAxis,rotation),sourceFrontAxis,
    availability:'visual-only',mapPlacement:false,gameplay:{supported:false,reason:'No inventory, fire, collision registration, navigation or save-schema integration. solidParts supplies geometry for separately reviewed consumer adapters.'},
    halo:{supported:false,reason:'InstancedMesh roots are unsupported by the current silhouette pipeline.'},
    source:{repository:'https://github.com/Syntaxswine/farmyard-commando',commit:pin,version:LIBRARY_VERSION,id:source.id}};
}

export function listFurnitureAssets(filters={}) {
  options(filters,['form','finish','contents']);
  for(const [key,values]of [['form',FORMS.map(form=>form.id)],['finish',SKINS.map(finish=>finish.id)],['contents',CONTENTS]])if(own(filters,key)&&!values.includes(filters[key]))throw new TypeError('Unsupported furniture '+key+': '+String(filters[key]));
  return [...ids].filter(([, [form,finish,contents]])=>(!own(filters,'form')||form.id===filters.form)&&(!own(filters,'finish')||finish.id===filters.finish)&&(!own(filters,'contents')||contents===filters.contents)).map(([id])=>furnitureAsset(id));
}
