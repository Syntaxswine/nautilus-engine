// Root-owned fixed private SDK planner/authenticator. No runtime factory, writer,
// validator replacement, permissive prefix or public registration is provided.
import assert from 'node:assert/strict';
import path from 'node:path';
import {createHash} from 'node:crypto';
export const CORE_INTEGRATION_SOURCE='f727599bbbe619910fea0bcd54d206854cb709e2';
export const CORE_INTEGRATION_BASE='e4d798cd30857e4a77c8875817f9f333286eb32c';
export const CORE_INTEGRATION_ROOT='apps/editor/tile-authoring/c2/core/browser-owned-v1/integration-v1/';
export const CORE_INTEGRATION_TOOL='tools/tile-authoring-c2-core-integration-source.mjs';
export const CORE_INTEGRATION_RECORD='docs/reviews/tile-authoring/architect/c2-core-integration-source.json';
const SOURCE='candidates/tile-authoring/core/c2/browser-owned-v1/integration-v1/';
const PURE='30bfa968cf778750fbad6a7aec8ff7052e05ba0c';
const sha=b=>createHash('sha256').update(b).digest('hex'),blob=b=>createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex'),json=v=>Buffer.from(JSON.stringify(v,null,2)+'\n');
const runtimeTargets={
  "capacity.js": "apps/editor/tile-authoring/c2/core/browser-owned-v1/integration-v1/capacity.js",
  "core.js": "apps/editor/tile-authoring/c2/core/browser-owned-v1/integration-v1/core.js",
  "host-construction.js": "apps/editor/tile-authoring/c2/core/browser-owned-v1/integration-v1/host-construction.js",
  "host/data.js": "apps/editor/tile-authoring/c2/core/browser-owned-v1/integration-v1/host/data.js",
  "host/host-composition.js": "apps/editor/tile-authoring/c2/core/browser-owned-v1/integration-v1/host/host-composition.js",
  "index.js": "apps/editor/tile-authoring/c2/core/browser-owned-v1/integration-v1/index.js",
  "journal.js": "apps/editor/tile-authoring/c2/core/browser-owned-v1/integration-v1/journal.js",
  "kernel-backend.js": "apps/editor/tile-authoring/c2/core/browser-owned-v1/integration-v1/kernel-backend.js",
  "kernel.js": "apps/editor/tile-authoring/c2/core/browser-owned-v1/integration-v1/kernel.js",
  "kernel/deps/apps/editor/smart-tile/checkpoint.js": "apps/editor/smart-tile/checkpoint.js",
  "kernel/deps/apps/editor/smart-tile/contract.js": "apps/editor/smart-tile/contract.js",
  "kernel/deps/apps/editor/smart-tile/intents.js": "apps/editor/smart-tile/intents.js",
  "kernel/deps/apps/editor/smart-tile/views.js": "apps/editor/smart-tile/views.js",
  "kernel/deps/apps/editor/tile-stack/contract.js": "apps/editor/tile-stack/contract.js",
  "kernel/deps/apps/editor/tile-stack/floors.js": "apps/editor/tile-stack/floors.js",
  "kernel/deps/apps/editor/tile-stack/policy.js": "apps/editor/tile-stack/policy.js",
  "kernel/deps/packages/parts-core/hash.js": "packages/parts-core/hash.js",
  "kernel/runtime/apps/editor/smart-tile/authority.js": "apps/editor/smart-tile/authority.js",
  "kernel/runtime/apps/editor/smart-tile/checkpoint.js": "apps/editor/smart-tile/checkpoint.js",
  "kernel/runtime/apps/editor/smart-tile/session.js": "apps/editor/smart-tile/session.js",
  "kernel/runtime/apps/editor/smart-tile/storage.js": "apps/editor/smart-tile/storage.js",
  "kernel/runtime/apps/editor/tile-authoring/checkpoint.js": "apps/editor/tile-authoring/checkpoint.js",
  "kernel/runtime/apps/editor/tile-authoring/jsonl.js": "apps/editor/tile-authoring/jsonl.js",
  "kernel/runtime/observation.js": "packages/authoring-runtime/observation.js",
  "kernel/runtime/packages/windows-authoring/journal.js": "packages/windows-authoring/journal.js",
  "ordinary/data.js": "apps/editor/tile-authoring/c2/core/browser-owned-v1/integration-v1/ordinary/data.js",
  "ordinary/index.js": "apps/editor/tile-authoring/c2/core/browser-owned-v1/integration-v1/ordinary/index.js",
  "ordinary/public-consumer.js": "apps/editor/tile-authoring/c2/core/browser-owned-v1/integration-v1/ordinary/public-consumer.js",
  "ordinary/runtime/c1/contract.js": "packages/tile-authoring-core/contract.js",
  "ordinary/runtime/c1/contract.schema.json": "packages/tile-authoring-core/contract.schema.json",
  "ordinary/runtime/c1/geometry.js": "apps/editor/tile-authoring/c2/core/browser-owned-v1/integration-v1/ordinary/runtime/c1/geometry.js",
  "ordinary/runtime/c1/index.js": "apps/editor/tile-authoring/c2/core/browser-owned-v1/integration-v1/ordinary/runtime/c1/index.js",
  "ordinary/runtime/c1/model.js": "apps/editor/tile-authoring/c2/core/browser-owned-v1/integration-v1/ordinary/runtime/c1/model.js",
  "ordinary/runtime/c1/operations.js": "apps/editor/tile-authoring/c2/core/browser-owned-v1/integration-v1/ordinary/runtime/c1/operations.js",
  "ordinary/runtime/c1/target.js": "apps/editor/tile-authoring/c2/core/browser-owned-v1/integration-v1/ordinary/runtime/c1/target.js",
  "ordinary/runtime/stack/budget.js": "apps/editor/tile-authoring/c2/core/browser-owned-v1/integration-v1/ordinary/runtime/stack/budget.js",
  "ordinary/runtime/stack/contracts.js": "packages/tile-stack-core/contracts.js",
  "ordinary/runtime/stack/geometry.js": "packages/tile-stack-core/geometry.js",
  "ordinary/runtime/stack/ids.js": "packages/tile-stack-core/ids.js",
  "ordinary/runtime/stack/index.js": "apps/editor/tile-authoring/c2/core/browser-owned-v1/integration-v1/ordinary/runtime/stack/index.js",
  "ordinary/scope.js": "apps/editor/tile-authoring/c2/core/browser-owned-v1/integration-v1/ordinary/scope.js",
  "owner.js": "apps/editor/tile-authoring/c2/core/browser-owned-v1/integration-v1/owner.js",
  "root-profile-helpers.js": "apps/editor/tile-authoring/c2/core/browser-owned-v1/integration-v1/root-profile-helpers.js",
  "root-profile.js": "apps/editor/tile-authoring/profile.js",
  "source.js": "apps/editor/tile-authoring/c2/core/browser-owned-v1/integration-v1/source.js",
  "work-profiles.js": "apps/editor/tile-authoring/c2/core/browser-owned-v1/integration-v1/work-profiles.js",
  "work-profiles.json": "apps/editor/tile-authoring/c2/core/browser-owned-v1/integration-v1/work-profiles.json",
  "retained-command.js": "apps/editor/tile-authoring/c2/core/browser-owned-v1/integration-v1/retained-command.js"
};
const profileEdits=[
  {
    "from": "import {smartTileData,smartTileDigest,fields,fail} from '../smart-tile/checkpoint.js';",
    "to": "import {smartTileData as originalData,smartTileDigest as originalDigest,fields as originalFields,fail} from '../smart-tile/checkpoint.js';\nimport {bindPrivateObservation} from '../../../packages/authoring-runtime/observation.js';",
    "occurrences": 1,
    "role": "Import the SAME canonical observed helpers; no package->apps dependency or private Core import."
  },
  {
    "from": "import {readAuthoringJSON} from './jsonl.js';",
    "to": "import {readAuthoringJSON as originalReader} from './jsonl.js';",
    "occurrences": 1,
    "role": "Name the SAME actual strict reader; default syntax/limits do not change."
  },
  {
    "from": "export function createTileAuthoringSessionProfile(deps,{binding,finishCatalogue,resourcePorts,inspection=null}){",
    "to": "export function createTileAuthoringSessionProfile(deps,{binding,finishCatalogue,resourcePorts,inspection=null},privateObservation=undefined){\n  const observer=bindPrivateObservation(privateObservation);\n  const smartTileData=value=>originalData(value,observer);\n  const smartTileDigest=value=>originalDigest(value,observer);\n  const fields=(value,keys,path,required=keys)=>originalFields(value,keys,path,required,observer);\n  const readAuthoringJSON=(value,options={})=>originalReader(value,{...options,observer});\n  const tileHash=value=>observer?observer.opaque('frozen.tiles.hash',value,()=>deps.tiles.tileLayoutToken(value)):deps.tiles.tileLayoutToken(value);",
    "occurrences": 1,
    "role": "Semantic opt-in seam. Default third argument is absent/undefined; real Core supplies its existing bound bridge. Profile shape, options and authority stay unchanged."
  },
  {
    "from": "geometry:deps.tiles.tileLayoutToken({sourceJSON:d.sourceJSON,floorBinding:d.floorBinding,tileBundle:d.tileBundle}),appearance:deps.tiles.tileLayoutToken({tileBundle:d.tileBundle,finishBinding:d.finishBinding,decorations:d.authoring.decorations,resourceRefs:d.resourceRefs,profileDigest:presentationProfileDigest})",
    "to": "geometry:tileHash({sourceJSON:d.sourceJSON,floorBinding:d.floorBinding,tileBundle:d.tileBundle}),appearance:tileHash({tileBundle:d.tileBundle,finishBinding:d.finishBinding,decorations:d.authoring.decorations,resourceRefs:d.resourceRefs,profileDigest:presentationProfileDigest})",
    "occurrences": 1,
    "role": "Two actual hash calls use existing observer.opaque and actual public tiles, matching candidate observation sites; no invented measured counters."
  }
];
const sharedHashes={'apps/editor/smart-tile/checkpoint.js':'60c932437c272edc79b8b3e9b961910fa532ff3b8aed1ce17d7a489411358bb8','apps/editor/smart-tile/session.js':'d8a2e73bf30d4cb17d772da920ea2b053d8331d8afaf046e159dcaddfcfc588d','apps/editor/tile-authoring/checkpoint.js':'992cfd822c58a15d361c1eafc98a4015bd05f93487e697aaaa51625fa8e56229','apps/editor/tile-authoring/profile.js':'1220d8481ea05dc5c594a5b40ca7d7852da979c6cc1b0ece8b24dad3515a6502'};
const sdkReadme='Private canonical Core SDK, fixed f727599bbbe619910fea0bcd54d206854cb709e2.\n\nRoot callers construct one source owner/Kernel and use kernel.constructHostComposition; no separate Host factory, Kernel, journal or manager. The safe Host entry is source-private. Retained commands identify original immutable commands without edit credit; a fresh original-ID attempt pays inspection. Shared default C1 is preserved.\n\nThis imports reviewed source and constructor/retained protocols. Actual C2 Native acquisition, prepared/apply authority, final WAL and live Editor composition remain UNBOUND. No public package export or consumer adoption is declared. See source.json and the architect source record for immutable origins, notices, exact transformations and proof limits.\n';
const describe=(p,b)=>({path:p,bytes:b.length,sha256:sha(b),gitBlob:blob(b)});
const safe=p=>{assert.equal(path.posix.normalize(p),p);assert.ok(p&&!p.startsWith('/')&&!p.includes('\\')&&!p.split('/').includes('..'));return p;};
export function coreIntegrationSourcePlan({object}){
 const cache=new Map(),read=(commit,file)=>{safe(file);const key=commit+':'+file;if(!cache.has(key)){const bytes=object(commit,file);assert.ok(Buffer.isBuffer(bytes),'Fixed Git source reader must supply original bytes');cache.set(key,bytes);}return cache.get(key);},fixed=p=>read(CORE_INTEGRATION_SOURCE,p);
 const inventoryBytes=fixed(SOURCE+'source.json');assert.equal(sha(inventoryBytes),'682d0c1028cd7cd101e6f21645d20b152d306594c5aca2189738bbfb2489a1fc');const inventory=JSON.parse(inventoryBytes);assert.equal(inventory.runtime.length,48);assert.equal(inventory.dependencies.length,110);assert.equal(inventory.frozenCorrectedCoreClosure,95);assert.deepEqual(inventory.runtime.map(r=>r.path).sort(),Object.keys(runtimeTargets).map(p=>SOURCE+p).sort());
 for(const row of [...inventory.files,...inventory.runtime,...inventory.dependencies]){const bytes=fixed(row.path);assert.equal(bytes.length,row.bytes,row.path);assert.equal(sha(bytes),row.sha256,row.path);}
 for(const row of inventory.dependencies)assert.ok(fixed(row.path).equals(read(PURE,row.path)),'Protected pure Core/public dependency changed: '+row.path);
 const pureMapBytes=read(CORE_INTEGRATION_BASE,'apps/editor/tile-authoring/c2/core/source.json'),pureMap=JSON.parse(pureMapBytes);assert.equal(pureMap.sourceCommit,PURE);const mapping=new Map(Object.entries(runtimeTargets).map(([p,t])=>[SOURCE+p,t]));for(const row of pureMap.files)mapping.set(row.sourcePath,row.targetPath);
 const sourceInputs=[];for(const [name,key,count]of [['kernel-inputs.json','closure',16],['root-inputs.json','inputs',9],['ordinary-inputs.json','inputs',14],['host-inputs.json','inputs',2]]){const input=JSON.parse(fixed(SOURCE+name));assert.equal(input[key].length,count);for(const row of input[key]){const original=read(row.commit,row.path);assert.equal(original.length,row.bytes);assert.equal(sha(original),row.sha256);assert.ok(fixed(row.vendor).equals(original),'Changed retained raw original: '+row.vendor);if(row.adapter){let text=original.toString();for(const edit of row.importRewrites)for(const q of ["'",'"'])text=text.split(q+edit.from+q).join(q+edit.to+q);for(const edit of row.sourceAdaptations??[]){assert.equal(text.split(edit.from).length-1,edit.occurrences,edit.id);text=text.split(edit.from).join(edit.to);}assert.equal(sha(Buffer.from(text)),row.adapterSha256??row.equivalentBaseSha256,row.adapter);if(row.adapterSha256)assert.ok(Buffer.from(text).equals(fixed(row.adapter)));}sourceInputs.push({commit:row.commit,path:row.path,bytes:row.bytes,sha256:row.sha256,gitBlob:blob(original),vendor:row.vendor,adapter:row.adapter??null,declaredSemanticEdits:row.sourceAdaptations??[]});}}
 const transform=(source,target,extraMap=mapping)=>{const original=fixed(source);let text=original.toString(),rewrites=[];assert.ok(Buffer.from(text).equals(original));for(const match of [...original.toString().matchAll(/\b(?:from\s*|import\s*)(['"])(\.[^'"\r\n]+)\1/g)]){const q=match[1],spec=match[2],dependency=path.posix.normalize(path.posix.join(path.posix.dirname(source),spec)),mapped=extraMap.get(dependency)??dependency;assert.ok(!mapped.startsWith('candidates/'),'No private candidate/worker fallback: '+dependency);let relative=path.posix.relative(path.posix.dirname(target),mapped);if(!relative.startsWith('.'))relative='./'+relative;if(relative!==spec&&!rewrites.some(r=>r.from===q+spec+q)){const from=q+spec+q,to=q+relative+q,occurrences=text.split(from).length-1;assert.ok(occurrences);text=text.split(from).join(to);rewrites.push({from,to,occurrences});}}return{bytes:Buffer.from(text),rewrites};};
 const files=[],overrides={},variants=[],add=(target,bytes,source,rewrites=[],role='private SDK source')=>{assert.ok(!files.some(r=>r.path===target),'Duplicate private target '+target);files.push({path:target,expectedBuffer:bytes,...describe(target,bytes),source,rewrites,role});};
 for(const row of inventory.runtime){const suffix=row.path.slice(SOURCE.length),target=mapping.get(row.path);if(suffix==='kernel/deps/apps/editor/smart-tile/checkpoint.js'){variants.push({source:row.path,target,status:'Historical original-C1 alias only; reuse the ONE observed canonical checkpoint. No body copied.'});continue;}if(suffix==='root-profile.js')continue;const result=transform(row.path,target);let bytes=result.bytes,semanticEdits=[];if(suffix==='kernel.js'){const from='createTileAuthoringSessionProfile({...deps,authoring:authoringPort},{...options,binding})',to='createTileAuthoringSessionProfile({...deps,authoring:authoringPort},{...options,binding},bridge)';assert.equal(bytes.toString().split(from).length-1,1);bytes=Buffer.from(bytes.toString().replace(from,to));semanticEdits.push({from,to,occurrences:1,role:'The actual canonical Root profile receives the SAME existing bound observation bridge.'});}
  const origin={commit:CORE_INTEGRATION_SOURCE,path:row.path,bytes:row.bytes,sha256:row.sha256,semanticEdits};if(Object.hasOwn(sharedHashes,target)){assert.equal(sha(bytes),sharedHashes[target]);const before=read(CORE_INTEGRATION_BASE,target);overrides[target]={path:target,before,expectedBuffer:bytes,source:origin,rewrites:result.rewrites,...describe(target,bytes),baseCommit:CORE_INTEGRATION_BASE,baseSha256:sha(before),role:'Exact reviewed shared semantic SDK adaptation; default C1 preserved'};}
  else if(target.startsWith(CORE_INTEGRATION_ROOT))add(target,bytes,origin,result.rewrites);else{const before=read(CORE_INTEGRATION_BASE,target);assert.ok(bytes.equals(before),'Unrelated reused Root dependency differs: '+target);variants.push({source:row.path,target,...describe(target,bytes),status:'Exact existing Root body after import relocation; not copied'});}}
 const profilePath='apps/editor/tile-authoring/profile.js',beforeProfile=read(CORE_INTEGRATION_BASE,profilePath);let profile=beforeProfile.toString();assert.equal(sha(beforeProfile),'88e74d135c21db09003199aa45f3f3b1d2a4dd4620baad0fca04a21ad5f9f784');for(const edit of profileEdits){assert.equal(profile.split(edit.from).length-1,edit.occurrences);profile=profile.split(edit.from).join(edit.to);}const profileBytes=Buffer.from(profile);assert.equal(sha(profileBytes),sharedHashes[profilePath]);overrides[profilePath]={path:profilePath,before:beforeProfile,expectedBuffer:profileBytes,...describe(profilePath,profileBytes),source:{commit:CORE_INTEGRATION_BASE,path:profilePath,bytes:beforeProfile.length,sha256:sha(beforeProfile),semanticEdits:profileEdits},rewrites:[],baseCommit:CORE_INTEGRATION_BASE,baseSha256:sha(beforeProfile),role:'Actual-tested optional observer profile seam; thirdarg absent preserves default C1'};
 const typePairs=[[SOURCE+'index.d.ts',CORE_INTEGRATION_ROOT+'index.d.ts'],[SOURCE+'host-construction.d.ts',CORE_INTEGRATION_ROOT+'host-construction.d.ts'],['candidates/tile-authoring/core/c2/browser-owned-v1/types.d.ts','apps/editor/tile-authoring/c2/core/browser-owned-v1/types.d.ts'],['candidates/tile-authoring/core/c2/abi/types.d.ts','apps/editor/tile-authoring/c2/core/abi/types.d.ts']],typeMap=new Map(mapping);for(const [from,to]of typePairs)typeMap.set(from.replace(/\.d\.ts$/,'.js'),to.replace(/\.d\.ts$/,'.js'));for(const [from,to]of typePairs){const x=transform(from,to,typeMap),b=fixed(from);add(to,x.bytes,{commit:CORE_INTEGRATION_SOURCE,path:from,...describe(from,b)},x.rewrites,'Private type-only closure; static source resolution, no compiler claim');}
 const noticeRows=[['vendor/NOTICE.kernel-4ade.md','NOTICE.kernel-4ade.md'],['vendor/root/NOTICE.648cad3.md','NOTICE.root-648cad3.md'],['vendor/host/NOTICE.f7fcc89.md','NOTICE.host-642086a.md']];for(const [from,to]of noticeRows){const bytes=fixed(SOURCE+from);add(CORE_INTEGRATION_ROOT+to,bytes,{commit:CORE_INTEGRATION_SOURCE,path:SOURCE+from,...describe(SOURCE+from,bytes)},[],'Verbatim original notice; raw code originals remain fixed Git references');}add(CORE_INTEGRATION_ROOT+'README.md',Buffer.from(sdkReadme),null,[],'Root-authored private usage/readiness guide');
 const proofInputs=[
  {
    "path": "tests/tile-authoring-c2-constructors.test.mjs",
    "commit": "f727599bbbe619910fea0bcd54d206854cb709e2",
    "sourcePath": "tests/tile-authoring-core-c2-browser-constructors.test.mjs",
    "sourceSha256": "6db4c0bc9e980dfffdb551aed988a5d53bd4a643476ff4e56431197aacb729fc",
    "edits": [
      {
        "from": "'../candidates/tile-authoring/core/c2/browser-owned-v1/integration-v1/index.js'",
        "to": "'../apps/editor/tile-authoring/c2/core/browser-owned-v1/integration-v1/index.js'",
        "occurrences": 1
      },
      {
        "from": "'../candidates/tile-authoring/core/c2/browser-owned-v1/integration-v1/host-construction.js'",
        "to": "'../apps/editor/tile-authoring/c2/core/browser-owned-v1/integration-v1/host-construction.js'",
        "occurrences": 1
      },
      {
        "from": "'../tools/tile-authoring-core-c2-fixtures.mjs'",
        "to": "'./fixtures/tile-authoring/c2-sdk.mjs'",
        "occurrences": 1
      }
    ]
  },
  {
    "path": "tests/tile-authoring-c2-session-constructor.test.mjs",
    "commit": "f727599bbbe619910fea0bcd54d206854cb709e2",
    "sourcePath": "tests/tile-authoring-core-c2-browser-session-constructor.test.mjs",
    "sourceSha256": "50f7c8cc2d38fddc938e8fa482f6dadcc6000483b69fc5d8c36b6c3e4e84d9e4",
    "edits": [
      {
        "from": "'../candidates/tile-authoring/core/c2/browser-owned-v1/integration-v1/index.js'",
        "to": "'../apps/editor/tile-authoring/c2/core/browser-owned-v1/integration-v1/index.js'",
        "occurrences": 1
      },
      {
        "from": "'../tools/tile-authoring-core-c2-fixtures.mjs'",
        "to": "'./fixtures/tile-authoring/c2-sdk.mjs'",
        "occurrences": 1
      }
    ]
  },
  {
    "path": "tests/tile-authoring-c2-retained.test.mjs",
    "commit": "f727599bbbe619910fea0bcd54d206854cb709e2",
    "sourcePath": "tests/tile-authoring-core-c2-browser-retained-ingress.test.mjs",
    "sourceSha256": "4025eef10d76f159929ad714a99a3777c436722021cbe268fb0c6f2e673b9f38",
    "edits": [
      {
        "from": "'../candidates/tile-authoring/core/c2/browser-owned-v1/integration-v1/index.js'",
        "to": "'../apps/editor/tile-authoring/c2/core/browser-owned-v1/integration-v1/index.js'",
        "occurrences": 1
      },
      {
        "from": "'../candidates/tile-authoring/core/c2/browser-owned-v1/integration-v1/host-construction.js'",
        "to": "'../apps/editor/tile-authoring/c2/core/browser-owned-v1/integration-v1/host-construction.js'",
        "occurrences": 1
      },
      {
        "from": "'../tools/tile-authoring-core-c2-fixtures.mjs'",
        "to": "'./fixtures/tile-authoring/c2-sdk.mjs'",
        "occurrences": 1
      }
    ]
  },
  {
    "path": "tests/fixtures/tile-authoring/c2-sdk.mjs",
    "generated": "// Root proof adapter: actual public modules only; no DTO/native/Kernel substitute.\nexport * as T from '../../../packages/tiles-core/index.js';\nexport * as M from '../../../packages/map-core/index.js';\nexport * as A from '../../../packages/tile-authoring-core/index.js';\nexport * as F from '../../../packages/tile-finishes/catalogue.js';\nexport const cp=value=>structuredClone(value);\n"
  }
];
 for(const proof of proofInputs){let bytes;if(proof.generated)bytes=Buffer.from(proof.generated);else{bytes=read(proof.commit,proof.sourcePath);assert.equal(sha(bytes),proof.sourceSha256);let text=bytes.toString();for(const edit of proof.edits){assert.equal(text.split(edit.from).length-1,edit.occurrences);text=text.split(edit.from).join(edit.to);}bytes=Buffer.from(text);}add(proof.path,bytes,proof.generated?null:{commit:proof.commit,path:proof.sourcePath,sha256:proof.sourceSha256},proof.edits??[],'Actual retained/constructor regression proof; no synthetic runtime authority');}
 const serial=rows=>rows.map(({expectedBuffer,before,...row})=>row),summary={kind:'nautilus-private-c2-core-integration-source',version:1,declared:false,publicActivation:false,sourceCommit:CORE_INTEGRATION_SOURCE,baseCommit:CORE_INTEGRATION_BASE,pureCore:PURE,sourceInventory:{sha256:sha(inventoryBytes),runtimeRows:48,protectedDependencies:110,frozenClosure:95},sourceInputs,files:serial(files),sharedOverrides:Object.values(overrides).map(({before,expectedBuffer,...r})=>r),variants,privateTypes:4,typeCompilerValidation:false,scope:'Exact source/constructor/retained protocols only. Actual C2 Native/final WAL/live Editor remain unavailable.'};const sdkMetadata=json(summary);add(CORE_INTEGRATION_ROOT+'source.json',sdkMetadata,null,[],'Exact Root SDK integration inventory; old pure30b record remains unchanged');
 return{files,overrides,sourceInputs,variants,summary,requiredGitCommits:[...new Set([CORE_INTEGRATION_SOURCE,CORE_INTEGRATION_BASE,PURE,'879bd57f20172a91144a64814cb0800cdad0ed93','08b70fec2a574ade7367ba748c3acf7a3281758c','2810b3c333187eadb428a88c83d98a8256f0fa56','60afd66f72855d80213eb8404e5b17d4b09dd004',...sourceInputs.map(r=>r.commit)])]};
}
export function coreIntegrationRecord(plan,toolBytes){return json({...plan.summary,files:plan.files.map(({expectedBuffer,before,...r})=>r),sourceTool:{path:CORE_INTEGRATION_TOOL,bytes:toolBytes.length,sha256:sha(toolBytes)},sourceReview:{accepted879:'14c8c6a1008a07ad881522a4b86fe34977b4fe5e79d3cda63ddc8ce8f9bae59c',projected879:'937c813d6aadea5b9fda41317616c1bae17b340e6019c5dd07a4eca0edc9c5d5',f727:'Scoped retained correction accepted; canonical11source controls passed. No live C2 Native/final-WAL acceptance.'}});}
export function authenticateCoreIntegrationSources({object,read,indexed=()=>{},expectedRecordSha256}){
 assert.match(expectedRecordSha256,/^[a-f0-9]{64}$/);const plan=coreIntegrationSourcePlan({object}),tool=read(CORE_INTEGRATION_TOOL),metadata=read(CORE_INTEGRATION_RECORD);assert.equal(sha(metadata),expectedRecordSha256,'Unreviewed private Core integration metadata');assert.ok(metadata.equals(coreIntegrationRecord(plan,tool)),'Core integration record must derive from exact fixed source and actual source tool');
 const all=[...plan.files,{path:CORE_INTEGRATION_TOOL,expectedBuffer:tool,...describe(CORE_INTEGRATION_TOOL,tool),role:'Root fixed planner'},{path:CORE_INTEGRATION_RECORD,expectedBuffer:metadata,...describe(CORE_INTEGRATION_RECORD,metadata),role:'Exact Root private integration source record'}];
 // Complete actual bytes/index authentication precedes returning ANY preimage.
 for(const row of [...all,...Object.values(plan.overrides)]){const bytes=read(row.path);assert.ok(Buffer.isBuffer(bytes)&&bytes.equals(row.expectedBuffer),'Changed exact private Core SDK contribution: '+row.path);indexed(row.path,bytes);}
 return{...plan,files:all,report:{enabled:true,status:'authenticated-private-canonical-core-sdk-only',sourceCommit:CORE_INTEGRATION_SOURCE,sourceRows:48,privateTypes:4,sharedOverrides:Object.keys(plan.overrides),publicExports:0,liveNative:false,finalWAL:false,requiredGitCommits:plan.requiredGitCommits}};
}
