import {data,fields,id,array,number,integer,choice,token,fail} from './data.js';
import {Q,unit,direction,dmetres,checkTransform,transformPoint} from './curves.js';
export function checkField(s,p='/field'){
  fields(s,['kind','id','bounds','values','heights','paint','fieldAmplitude','heightAmplitudeM','variantSeed','saddle'],p);choice(s.kind,['field-cell'],p+'/kind');id(s.id,p+'/id');array(s.bounds,p+'/bounds',4,4).forEach((v,i)=>number(v,p+'/bounds/'+i));if(s.bounds[2]<=s.bounds[0]||s.bounds[3]<=s.bounds[1])fail('INVALID_BOUNDS',p+'/bounds','A field cell needs positive native width/depth.');if([0,1].some(i=>Math.round(s.bounds[i]*Q)===Math.round(s.bounds[i+2]*Q)))fail('COLLAPSED_FIELD','/bounds','Field width/depth collapsed under the named position policy.');
  for(const k of ['values','heights','paint'])array(s[k],p+'/'+k,4,4).forEach((v,i)=>number(v,p+'/'+k+'/'+i,k==='paint'?0:-1000000,k==='paint'?1:1000000));
  number(s.fieldAmplitude,p+'/fieldAmplitude',-1000,1000);number(s.heightAmplitudeM,p+'/heightAmplitudeM',0,1000);integer(s.variantSeed,p+'/variantSeed',0,4294967295);choice(s.saddle,['connect-positive','connect-negative'],p+'/saddle');
  const {ambiguous}=fieldTopology(s);if(ambiguous&&s.values.some(v=>Math.abs(v)!==1))fail('UNSUPPORTED_FIELD_CONDITIONING',p+'/values','Ambiguous checkerboards require exactly [1,-1,1,-1] or [-1,1,-1,1]. Other corner magnitudes or zero-valued checkerboards have no supported connectivity proof; preserve and refuse them.');return s;
}
const smooth=u=>u*u*(3-2*u),ds=u=>6*u*(1-u);
function bilinear(v,x,y){return (v[0]*(1-x)+v[1]*x)*(1-y)+(v[3]*(1-x)+v[2]*x)*y;}
export function fieldAt(s,u,v){
  const x=smooth(u),y=smooth(v),boundary=u===0||u===1||v===0||v===1,noise=Number.parseInt(token(['tile-interior-v1',s.variantSeed]).slice(0,8),16)/4294967295*2-1;
  const fade=boundary?0:256*u*u*(1-u)*(1-u)*v*v*(1-v)*(1-v),fu=boundary?0:512*u*(1-u)*(1-2*u)*v*v*(1-v)*(1-v),fv=boundary?0:512*v*(1-v)*(1-2*v)*u*u*(1-u)*(1-u);
  const gradient=(values,amplitude)=>[(values[1]-values[0])*(1-y)+(values[2]-values[3])*y,(values[3]-values[0])*(1-x)+(values[2]-values[1])*x].map((a,i)=>(a*(i?ds(v):ds(u))+amplitude*noise*(i?fv:fu))/(s.bounds[i+2]-s.bounds[i]));
  // Validated checkerboards are binary. On the selected diagonal the bilinear
  // term is sign*(1-2*smooth(t))^2, and the signed bubble coefficient is >=2
  // for every allowed amplitude/seed. This full strict-sign path also separates
  // the opposite-sign corners. A centre-sign bias alone proves neither fact.
  const topology=fieldTopology(s),bias=topology.ambiguous?(s.saddle==='connect-positive'?1:-1)*(2+Math.abs(s.fieldAmplitude)):0;
  const value=bilinear(s.values,x,y)+(s.fieldAmplitude*noise+bias)*fade,height=bilinear(s.heights,x,y)+s.heightAmplitudeM*noise*fade,g=gradient(s.heights,s.heightAmplitudeM),normal=dmetres(direction([-g[0],-g[1],1]));
  return {value:Object.is(value,-0)?0:value,heightM:height,normal,paint:bilinear(s.paint,x,y),classification:value>=0?'positive':'negative',boundary};
}
export function fieldTopology(s){const mask=s.values.reduce((m,v,i)=>m|(v>=0?1<<i:0),0),ambiguous=mask===5||mask===10,positiveDiagonal=mask===5?[0,2]:[1,3];return {mask,ambiguous,saddle:s.saddle,cornerPositiveComponents:ambiguous&&s.saddle==='connect-negative'?2:mask?1:0,cornerNegativeComponents:ambiguous&&s.saddle==='connect-positive'?2:mask===15?0:1,diagonal:ambiguous?(s.saddle==='connect-positive'?positiveDiagonal:[0,1,2,3].filter(i=>!positiveDiagonal.includes(i))):null,pointContactGrantsTraversal:false,zeroPolicy:'zero-positive-v1',scope:'Explicit corner/saddle connectivity; not a gameplay traversal proof.'};}
export function sampleTileField(input,u,v){const s=checkField(data(input));number(u,'/u',0,1);number(v,'/v',0,1);return {...fieldAt(s,u,v),topology:fieldTopology(s)};}
export function tileFieldTopology(input,options){const s=checkField(data(input)),o=data(options);fields(o,['transform','complement'],'/options');checkTransform(o.transform);if(typeof o.complement!=='boolean')fail('INVALID_COMPLEMENT','/options/complement','Declare a boolean complement.');const corners=[[0,0,0],[1,0,0],[1,1,0],[0,1,0]].map(v=>transformPoint(v,o.transform)),min=[0,1].map(i=>Math.min(...corners.map(v=>v[i]))),max=[0,1].map(i=>Math.max(...corners.map(v=>v[i]))),ordered=[[min[0],min[1]],[max[0],min[1]],[max[0],max[1]],[min[0],max[1]]].map(v=>corners.findIndex(c=>c[0]===v[0]&&c[1]===v[1])),values=ordered.map(i=>o.complement&&s.values[i]!==0?-s.values[i]:s.values[i]),saddle=o.complement?(s.saddle==='connect-positive'?'connect-negative':'connect-positive'):s.saddle,transformed=checkField({...s,values,saddle},'/transformedField');return {...fieldTopology(transformed),cornerSources:ordered,transform:o.transform,complement:o.complement};}
export function checkNormal(n,p='/normal'){
  if(n?.kind==='constant'){fields(n,['kind','vector'],p);unit(n.vector,p+'/vector');}
  else if(n?.kind==='field-cell'){fields(n,['kind','field'],p);checkField(n.field,p+'/field');}
  else fail('UNSUPPORTED_NORMAL',p,'Use a serializable constant or shared field-cell normal evaluator.');return n;
}
export function normalAt(n,local){if(n.kind==='constant')return n.vector;const s=n.field,u=(local[0]-s.bounds[0])/(s.bounds[2]-s.bounds[0]),v=(local[1]-s.bounds[1])/(s.bounds[3]-s.bounds[1]);number(u,'/normal/u',0,1);number(v,'/normal/v',0,1);return fieldAt(s,u,v).normal;}
