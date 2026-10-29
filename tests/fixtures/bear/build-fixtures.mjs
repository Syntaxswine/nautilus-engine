import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {blankMap} from '../../../packages/map-core/index.js';
import {createAppearance,createAppearanceDocument,serializeAppearance} from '../../../packages/appearance-core/index.js';
export const goldenActor={id:'bear-golden',species:'bear',outfit:'red-hats',weapon:'rpg',role:'npc',x:12,y:12,z:0,heading:90,authored:{character:{id:'bear-authored-id',displayName:'Authored bear',faction:'host-policy',dialogueRef:'retained-dialogue'},resources:{hp:37,ap:0,stamina:6.5},future:{unchanged:true}}};
export function appearanceGolden(){const base=JSON.parse(fs.readFileSync(new URL('../persistence/legacy-block-v1.json',import.meta.url),'utf8'));return createAppearance(base,[goldenActor]);}
export function workflowGolden(){const commands=[{type:'place',actor:goldenActor},{type:'update',id:goldenActor.id,patch:{outfit:'normal',weapon:'hmg',role:'guard',heading:180}}],document=createAppearanceDocument(blankMap('Bear workflow golden'));for(const command of commands){const result=document.apply(command);if(!result.ok)throw Error(result.error);}return {version:1,base:'blankMap:Bear workflow golden',commands,serializedSha256:createHash('sha256').update(document.export()).digest('hex')};}
if(process.argv.includes('--write')){fs.writeFileSync(new URL('appearance-block-v1.json',import.meta.url),JSON.stringify(appearanceGolden(),null,2)+'\n');fs.writeFileSync(new URL('authoring-workflow-v1.json',import.meta.url),JSON.stringify(workflowGolden(),null,2)+'\n');}
