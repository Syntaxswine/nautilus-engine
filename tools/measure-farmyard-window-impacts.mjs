import fs from 'node:fs';
import * as W from '../packages/windows-core/index.js';
import * as F from '../packages/adapters/farmyard/windows.js';
import * as Source from '../vendor/farmyard-grenades/251bf8094b5f9ebe44208443084c1a6d6658512a/sites/tactical-animal/dist/solo-game.js';
import {paneHarness} from '../tests/fixtures/farmyard-window-impacts/harness.mjs';
const h=paneHarness({W,F,Source}),cases=[];
try{
  cases.push({schema:'host',label:'complete initial source/geometry/state',valid:true,value:JSON.parse(h.binding.save())});h.binding.perform(h.packet());const complete=JSON.parse(h.binding.save()),state=complete.windowState;cases.push({schema:'state',label:'complete confirmed journal',valid:true,value:state},{schema:'host',label:'complete committed source/geometry/state',valid:true,value:complete});
  const retained=structuredClone(complete);retained.source.futureExtension={injured:13,spent:.125,clock:{remaining:.01},queue:[{id:'pending'}]};cases.push({schema:'host',label:'unknown retained finite JSON',valid:true,value:retained});
  for(const [schema,label,change]of [
    ['state','missing mask',s=>delete s.broken],['state','extra root field',s=>s.extra=1],['state','wrong command version',s=>s.receipts[0].command.version=2],['state','extra impact index',s=>s.receipts[0].command.confirmation.impactIndex=1],['state','boolean host id',s=>s.receipts[0].command.confirmation.hostCommandId=true],['state','replayable receipt effect',s=>s.receipts[0].effects=[{}]],['state','invalid pane',s=>s.broken={'clear-a':['r0c9']}],
    ['host','missing sequence origin',s=>delete s.sequenceOrigin],['host','missing retained actor health',s=>delete s.source.units[0].hp],['host','invalid source team',s=>s.source.units[0].team='unknown'],['host','duplicate set flags',s=>s.setFields=['seen','seen']],['host','unknown joint field',s=>s.extra=true]
  ]){const value=structuredClone(schema==='state'?state:complete);change(value);cases.push({schema,label,valid:false,value});}
  const folder=new URL('../artifacts/farmyard-windows/',import.meta.url);fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(new URL('impact-schema-cases.json',folder),JSON.stringify(cases,null,2)+'\n');console.log(JSON.stringify({status:'pass',structuralCases:cases.length,receipts:state.receipts.length,scope:'Independent schema inputs; no server, live game commit, package registration or source import.'}));
}finally{h.binding.dispose();}
