import {FRONTIER_LAYOUTS} from '../frontier-fort/layouts.js';
import {VARIANT_IDS,freeze} from './designs.js';
import {validateLayout} from './index.js';
const layouts=[];
for(const theme of['castle','cyclone'])for(const base of FRONTIER_LAYOUTS){
  const r=structuredClone(base);r.id=theme+'-fort-'+(base.width===72?'courtyard':'compact');
  r.name=(theme==='castle'?'Castle':'Modern security')+(base.width===72?' courtyard compound':' compact compound');r.theme=theme;
  r.source='Original configuration of the '+theme+' variant kit, retaining the fixed frontier module transforms.';
  for(const i of r.instances)i.assetId=VARIANT_IDS[theme][i.assetId];r.connections=validateLayout(r).connections;layouts.push(r);
}
const mixed=structuredClone(layouts[0]);mixed.id='fort-variants-mixed';mixed.name='Mixed construction · fitted transitions';mixed.theme='mixed';
for(const i of mixed.instances)if(i.id.includes('east')||['sally','quarters','barracks-stairs','adobe-store'].includes(i.id)){
  const legacy=Object.keys(VARIANT_IDS.castle).find(k=>VARIANT_IDS.castle[k]===i.assetId);i.assetId=VARIANT_IDS.cyclone[legacy];
}
// Replace two six-metre runs with a three-metre native closure plus an explicit handed transition.
for(const [id,hand,firstTheme]of[['front-east-0','castle-to-cyclone','cyclone'],['rear-west-0','cyclone-to-castle','castle']]){
  const i=mixed.instances.find(i=>i.id===id),origin=[...i.position],c=Math.cos(i.yaw),s=Math.sin(i.yaw);
  i.assetId='link-'+hand;
  mixed.instances.push({id:id+'-closure',assetId:VARIANT_IDS[firstTheme]['frontier-stockade-3'],position:[origin[0]+3*c,0,origin[2]-3*s].map(n=>Math.round(n*1e9)/1e9),yaw:i.yaw,scale:[1,1,1]});
}
mixed.connections=validateLayout(mixed).connections;layouts.push(mixed);
for(const l of layouts){const p=validateLayout(l);if(!p.closed)throw Error(p.errors.join(' '));}
export const VARIANT_LAYOUTS=freeze(layouts);
export function variantLayout(id){const r=VARIANT_LAYOUTS.find(r=>r.id===id);if(!r)throw Error('Unknown variant layout: '+id);return structuredClone(r);}
