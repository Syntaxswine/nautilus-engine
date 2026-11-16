// Reusable metric exterior primitives. One graph supplies rendering, support
// and collision; dimensions above a mapped footprint remain authored inference.
const rect=(x0,y0,x1,y1)=>[[x0,y0],[x1,y0],[x1,y1],[x0,y1]],box=(id,b,minH,topH,material,extra={})=>({id,kind:'box',points:rect(...b),minH,topH,material,collider:true,...extra});
function rectangle(b){if(!Array.isArray(b)||b.length!==4||!b.every(n=>Number.isFinite(n)&&Math.abs(n)<65536)||b[2]<=b[0]||b[3]<=b[1]||b[2]-b[0]>240||b[3]-b[1]>240)throw Error('EXTERIOR_BOUNDS');}
const contains=(b,x,y)=>x>=b[0]&&x<=b[2]&&y>=b[1]&&y<=b[3];
export function planOpenPorch({id,bounds,floorH,storyM=2.12,stories=2,postSpacingM=2.4,postRadiusM=.065,openings=[],railEdges=['east','south'],upperEnclosures=[]}){
 rectangle(bounds);if(typeof id!=='string'||id.length>48||!Number.isFinite(floorH)||floorH<0||floorH>12||!Number.isInteger(stories)||stories<1||stories>3||storyM!==2.12||!Number.isFinite(postSpacingM)||postSpacingM<.5||postSpacingM>6||!Number.isFinite(postRadiusM)||postRadiusM<.03||postRadiusM>.3||openings.length>16||upperEnclosures.length>16)throw Error('EXTERIOR_PORCH');for(const o of openings)rectangle(o);for(const e of upperEnclosures){rectangle(e.bounds);if(e.minH<floorH+storyM||e.minH>floorH+stories*storyM)throw Error('EXTERIOR_ENCLOSURE');}
 const [x0,y0,x1,y1]=bounds,roofH=floorH+stories*storyM,parts=[box(id+':deck',bounds,floorH-.12,floorH,'porch-floor',{support:true}),box(id+':balcony',bounds,floorH+storyM-.12,floorH+storyM,'porch-floor',{support:false,role:'roof'}),box(id+':roof',bounds,roofH,roofH+.12,'blue-roof',{role:'roof'}),box(id+':eave:east',[x1-.13,y0,x1,y1],roofH-.14,roofH,'ivory',{role:'roof'}),box(id+':eave:south',[x0,y1-.13,x1,y1],roofH-.14,roofH,'ivory',{role:'roof'})];
 const runs=[[[x1,y0],[x1,y1]],[[x0,y1],[x1,y1]]];
 for(const [ri,[a,b]]of runs.entries()){const length=Math.hypot(b[0]-a[0],b[1]-a[1]),count=Math.ceil(length/postSpacingM);for(let i=0;i<=count;i++){const x=a[0]+(b[0]-a[0])*i/count,y=a[1]+(b[1]-a[1])*i/count;if(openings.some(o=>contains(o,x,y)))continue;const topH=Math.min(floorH+stories*storyM,...upperEnclosures.filter(e=>contains(e.bounds,x,y)).map(e=>e.minH));parts.push({id:id+':post:'+ri+':'+i,kind:'post',points:[[x,y]],radiusM:postRadiusM,minH:floorH,topH,material:'ivory',collider:true});
   // Two short braces per post, using the same slender modular piece.
   for(const sign of [-1,1])parts.push({id:id+':bracket:'+ri+':'+i+':'+sign,kind:'beam',from:[x,topH-.38,y],to:[x+(ri?sign*.32:0),topH, y+(ri?0:sign*.32)],widthM:.065,material:'blue-trim',role:'trim',collider:true});
  }
  // The upper rail stays a physical segment at its actual height. Individual
  // balusters are visual subparts, sharing this conservative rail collider.
  if(railEdges.includes(ri?'south':'east')&&!openings.some(o=>contains(o,...a)&&contains(o,...b)))for(let level=0;level<stories;level++){
   let intervals=[[0,1]];for(const e of upperEnclosures.filter(e=>floorH+level*storyM>=e.minH-1e-7)){const axis=ri?0:1,fixed=ri?1:0;if(a[fixed]<e.bounds[fixed]||a[fixed]>e.bounds[fixed+2])continue;const lo=Math.max(0,(e.bounds[axis]-a[axis])/(b[axis]-a[axis])),hi=Math.min(1,(e.bounds[axis+2]-a[axis])/(b[axis]-a[axis]));intervals=intervals.flatMap(([s,t])=>hi<=s||lo>=t?[[s,t]]:[[s,Math.max(s,lo)],[Math.min(t,hi),t]].filter(([s,t])=>t-s>1e-7));}
   for(const [index,[s,t]]of intervals.entries()){const at=v=>[a[0]+(b[0]-a[0])*v,a[1]+(b[1]-a[1])*v];parts.push({id:id+':rail:'+ri+':'+level+':'+index,kind:'rail',points:[at(s),at(t)],radiusM:.035,minH:floorH+level*storyM+.12,topH:floorH+level*storyM+.88,material:'ivory',collider:true});}
  }
 }
 return parts;
}
export function planProfiledCap({id,centre,baseH,rings,sides=8,material='blue-roof'}){if(!Array.isArray(centre)||centre.length!==2||!centre.every(Number.isFinite)||!Number.isFinite(baseH)||baseH<0||baseH>24||!Number.isInteger(sides)||sides<6||sides>16||!Array.isArray(rings)||rings.length<2||rings.length>16||rings.some(([h,r],i)=>!Number.isFinite(h)||h<0||h>6||!Number.isFinite(r)||r<0||r>4||i&&h<=rings[i-1][0]))throw Error('EXTERIOR_CAP_PROFILE');return {id,kind:'profiled-cap',centre,baseH,rings,sides,material,role:'roof'};}
export function planGableTrim({id,x0,x1,y0,y1,eaveH,riseM,axis='x',material='ivory'}){rectangle([x0,y0,x1,y1]);if(!Number.isFinite(eaveH)||eaveH<0||eaveH>20||!Number.isFinite(riseM)||riseM<=0||riseM>10||!['x','y'].includes(axis))throw Error('EXTERIOR_GABLE');return {id,kind:'gable',points:rect(x0,y0,x1,y1),minH:eaveH,topH:eaveH+riseM,axis,material:'blue-roof',trimMaterial:material,role:'roof'};}
export function planRisers({id,bounds,topH,riseM=.212,direction='west'}){rectangle(bounds);if(direction!=='west'||!Number.isFinite(topH)||topH<=0||topH>5||!Number.isFinite(riseM)||riseM>2.12/8||riseM<=0)throw Error('EXTERIOR_RISERS');const [x0,y0,x1,y1]=bounds,count=Math.round(topH/riseM);if(Math.abs(count*riseM-topH)>1e-7||count<1||count>32)throw Error('EXTERIOR_RISERS');return Array.from({length:count},(_,i)=>box(id+':'+i,[x1-(i+1)*(x1-x0)/count,y0,x1-i*(x1-x0)/count,y1],0,(i+1)*riseM,'ivory',{support:true,floorId:'md-donnelly-porch'}));}
export function planDonnellyExterior(){
 const floor=.848,story=2.12,top=floor+2*story,parts=[];
 // Coordinates are engine/game metres, explicitly converted once below.
 for(const [id,b]of [['main',[393,470,403,481.8]],['west',[387,474,393,482.8]],['south',[392,481.8,398,483]]])parts.push(box('donnelly:body:'+id,b,floor,top,'yellow-siding',{role:'wall'}));
 for(const [id,b]of [['front-north',[403,470.8,408,477]],['front-south',[403,478.8,408,482.2]],['landing',[403,477,406.2,478.8]],['south',[393,481.8,404.3,486]]]){
  const p=planOpenPorch({id:'donnelly:porch:'+id,bounds:b,floorH:floor,storyM:story,railEdges:id==='landing'?[]:id==='south'?['south']:['east'],upperEnclosures:[{bounds:[403,472,408,476.8],minH:floor+story}],openings:[[406,476.8,409,479]]});parts.push(...p);
 }
 parts.push(...planRisers({id:'donnelly:approach',bounds:[406.2,477,408,478.8],topH:floor}));
 parts.push(planGableTrim({id:'donnelly:roof:main',x0:393,x1:403,y0:470,y1:482,eaveH:top,riseM:3.5,axis:'y'}));
 parts.push(planGableTrim({id:'donnelly:roof:front-large',x0:393,x1:408,y0:471.4,y1:478,eaveH:top,riseM:3.4}));
 parts.push(planGableTrim({id:'donnelly:roof:front-small',x0:399,x1:408,y0:479,y1:482.4,eaveH:top,riseM:2.1}));
 parts.push(planGableTrim({id:'donnelly:roof:west',x0:387,x1:393,y0:474,y1:483,eaveH:top,riseM:2.4,axis:'y'}));
 const centre=[406,484],towerTop=floor+3*story;parts.push({id:'donnelly:tower',kind:'tower',points:Array.from({length:8},(_,i)=>[centre[0]+1.5*Math.cos(i*Math.PI/4),centre[1]+1.5*Math.sin(i*Math.PI/4)]),minH:floor,topH:towerTop,material:'yellow-siding',collider:true,sides:8});
 parts.push(planProfiledCap({id:'donnelly:tower:cap',centre,baseH:towerTop,rings:[[0,1.72],[.16,1.72],[.45,1.6],[1.15,1.38],[1.9,1.05],[2.35,.75],[2.5,.38],[2.62,.15],[2.8,0]]}));
 for(let face=0;face<8;face++){const angle=face*Math.PI/4,x=centre[0]+1.5*Math.cos(angle),y=centre[1]+1.5*Math.sin(angle);parts.push({id:'donnelly:tower:mullion:'+face,kind:'beam',from:[x,floor,y],to:[x,towerTop,y],widthM:.11,material:'ivory',role:'trim'});}
 for(const [face,angle]of [Math.PI/8,3*Math.PI/8,-Math.PI/8].entries())for(let level=0;level<3;level++)parts.push({id:'donnelly:tower:window:'+face+':'+level,kind:'window',centre:[centre[0]+1.40582*Math.cos(angle),floor+level*story+1.03,centre[1]+1.40582*Math.sin(angle)],widthM:.66,heightM:1.38,normal:[Math.cos(angle),Math.sin(angle)],material:level===2?'yellow-siding':'recessed-window',role:'detail'});
 parts.push(box('donnelly:upper-front-bay',[403,472,408,476.8],floor+story,top,'yellow-siding',{role:'wall'}));
 parts.push({id:'donnelly:upper-round-window',kind:'oculus',centre:[408.03,floor+story+1.06,474.7],radiusM:.88,normal:[1,0],material:'ivory',role:'detail'});
 // Tall windows and recessed cream surrounds on the street face; no door or
 // interior assertion is inferred from an exterior photograph.
 for(const [yi,y]of [473,475.8,480.5].entries())for(let level=0;level<2;level++)parts.push({id:'donnelly:window:'+yi+':'+level,kind:'window',centre:[403.025,floor+level*story+1.05,y],widthM:.82,heightM:1.45,normal:[1,0],material:'recessed-window',role:'detail'});
 for(const y of [473.8,475.5])parts.push({id:'donnelly:gable:tall-window:'+y,kind:'window',centre:[408.02,top+.74,y],widthM:.53,heightM:1.22,normal:[1,0],material:'recessed-window',role:'roof'});
 for(const p of parts){if(p.points)p.points=p.points.map(([x,y])=>[x-.5,y-.5]);if(p.centre){if(p.centre.length===2)p.centre=p.centre.map(v=>v-.5);else p.centre=[p.centre[0]-.5,p.centre[1],p.centre[2]-.5];}for(const key of ['from','to'])if(p[key])p[key]=[p[key][0]-.5,p[key][1],p[key][2]-.5];}
 return {kind:'nautilus-photo-guided-exterior',version:1,id:'osm-way-547799531',profile:'photo-guided-v1',evidence:'User exterior photo; inferred dimensions, unseen rear conservative; no surveyed interiors or entrance',storyM:story,footprint:'unchanged source horizontal envelope',floorH:floor,towerTopH:towerTop+2.8,parts};
}
