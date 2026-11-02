// Genuine saved/public-source fixtures and independent hash oracles only.
// No Host, renderer, decoder or ownership captures are manufactured here.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import * as C from '../candidates/tile-authoring/core/c2/index.js';
import {T,cp,stageFixture,pack} from './tile-authoring-core-c2-fixtures.mjs';
export {C,T,cp,stageFixture,pack};
export const canonical=v=>Array.isArray(v)?'['+v.map(canonical).join(',')+']':v!==null&&typeof v==='object'?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}':JSON.stringify(v);
export const sha=v=>createHash('sha256').update(v).digest('hex');
export const oracle=v=>sha(canonical(v));
export const unpainted=cp(stageFixture().input.document);
export const painted=JSON.parse(fs.readFileSync(new URL('../candidates/tile-authoring/core/c2/fixtures/stage-b-golden-save.json',import.meta.url),'utf8'));
export function selected(d){const pin=d.authoring.ownerPins[0],owner=d.tileBundle.layout.instances.find(x=>x.id===pin.ownerId),definition=d.authoring.library.definitions.find(x=>x.id===pin.definition.id&&x.revision===pin.definition.revision);return {pin,owner,definition,surface:definition.body.surfaces[0]};}
export function input(document=unpainted){const d=cp(document),s=selected(d);return {document:d,expectedSource:{hostDocumentDigest:oracle(d),workspaceRevision:d.contentRevision},selection:{ownerId:s.owner.id,surfaceId:s.surface.id,definition:cp(s.pin.definition)}};}
export const refresh=v=>(v.expectedSource={hostDocumentDigest:oracle(v.document),workspaceRevision:v.document.contentRevision},v);
export function rehashRecord(d){const {pin,definition}=selected(d),{contentDigest,...raw}=definition;definition.contentDigest=oracle(raw);pin.definition={id:definition.id,revision:definition.revision,contentDigest:definition.contentDigest};return d;}
export function nextDefinition(change){
 const d=cp(unpainted),{pin,owner,definition:old}=selected(d),record=cp(old);record.revision++;record.body.recipe.id+='.surface-target';
 change(record.body,owner,d);
 for(const surface of record.body.surfaces){surface.geometryDigest=oracle({profile:surface.profile,frame:record.body.recipe.frame,shape:record.body.recipe.shape});const {frameDigest,...raw}=surface;surface.frameDigest=oracle(raw);}
 const {contentDigest,...raw}=record;record.contentDigest=oracle(raw);d.authoring.library.definitions.push(record);pin.definition={id:record.id,revision:record.revision,contentDigest:record.contentDigest};pin.preset=null;
 const catalogue=T.createTileCatalogue([...d.tileBundle.recipes,record.body.recipe]);owner.recipeId=record.body.recipe.id;owner.contentDigest=T.compileTileRecipe(record.body.recipe).contentDigest;
 d.tileBundle=T.tileBundle({...d.tileBundle.layout,catalogueDigest:catalogue.digest,revision:d.tileBundle.layout.revision+1},catalogue);d.contentRevision++;return d;
}
export function sizes(v){const walk=(x,depth=0)=>{let nodes=1,maxDepth=depth;if(x&&typeof x==='object')for(const child of Object.values(x)){const r=walk(child,depth+1);nodes+=r.nodes;maxDepth=Math.max(maxDepth,r.maxDepth);}return {nodes,maxDepth};};const outside=walk(v),legacy=walk(JSON.parse(v.document.sourceJSON));return {inputBytes:Buffer.byteLength(JSON.stringify(v)),sourceBytes:Buffer.byteLength(JSON.stringify(v.document)),nodes:outside.nodes+legacy.nodes,depth:Math.max(outside.maxDepth,legacy.maxDepth)};}
