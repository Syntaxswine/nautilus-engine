// Contract mathematics only. No authoring executor, decoder or renderer.
const closedAxes=[[1,0,0],[0,1,0]];
const assertFrame=surface=>{if(JSON.stringify(surface.axes)!==JSON.stringify(closedAxes))throw new RangeError('Unsupported source-frame basis for owner-local-level-top-v1');};
const rotate=([x,y],r)=>[Math.cos(r)*x-Math.sin(r)*y,Math.sin(r)*x+Math.cos(r)*y];
const quarter=([x,y],q)=>{for(let i=0;i<q;i++)[x,y]=[-y,x];return [x,y];};
export function referenceGraphicPoint(imageTopLeftUV,t,surface,owner){
 assertFrame(surface);
 const [ui,vi]=imageTopLeftUV,[pu,pv]=t.pivotUV,[widthM,heightM]=t.sizeM;
 const rotated=rotate([(t.mirrorU?-1:1)*(ui-pu)*widthM,(pv-vi)*heightM],t.rotationRad);
 const surfaceLocalM=rotated.map((x,i)=>x+t.positionM[i]);
 const ownerLocalM=surface.originM.map((x,i)=>x+surface.axes[0][i]*surfaceLocalM[0]+surface.axes[1][i]*surfaceLocalM[1]);
 const planar=quarter([(owner.transform.mirrorX?-1:1)*ownerLocalM[0],ownerLocalM[1]],owner.transform.quarterTurns);
 const nativeM=[planar[0]+owner.origin[0],planar[1]+owner.origin[1],ownerLocalM[2]+owner.origin[2]];
 return {surfaceLocalM,ownerLocalM,nativeM,renderM:[nativeM[0],nativeM[2],nativeM[1]]};
}
export function referenceImageTopLeftUV(nativeM,t,surface,owner){
 assertFrame(surface);
 const planar=quarter([nativeM[0]-owner.origin[0],nativeM[1]-owner.origin[1]],(4-owner.transform.quarterTurns)%4);
 const ownerLocalM=[(owner.transform.mirrorX?-1:1)*planar[0],planar[1],nativeM[2]-owner.origin[2]];
 if(Math.abs(ownerLocalM[2]-surface.originM[2])>1e-9)throw new RangeError('Point is outside the closed source-frame plane');
 const delta=ownerLocalM.map((x,i)=>x-surface.originM[i]),surfaceLocalM=surface.axes.map(axis=>axis.reduce((sum,x,i)=>sum+x*delta[i],0));
 const local=rotate(surfaceLocalM.map((x,i)=>x-t.positionM[i]),-t.rotationRad);
 return [t.pivotUV[0]+(t.mirrorU?-1:1)*local[0]/t.sizeM[0],t.pivotUV[1]-local[1]/t.sizeM[1]];
}
export function referenceTexelCenter(imageTopLeftUV,frameRectPx,form){
 let [ui,vi]=imageTopLeftUV;
 if(form==='stamp'&&(ui<0||ui>1||vi<0||vi>1))return null;
 if(form==='detail'){ui-=Math.floor(ui);vi-=Math.floor(vi);}
 const [x,y,w,h]=frameRectPx;return [x+ui*w-.5,y+vi*h-.5];
}
export function checkCoordinateVectors(v){
 const problems=[],compare=(label,a,b)=>{if(a.length!==b.length||a.some((x,i)=>!Number.isFinite(x)||Math.abs(x-b[i])>1e-9))problems.push(label);};
 const check=(label,w,owner=w.owner)=>{const actual=referenceGraphicPoint(w.imageTopLeftUV,w.transform,w.surface,owner);for(const key of ['surfaceLocalM','ownerLocalM','nativeM','renderM'])compare(label+'.'+key,actual[key],w['expected'+key[0].toUpperCase()+key.slice(1)]);compare(label+'.inverse',referenceImageTopLeftUV(w.expectedNativeM,w.transform,w.surface,owner),w.imageTopLeftUV);};
 check('noncentral-pivot',v.noncentralPivotWitness);check('source-frame',v.sourceFrameWitness);
 let poses=0;for(const w of v.allD4Witnesses)for(const pose of w.poses){check(w.name+'.'+poses,{...w,...pose},{origin:w.ownerOrigin,transform:{quarterTurns:pose.quarterTurns,mirrorX:pose.mirrorX}});poses++;}
 for(const [i,row]of v.frameSampling.samples.entries()){const actual=referenceTexelCenter(row.imageTopLeftUV,v.frameSampling.rectPx,row.form);if(row.expectedTransparent){if(actual!==null)problems.push('frame-sample.'+i);}else if(actual===null)problems.push('frame-sample.'+i);else compare('frame-sample.'+i,actual,row.expectedTexelCenter);}
 return {ok:problems.length===0,rootWitnesses:2,allD4Poses:poses,frameSamples:v.frameSampling.samples.length,problems,kind:'contract-mathematical-oracle-not-runtime-proof'};
}
