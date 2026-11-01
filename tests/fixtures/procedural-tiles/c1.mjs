import {native,line,clone} from './v2.mjs';
export {clone};
export function polygon(id,rings,{baseM=0,thicknessM=.1}={}){
  return {kind:'leaf',id,shape:{kind:'region',id:id+'.shape',outlines:rings.map((points,j)=>({kind:'compound',id:id+'.ring.'+j,segments:points.map((p,i)=>line(id+'.edge.'+j+'.'+i,[p[0],p[1],p[2]??baseM],[points[(i+1)%points.length][0],points[(i+1)%points.length][1],points[(i+1)%points.length][2]??baseM]))})),baseM,thicknessM}};
}
export const rectangle=(id,x0,y0,x1,y1,options)=>polygon(id,[[[x0,y0],[x1,y0],[x1,y1],[x0,y1]]],options);
export function recipe(nodes,rootId='root'){const r=native('shape-graph');r.id='c1.recipe';r.shape={kind:'shape-graph',id:'c1.graph',nodes:clone(nodes),rootId};return r;}
export const union=(id,...inputs)=>({kind:'union',id,inputs}),intersection=(id,...inputs)=>({kind:'intersection',id,inputs}),difference=(id,baseId,subtractId)=>({kind:'difference',id,baseId,subtractId});
export const options=(T,overrides={})=>({profile:'regularized-planar-lines-c1',limits:{...T.PLANAR_C1_LIMITS,...overrides.limits},queries:[],transform:{quarterTurns:0,mirrorX:false},origin:[0,0,0],...Object.fromEntries(Object.entries(overrides).filter(([k])=>k!=='limits'))});
export function pointContactRing(island=false){const leaves=[rectangle('west',0,0,1,1),rectangle('north',1,1,2,2),rectangle('east',2,0,3,1),rectangle('south',1,-1,2,0)];if(island)leaves.push(rectangle('island',1.25,.25,1.75,.75));return recipe([...leaves,union('root',...leaves.map(l=>l.id))]);}
export function reorderSource(source,mask){const r=clone(source);if(mask&1)r.shape.nodes.reverse();for(const node of r.shape.nodes){if(mask&4&&['union','intersection'].includes(node.kind))node.inputs.reverse();if(node.kind==='leaf')for(const ring of node.shape.outlines){if(mask&2)ring.segments.reverse().forEach(s=>[s.a,s.b]=[s.b,s.a]);if(mask&8)ring.segments.push(ring.segments.shift());}}return r;}
export function fullInputCeiling(){const leaves=Array.from({length:16},(_,i)=>{const x=2*i;return polygon('leaf.'+i,[[[x,0],[x+.5,0],[x+1,0],[x+1,.5],[x+1,1],[x+.5,1],[x,1],[x,.5]]]);});return recipe([...leaves,union('root',...leaves.map(l=>l.id))]);}
export function matrix(){
  const A=()=>rectangle('a',0,0,4,3),B=()=>rectangle('b',2,1,6,4),cases=[];
  const add=(name,nodes,area,components,voids,queries=[])=>cases.push({name,recipe:recipe(nodes),area:String(area),components,voids,queries});
  add('A union A',[A(),union('root','a','a')],12,1,0,[[[2,1],'interior'],[[0,1],'boundary'],[[5,1],'exterior']]);
  add('A intersect A',[A(),intersection('root','a','a')],12,1,0);
  add('A-A empty',[A(),difference('root','a','a')],0,0,0,[[[0,0],'exterior'],[[2,1],'exterior']]);
  add('independent identical union',[A(),rectangle('b',0,0,4,3),union('root','a','b')],12,1,0);
  add('independent identical subtraction',[A(),rectangle('b',0,0,4,3),difference('root','a','b')],0,0,0);
  add('overlap union not parity',[A(),B(),union('root','a','b')],20,1,0,[[[3,2],'interior'],[[4,2],'interior']]);
  add('overlap intersection',[A(),B(),intersection('root','a','b')],4,1,0);
  add('overlap difference',[A(),B(),difference('root','a','b')],8,1,0);
  add('L footprint',[rectangle('a',0,0,4,1),rectangle('b',0,0,1,4),union('root','a','b')],7,1,0,[[[.5,3],'interior'],[[3,3],'exterior']]);
  add('H footprint',[rectangle('a',0,0,1,4),rectangle('b',3,0,4,4),rectangle('c',0,1.5,4,2.5),union('root','a','b','c')],10,1,0);
  add('courtyard',[rectangle('a',0,0,6,6),rectangle('b',2,2,4,4),difference('root','a','b')],32,1,1,[[[3,3],'exterior'],[[2,3],'boundary'],[[1,3],'interior']]);
  add('split islands',[rectangle('a',0,0,6,4),rectangle('b',2,-1,4,5),difference('root','a','b')],16,2,0);
  add('nested island void grouping',[rectangle('a',0,0,10,10),rectangle('b',2,2,8,8),rectangle('c',4,4,6,6),difference('cut','a','b'),union('root','cut','c')],68,2,1,[[[5,5],'interior'],[[3,3],'exterior'],[[1,1],'interior']]);
  add('adjacent shared edge',[rectangle('a',0,0,1,1),rectangle('b',1,0,2,1),union('root','a','b')],2,1,0,[[[1,.5],'interior']]);
  add('edge-only intersection',[rectangle('a',0,0,1,1),rectangle('b',1,0,2,1),intersection('root','a','b')],0,0,0,[[[1,.5],'exterior']]);
  add('partial coincident T events',[rectangle('a',0,0,1,1),rectangle('b',1,.25,2,.75),union('root','a','b')],1.5,1,0);
  add('point tangent union',[rectangle('a',0,0,1,1),rectangle('b',1,1,2,2),union('root','a','b')],2,2,0,[[[1,1],'boundary'],[[1.1,.9],'exterior']]);
  add('point-only intersection',[rectangle('a',0,0,1,1),rectangle('b',1,1,2,2),intersection('root','a','b')],0,0,0,[[[1,1],'exterior']]);
  add('tangent diamond hole',[rectangle('a',0,0,6,6),polygon('b',[[[3,6],[4,5],[3,4],[2,5]]]),difference('root','a','b')],34,1,1,[[[3,6],'boundary'],[[3,5],'exterior'],[[3,3],'interior']]);
  add('edge notch',[rectangle('a',0,0,6,6),rectangle('b',2,4,4,6),difference('root','a','b')],32,1,0);
  add('disjoint union',[rectangle('a',0,0,1,1),rectangle('b',2,0,3,1),union('root','a','b')],2,2,0);
  add('leaf parity hole',[polygon('a',[[[0,0],[6,0],[6,6],[0,6]],[[2,2],[4,2],[4,4],[2,4]]]),union('root','a','a')],32,1,1);
  cases.push({name:'four-component point-contact ring',recipe:pointContactRing(),area:'4',components:4,voids:1,queries:[[[1.5,.5],'exterior'],[[.5,.5],'interior'],[[1,.5],'boundary']]});
  cases.push({name:'point-contact ring with inner island',recipe:pointContactRing(true),area:'4.25',components:5,voids:1,queries:[[[1.5,.5],'interior'],[[1.125,.5],'exterior'],[[1,.5],'boundary']]});
  return cases;
}
export function oracleCases(){
  const cases=matrix().map(c=>({name:c.name,recipe:c.recipe,queries:c.queries.map(q=>q[0])}));
  for(const name of ['H footprint','nested island void grouping','tangent diamond hole','courtyard','four-component point-contact ring','point-contact ring with inner island'])for(let i=0;i<8;i++){
    const c=matrix().find(c=>c.name===name),t={quarterTurns:i%4,mirrorX:i>=4};cases.push({name:name+' D4 '+i,recipe:c.recipe,queries:c.queries.map(q=>q[0]),transform:t,origin:[100000,.0000003,.0000001]});
    const transformed=clone(c.recipe),rotate=p=>{let [x,y]=p;if(t.mirrorX)x=-x;for(let n=0;n<t.quarterTurns;n++)[x,y]=[-y,x];return [x||0,y||0];};for(const node of transformed.shape.nodes)if(node.kind==='leaf')for(const ring of node.shape.outlines)for(const s of ring.segments){s.a=[...rotate(s.a),s.a[2]];s.b=[...rotate(s.b),s.b[2]];}
    cases.push({name:name+' reauthored exact D4 '+i,recipe:transformed,queries:c.queries.map(q=>rotate(q[0]))});
  }
  for(const name of ['courtyard','nested island void grouping','tangent diamond hole','four-component point-contact ring','point-contact ring with inner island'])for(let mask=1;mask<16;mask++){const c=matrix().find(c=>c.name===name);cases.push({name:name+' source order '+mask,recipe:reorderSource(c.recipe,mask),queries:c.queries.map(q=>q[0])});}
  let state=0x531c0de;const next=n=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state%n;};
  for(let i=0;i<16;i++){
    const leaves=['a','b','c'].map(id=>{const x=(next(17)-8)/2,y=(next(17)-8)/2;return rectangle(id,x,y,x+(next(8)+1)/2,y+(next(8)+1)/2);});
    for(const kind of ['union','intersection','difference']){const middle=union('middle','a','b'),root=kind==='union'?union('root','middle','c'):kind==='intersection'?intersection('root','middle','c'):difference('root','middle','c');cases.push({name:'seeded '+i+' '+kind,recipe:recipe([...leaves,middle,root]),queries:[[0,0],[.25,.25],[-2,-2],[1,1],[2,2],[3.5,1.5],[6,6]]});}
  }
  const triangles=[polygon('a',[[[-3,-2],[4,3],[-2,4]]]),polygon('b',[[[-1,-3],[3,-1],[1,5]]])];for(const op of [union,intersection,difference])cases.push({name:'rational diagonal '+op.name,recipe:recipe([...triangles,op('root','a','b')]),queries:[[0,0],[1,1],[0,-2],[3,-1]]});
  cases.push({name:'sub-Q sliver',recipe:recipe([rectangle('a',0,0,1,1),rectangle('b',0,0,1-.00000001,1),difference('root','a','b')]),queries:[[1,.5],[.5,.5]]});
  cases.push({name:'near-collinear positive triangle',recipe:recipe([polygon('a',[[[0,0],[1,1],[2,2+Number.EPSILON*2]]]),union('root','a','a')]),queries:[[1,1]]});
  cases.push({name:'full 16-leaf 128-segment input ceiling',recipe:fullInputCeiling(),queries:[[0,0],[.5,.5],[1.5,.5],[30.5,.5]]});
  return cases;
}
