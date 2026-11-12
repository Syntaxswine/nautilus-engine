import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {VEHICLE_BODIES} from '../../packages/vehicle-visuals/catalogue.js';
const root=fileURLToPath(new URL('../../',import.meta.url));
const pin='7b2d4f4c817aea55d74dcd65d9763ac2ca608026';
const files=['tools/vehicle-art/bake.mjs','tools/vehicle-art/skins.mjs','tools/vehicle-art/record.mjs',
 'tools/vehicle-art/paint-master.png','tools/vehicle-art/prompt.json',
 ...['meshopt_simplifier.module.js','LICENSE.md','README.md'].map(f=>'vendor/meshoptimizer/'+pin+'/'+f),
 'packages/vehicle-visuals/reduced-data.js','packages/vehicle-visuals/reduction.json',
 ...[...VEHICLE_BODIES.map(b=>b.id),'running-gear'].map(id=>'packages/vehicle-visuals/skins/'+id+'.png')];
const row=file=>{const data=fs.readFileSync(path.join(root,file));return{path:file,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')};};
const record={schema:1,author:'Original Nautilus procedural vehicle sculpts and registered skin layouts',
 workflow:'Finish high-resolution sculpt, simplify its saved author vertices with pinned meshoptimizer, retain original UVs/normals, compact buffers, compose painterly image skins against the same UV layout.',
 texture:{method:'Built-in image_gen__imagegen; generated brushwork then code-native UV/detail composition with Sharp',
  prompt:'tools/vehicle-art/prompt.json',master:'tools/vehicle-art/paint-master.png',
  styleReference:row('vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/assets/environment/painted-study/material-atlas-v2.png'),
  encoding:'Skin RGB is opaque painted colour. Alpha stores finish tint coverage: 1 for body enamel, 0 for glass/trim. The renderer ignores alpha for opacity.'},
 simplifier:{repository:'https://github.com/zeux/meshoptimizer',commit:pin,tag:'v0.24',license:'MIT',
  imports:[{local:'meshopt_simplifier.module.js',upstream:'js/meshopt_simplifier.module.js'},
   {local:'README.md',upstream:'js/README.md'},{local:'LICENSE.md',upstream:'LICENSE.md'}],
  closure:'Self-contained ES module with embedded WebAssembly; no network, packages or runtime imports. Authoring only. Original upstream bytes remain unchanged.'},
 files:files.map(row)};
fs.writeFileSync(path.join(root,'tools/vehicle-art/provenance.json'),JSON.stringify(record,null,2)+'\n');
console.log('Recorded '+files.length+' vehicle authoring and painted runtime files.');
