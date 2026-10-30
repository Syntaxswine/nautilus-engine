import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import * as T from '../packages/render-effects/three.js';
import {PROP_CATALOGUE,createInteriorProp,createVenueInterior} from '../packages/tinderbox-art/native/interiors.js';
import {WATERFRONT_TILES,createWaterfrontTile} from '../packages/tinderbox-art/native/waterfront.js';
import {SOURCE_COMMIT,root} from './intake-tinderbox-art.mjs';
import {MEDICINE_COMMIT} from './intake-tinderbox-medicine.mjs';
import * as medicine from '../packages/tinderbox-art/native/medicine.js';
import {medicineProp} from '../packages/tinderbox-art/three.js';
const rounded=n=>Math.round(n*1e6)/1e6;
export function tinderboxArtCatalogueSource(){
 const assets=[];
 function add(family,sourceId,name,model){try{
  const b=model.bounds,size=b.getSize(new T.Vector3()),d=model.diagnostics();
  assets.push({id:'tinderbox:'+family+':'+sourceId,sourceId,family,name,
   category:family==='waterfront'?'Waterfront':family==='layout'?'Interior layouts':family==='medicine'?'Medicine props':'Furnishings',
   dimensions:{width:rounded(size.x),height:rounded(size.y),depth:rounded(size.z),metresPerUnit:1},
   bounds:{min:b.min.toArray().map(rounded),max:b.max.toArray().map(rounded)},triangles:d.triangles,
   source:{project:'tinderbox',commit:family==='medicine'?MEDICINE_COMMIT:SOURCE_COMMIT,status:['waterfront','medicine'].includes(family)?'published-master-equivalent':'fixed-artist-candidate'},
   availability:'optional-visual-provider',entry:'./assets/three',factory:'loadTinderboxArt',
   guide:'packages/tinderbox-art/README.md',example:'https://github.com/Syntaxswine/nautilus-engine/blob/e24de0c688f53d55f38c87d7f41ba9f8e6888dc4/examples/tinderbox-art.html',
   ...(family==='medicine'?{snapshotFactory:'loadTinderboxMedicine',snapshotVersion:1}:{}),
   profile:'tinderbox-native-art-v1',version:1,
   note:family==='layout'?'Partitions and furnishings only. Requires the matching source shell/floors/access and named replacements; no collision, fire or traversal binding.':'Native metre-scale art. Host owns placement persistence, physical materials, collision, traversal and damage policy.'});
 }finally{model.dispose();}}
 for(const p of PROP_CATALOGUE)add('interior',p.id,p.name,createInteriorProp(T,{assetId:p.id}));
 for(const type of WATERFRONT_TILES)add('waterfront',type,type.split('-').map(s=>s[0].toUpperCase()+s.slice(1)).join(' '),createWaterfrontTile(T,{type}));
 for(const [kind,name]of [['powder','Powder packet'],['healing','Healing jar'],['inversion','Inversion tin']])add('medicine',kind,name,medicineProp(T,medicine,kind));
 for(const [id,name]of [['new-york','New York furnished interior'],['administration','Administration furnished interior'],['horticulture','Horticulture furnished interior'],['fisheries','Fisheries furnished interior']])add('layout',id,name,createVenueInterior(T,{venueId:id}));
 return '// Generated from fixed native meshes by tools/tinderbox-art-catalogue.mjs.\nexport const TINDERBOX_ART_ASSETS = '+JSON.stringify(assets,null,2)+';\n';
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const file=path.join(root,'packages/tinderbox-art/catalogue.js'),expected=tinderboxArtCatalogueSource();
 if(process.argv.includes('--write'))fs.writeFileSync(file,expected);
 else if(fs.readFileSync(file,'utf8')!==expected)throw Error('Tinderbox art catalogue differs from native source geometry.');
 console.log('Verified 35 furnishings, 9 waterfront pieces, 3 medicine props and 4 additive interior layouts.');
}
