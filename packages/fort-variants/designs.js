// Original visual variants of the fixed, reviewed 6d9dfeca frontier artist kit.
import {FRONTIER_BUILDINGS,FRONTIER_PARTS,WALK,freeze} from '../frontier-fort/designs.js';
export {WALK,freeze};
export const VARIANT_THEMES=freeze(['castle','cyclone']);
export const VARIANT_COLLECTION='nautilus-fort-era-variants-v1';
const castle=['gatehouse','corner-tower','keep','commanders-house','barracks-arcade','barracks-roof-stair','stone-store','roof-store',
  'curtain-6','curtain-3','curtain-corner','curtain-u','postern','rampart-platform','datum-stair','arcade-bay','arcade-terminal','paired-gate'];
const cyclone=['security-gatehouse','guard-tower','operations','officers-quarters','barracks-canopy','barracks-roof-stair','utility-store','roof-store',
  'fence-6','fence-3','fence-corner','fence-u','service-gate','catwalk-platform','datum-stair','canopy-bay','canopy-terminal','paired-gate'];
const labels={castle:['Castle gatehouse','Battlement corner tower','Great hall and watch keep',"Commander’s stone house",'Arcaded castle barracks','Castle barracks and roof stair','Castle storehouse','Castle roof-walk store',
  'Curtain wall · 6 m','Curtain wall · 3 m','Curtain wall · corner','Curtain wall · U return','Castle postern','Stone rampart and stair','Stone return stair','Stone arcade · 3 m bay','Arcade terminal pier','Castle paired gate'],
cyclone:['Security gatehouse','Elevated guard tower','Operations building','Officers’ quarters','Barracks with steel canopy','Barracks and roof stair','Utility store','Roof-walk utility store',
  'Cyclone fence · 6 m','Cyclone fence · 3 m','Cyclone fence · corner','Cyclone fence · U return','Rear service gate','Steel catwalk platform and stair','Steel return stair','Steel canopy · 3 m bay','Canopy terminal post','Paired mesh gate']};
const bases=[...FRONTIER_BUILDINGS,...FRONTIER_PARTS];
export const VARIANT_IDS=freeze(Object.fromEntries(VARIANT_THEMES.map(theme=>[theme,Object.fromEntries(bases.map((r,i)=>[r.id,theme+'-'+(theme==='castle'?castle:cyclone)[i]]))])));
const terrace=(level,x,y,width,depth,id='roof-deck')=>({level,rooms:[{id,name:'Accessible battlement terrace',x,y,width,depth,type:'terrace'}]});
function make(source,theme,index){
  const r=structuredClone(source);r.id=VARIANT_IDS[theme][source.id];r.name=labels[theme][index];r.sourceModuleId=source.id;r.theme=theme;
  r.collection=VARIANT_COLLECTION;r.sourceId='original-fort-era-variants';r.period=theme==='castle'?'Original castle aesthetic':'Original modern security compound';
  r.adaptation=r.period+' variant of the fixed frontier kit; authored dimensions and descriptive art only.';
  r.visualConstruction=theme==='castle'?'Masonry, ashlar, slate and oak':'Coated steel, concrete, geometric chain-link and grating';
  if(index>=8)return r;
  r.wall=theme==='castle'?'stone':'metal';r.upperWall=theme==='castle'?'stone':'metal';r.roofMaterial=theme==='castle'?'shingle':'metal';
  r.tint={wall:theme==='castle'?[.93,.92,.86]:[.9,.93,.9],wood:[.65,.55,.43],trim:[.6,.6,.57],roof:[.85,.89,.94]};
  if(r.separateStair)r.separateStair.material=theme==='castle'?'stone':'metal';
  for(const q of r.flatRoofs||[])q.parapet=theme==='castle'?1.18:.95;
  for(const q of r.roofs)for(const c of q.components){if(theme==='cyclone'){c.type='hip';c.rise=.12;}}
  if(theme==='castle'){
    for(const o of r.openings)if(o.style==='firing-port'){o.width=.45;o.height=.95;o.bottom=.65;}
    if(source.id==='frontier-gatehouse'){
      r.levels=4;r.floors.push(terrace(3,3,0,12,6));r.cores[0].levels.push(3);r.roofs=[];
      r.battlements=[{level:3,x:3,y:0,width:12,depth:6}];r.relievingArch=true;
      r.openings=r.openings.filter(o=>!(o.level===2&&o.point[1]===0&&[7.5,10.5].includes(o.point[0])));
    }
    if(source.id==='frontier-blockhouse'){
      r.levels=3;r.floors.push(terrace(2,0,0,6,6));r.cores[0].levels.push(2);r.roofs=[];
      r.battlements=[{level:2,x:0,y:0,width:6,depth:6}];
    }
  }else if(source.id==='frontier-blockhouse'){
    r.levels=3;r.floors=[terrace(0,0,0,6,6,'guard'),terrace(1,0,0,6,6,'watch'),
      {level:2,rooms:[{id:'cab',name:'Raised glazed guard cabin',x:0,y:0,width:6,depth:6,type:'circulation'}]}];
    r.floors[0].rooms[0].name='Open ground and stair bay';r.floors[1].rooms[0].name='Intermediate catwalk deck';
    r.cores[0].levels=[0,1,2];r.entries=[];r.openings=[[3,0],[0,3],[6,3],[3,6]].map(point=>({point,width:2.4,height:1.05,bottom:.7,level:2,glazed:true,columns:3,rows:1}));
    r.roofs=[{id:'guard-cab-roof',level:3,components:[{id:'guard-cab-canopy',type:'hip',axis:'x',x:0,y:0,width:6,depth:6,rise:.12,overhang:.25}]}];
    r.deckGuards=[{level:1,x:0,y:0,width:6,depth:6,gaps:[{edge:'east',from:3.08,to:4.74},{edge:'back',from:3.08,to:4.74}]}];
    r.cornerButtresses=false;r.towerSupports=true;
  }
  return r;
}
const all=VARIANT_THEMES.flatMap(theme=>bases.map((r,i)=>make(r,theme,i)));
export const VARIANT_BUILDINGS=freeze(all.filter(r=>r.floors));
const ports=structuredClone(FRONTIER_PARTS.find(r=>r.kind==='stockade'&&r.length===3).interfaces);
export const VARIANT_PARTS=freeze([...all.filter(r=>!r.floors),
  ...['castle-to-cyclone','cyclone-to-castle'].map(kind=>({id:'link-'+kind,name:kind==='castle-to-cyclone'?'Masonry to cyclone transition':'Cyclone to masonry transition',
    collection:VARIANT_COLLECTION,theme:'link',kind:'transition',transition:kind,width:3,depth:1.66,length:3,interfaces:structuredClone(ports),
    sourceModuleId:'frontier-stockade-3',visualConstruction:'Masonry end, steel end, common deck and fitted junction pier',
    adaptation:'Original explicit transition between two constructions at the unchanged native connector profile.'}))]);
export function variantRecipe(id){const r=VARIANT_BUILDINGS.find(r=>r.id===id);if(!r)throw Error('Unknown variant building: '+id);return structuredClone(r);}
export function variantPart(id){const r=VARIANT_PARTS.find(r=>r.id===id);if(!r)throw Error('Unknown variant part: '+id);return structuredClone(r);}
