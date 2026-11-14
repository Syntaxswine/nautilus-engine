import {openDocument} from '../map-core/index.js';
import {plain,clone,canonical,dataSHA256,refuse} from './data.js';
import {MOUNT_DORA_SOURCE,MOUNT_DORA_ART,MOUNT_DORA_FEATURE,MOUNT_DORA_DEPOT,MOUNT_DORA_DEPOT_SHA256,MOUNT_DORA_PROFILES} from './contract.js';
const tree=p=>typeof p.kind==='string'&&p.kind.startsWith('tree-'),treeRecords=map=>(map.props||[]).filter(tree),equal=(a,b)=>canonical(a)===canonical(b);
const defaultPresentation={ordinary:'source-compatible',donnelly:'source-compatible',rail:'source-compatible'};
function presentation(input){if(!input)refuse('MOUNT_DORA_PRESENTATION','Keep an explicit saved presentation profile.');const v=plain(input);if(Object.keys(v).sort().join(',')!=='donnelly,ordinary,rail'||Object.entries(v).some(([k,x])=>!MOUNT_DORA_PROFILES[k]?.includes(x)))refuse('MOUNT_DORA_PRESENTATION','Choose explicit supported ordinary-house, Donnelly and railway profiles.');return v;}
/** One retained public MapDocument owns every edit and history entry. No second editor/history. */
export function openMountDoraDocument(input,{catalog,reference,placements,presentation:profile}={}){
 const original=plain(reference),value=plain(input),sector=catalog?.sector(original.mountDora?.sectorId);if(!sector)refuse('MOUNT_DORA_REFERENCE','Bind the verified original native sector and catalog.');if(!sector.nativeReady)refuse('NATIVE_WATER_ONLY','World/visual content remains available; native authoring refuses '+sector.id+': '+sector.nativeRefusal);
 if(original.mountDora?.projectId!==catalog.identity.id||!equal(original.mountDora.originM,sector.origin)||value.mountDora?.sectorId!==sector.id)refuse('MOUNT_DORA_IDENTITY','Keep the complete native sector identity and origin.');
 const sourcePlacements=plain(placements);if(!Array.isArray(sourcePlacements))refuse('MOUNT_DORA_PLACEMENTS','Bind the verified placement records covering this sector.');const depot=sourcePlacements.find(p=>p.id===MOUNT_DORA_DEPOT);if(original.mountDora.buildingIds?.includes(MOUNT_DORA_DEPOT)&&(!depot||dataSHA256(depot)!==MOUNT_DORA_DEPOT_SHA256))refuse('MOUNT_DORA_DEPOT','Preserve the complete canonical depot treatment, relative fields and placement.');
 const baseline={kind:MOUNT_DORA_FEATURE,version:1,sourceCommit:MOUNT_DORA_SOURCE,artRevision:MOUNT_DORA_ART,sectorId:sector.id,sourceNativeSHA256:sector.sha256,sourceMetadata:clone(original.mountDora),originalGuardRecords:clone(original.guards),sourcePlacements};
 const old=value.mountDoraEngine;if(old){const {presentation:oldProfile,...identity}=old;if(!equal(identity,baseline))refuse('MOUNT_DORA_PROTECTED_METADATA','The imported adapter changed protected source/placement metadata.');presentation(oldProfile);profile??=oldProfile;}
 value.mountDoraEngine={...baseline,presentation:presentation(profile??defaultPresentation)};
 // Native normalization may add standard character fields. Supply deterministic
 // identities once, then retain genuine edited character/weapon/patrol records.
 for(const field of ['starts','guards'])for(const [index,g]of value[field].entries())if(g.character===undefined){
  // Explicit v1 editor metadata, matching the inherited defaults. Supplying all
  // fields avoids both global UUID creation and normalization of saved edits.
  g.character={id:'char_md_'+sector.id+'_'+field+'_'+String(g.id??index).replace(/[^a-zA-Z0-9_-]/g,'_'),displayName:'',scriptId:'',category:field==='starts'?'squad':'combat',faction:field==='starts'?'player':'unaffiliated',attitude:field==='starts'?'friendly':'hostile',combatBehavior:'fight',canTalk:false,dialogueRef:'',canSell:false,shopInventoryRef:'',shopPricingRef:'',references:[]};
 }
 function protectedData(map){if(!equal(map.mountDora,original.mountDora)||!equal(treeRecords(map),treeRecords(original)))refuse('MOUNT_DORA_PROTECTED_CONTENT','Preserve original sector metadata and all current tree placements/variants.');const {presentation:p,...identity}=map.mountDoraEngine||{};presentation(p);if(!equal(identity,baseline))refuse('MOUNT_DORA_PROTECTED_METADATA','Preserve original source/placement records alongside edits.');return true;}
 protectedData(value);const document=openDocument(value);
 const read=()=>clone(document.map),assertCurrent=()=>protectedData(document.map),preview=command=>{const r=document.preview(plain(command));if(r.ok)try{protectedData(r.map);}catch(error){return {...r,ok:false,code:error.code,error:error.message};}return r;};
 const facade={kind:MOUNT_DORA_FEATURE,sector:clone(sector),get revision(){return document.revision;},read,preview,
  apply(command){const data=plain(command),checked=preview(data);if(!checked.ok)return clone(checked);const r=document.apply(data);assertCurrent();return clone(r);},
  undo(){const changed=document.undo();assertCurrent();return changed;},redo(){const changed=document.redo();assertCurrent();return changed;},rename(name){const r=document.rename(name);assertCurrent();return r;},
  setPresentation(next){const candidate=read();candidate.mountDoraEngine.presentation=presentation(next);protectedData(candidate);document.replace(candidate);assertCurrent();return {ok:true};},
  replace(next){next=plain(next);protectedData(next);document.replace(next);assertCurrent();return {ok:true};},
  export(){assertCurrent();return document.export();},validate:()=>document.validate(),
  requirements(){return {schema:{id:'aft-map-v2',version:2},required:[{id:MOUNT_DORA_FEATURE,minVersion:1,maxVersion:1}],content:clone(catalog.identity),sectorId:sector.id,presentation:clone(document.map.mountDoraEngine.presentation)};}
 };return Object.freeze(facade);
}
