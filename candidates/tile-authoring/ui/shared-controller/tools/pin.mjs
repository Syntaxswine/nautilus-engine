// Immutable reviewed commits only. No staged/moving Root or worker imports.
import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
const here=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),root=path.resolve(here,'../../../..'),sha=b=>createHash('sha256').update(b).digest('hex'),pin='648cad33c3e0e1f36b4313b1492b1a750492ece4',previous='938ea1f78d305d86c163f9e4e84033236916e897';
const git=args=>execFileSync('git',args,{cwd:root,windowsHide:true,maxBuffer:16e6}),inputs=[];
function save(bytes,relative,origin){const file=path.join(here,relative);fs.mkdirSync(path.dirname(file),{recursive:true});if(fs.existsSync(file)&&!fs.readFileSync(file).equals(bytes))throw Error('Preserve original '+relative);fs.writeFileSync(file,bytes);inputs.push({...origin,vendored:relative,bytes:bytes.length,sha256:sha(bytes)});}
for(const name of ['panel.js','commands.js','styles.css']){const source='apps/editor/tile-authoring/ui/'+name;save(git(['show',pin+':'+source]),'vendor/root648/'+name,{commit:pin,path:source});}
const original=fs.readFileSync(path.join(here,'vendor/root648/panel.js')),prior=git(['show',previous+':candidates/tile-authoring/ui/c2-read-pairing/vendor/root-coordinator/panel.js']);
if(!original.equals(prior)||sha(original)!=='81e0d2ad2aaa52c01b9d1d3ed172b5bef951b4f8e7440c8218e591f787425db4')throw Error('Reviewed Root/938e equivalence changed');
let semantic=original.toString('utf8'),changes=[];function once(from,to){if(semantic.split(from).length!==2)throw Error('Root mount anchor changed');semantic=semantic.replace(from,to);changes.push({from,to});}
once('rectangleSpec,onError=()=>{}}={})','rectangleSpec,onError=()=>{},attachCoordinator=null}={})');
once("  const commands=createTileAuthoringCommands({tiles,authoring})", "  if(attachCoordinator!==null&&typeof attachCoordinator!=='function')throw issue('UI_ATTACHMENT_FACTORY_REQUIRED','Supply an explicit borrowed coordinator attachment factory.');\n  const commands=createTileAuthoringCommands({tiles,authoring})");
once('controller=createTileAuthoringUIController(binding,{onView:render,onPending:updateGates,onError:showError})','controller=(attachCoordinator??createTileAuthoringUIController)(binding,{onView:render,onPending:updateGates,onError:showError})');
const proposal=path.join(here,'proposal/root-panel.semantic.js.txt');fs.mkdirSync(path.dirname(proposal),{recursive:true});fs.writeFileSync(proposal,semantic);
let candidate=semantic.replace("from './commands.js'","from './vendor/root648/commands.js'");fs.writeFileSync(path.join(here,'c1-mount.mjs'),'// Explicit private Root mount continuation; default algorithm unchanged.\n'+candidate);
let diff;
// diff runs in the candidate directory so the patch contains only the semantic
// Root edit; its existing relative command import is preserved.
try{diff=execFileSync('git',['diff','--no-index','--no-ext-diff','--','vendor/root648/panel.js','proposal/root-panel.semantic.js.txt'],{cwd:here,windowsHide:true});}catch(error){if(error.status!==1)throw error;diff=error.stdout;}
let patch=diff.toString('utf8').replaceAll('a/vendor/root648/panel.js','a/apps/editor/tile-authoring/ui/panel.js').replaceAll('b/proposal/root-panel.semantic.js.txt','b/apps/editor/tile-authoring/ui/panel.js');fs.writeFileSync(path.join(here,'proposal/root-mount-opt-in.patch'),patch);
save(git(['show',pin+':NOTICE.md']),'vendor/NOTICE.md',{commit:pin,path:'NOTICE.md'});
fs.writeFileSync(path.join(here,'vendor/source.json'),JSON.stringify({kind:'private-shared-controller-frozen-inputs',root:pin,protectedBaseline:previous,inputs,mountContinuation:{changes,semantic:'proposal/root-panel.semantic.js.txt',patch:'proposal/root-mount-opt-in.patch',candidate:'c1-mount.mjs',candidateImportRelocation:"./commands.js -> ./vendor/root648/commands.js",semanticSha256:sha(Buffer.from(semantic))},previousRootProvenance:{commit:previous,path:'candidates/tile-authoring/ui/c2-read-pairing/vendor/root-coordinator/panel.js',sha256:sha(prior),equivalentReviewedRootCommit:pin,status:'Additive equivalence receipt; historical938e files and proof unchanged'}},null,2)+'\n');
console.log(JSON.stringify({root:pin,rootPanelSha256:sha(original),originals:inputs.length,previous938eUnchanged:true,semanticMountEdits:changes.length}));
