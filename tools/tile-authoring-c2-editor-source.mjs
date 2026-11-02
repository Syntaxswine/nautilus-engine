// Exact contribution authentication. This does not certify a live overlay route.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {kernelPromotionSources,serializablePlan,HELPER as KERNEL_HELPER} from './tile-authoring-c2-kernel-source.mjs';

const prefixCommit='d8ff73ce63282e897cac146bc3077ea443c38e05';
const uiCommit='5a7cb4ce728d158f42d997e076c296459cb259aa';
const coreCommit='30bfa968cf778750fbad6a7aec8ff7052e05ba0c';
const base='1e6a97b67c57917160db89db34cbae9e4e46f90c';
const namespace='apps/editor/tile-authoring/c2/';
const sha=b=>createHash('sha256').update(b).digest('hex');
const blob=b=>createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
const json=value=>Buffer.from(JSON.stringify(value,null,2)+'\n');

export function tileAuthoringC2EditorSources({object,projectRoot}){
 const directory=path.join(projectRoot,namespace);
 if(!fs.existsSync(directory))return {enabled:false,files:[],namespaceFiles:[],overrides:{},requiredGitCommits:[]};
 const files=[];
 const add=(file,bytes,provenance)=>{assert.ok(Buffer.isBuffer(bytes));assert.ok(!files.some(row=>row.path===file));files.push({path:file,expectedBuffer:bytes,bytes:bytes.length,sha256:sha(bytes),...provenance});};
 const component=(commit,source,target,names,transform=(_name,bytes)=>({bytes,rewrites:[]}))=>names.map(name=>{
  const original=object(commit,source+name),{bytes,rewrites}=transform(name,original);
  add(target+name,bytes,{sourceCommit:commit,sourcePath:source+name,sourceSha256:sha(original),rewrites});
  return {name,original,bytes,record:{sourceCommit:commit,sourcePath:source+name,targetPath:target+name,sourceBytes:original.length,sourceSha256:sha(original),sourceGitBlob:blob(original),bytes:bytes.length,sha256:sha(bytes),rewrites}};
 });
 const prefixSource='candidates/tile-authoring/host/builtin-dependency-prefix/',prefixTarget=namespace+'builtin-prefix/';
 const prefixRows=component(prefixCommit,prefixSource,prefixTarget,['.gitattributes','data.mjs','index.mjs','owner.mjs','pack.mjs','NOTICE.md','vendor/ui057/projection.d.ts']);
 const prefixManifest={kind:'nautilus-editor-builtin-prefix-source',version:1,sourceCommit:prefixCommit,independentReview:'artifacts/tile-authoring-review/c2-builtin-prefix-review-d8ff73c/REVIEW.md',status:'Reviewed component imported; live Host/Core/native/attempt bindings remain unavailable until composition',files:prefixRows.map(row=>({sourceCommit:prefixCommit,sourcePath:prefixSource+row.name,targetPath:prefixTarget+row.name,bytes:row.bytes.length,sha256:sha(row.bytes),gitBlob:blob(row.bytes),transformation:'none; exact reviewed original bytes'})),usage:'Private Editor implementation. It acquires no renderer or authority and grants no authoring credit.'};
 add(prefixTarget+'source.json',json(prefixManifest),{role:'Root exact import provenance'});
 const uiSource='candidates/tile-authoring/ui/c2-runtime/',uiTarget=namespace+'ui/';
 const uiRows=component(uiCommit,uiSource,uiTarget,['.gitattributes','component.js','contract.js','forms.js','styles.css','vendor/NOTICE.md','vendor/core/8b4cd72c2d8f424d6811196d9651916bb7e9e2bd/contract.schema.json','vendor/ui/05723c3cada36249c6b6777dd40c8a478701bccb/projection.schema.json'],(name,original)=>{
  if(name!=='contract.js')return {bytes:original,rewrites:[]};
  let text=original.toString('utf8');const rewrites=[];
  for(const file of ['commands.js','panel.js']){const from="'../../../../apps/editor/tile-authoring/ui/"+file+"'",to="'../../ui/"+file+"'";assert.equal(text.split(from).length,2);text=text.replace(from,to);rewrites.push({from,to});}
  return {bytes:Buffer.from(text),rewrites};
 });
 add(uiTarget+'vendor/source/component-contract.js.txt',uiRows.find(row=>row.name==='contract.js').original,{sourceCommit:uiCommit,sourcePath:uiSource+'contract.js',role:'Original unmodified pre-relocation source'});
 const uiManifest={kind:'nautilus-editor-overlay-ui-source',version:1,sourceCommit:uiCommit,independentReview:'artifacts/tile-authoring-review/c2-ui-component-review-5a7cb4c/REVIEW.md',status:'Accepted UI component imported; actual coordinator, source, prefix, native and service pairing remain unavailable until composition',files:uiRows.map(row=>row.record),originalContract:'vendor/source/component-contract.js.txt',transformation:'Only two relative C1 UI import paths change for relocation. No grammar or behavior changes.'};
 add(uiTarget+'source.json',json(uiManifest),{role:'Root exact import provenance'});
 const coreTarget=namespace+'core/',coreSource='candidates/tile-authoring/core/c2/';
 const coreManifestBytes=fs.readFileSync(path.join(projectRoot,coreTarget+'source.json'));
 assert.equal(sha(coreManifestBytes),'0ebc72d1e075736d6c4035714af5e9f1f39c6e1fdf33d806aa254297e53cff41','Unreviewed Core relocation manifest');
 const coreManifest=JSON.parse(coreManifestBytes);assert.equal(coreManifest.sourceCommit,coreCommit);assert.equal(coreManifest.files.length,44);assert.equal(coreManifest.borrowed.length,83);
 for(const row of coreManifest.files){
  assert.ok(row.sourcePath.startsWith(coreSource));
  const expectedPath=row.sourcePath===coreSource+'browser-owned-v1/.gitattributes'?coreTarget+'.gitattributes':coreTarget+row.sourcePath.slice(coreSource.length);
  assert.equal(row.targetPath,expectedPath);let bytes=object(coreCommit,row.sourcePath);
  assert.equal(bytes.length,row.sourceBytes);assert.equal(sha(bytes),row.sourceSha256);assert.equal(blob(bytes),row.sourceGitBlob);
  if(row.rewrites.length){let text=bytes.toString('utf8');for(const rewrite of row.rewrites){let count=0;for(const quote of ["'",'"']){const from=quote+rewrite.from+quote,to=quote+rewrite.to+quote;count+=text.split(from).length-1;text=text.split(from).join(to);}assert.equal(count,rewrite.occurrences);}bytes=Buffer.from(text);}
  assert.equal(bytes.length,row.bytes);assert.equal(sha(bytes),row.sha256);add(row.targetPath,bytes,{sourceCommit:coreCommit,sourcePath:row.sourcePath,sourceSha256:row.sourceSha256,rewrites:row.rewrites});
 }
 for(const row of coreManifest.borrowed){const bytes=object(coreCommit,row.path);assert.equal(bytes.length,row.bytes);assert.equal(sha(bytes),row.sha256);assert.equal(blob(bytes),row.gitBlob);assert.ok(fs.readFileSync(path.join(projectRoot,row.path)).equals(bytes),'Changed borrowed Core dependency: '+row.path);}
 add(coreTarget+'source.json',coreManifestBytes,{role:'Exact reviewed pure Core relocation manifest'});
 const overrides={};
 const kernelMetadata='docs/reviews/tile-authoring/architect/c2-kernel-source.json',kernelTool='tools/tile-authoring-c2-kernel-source.mjs';
 const hasHelper=fs.existsSync(path.join(projectRoot,KERNEL_HELPER)),hasKernelMetadata=fs.existsSync(path.join(projectRoot,kernelMetadata));let kernel=null;
 if(hasHelper||hasKernelMetadata){
  assert.ok(hasHelper&&hasKernelMetadata,'Partial Kernel promotion is unavailable');kernel=kernelPromotionSources({object});
  const metadataBytes=fs.readFileSync(path.join(projectRoot,kernelMetadata));assert.equal(sha(metadataBytes),'126c90ec8b2234be461d2ca67da3b00e669436b985ecbc783c0e0a606a9c5872','Unreviewed Kernel promotion record');
  const metadata=JSON.parse(metadataBytes),toolBytes=fs.readFileSync(path.join(projectRoot,kernelTool));assert.equal(sha(toolBytes),metadata.sourceTool.sha256);
  const expectedMetadata={...serializablePlan(kernel),kind:'nautilus-root-c2-kernel-source',status:'Reviewed shared hooks adopted; actual Core/Artist/meter/Host bindings remain unavailable until composition',independentReview:{file:'artifacts/tile-authoring-review/c2-shared-runtime-review-4ade3ea/REVIEW.md',sha256:'49611c059bbd0944e35e0b16fbc13eb7467e0faf1f811950fa78c027f1c8a28f'},sourceTool:{path:kernelTool,sha256:sha(toolBytes)}};
  assert.ok(metadataBytes.equals(json(expectedMetadata)),'Kernel source record must match the fixed-object plan');
  for(const row of kernel.rows){
   if(row.beforeBuffer){assert.ok(!Object.hasOwn(overrides,row.path));assert.ok(fs.readFileSync(path.join(projectRoot,row.path)).equals(row.expectedBuffer),'Changed promoted Kernel body: '+row.path);overrides[row.path]={path:row.path,before:row.beforeBuffer,expectedBuffer:row.expectedBuffer,sha256:row.expected.sha256,baseCommit:kernel.main,baseSha256:row.before.sha256,sourceCommit:kernel.kernel,sourcePath:row.sourcePath,rewrites:row.rewrites,role:row.role};}
   else add(row.path,row.expectedBuffer,{sourceCommit:kernel.kernel,sourcePath:row.sourcePath,sourceSha256:row.source.sha256,rewrites:row.rewrites,role:row.role});
  }
  add(kernelMetadata,metadataBytes,{role:'Exact reviewed Kernel adaptation record'});add(kernelTool,toolBytes,{role:'Exact read-only Kernel source planner'});add('package.json',kernel.packageWhitelist.expectedBuffer,{role:'Exact one-file internal helper whitelist addition'});
 }
 const paths=folder=>fs.readdirSync(path.join(projectRoot,folder),{withFileTypes:true}).flatMap(entry=>{const file=folder+'/'+entry.name;assert.equal(entry.isSymbolicLink(),false,'C2 source symlink: '+file);return entry.isDirectory()?paths(file):[file];});
 assert.deepEqual(paths(namespace.slice(0,-1)).sort(),files.filter(row=>row.path.startsWith(namespace)).map(row=>row.path).sort(),'Only the exact reviewed C2 files are authorized.');
 for(const row of files)assert.ok(fs.readFileSync(path.join(projectRoot,row.path)).equals(row.expectedBuffer),'Changed exact C2 contribution: '+row.path);
 const panel='apps/editor/tile-authoring/ui/panel.js',before=object(base,panel),after=fs.readFileSync(path.join(projectRoot,panel));
 assert.equal(sha(after),'81e0d2ad2aaa52c01b9d1d3ed172b5bef951b4f8e7440c8218e591f787425db4','Unreviewed shared UI coordinator body');
 overrides[panel]={path:panel,before,expectedBuffer:after,sha256:sha(after),baseCommit:base,baseSha256:sha(before),role:'Root opt-in coordinator attachment; separate independent review required'};
 return {enabled:true,files,borrowedFiles:coreManifest.borrowed,namespaceFiles:files.filter(row=>row.path.startsWith(namespace)&&/\.(?:m?js|css)$/.test(row.path)),overrides,requiredGitCommits:[base,prefixCommit,uiCommit,coreCommit,...(kernel?.requiredGitCommits??[])],status:'exact-source-authentication-only; actual overlay workflow remains separately gated'};
}
