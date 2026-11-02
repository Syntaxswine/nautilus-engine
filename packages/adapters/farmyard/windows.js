// Engine-owned adaptation of the fixed Farmyard native geometry specification.
// Original bytes/hashes/notices: docs/reviews/farmyard-windows/source-audit.json.
// Catalogue inherits the source study/art rights uncertainty; no new grant.
import {WINDOW_GEOMETRY_CONTRACT as C} from '../../windows-core/contract.js';
import {data,fields,integer,finite,id,bool,fail,freeze} from '../../windows-core/data.js';
const template='window.full.borderless',post=.055,mullion=.035;
const patterns=[['borderless',1,1],['clear',1,1],['vertical-2',2,1],['vertical-3',3,1],['horizontal-2',1,2],['grid-2x2',2,2],['grid-3x2',3,2]];
const presets=freeze(['full','waist'].flatMap(heightId=>[1,2,3].flatMap(width=>patterns.filter(([pattern])=>heightId==='full'||pattern!=='borderless').map(([patternId,columns,rows])=>({id:`window.${heightId}.${patternId}.${width}m`,heightId,patternId,width,columns,rows})))));
export const FARMYARD_WINDOW_CATALOGUE=freeze({sourceCommit:C.sourceCommit,version:C.sourceVersion,templateId:template,presets,finishes:['steel','sage','ivory'],walls:['brick','concrete','corrugated'],units:'metres'});
export function farmyardStoreysToMetres(storeys){finite(storeys,'/storeys');if(storeys<=0)fail('UNSUPPORTED_DIMENSIONS','/storeys','Storeys must be positive.');const height=Number((storeys*2.12).toPrecision(12));finite(height,'/height');if(Math.fround(height)<=0)fail('UNSUPPORTED_DIMENSIONS','/height','Height must be float-buffer representable.');return height;}
export function farmyardWindowDefinition(input){
  const request=data(input);fields(request,['id','joins','dimensions'],'',['id']);id(request.id,'/id');
  const preset=presets.find(p=>p.id===request.id)||(request.id===template?{...presets[0],id:template}:null);
  if(!preset)fail('UNKNOWN_WINDOW_DEFINITION','/id','Unknown fixed native window definition.');
  const joins=request.joins===undefined?{}:request.joins;fields(joins,['left','right'],'/joins',[]);for(const key of Object.keys(joins))bool(joins[key],'/joins/'+key);
  const joined={left:joins.left??false,right:joins.right??false},borderless=preset.patternId==='borderless';
  let width=preset.width,height=borderless?2.12:2;
  if(request.dimensions!==undefined){fields(request.dimensions,['width','height'],'/dimensions');if(!borderless)fail('UNSUPPORTED_DIMENSIONS','/dimensions','Framed resizing is unsupported.');width=request.dimensions.width;height=request.dimensions.height;}
  if(request.id===template&&!request.dimensions)fail('MISSING_DIMENSIONS','/dimensions','The resizable template requires saved metre dimensions.');
  integer(width,1,240,'/dimensions/width');finite(height,'/dimensions/height');if(height<=0||Math.fround(height)<=0)fail('UNSUPPORTED_DIMENSIONS','/dimensions/height','Height must be positive and float-buffer representable.');
  const x0=-width/2+(borderless?0:post/(joined.left?2:1)),x1=width/2-(borderless?0:post/(joined.right?2:1)),y0=borderless?0:preset.heightId==='waist'?.9:.055,y1=borderless?height:1.945,depth=borderless?.008:.20;
  const panes=[],solids=[],solid=(id,role,min,max)=>solids.push({id,role,min,max});
  if(!borderless){
    solid('frame.left','frame',[-width/2,y0-post,-.1],[x0,2,.1]);
    solid('frame.right','frame',[x1,y0-post,-.1],[width/2,2,.1]);
    solid('frame.sill','sill',[x0,y0-post,-.1],[x1,y0,.1]);
    solid('frame.head','frame',[x0,y1,-.1],[x1,2,.1]);
  }
  if(preset.heightId==='waist')solid('wall.lower','lower-wall',[-width/2,0,-.08],[width/2,y0-post,.08]);
  const cellWidth=(x1-x0-(preset.columns-1)*mullion)/preset.columns,cellHeight=(y1-y0-(preset.rows-1)*mullion)/preset.rows;
  for(let c=1;c<preset.columns;c++){const x=x0+c*cellWidth+(c-1)*mullion;solid('mullion.v'+c,'mullion',[x,y0,-.1],[x+mullion,y1,.1]);}
  for(let r=1;r<preset.rows;r++){const y=y0+r*cellHeight+(r-1)*mullion;solid('mullion.h'+r,'mullion',[x0,y,-.1],[x1,y+mullion,.1]);}
  for(let r=0;r<preset.rows;r++)for(let c=0;c<preset.columns;c++){const x=x0+c*(cellWidth+mullion),y=y0+r*(cellHeight+mullion);panes.push({id:`r${r}c${c}`,min:[x,y,-.004],max:[x+cellWidth,y+cellHeight,.004]});}
  return {sourceCommit:C.sourceCommit,version:C.sourceVersion,id:preset.id,joins:joined,dimensions:borderless?{width,height}:null,width,height,bounds:{min:[-width/2,0,-depth/2],max:[width/2,height,depth/2]},panes,solids};
}
export const FARMYARD_WINDOW_DEFINITIONS=Object.freeze({sourceCommit:C.sourceCommit,version:C.sourceVersion,resolve:farmyardWindowDefinition});
export {createFarmyardWindowHostSave,openFarmyardWindowHostSave,serializeFarmyardWindowHostSave,farmyardWindowSourceToken,farmyardWindowHostToken,windowCompleteQueryToken,connectFarmyardWindows} from './windows/host.js';
export const FARMYARD_WINDOW_COMPONENT=freeze({id:'window:pane-state',version:1,status:'optional bounded headless profile; host bindings and game adoption require review',entry:'./adapters/farmyard/windows',coreEntry:'./windows',profileId:C.profileId,capability:'nautilus-window-panes-v1',guide:'docs/adapters/farmyard-window-impacts.md',ownership:'Host owns successful rolls, complete queries, costs, clocks, inventory, atomic persistence and publication. No renderer or other-game adoption.'});
export function farmyardWindowUsageCard(){return {...FARMYARD_WINDOW_COMPONENT,guide:new URL('../../../docs/adapters/farmyard-window-impacts.md',import.meta.url).href,stateSchema:new URL('../../windows-core/window-pane-state-v1.schema.json',import.meta.url).href,hostSaveSchema:new URL('./windows/window-host-save-v1.schema.json',import.meta.url).href};}
