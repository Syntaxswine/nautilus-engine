import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import * as V1 from '../packages/tiles-core/index.js';
import * as T from '../packages/tiles-core/candidate-v2.js';
import {moduleClosure} from './distribution.mjs';
import {tileSchemas} from './tile-schemas.mjs';
import {tileV2Schemas} from './tile-v2-schemas.mjs';
import {native,mixedV2,renderOptions,windowOptions,zeroPair,region,field,put,setup,clone,v1Corpus} from '../tests/fixtures/procedural-tiles/v2.mjs';
const base='69115f6c283c4c60588d8462b943ea944ab17aca',sha=b=>createHash('sha256').update(b).digest('hex'),goldenPath=new URL('../tests/fixtures/procedural-tiles/v2-golden-v1.json',import.meta.url);
if(process.argv.includes('--write-golden')){
  const files=[...moduleClosure(['packages/tiles-core/index.js']),...tileSchemas().map(x=>x.file)],records=files.map(file=>{const expected=execFileSync('git',['show',base+':'+file],{windowsHide:true}),actual=fs.readFileSync(new URL('../'+file,import.meta.url));if(sha(actual)!==sha(expected))throw Error('Accepted v1 bytes changed: '+file);return {file,sha256:sha(expected)};});fs.writeFileSync(goldenPath,JSON.stringify({base,files:records,corpusSha256:sha(JSON.stringify(v1Corpus(V1)))},null,2)+'\n');
}
const cases=[],add=(schema,label,value,valid=true)=>cases.push({schema,label,value,valid});
for(const kind of ['shape-graph','ribbon-sweep','section-sweep','stair-run']){const s=mixedV2(T,kind);add('recipe2','typed '+kind,s.r);add('layout2','unresolved layout '+kind,s.layout);add('bundle2','complete mixed bundle '+kind,s.bundle);}
const r=region('render-schema'),s=setup(T,[r],[put(T,'a',r)]),portPlan=T.planTileRenderEdges({bundles:[s.bundle],windows:[]},renderOptions());add('compiled2','actual public render plan',portPlan);const f=field('cut-schema',5);add('compiled2','actual field cut render plan',T.planTileRenderEdges({bundles:[],windows:[{recipe:f,options:windowOptions(T,f)}]},renderOptions()));add('compiled2','actual level region cut render plan',T.planTileRenderEdges({bundles:[],windows:[{recipe:r,options:windowOptions(T,r)}]},renderOptions()));
for(const [opposite,amplitude]of [[1,.01],[-1,.01],[1,1000],[0,0]])add('compiled2','actual zero exposure '+opposite+'/'+amplitude,T.inspectTileZeroExposure(zeroPair(T,opposite,amplitude),{collarM:.125,residentA:true,residentB:true,maxWork:100000}));
const source=mixedV2(T);for(const [schema,label,change]of [
 ['recipe2','future version',v=>v.version=3],['recipe2','future tag',v=>v.shape.kind='unknown'],['recipe2','missing width law',v=>delete v.shape.width],['recipe2','negative width',v=>v.shape.width.stations[0].leftM=-1],['recipe2','hidden functional field',v=>v.averagedWidth=1],['recipe2','unknown feature',v=>v.features.push('all-gameplay-ready')],['recipe2','missing exposure intent',v=>delete v.exposure],
 ['layout2','missing format discriminator',v=>delete v.instances[0].recipeVersion],['layout2','functional annotation',v=>v.annotations.width=2],['layout2','numeric display string',v=>v.annotations.label=4],['layout2','opaque functional extensions',v=>v.extensions={width:2}],
 ['bundle2','missing complete controls',v=>v.recipes=[]],['bundle2','compiled proof smuggled in save',v=>v.compiled={accepted:true}],['compiled2','false live adoption',v=>v.statuses.liveAdoption=true],['compiled2','relaxed render ceiling',v=>v.options.maxTotalNodes=65537],['compiled2','missing exact attributes',v=>delete v.edges[0].nodes[0].attributes.normal],['compiled2','untyped event',v=>v.edges[0].events.push({kind:'root',t:.5})],['compiled2','trailing newline in edge identity',v=>v.edges[0].edgeKey+='\n'],['compiled2','relaxed cut node ceiling',v=>v.options.maxCutNodes=130],['compiled2','relaxed public node ceiling',v=>v.options.maxPortNodes=4098]
]){const v=clone(schema==='recipe2'?source.r:schema==='layout2'?source.layout:schema==='bundle2'?source.bundle:portPlan);change(v);add(schema,label,v,false);}
// These have valid structural syntax but require executable graph/source audits.
const cyclic=native('shape-graph');cyclic.shape.nodes[1].baseId='difference';add('recipe2','structural syntax is not a cycle proof',cyclic);const absent=clone(source.layout);absent.instances[0].contentDigest='a'.repeat(64);add('layout2','structural digest is not a source identity proof',absent);
for(const x of [...tileSchemas(),...tileV2Schemas()])add('meta','schema document '+x.schema.$id,x.schema);
const folder=new URL('../artifacts/procedural-tiles-v2/',import.meta.url);fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(new URL('schema-cases.json',folder),JSON.stringify(cases,null,2)+'\n');console.log(JSON.stringify({status:'pass',schemas:8,cases:cases.filter(c=>c.schema!=='meta').length,golden:fs.existsSync(goldenPath)}));
