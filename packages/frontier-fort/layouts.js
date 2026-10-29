import {freeze} from './designs.js';
import {validateLayout} from './index.js';
const PI=Math.PI;
function createLayout(width,depth,compact=false){
  const middle=width/2,back=depth-6,east=width-6,instances=[],put=(id,assetId,x,z,yaw=0)=>instances.push({id,assetId,position:[x,0,z].map(n=>Math.round(n*1e9)/1e9),yaw,scale:[1,1,1]});
  put('gate','frontier-gatehouse',middle-9,3);
  put('front-west-block','frontier-blockhouse',3,3);
  put('front-east-block','frontier-blockhouse',width-3,3,-PI/2);
  put('rear-west-corner','frontier-stockade-corner',6,back,PI/2);
  put('rear-east-corner','frontier-stockade-corner',east,back,PI);
  put('sally','frontier-sally-port',middle+3,back,PI);
  function run(id,start,length,yaw,platformAt=null){
    const c=Math.cos(yaw),s=Math.sin(yaw);let at=0,n=0;
    while(at<length-1e-7){
      const span=Math.min(6,length-at),asset=platformAt!==null&&Math.abs(at-platformAt)<1e-7?'frontier-rampart-platform':'frontier-stockade-'+span;
      put(id+'-'+n++,asset,start[0]+at*c,start[1]-at*s,yaw);at+=span;
    }
  }
  run('front-west',[9,6],middle-18,0);run('front-east',[middle+9,6],middle-18,0);
  run('east',[east,9],back-15,-PI/2,compact?0:30);
  run('rear-east',[width-12,back],middle-15,PI);run('rear-west',[middle-3,back],middle-15,PI);
  run('west',[6,back-6],back-15,PI/2);
  put('hq','frontier-headquarters',12,compact?30:36);
  put('quarters','frontier-commanders-quarters',compact?33:42,compact?30:36);
  put('barracks-porch','frontier-adobe-barracks-porch',18,compact?9:12,-PI/2);
  if(!compact)put('barracks-stairs','frontier-adobe-barracks-stairs',54,33,PI/2);
  put('stone-store','frontier-stone-storehouse',compact?39:21,compact?21:24);
  put('adobe-store','frontier-adobe-storehouse',compact?21:45,compact?21:24);
  const layout={id:compact?'frontier-fort-compact':'frontier-fort-courtyard',name:compact?'Compact frontier compound':'Courtyard frontier fort',
    width,depth,scale:[1,1,1],instances,
    courtyard:compact?{x:27,y:10,width:12,depth:28}:{x:30,y:12,width:14,depth:30},
    source:'Original configurations of the same modular fictional frontier-fort kit.',
    reservedGateApproach:{x:middle-3,y:0,width:6,depth:12},
    consumerSupport:{editorProvider:false,collision:false,navigation:false,fire:false}};
  const proof=validateLayout(layout);if(proof.errors.length)throw Error(proof.errors.join('\n'));layout.connections=proof.connections;return layout;
}
export const FRONTIER_LAYOUTS=freeze([createLayout(72,60),createLayout(60,48,true)]);
export function frontierLayout(id){const r=FRONTIER_LAYOUTS.find(r=>r.id===id);if(!r)throw Error('Unknown frontier layout.');return structuredClone(r);}
