import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {DESIGNS} from '../packages/building-catalog/index.js';
import {buildEditorBuilding} from '../packages/building-catalog/editor.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),out=path.join(root,'assets/buildings/editor');
fs.mkdirSync(out,{recursive:true});
const entries=[];
const write=(file,bytes)=>{try{if(fs.readFileSync(file).equals(bytes))return;}catch(error){if(error.code!=='ENOENT')throw error;}fs.writeFileSync(file,bytes);};
for(const design of DESIGNS){
 const {map,block,commands,report,view}=buildEditorBuilding(design);
 const files=[];
 for(const [suffix,value]of [['map.json',map],['recipe.json',commands],['report.json',report],...(block?[['block.json',block]]:[])]){
  const bytes=Buffer.from(JSON.stringify(value));const name=design.id+'.'+suffix;write(path.join(out,name),bytes);files.push({file:name,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
 }
 entries.push({id:design.id,name:design.name,group:design.group,style:design.style,view,...report,files});
}
const inputs=['packages/building-catalog/designs.js','packages/building-catalog/index.js','packages/building-catalog/editor.js','tools/build-editor-buildings.mjs'].map(file=>({file,sha256:createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')}));
write(path.join(out,'index.json'),Buffer.from(JSON.stringify({schemaVersion:1,format:'aft-map-v2',blockFormat:'aft-block-v1',inputs,buildings:entries},null,2)));
console.log(JSON.stringify({editorBuildings:entries.length,reusableBlocks:entries.filter(e=>e.blockAvailable).length,occupiedFloors:entries.reduce((n,e)=>n+e.occupiedFloors,0),rooms:entries.reduce((n,e)=>n+e.roomCount,0),brushCommands:entries.reduce((n,e)=>n+e.commands,0)}));
