// Candidate authored grammar only. None of the new native shapes is evaluated.
import {fields,id,array,number,integer,choice,unique,fail} from './data.js';
import {checkCurve,parts,evaluate,qp,same} from './curves.js';
import {checkField} from './fields.js';
import {bounds,profile} from './recipes.js';

export const V2_FEATURES=['canonical-boundaries-v1','shape-graph-v2','ribbon-sweep-v2','section-sweep-v2','stair-run-v2','zero-exposure-v2'];
const dimension=(v,p)=>number(v,p,.000001,100000);
function baseShape(s,p){
  if(s.kind==='field-cell')return checkField(s,p);
  if(s.kind==='region'){
    fields(s,['kind','id','outlines','baseM','thicknessM','clip'],p,['kind','id','outlines','baseM','thicknessM']);id(s.id,p+'/id');array(s.outlines,p+'/outlines',8,1);unique(s.outlines,p+'/outlines',x=>x.id);
    s.outlines.forEach((c,i)=>{checkCurve(c,p+'/outlines/'+i);if(!same(qp(evaluate(c,0)),qp(evaluate(c,1))))fail('OPEN_REGION',p,'Keep closed original outlines.');});number(s.baseM,p+'/baseM');dimension(s.thicknessM,p+'/thicknessM');
  }else{
    fields(s,['kind','id','path','widthM','thicknessM','clip'],p,['kind','id','path','widthM','thicknessM']);id(s.id,p+'/id');checkCurve(s.path,p+'/path');dimension(s.widthM,p+'/widthM');dimension(s.thicknessM,p+'/thicknessM');
  }
  if(s.clip)bounds(s.clip,p+'/clip');return s;
}
export function checkV2Shape(s,p='/shape',graphAllowed=true){
  choice(s?.kind,graphAllowed?['field-cell','region','profile-sweep','shape-graph','ribbon-sweep','section-sweep','stair-run']:['field-cell','region','profile-sweep','ribbon-sweep','section-sweep','stair-run'],p+'/kind');
  if(['field-cell','region','profile-sweep'].includes(s.kind))return baseShape(s,p);
  id(s.id,p+'/id');
  if(s.kind==='shape-graph'){
    fields(s,['kind','id','rootId','nodes'],p);id(s.rootId,p+'/rootId');array(s.nodes,p+'/nodes',128,1);unique(s.nodes,p+'/nodes',n=>n.id);const nodes=new Map(s.nodes.map(n=>[n.id,n]));
    for(const [i,n]of s.nodes.entries()){
      const q=p+'/nodes/'+i;id(n.id,q+'/id');choice(n.kind,['leaf','union','intersection','difference'],q+'/kind');
      if(n.kind==='leaf'){fields(n,['kind','id','shape'],q);checkV2Shape(n.shape,q+'/shape',false);}
      else if(n.kind==='difference'){fields(n,['kind','id','baseId','subtractId'],q);id(n.baseId,q+'/baseId');id(n.subtractId,q+'/subtractId');}
      else{fields(n,['kind','id','inputs'],q);array(n.inputs,q+'/inputs',16,2);n.inputs.forEach((v,j)=>id(v,q+'/inputs/'+j));}
    }
    const refs=n=>n.kind==='leaf'?[]:n.kind==='difference'?[n.baseId,n.subtractId]:n.inputs;
    if(!nodes.has(s.rootId))fail('UNKNOWN_SHAPE_NODE',p+'/rootId','The graph root must name a saved node.');
    // Memoize maximum depths after an O(nodes+edges) cycle audit. Walking every
    // DAG path would turn a bounded shared-node graph into exponential work.
    const state=new Map(),depths=new Map();function audit(key){if(state.get(key)===1)fail('SHAPE_GRAPH_CYCLE',p,'Boolean dependencies must be acyclic.');if(state.get(key)===2)return depths.get(key);const n=nodes.get(key);if(!n)fail('UNKNOWN_SHAPE_NODE',p,'Every operand must name a saved node.',{nodeId:key});state.set(key,1);let d=1;for(const r of refs(n))d=Math.max(d,1+audit(r));if(d>12)fail('SHAPE_GRAPH_DEPTH',p,'Graph dependency depth exceeds 12.');state.set(key,2);depths.set(key,d);return d;}for(const key of nodes.keys())audit(key);
    return s;
  }
  if(s.kind==='ribbon-sweep'){
    fields(s,['kind','id','path','width','caps','corners','thicknessM'],p);checkCurve(s.path,p+'/path');dimension(s.thicknessM,p+'/thicknessM');fields(s.caps,['start','end'],p+'/caps');for(const k of ['start','end'])choice(s.caps[k],['butt','square','round'],p+'/caps/'+k);fields(s.corners,['policy','miterLimit'],p+'/corners');choice(s.corners.policy,['bevel','round','miter'],p+'/corners/policy');number(s.corners.miterLimit,p+'/corners/miterLimit',1,1000);
    fields(s.width,['metric','stations'],p+'/width');choice(s.width.metric,['curve-parameter','planar-arc-length-m'],p+'/width/metric');array(s.width.stations,p+'/width/stations',128,2);unique(s.width.stations,p+'/width/stations',v=>v.id);const ps=parts(s.path);let previous=-1;
    for(const [i,v]of s.width.stations.entries()){
      const q=p+'/width/stations/'+i;fields(v,s.width.metric==='curve-parameter'?['id','segmentId','t','leftM','rightM']:['id','sM','leftM','rightM'],q);id(v.id,q+'/id');number(v.leftM,q+'/leftM',0,100000);number(v.rightM,q+'/rightM',0,100000);if(v.leftM+v.rightM<.000001)fail('COLLAPSED_WIDTH',q,'Retain positive native total width.');
      let station;if(s.width.metric==='curve-parameter'){id(v.segmentId,q+'/segmentId');const index=ps.findIndex(c=>c.id===v.segmentId);if(index<0)fail('UNKNOWN_WIDTH_SEGMENT',q,'Width stations name original primitive IDs.');number(v.t,q+'/t',0,1);station=index+v.t;}else{number(v.sM,q+'/sM',0,1000000);station=v.sM;}
      if(station<=previous)fail('WIDTH_STATION_ORDER',q,'Stations must increase in the explicitly saved metric.');if(i===0&&station!==0)fail('WIDTH_ENDPOINT',q,'The first width station must be the original path start.');if(i===s.width.stations.length-1&&s.width.metric==='curve-parameter'&&station!==ps.length)fail('WIDTH_ENDPOINT',q,'The last parameter station must be the original path end.');previous=station;
    }
  }else if(s.kind==='section-sweep'){
    fields(s,['kind','id','path','section','frame','scale','caps'],p);checkCurve(s.path,p+'/path');fields(s.frame,['policy','rollRad'],p+'/frame');choice(s.frame.policy,['gravity-upright-v1','transported-3d-v1'],p+'/frame/policy');number(s.frame.rollRad,p+'/frame/rollRad',-2*Math.PI,2*Math.PI);fields(s.scale,['lateral','vertical'],p+'/scale');number(s.scale.lateral,p+'/scale/lateral',.000001,1000);number(s.scale.vertical,p+'/scale/vertical',.000001,1000);choice(s.caps,['open','closed'],p+'/caps');
    fields(s.section,['id','contours'],p+'/section');id(s.section.id,p+'/section/id');array(s.section.contours,p+'/section/contours',8,1);unique(s.section.contours,p+'/section/contours',c=>c.id);let vertices=0;
    for(const [i,c]of s.section.contours.entries()){
      const q=p+'/section/contours/'+i;fields(c,['id','role','vertices','materials'],q);id(c.id,q+'/id');choice(c.role,['outer','hole','open'],q+'/role');array(c.vertices,q+'/vertices',128,c.role==='open'?2:3);vertices+=c.vertices.length;if(vertices>128)fail('SECTION_VERTEX_LIMIT',q,'At most 128 native section vertices across all contours.');unique(c.vertices,q+'/vertices',v=>v.id);for(const [j,v]of c.vertices.entries()){fields(v,['id','point'],q+'/vertices/'+j);id(v.id,q+'/vertices/'+j+'/id');array(v.point,q+'/vertices/'+j+'/point',2,2).forEach((x,k)=>number(x,q+'/vertices/'+j+'/point/'+k));}array(c.materials,q+'/materials',128,c.role==='open'?c.vertices.length-1:c.vertices.length);if(c.materials.length!==(c.role==='open'?c.vertices.length-1:c.vertices.length))fail('SECTION_MATERIAL_COUNT',q,'Save one material contract per original section edge.');c.materials.forEach((m,j)=>profile(m,q+'/materials/'+j));if(c.role==='open'&&s.caps==='closed')fail('OPEN_SECTION_CAP',q,'An open section cannot promise closed caps.');
    }
  }else{
    fields(s,['kind','id','path','widthM','count','countPolicy','rise','run','baseM','bottomLandingM','topLandingM','interfaces'],p);checkCurve(s.path,p+'/path');dimension(s.widthM,p+'/widthM');integer(s.count,p+'/count',1,128);choice(s.countPolicy,['equal-treads-risers-v1'],p+'/countPolicy');number(s.baseM,p+'/baseM');number(s.bottomLandingM,p+'/bottomLandingM',0,100000);number(s.topLandingM,p+'/topLandingM',0,100000);
    for(const k of ['rise','run']){fields(s[k],['kind','metres'],p+'/'+k);choice(s[k].kind,k==='rise'?['per-step','total']:['per-tread','total'],p+'/'+k+'/kind');number(s[k].metres,p+'/'+k+'/metres',k==='rise'?-100000:.000001,100000);if(s[k].metres===0)fail('COLLAPSED_RISE',p+'/rise','A stair preserves a nonzero signed rise.');}
    for(const c of parts(s.path)){const heights=c.kind==='arc'?[c.h0,c.h1]:c.kind==='line'?[c.a[2],c.b[2]]:c.points.map(v=>v[2]);if(heights.some(h=>h!==0))fail('STAIR_PLAN_HEIGHT',p+'/path','Stair plan controls have h=0; native vertical intent is in base/rise, never silently discarded.');}
    fields(s.interfaces,['start','firstTread','end'],p+'/interfaces');choice(s.interfaces.start,['lower-riser'],p+'/interfaces/start');choice(s.interfaces.firstTread,['first-tread'],p+'/interfaces/firstTread');choice(s.interfaces.end,['top-tread'],p+'/interfaces/end');
  }
  return s;
}
export function shapeSources(s,map=new Map()){
  const add=(key,count=null)=>{if(map.has(key))fail('DUPLICATE_SOURCE_ID','/shape','Editable source identities must be unique across the recipe.',{sourceId:key});map.set(key,count);};add(s.id);
  if(s.kind==='shape-graph'){for(const n of s.nodes){add(n.id);if(n.kind==='leaf')shapeSources(n.shape,map);}return map;}
  const curves=s.kind==='region'?s.outlines:s.path?[s.path]:[];for(const c of curves){if(c.kind==='compound')add(c.id);for(const a of parts(c))add(a.id,a.kind==='cubic'?4:a.kind==='arc'?3:2);}
  if(s.kind==='ribbon-sweep')for(const v of s.width.stations)add(v.id);
  if(s.kind==='section-sweep'){add(s.section.id);for(const c of s.section.contours){add(c.id);for(const v of c.vertices)add(v.id);}}
  return map;
}
