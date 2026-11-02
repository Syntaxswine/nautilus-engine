// Reviewed fixed3df registration composition. Browser/game adoption is separate.
// Designed for tools/. This adds no generic stripping or registration fallback.
import assert from 'node:assert/strict';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {checkTileStackRegistration,TILE_STACK_REGISTRATION_BASE} from './tile-stack-registration.mjs';

export const TILE_AUTHORING_REGISTRATION_SOURCE='3df11ce6e62fb94806e30652b87168949f8ef4dd';
export const TILE_AUTHORING_REGISTRATION_BASE='d869410625b246cfff2b51089e7878c31951775c';
export const TILE_AUTHORING_REGISTRATION_ENTRY='./tiles/authoring';
export const TILE_AUTHORING_REGISTRATION_TARGET='./packages/tile-authoring-core/index.js';
export const TILE_AUTHORING_DISTRIBUTION_LINE="  if(profile==='core'||profile==='compatibility')extras.push('packages/tile-authoring-core/index.d.ts','packages/tile-authoring-core/contract.schema.json','packages/tile-authoring-core/README.md','packages/tile-authoring-core/source.json','docs/tile-authoring.md');";
const runtime=['budget.js','contract.js','data.js','geometry.js','index.js','model.js','operations.js','target.js'].map(name=>'packages/tile-authoring-core/'+name);
const support=['packages/tile-authoring-core/README.md','packages/tile-authoring-core/contract.schema.json','packages/tile-authoring-core/index.d.ts','packages/tile-authoring-core/source.json','docs/tile-authoring.md'].sort();
const additionalFiles=[...runtime,...support].sort(),profiles=['core','renderer','assets','compatibility'];
const approvedCritical=[
  {
    "commit": "3df11ce6e62fb94806e30652b87168949f8ef4dd",
    "path": "packages/tile-authoring-core/source.json",
    "bytes": 22066,
    "sha256": "3c0195dcee6105d7f24e86e19ecac10759b1e88f031a057083d5bad1fd57ea49",
    "gitBlob": "f4e2702b31264c13f82c38b91d2a3f0b7743832c"
  },
  {
    "commit": "3df11ce6e62fb94806e30652b87168949f8ef4dd",
    "path": "package.json",
    "bytes": 27867,
    "sha256": "01e6aa39dcc0dd8a975ec7e7468f958aed54f87cf5abf33eb7ec8c92f641e407",
    "gitBlob": "e9c77577b5585317221a0da18073a024d1c645c4"
  },
  {
    "commit": "3df11ce6e62fb94806e30652b87168949f8ef4dd",
    "path": "tools/distribution.mjs",
    "bytes": 17783,
    "sha256": "361503d8d363f040d7fb0dab91e0ed57834d0670405b42b01c1949e552a5e385",
    "gitBlob": "aaf31ebebddaeecb5645ee198a0b196f89684181"
  },
  {
    "commit": "d869410625b246cfff2b51089e7878c31951775c",
    "path": "package.json",
    "bytes": 27120,
    "sha256": "c1d104fdb18fc6f5626b63f5a352450ec4dc0b6be88ea5e6f9e584beaeeeb559",
    "gitBlob": "efd8d76517a3b320b10bab44a73740fd812b5a60"
  },
  {
    "commit": "d869410625b246cfff2b51089e7878c31951775c",
    "path": "tools/distribution.mjs",
    "bytes": 17517,
    "sha256": "256f67d629389dcb0d55f979674eac6efcce1586c99faefd3aba2782d4db5cce",
    "gitBlob": "8f488c2c55f251b3493647a09bb6c6f4ddbe73af"
  },
  {
    "commit": "d869410625b246cfff2b51089e7878c31951775c",
    "path": "tools/tile-stack-registration.mjs",
    "bytes": 7452,
    "sha256": "e27b695f80c9f89844a2406607cb6ec5b57badd117b7034c08814548716b8162",
    "gitBlob": "46e3de25f23454ec13343d20d9cf3b86f46ca988"
  },
  {
    "commit": "3df11ce6e62fb94806e30652b87168949f8ef4dd",
    "path": "docs/distribution.md",
    "bytes": 15699,
    "sha256": "7f2b96a1969897552986b855dc92f98d2f9ac331e645b687845be9153dfe5daa",
    "gitBlob": "5e519ffd2208df8897b3e5d4939b48e280a6b322"
  },
  {
    "commit": "d869410625b246cfff2b51089e7878c31951775c",
    "path": "docs/distribution.md",
    "bytes": 15030,
    "sha256": "ae9b5d5cdb35afd97664120ca98245674cbab150107454aad3eeb33e8318c527",
    "gitBlob": "c3c671e1619cab6d14c833fa72706dfa3a4739e4"
  }
];
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const canonical=value=>Array.isArray(value)?'['+value.map(canonical).join(',')+']':value&&typeof value==='object'?'{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonical(value[key])).join(',')+'}':JSON.stringify(value);
const token=value=>sha(canonical(value)),record=(file,bytes)=>({path:file,bytes:bytes.length,sha256:sha(bytes)});
const relative=file=>typeof file==='string'&&file&&!path.posix.isAbsolute(file)&&!file.includes('\\')&&!file.includes('%')&&!/[\x00-\x1f\x7f?#]/.test(file)&&path.posix.normalize(file)===file&&!file.split('/').some(part=>!part||part==='.'||part==='..');
const included=profile=>profile==='core'||profile==='compatibility';
const priorExports=(pkg,profile)=>profile==='core'?Object.fromEntries(Object.entries(pkg.exports).filter(([id])=>!id.endsWith('/three')&&!id.startsWith('./render-effects')&&!id.startsWith('./floors/')&&!id.startsWith('./game-ui/')&&!['./grenades/ui','./grenades/style.css','./grenades/view'].includes(id))):profile==='renderer'?{...Object.fromEntries(Object.entries(pkg.exports).filter(([id])=>id.endsWith('/three')||id==='./render-effects'||id==='./grenades/view')),'.':'./packages/assets/three.js'}:profile==='assets'?{'.':'./packages/assets/files.js','./catalogue':'./packages/assets/index.js'}:{...pkg.exports};

export function checkTileAuthoringRegistration({object,read,indexed=()=>{},moduleClosure,distribution}){
  const authenticate=(commit,file)=>{
    const row=approvedCritical.find(row=>row.commit===commit&&row.path===file);assert.ok(row,'No approved critical source row '+commit+':'+file);
    const bytes=object(commit,file);assert.ok(Buffer.isBuffer(bytes));assert.equal(bytes.length,row.bytes);assert.equal(sha(bytes),row.sha256);assert.equal(createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),row.gitBlob);return bytes;
  };
  const base=TILE_AUTHORING_REGISTRATION_BASE,source=TILE_AUTHORING_REGISTRATION_SOURCE,basePackageBytes=authenticate(base,'package.json'),basePackage=JSON.parse(basePackageBytes),sourcePackageBytes=authenticate(source,'package.json'),sourcePackage=JSON.parse(sourcePackageBytes);
  const expectedPackage=structuredClone(basePackage);assert.equal(Object.hasOwn(expectedPackage.exports,TILE_AUTHORING_REGISTRATION_ENTRY),false);
  expectedPackage.exports[TILE_AUTHORING_REGISTRATION_ENTRY]=TILE_AUTHORING_REGISTRATION_TARGET;
  for(const file of additionalFiles)assert.equal(expectedPackage.files.includes(file),false);
  expectedPackage.files=[...expectedPackage.files,...additionalFiles].sort();assert.equal(Object.hasOwn(expectedPackage.scripts,'test:tiles:authoring'),false);expectedPackage.scripts['test:tiles:authoring']='node tools/test-tile-authoring-core-package.mjs';
  assert.deepEqual(sourcePackage,expectedPackage,'Fixed Core package must add exactly one entry, thirteen files and the named proof script.');
  assert.ok(sourcePackageBytes.equals(Buffer.from(JSON.stringify(expectedPackage,null,2)+'\n')),'Fixed package representation changed.');
  const currentPackageBytes=read('package.json');assert.ok(currentPackageBytes.equals(sourcePackageBytes),'Unexplained current package/export/whitelist/script delta.');
  const baseDistribution=authenticate(base,'tools/distribution.mjs'),sourceDistribution=authenticate(source,'tools/distribution.mjs'),marker='  const files = [...new Set(',text=baseDistribution.toString('utf8');assert.equal(text.split(marker).length,2);assert.equal(text.includes(TILE_AUTHORING_DISTRIBUTION_LINE),false);
  const expectedDistribution=Buffer.from(text.replace(marker,TILE_AUTHORING_DISTRIBUTION_LINE+'\n'+marker));assert.ok(sourceDistribution.equals(expectedDistribution),'Fixed Core distribution may add only the named support line.');
  const currentDistribution=read('tools/distribution.mjs');assert.ok(currentDistribution.equals(expectedDistribution),'Unexplained current distribution delta.');
  const sourceDocs=authenticate(source,'docs/distribution.md'),baseDocs=authenticate(base,'docs/distribution.md'),rockSentence=bytes=>bytes.toString().split('\n').find(line=>line.startsWith('./items provides headless rock actions'));
  const fromSentence=rockSentence(sourceDocs),toSentence=rockSentence(baseDocs);assert.ok(fromSentence&&toSentence);assert.equal(fromSentence.replaceAll('â†’','→'),toSentence,'Restore only the original rock-workflow arrow glyphs.');assert.equal(fromSentence.split('â†’').length-1,3);assert.equal(sourceDocs.toString().split(fromSentence).length,2);
  const expectedDocs=Buffer.from(sourceDocs.toString().replace(fromSentence,toSentence));assert.ok(read('docs/distribution.md').equals(expectedDocs),'Distribution guide may differ from fixed Core only by the one original-sentence restoration.');indexed('docs/distribution.md',expectedDocs);
  const documentationAdaptation={kind:'literal-known-sentence-restoration',path:'docs/distribution.md',sourceCommit:source,restorationSource:base,from:fromSentence,to:toSentence,occurrences:1,source:record('docs/distribution.md',sourceDocs),current:record('docs/distribution.md',expectedDocs)};
  const oldHelper=authenticate(base,'tools/tile-stack-registration.mjs');assert.ok(object(source,'tools/tile-stack-registration.mjs').equals(oldHelper));assert.ok(read('tools/tile-stack-registration.mjs').equals(oldHelper),'The historical registration helper must remain unchanged.');
  const manifestPath='packages/tile-authoring-core/source.json',manifestBytes=authenticate(source,manifestPath),manifest=JSON.parse(manifestBytes);
  assert.equal(manifest.schemaVersion,1);assert.equal(manifest.base,base);assert.equal(manifest.baseline.base,base);assert.deepEqual(manifest.baseline.exports,basePackage.exports);assert.deepEqual(manifest.runtime.map(row=>row.path),runtime);
  assert.deepEqual(manifest.metadata.map(row=>row.path).sort(),support.filter(file=>file!==manifestPath));
  const currentRows=[],readFixed=(row,commit=source)=>{assert.ok(relative(row.path));const bytes=object(commit,row.path);assert.deepEqual(record(row.path,bytes),row,'Fixed source record differs '+row.path);assert.ok(read(row.path).equals(bytes),'Current source differs '+row.path);indexed(row.path,bytes);return bytes;};
  for(const row of [...manifest.runtime,...manifest.metadata]){readFixed(row);currentRows.push(row);}
  assert.ok(read(manifestPath).equals(manifestBytes),'Current source manifest differs from fixed reviewed bytes.');indexed(manifestPath,manifestBytes);currentRows.push(record(manifestPath,manifestBytes));
  const dependencyPaths=manifest.dependencies.map(row=>row.path);assert.equal(new Set(dependencyPaths).size,dependencyPaths.length);
  for(const row of manifest.dependencies){assert.ok(basePackage.files.includes(row.path),'New dependency was not already public: '+row.path);const before=readFixed(row,base);assert.ok(before.equals(object(source,row.path)),'Core changed a prior dependency: '+row.path);}
  const expectedClosure=[...runtime,...dependencyPaths,'packages/tile-authoring-core/contract.schema.json'].sort(),closure=moduleClosure([TILE_AUTHORING_REGISTRATION_TARGET]);assert.deepEqual(closure,expectedClosure,'Actual authoring source closure differs from the complete fixed closure.');
  assert.equal(new Set(closure).size,closure.length);for(const file of closure)assert.ok(relative(file)&&!file.startsWith('apps/')&&!/^(?:candidates|tests|tools|artifacts)\//.test(file),'Private or host dependency in public authoring closure: '+file);
  const currentProfiles={},oldProfiles={},profileReport={};
  for(const profile of profiles){
    const plan=distribution(profile),wantedEntry=included(profile)?TILE_AUTHORING_REGISTRATION_TARGET:undefined,expectedExports=priorExports(basePackage,profile),expectedCurrentExports={...expectedExports,...(included(profile)?{[TILE_AUTHORING_REGISTRATION_ENTRY]:wantedEntry}:{})};
    assert.deepEqual(plan.exports,expectedCurrentExports,'Complete current profile export map differs: '+profile);
    assert.deepEqual(plan.files,[...new Set(plan.files)].sort(),'Profile files must be unique and sorted: '+profile);
    for(const file of plan.files)assert.ok(relative(file)&&!/^(?:candidates|tests|tools|artifacts)\//.test(file),'Private source leaked into '+profile+': '+file);
    const own=plan.files.filter(file=>file.startsWith('packages/tile-authoring-core/')||file==='docs/tile-authoring.md'),wantedFiles=included(profile)?additionalFiles:[];
    assert.deepEqual(own,wantedFiles,'Complete additional profile footprint differs: '+profile);
    // Validate the whole remaining profile before exposing a historical view.
    const remaining=plan.files.filter(file=>!additionalFiles.includes(file)),baseline=manifest.baseline.profiles[profile];assert.equal(remaining.length,baseline.fileCount);assert.equal(token(remaining),baseline.filesHash,'Unexplained unrelated profile files: '+profile);assert.equal(token(expectedExports),baseline.exportsHash);
    assert.equal(plan.name,profile==='compatibility'?basePackage.name:'@nautilus-engine/'+(profile==='assets'?'building-assets':profile));
    currentProfiles[profile]=plan;oldProfiles[profile]={...plan,exports:expectedExports,files:remaining};profileReport[profile]={beforeFiles:remaining.length,files:plan.files.length,addedFiles:[...own],entryAdded:included(profile),unrelatedFilesUnchanged:true};
  }
  assert.deepEqual(sourcePackage.files,currentProfiles.compatibility.files,'Exact root whitelist must match the complete current compatibility profile.');
  indexed('package.json',currentPackageBytes);indexed('tools/distribution.mjs',currentDistribution);indexed('tools/tile-stack-registration.mjs',oldHelper);
  // No historical projection exists until ALL current additions and profiles
  // above have authenticated. The original checker still runs unchanged.
  const historicalRead=file=>file==='package.json'?basePackageBytes:file==='tools/distribution.mjs'?baseDistribution:read(file);
  const historicalIndexed=(file,expected)=>{
    if(file==='package.json'){assert.ok(expected.equals(basePackageBytes));return indexed(file,currentPackageBytes);}
    if(file==='tools/distribution.mjs'){assert.ok(expected.equals(baseDistribution));return indexed(file,currentDistribution);}
    return indexed(file,expected);
  };
  const legacy=checkTileStackRegistration({object,read:historicalRead,indexed:historicalIndexed,moduleClosure,distribution:(profile='compatibility')=>{assert.ok(Object.hasOwn(oldProfiles,profile));return oldProfiles[profile];}});
  const requiredGitCommits=[source,base,TILE_STACK_REGISTRATION_BASE];
  return {...legacy,historicalView:{scope:'Authenticated pre-authoring logical export view only; not physical current package/index bytes.',exports:{...basePackage.exports}},authoringRegistration:{status:'reviewed-source-authentication',sourceCommit:source,integrationBase:base,entry:TILE_AUTHORING_REGISTRATION_ENTRY,target:TILE_AUTHORING_REGISTRATION_TARGET,runtime:[...runtime],support:[...support],runtimeClosure:closure,priorDependencyCount:dependencyPaths.length,registeredFiles:currentRows.sort((a,b)=>a.path.localeCompare(b.path)),profiles:profileReport,packageAdaptations:{path:'package.json',baseSha256:sha(basePackageBytes),sha256:sha(currentPackageBytes),entryCount:1,additionalFiles:13,script:'test:tiles:authoring'},distributionAdaptation:{path:'tools/distribution.mjs',baseSha256:sha(baseDistribution),sha256:sha(currentDistribution),line:TILE_AUTHORING_DISTRIBUTION_LINE,occurrences:1},documentationAdaptations:[documentationAdaptation],originalStackHelperUnchanged:true,globalSchemaRegistryChanged:false,privateCandidatesAdopted:false,gameAdopted:false,requiredGitCommits},requiredGitCommits};
}
