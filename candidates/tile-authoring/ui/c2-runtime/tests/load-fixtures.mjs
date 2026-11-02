import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
export const corePin='8b4cd72c2d8f424d6811196d9651916bb7e9e2bd';
export const uiPin='05723c3cada36249c6b6777dd40c8a478701bccb';
const witness='candidates/tile-authoring/core/c2/vendor/architect-review/f32f02a/';
const read=(commit,file)=>JSON.parse(execFileSync('git',['show',commit+':'+file],{maxBuffer:16*1024*1024,windowsHide:true}));
export function loadFixtures(){
  const pick=file=>{const v=read(corePin,witness+file);return{input:v.input,plan:{targetDocument:v.plan.targetDocument}};};
  const projection=file=>read(uiPin,'docs/reviews/tile-authoring/ui/c2/projection/fixtures/'+file).payload;
  return{classification:'SYNTHETIC COMPONENT FIXTURE; NOT HOST/NATIVE/WAL ADOPTION',pristine:pick('owned-live-charge-shrink.json'),painted:pick('accepted-source-residency-disappears.json'),projections:{prospective:projection('prospective-unavailable.json'),painted:projection('bound-mark-readonly.json'),fresh:projection('fresh-c1-builtin-prefix-unavailable.json')}};
}
