import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import * as T from '../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor/three.module.js';
import {buildingDigest} from './building-geometry.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const ORIGINAL_BUILDING_COMMIT='ee7c18ecdc2669168247b94a82156634b2c4ffe5';
// Fingerprints were verified against the fixed Git objects. Keep CI independent
// of a historical commit being present in its shallow checkout.
const fixedFiles={
  'assets/buildings/painted-materials-v2.png':'bbe33709a63362a13e509131c11f358d286b3d55ffcb86ca0ca1def4934ccdb2',
  'art/buildings/reference-register.json':'70eec5f387f94fd1a1df88a8a9a6af73b84f19dfde98306332695d9d99dbcfcd',
  'packages/building-catalog/index.js':'6a13677421fe00a22e5cec55a29b7012b65566006e6b2a413866943c83fd9108',
  'packages/building-catalog/designs.js':'87b20add713c321ac7a69a1ff16365c07657929d2200b7e82ba520f752bb24f6',
  // Recorded with the reviewed renderer; refreshing it is a deliberate edit of this line.
  'tests/fixtures/original-building-geometry.json':'037cc5f958d0dd1750e666df48ae85bb01713e2add346737a7ed2efaa526202e'
};
for(const [relative,expected]of Object.entries(fixedFiles))if(createHash('sha256').update(fs.readFileSync(path.join(root,relative))).digest('hex')!==expected)throw Error('Original prefab input differs from reviewed commit '+ORIGINAL_BUILDING_COMMIT+': '+relative);
// The renderer's source is not pinned: its arithmetic may be rewritten (it was,
// for speed) while its output may not change. Its reviewed output is pinned
// instead: geometry digests recorded with the ee7c18e renderer (three.js
// a6a71831…), and the catalogue's reviewed content apart from the line that
// records the renderer's own hash.
const REVIEWED_RENDERER='a6a71831c674c28b48ac25d4675708f9069329a759067ac08c5727002b38c6ba',REVIEWED_CATALOGUE_CONTENT='49ac30fc2fa74dd5f01d936ef6a5d78f7e8421248178d88abd82682327e1d223';
export const REVIEWED_GEOMETRY=JSON.parse(fs.readFileSync(path.join(root,'tests/fixtures/original-building-geometry.json')));
if(REVIEWED_GEOMETRY.recordedFrom.commit!==ORIGINAL_BUILDING_COMMIT||REVIEWED_GEOMETRY.recordedFrom.sha256!==REVIEWED_RENDERER)throw Error('Reviewed building geometry was not recorded with the ee7c18e renderer.');
{const catalogue=JSON.parse(fs.readFileSync(path.join(root,'assets/buildings/catalogue.json')));
 if(createHash('sha256').update(JSON.stringify({...catalogue,inputs:catalogue.inputs.filter(input=>input.file!=='packages/building-catalog/three.js')})).digest('hex')!==REVIEWED_CATALOGUE_CONTENT)throw Error('Original prefab input differs from reviewed commit '+ORIGINAL_BUILDING_COMMIT+': assets/buildings/catalogue.json');}
const {createBuildingModel}=await import('../packages/building-catalog/three.js');
export function originalCatalogueSource() {
  const bytes=fs.readFileSync(path.join(root,'assets/buildings/catalogue.json')),catalogue=JSON.parse(bytes);
  const references=JSON.parse(fs.readFileSync(path.join(root,'art/buildings/reference-register.json'))),byId=new Map(references.records.map(r=>[r.id,r]));
  const assets=catalogue.buildings.map(entry=>{
    const model=createBuildingModel(T,entry.id,{lod:'game'});
    try {
      if(buildingDigest(model)!==REVIEWED_GEOMETRY.digests['game:'+entry.id])throw Error('Original building geometry differs from reviewed commit '+ORIGINAL_BUILDING_COMMIT+': '+entry.id);
      const bounds=new T.Box3().setFromObject(model.root);model.setDoorsOpen(true);bounds.union(new T.Box3().setFromObject(model.root));
      const number=n=>Math.round(n*1e6)/1e6;
      return {id:entry.id,name:entry.name,provider:'original',collectionId:'original',collection:'Original architecture',group:entry.group,style:entry.style,
        bounds:[bounds.min.x,bounds.min.z,bounds.max.x,bounds.max.z].map(number),height:number(bounds.max.y-bounds.min.y),
        width:entry.width,depth:entry.depth,levels:model.building.floors.map(f=>({index:f.level,label:'Floor '+(f.level+1),y:f.height})),
        rooms:entry.rooms,gameTriangles:entry.gameTriangles,authoringTriangles:entry.authoringTriangles,
        plan:'assets/buildings/models/'+entry.id+'.blueprint.json',
        sources:entry.refs.map(id=>{const r=byId.get(id);if(!r||r.status!=='opened')throw Error('Missing opened building reference: '+id);return {id,title:r.title,url:r.url};}),
        sourceCommit:ORIGINAL_BUILDING_COMMIT,envelope:'Game mesh including overhangs and closed/open door poses',
        description:'Original '+entry.style.toLowerCase()+'. Unfurnished interiors and authored room arrangements informed by public references; not a measured reconstruction. Collision, navigation, stairs, doors and fire need a game adapter.'};
    }finally{model.dispose();}
  });
  // No hash is filed under a commit that lacks it: 'reviewed' holds ee7c18e's own fingerprints and
  // the reviewed output; 'current' the files this registry was generated from.
  const source={commit:ORIGINAL_BUILDING_COMMIT,
    reviewed:{commit:ORIGINAL_BUILDING_COMMIT,renderer:{file:'packages/building-catalog/three.js',sha256:REVIEWED_RENDERER},catalogueContentSha256:REVIEWED_CATALOGUE_CONTENT,geometry:{file:'tests/fixtures/original-building-geometry.json',sha256:fixedFiles['tests/fixtures/original-building-geometry.json']}},
    current:{catalogue:'assets/buildings/catalogue.json',catalogueSha256:createHash('sha256').update(bytes).digest('hex'),inputs:catalogue.inputs,note:'The renderer differs from the reviewed commit in source, not in output (reviewed.geometry).'},
    atlas:{...catalogue.atlas,file:'assets/buildings/'+catalogue.atlas.file}};
  return '// Generated by node tools/prefab-original-catalog.mjs --write. Original artist files remain unchanged.\n'+
    'const freeze = value => {if(value && typeof value === "object"){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};\n'+
    'export const ORIGINAL_BUILDING_SOURCE = freeze('+JSON.stringify(source,null,2)+');\n'+
    'export const ORIGINAL_BUILDING_ASSETS = freeze('+JSON.stringify(assets,null,2)+');\n';
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const file=path.join(root,'packages/prefab-core/original-catalogue.js'),expected=originalCatalogueSource();
  if(process.argv.includes('--write'))fs.writeFileSync(file,expected);
  else if(fs.readFileSync(file,'utf8')!==expected)throw Error('Original prefab registry differs from the fixed recipe/envelopes. Regenerate deliberately.');
  console.log('Verified 48 original prefab source bindings and closed/open-door envelopes.');
}
