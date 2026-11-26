import fs from 'node:fs';
import path from 'node:path';
import {withArtReview,projectRoot} from '../art-review-browser.mjs';
import {listFantasyEquipmentArt} from '../../packages/fantasy-equipment-art/catalogue.js';
const evidence=path.join(projectRoot,'docs/reviews/fantasy-equipment/art');fs.mkdirSync(evidence,{recursive:true});
const scenes=[['contact-sheet','contact'],['native-scale','scale'],...['blades','tools','long-arms','shields'].map(group=>['native-scale-'+group,'scale&group='+group]),['shields-front-back','shields'],['ranged-states','ranged'],...['knife','short-sword','sword','axe','pick','blacksmith-hammer','mace','spear','halberd','bow','crossbow'].map(id=>[id+'-close','solo&id='+id+(id==='bow'||id==='crossbow'?'&draw=1&loaded=true':'')]),...['round-wood-shield','emblem-metal-shield','tower-shield','riot-shield'].flatMap(id=>[['front','front'],['back','back']].map(([name,view])=>[id+'-'+name,'solo&id='+id+'&view='+view]))];
await withArtReview('Fantasy equipment original art source review',async({page,baseURL})=>{
 const results=[];for(const [name,mode] of scenes){await page.setViewportSize({width:mode==='scale'?1800:1600,height:1200});await page.goto(baseURL+'/tools/fantasy-equipment-art/viewer.html?capture=1&mode='+mode);await page.waitForFunction(()=>window.equipmentReview?.ready);await page.screenshot({path:path.join(evidence,name+'.png'),fullPage:true});const counts=await page.evaluate(()=>window.equipmentReview.snapshot());results.push({view:name,counts});await page.evaluate(()=>window.equipmentReview.retire());}
 fs.writeFileSync(path.join(evidence,'source-review.json'),JSON.stringify({date:new Date().toISOString(),base:'796c1e73644a30a3061d2f38b3bcccab49519453',source:true,scenes:results,catalogue:listFantasyEquipmentArt()},null,2)+'\n');
},{source:true,output:'fantasy-equipment-art-review',owner:'01a18109-8bdd-73a2-b61a-3d2cd8f8fcb3',timeoutMs:300000});
const receipt=path.join(projectRoot,'artifacts/fantasy-equipment-art-review/cleanup-receipt.json');fs.copyFileSync(receipt,path.join(evidence,'cleanup-receipt.json'));console.log('Reviewed '+scenes.length+' source views; temporary browser/server closed.');
