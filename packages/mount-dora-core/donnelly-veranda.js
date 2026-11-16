import {planDonnellyExterior,planOpenPorch,planRisers,planGableTrim} from './exterior-parts.js';

// An explicit successor, never an edit or migration of the v1 saved graph.
// Coordinates here are the same authored town metres as the original planner.
export function planDonnellyVeranda(){
 const legacy=planDonnellyExterior(),floor=legacy.floorH,story=legacy.storyM,parts=legacy.parts.filter(p=>!p.id.startsWith('donnelly:porch:')&&!p.id.startsWith('donnelly:approach')).map(p=>structuredClone(p));
 for(const p of parts){
  if(p.id.startsWith('donnelly:tower')){
   if(p.points)p.points=p.points.map(([x,y])=>[x-3.4,y-2.6]);
   if(p.centre)p.centre=p.centre.length===2?[p.centre[0]-3.4,p.centre[1]-2.6]:[p.centre[0]-3.4,p.centre[1],p.centre[2]-2.6];
   for(const k of ['from','to'])if(p[k])p[k]=[p[k][0]-3.4,p[k][1],p[k][2]-2.6];
  }
  if(['donnelly:upper-front-bay','donnelly:roof:front-large','donnelly:roof:front-small'].includes(p.id))p.points=p.points.map(([x,y])=>[x===407.5?404.5:x,y]);
  if(p.id==='donnelly:upper-round-window'||p.id.startsWith('donnelly:gable:tall-window:'))p.centre[0]-=3;
 }
 const additions=[];
 for(const [id,b]of [['front-north',[403,470.8,405,477]],['front-south',[403,478.8,405,481.8]],['landing',[403,477,405,478.8]],['south',[393,481.8,405,483.8]]]){
  additions.push(...planOpenPorch({id:'donnelly:v2:porch:'+id,bounds:b,floorH:floor,storyM:story,railEdges:id==='landing'?[]:id==='south'?['south']:['east'],upperEnclosures:[{bounds:[403,472,405,476.8],minH:floor+story}],openings:[[404.7,476.8,406.8,479]]}));
 }
 additions.push(...planRisers({id:'donnelly:v2:approach',bounds:[405,477,406.5,478.8],topH:floor,riseM:floor/5}));
 additions.push({...planGableTrim({id:'donnelly:v2:stair-canopy',x0:403,x1:406.65,y0:476.85,y1:478.95,eaveH:floor+story,riseM:.7}),collider:true});
 for(const p of additions){if(p.points)p.points=p.points.map(([x,y])=>[x-.5,y-.5]);for(const k of ['from','to'])if(p[k])p[k]=[p[k][0]-.5,p[k][1],p[k][2]-.5];}
 parts.push(...additions);
 return {...legacy,version:2,profile:'photo-guided-v2',evidence:'Exterior photo and NPS nomination; provisional 2m veranda, attached corner turret; no measured interior or verified entrance',footprint:'inferred exterior successor; v1 graph retained separately',dimensions:{frontDepthM:2,sideDepthM:2,stairRiseM:floor/5,stairGoingM:.3,stairWidthM:1.8,risers:5,landingDepthM:2,turretCentre:[402.6,481.4]},parts};
}
