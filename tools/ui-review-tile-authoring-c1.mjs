import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
export function reviewTileAuthoringUIProtocol(){
  const out=path.join(root,'artifacts/ui-tile-authoring-c1');
  fs.mkdirSync(out,{recursive:true});
  const args=['--test','--test-reporter=tap','tests/ui-tile-authoring-c1.test.mjs'];
  const result=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8',windowsHide:true});
  const log=(result.stdout??'')+(result.stderr??'');fs.writeFileSync(path.join(out,'protocol.log'),log);
  const inputs=['apps/editor/tile-authoring/ui/panel.js','apps/editor/tile-authoring/ui/commands.js','apps/editor/tile-authoring/ui/styles.css','tests/ui-tile-authoring-c1.test.mjs','tools/ui-review-tile-authoring-c1.mjs'].map(file=>{const b=fs.readFileSync(path.join(root,file));return {file,bytes:b.length,sha256:digest(b)};});
  const report={kind:'nautilus-ui-c1-protocol-review',version:1,status:result.status===0?'pass':'failed',scope:'Protocol doubles only. No actual Core authoring, Editor v3 host, browser or installed-package proof.',command:[process.execPath,...args],exitCode:result.status,tests:Number(log.match(/^# tests (\d+)/m)?.[1]??0),pass:Number(log.match(/^# pass (\d+)/m)?.[1]??0),fail:Number(log.match(/^# fail (\d+)/m)?.[1]??0),inputs,log:{file:'artifacts/ui-tile-authoring-c1/protocol.log',sha256:digest(Buffer.from(log))},acceptedMain:'d869410625b246cfff2b51089e7878c31951775c',coreContract:'43227894c50ec62b71806978195fff2c650eb388',uiContract:'678ceb609d05d2bc13e2a1f83cc7ab7e0e3c5cf2',actualCoreCommit:null,actualHostCommit:null,actualIntegration:false,browserStarted:false,retainedHelpers:0,finishedAt:new Date().toISOString()};
  fs.writeFileSync(path.join(out,'protocol.json'),JSON.stringify(report,null,2)+'\n');
  if(result.error)throw result.error;
  if(result.status!==0)throw Error('UI_C1_PROTOCOL_FAILED: '+log.slice(-5000));
  return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  if(process.argv.length!==3||process.argv[2]!=='--protocol')throw Error('UI_C1_NATIVE_REVIEW_GATED: This early checkpoint implements --protocol only. Actual source/built/installed browser proof waits for reviewed fixed Core and Editor HostService commits; no C0/fixture runtime fallback.');
  console.log(JSON.stringify(reviewTileAuthoringUIProtocol(),null,2));
}
