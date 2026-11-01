import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import * as V1 from '../packages/tiles-core/index.js';
import * as T from '../packages/tiles-core/candidate-v2.js';
import {moduleClosure} from './distribution.mjs';
import {tileSchemas} from './tile-schemas.mjs';
import {tileV2Schemas} from './tile-v2-schemas.mjs';
import {measureC1} from './measure-tile-c1.mjs';
import {options as c1Options} from '../tests/fixtures/procedural-tiles/c1.mjs';
import {native,mixedV2,renderOptions,windowOptions,zeroPair,wideZeroPair,clipRecipe,fractionalCompound,region,field,put,setup,clone,v1Corpus} from '../tests/fixtures/procedural-tiles/v2.mjs';
const base='69115f6c283c4c60588d8462b943ea944ab17aca',sha=b=>createHash('sha256').update(b).digest('hex'),goldenPath=new URL('../tests/fixtures/procedural-tiles/v2-golden-v1.json',import.meta.url);
if(process.argv.includes('--write-golden')){
  const files=[...moduleClosure(['packages/tiles-core/index.js']),...tileSchemas().map(x=>x.file)],records=files.map(file=>{const expected=execFileSync('git',['show',base+':'+file],{windowsHide:true}),actual=fs.readFileSync(new URL('../'+file,import.meta.url));if(sha(actual)!==sha(expected))throw Error('Accepted v1 bytes changed: '+file);return {file,sha256:sha(expected)};});fs.writeFileSync(goldenPath,JSON.stringify({base,files:records,corpusSha256:sha(JSON.stringify(v1Corpus(V1)))},null,2)+'\n');
}
const cases=[],add=(schema,label,value,valid=true)=>cases.push({schema,label,value,valid});
for(const kind of ['shape-graph','ribbon-sweep','section-sweep','stair-run']){const s=mixedV2(T,kind);add('recipe2','typed '+kind,s.r);add('layout2','unresolved layout '+kind,s.layout);add('bundle2','complete mixed bundle '+kind,s.bundle);}
const r=region('render-schema'),s=setup(T,[r],[put(T,'a',r)]),portPlan=T.planTileRenderEdges({bundles:[s.bundle],windows:[]},renderOptions());add('compiled2','actual public render plan',portPlan);const f=field('cut-schema',5);add('compiled2','actual field cut render plan',T.planTileRenderEdges({bundles:[],windows:[{recipe:f,options:windowOptions(T,f)}]},renderOptions()));add('compiled2','actual level region cut render plan',T.planTileRenderEdges({bundles:[],windows:[{recipe:r,options:windowOptions(T,r)}]},renderOptions()));
const exposureOptions={collarM:.125,residentA:true,residentB:true,maxWork:100000};
for(const [opposite,amplitude]of [[1,.01],[-1,.01],[1,1000],[0,0],[1,0],[-1,0]])add('compiled2','actual zero exposure '+opposite+'/'+amplitude,T.inspectTileZeroExposure(zeroPair(T,opposite,amplitude),exposureOptions));
for(const width of [1,1000])for(const amplitude of [0,.01])add('compiled2','actual native collar '+width+'/'+amplitude,T.inspectTileZeroExposure(wideZeroPair(T,width,amplitude),exposureOptions));
for(const [P,j]of [[22,15],[23,13],[26,15]]){const s=fractionalCompound(T,P,j);add('compiled2','actual fractional compound P'+P,T.planTileRenderEdges({bundles:[s.bundle],windows:[]},renderOptions()));}
for(const kind of ['region','profile-sweep'])for(const nested of [false,true]){
  const r=clipRecipe(kind,nested),shape=v=>nested?v.shape.nodes[0].shape:v.shape;assert.deepEqual(T.validateTileRecipe(r),r);add('recipe2','omitted clip '+kind+'/'+nested,r);
  const bounded=clone(r);shape(bounded).clip={min:[-1,-1,-1],max:[3,3,1]};assert.deepEqual(T.validateTileRecipe(bounded),bounded);add('recipe2','bounds clip '+kind+'/'+nested,bounded);
  for(const clip of [null,false,0,'']){const bad=clone(r);shape(bad).clip=clip;assert.throws(()=>T.validateTileRecipe(bad),e=>e.code==='INVALID_RECORD');add('recipe2','falsy clip '+kind+'/'+nested+'/'+JSON.stringify(clip),bad,false);if(!nested){const inherited=region('inherited.clip');inherited.shape=clone(shape(bad));assert.deepEqual(V1.validateTileRecipe(inherited),inherited);add('recipe1','known frozen v1 executable/schema clip discrepancy '+kind+'/'+JSON.stringify(clip),inherited,false);}}
}
const inheritedNames=native('shape-graph');inheritedNames.shape.nodes[0].id='constructor';inheritedNames.shape.nodes[1]={kind:'difference',id:'toString',baseId:'constructor',subtractId:'constructor'};inheritedNames.shape.rootId='toString';assert.deepEqual(T.validateTileRecipe(inheritedNames),inheritedNames);add('recipe2','own graph IDs matching inherited object names',inheritedNames);
const positive=T.inspectTileZeroExposure(zeroPair(T,1,0),exposureOptions);
for(const [label,change]of [['missing analytic claim',v=>delete v.a.side.analyticState],['missing native proof',v=>delete v.a.side.nativeProof],['native inside without proof',v=>v.a.side.nativeProof=null],['native unknown with positive proof',v=>v.a.side.state='unknown'],['unsupported native outside',v=>v.a.side.state='outside'],['old conflated sign claim',v=>v.a.side.proof='deflated-native-field-whole-collar-interval-v1']]){const bad=clone(positive);change(bad);add('compiled2',label,bad,false);}
const source=mixedV2(T);for(const [schema,label,change]of [
 ['recipe2','future version',v=>v.version=3],['recipe2','future tag',v=>v.shape.kind='unknown'],['recipe2','missing width law',v=>delete v.shape.width],['recipe2','negative width',v=>v.shape.width.stations[0].leftM=-1],['recipe2','hidden functional field',v=>v.averagedWidth=1],['recipe2','unknown feature',v=>v.features.push('all-gameplay-ready')],['recipe2','missing exposure intent',v=>delete v.exposure],
 ['layout2','missing format discriminator',v=>delete v.instances[0].recipeVersion],['layout2','functional annotation',v=>v.annotations.width=2],['layout2','numeric display string',v=>v.annotations.label=4],['layout2','opaque functional extensions',v=>v.extensions={width:2}],
 ['bundle2','missing complete controls',v=>v.recipes=[]],['bundle2','compiled proof smuggled in save',v=>v.compiled={accepted:true}],['compiled2','false live adoption',v=>v.statuses.liveAdoption=true],['compiled2','relaxed render ceiling',v=>v.options.maxTotalNodes=65537],['compiled2','missing exact attributes',v=>delete v.edges[0].nodes[0].attributes.normal],['compiled2','untyped event',v=>v.edges[0].events.push({kind:'root',t:.5})],['compiled2','trailing newline in edge identity',v=>v.edges[0].edgeKey+='\n'],['compiled2','relaxed cut node ceiling',v=>v.options.maxCutNodes=130],['compiled2','relaxed public node ceiling',v=>v.options.maxPortNodes=4098]
]){const v=clone(schema==='recipe2'?source.r:schema==='layout2'?source.layout:schema==='bundle2'?source.bundle:portPlan);change(v);add(schema,label,v,false);}
const c1Cases=measureC1();for(const c of c1Cases)add('compiled2','actual C1 '+c.name,c.result);
const c1Source=c1Cases[0].result.source,c1Positive=c1Cases[0].result,c1Empty=c1Cases.find(c=>c.result.resolution.state==='resolved-empty').result;
for(const [label,source,opts]of [['invalid source',null,c1Options(T)],['invalid options',c1Source,{}],['work refusal',c1Source,c1Options(T,{limits:{maxWork:1}})],['byte refusal',c1Source,c1Options(T,{limits:{maxSerializedBytes:1}})]])add('compiled2','C1 '+label,T.inspectTilePlanarBoolean(source,opts));
const unsupportedC1=clone(c1Source);unsupportedC1.shape.nodes[0].shape.clip={min:[-1,-1,-1],max:[5,5,1]};add('compiled2','C1 retained unsupported clip',T.inspectTilePlanarBoolean(unsupportedC1,c1Options(T)));
for(const [label,base,change]of [['false adoption',c1Positive,v=>v.statuses.liveAdoption=true],['missing provenance',c1Positive,v=>delete v.geometry.edges[0].coverage],['missing native direction',c1Positive,v=>delete v.geometry.edges[0].coverage[0].direction],['zero rational denominator',c1Positive,v=>v.geometry.vertices[0].point[0][1]='0'],['missing source binding',c1Positive,v=>delete v.sourceBindingDigest],['relaxed exact ceiling',c1Positive,v=>v.options.limits.maxInputBits=129],['untyped weak contour',c1Positive,v=>v.geometry.contours[0].weak='yes'],['fake mesh projection',c1Positive,v=>v.worldProjection.kind='mesh-ready'],['ghost empty geometry',c1Empty,v=>v.geometry.vertices.push(clone(c1Positive.geometry.vertices[0]))],['false empty state',c1Positive,v=>v.resolution.state='resolved-empty']]){const bad=clone(base);change(bad);add('compiled2','C1 '+label,bad,false);}
// These have valid structural syntax but require executable graph/source audits.
const cyclic=native('shape-graph');cyclic.shape.nodes[1].baseId='difference';add('recipe2','structural syntax is not a cycle proof',cyclic);const absent=clone(source.layout);absent.instances[0].contentDigest='a'.repeat(64);add('layout2','structural digest is not a source identity proof',absent);
for(const x of [...tileSchemas(),...tileV2Schemas()])add('meta','schema document '+x.schema.$id,x.schema);
const folder=new URL('../artifacts/procedural-tiles-v2/',import.meta.url);fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(new URL('schema-cases.json',folder),JSON.stringify(cases,null,2)+'\n');console.log(JSON.stringify({status:'pass',schemas:8,cases:cases.filter(c=>c.schema!=='meta').length,golden:fs.existsSync(goldenPath)}));
