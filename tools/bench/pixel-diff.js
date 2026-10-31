// Pixel identity oracle for the asset-rendering A/B, driven by
// tools/bench-asset-rendering.mjs --diff. One page loads both engine trees
// (/a/ and /b/, separate module instances), renders the same scene and view with
// each, and compares the frames byte for byte. Run it on a deterministic
// rasterizer (SwiftShader): GPU frames vary between runs even for one tree.
const THREE='vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor/three.module.js';
async function engine(tree){
 const [T,{BuildingPreviewScene}]=await Promise.all([import('/'+tree+'/'+THREE),import('/'+tree+'/apps/editor/prefab-preview.js')]);
 return {T,BuildingPreviewScene};
}
const engines={a:await engine('a'),b:await engine('b')};
function fit(T,models,width,height){
 const box=new T.Box3();for(const model of models)box.expandByObject(model.root);
 const size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3()),aspect=width/height;
 return {view:{x:center.x,y:center.z,span:Math.max(3,(size.x+size.z)/Math.SQRT2/aspect,(size.x+size.z)/Math.sqrt(8)+size.y*Math.sqrt(3)/2)*1.14,preset:'0'},level:center.y/2.12};
}
// Depth-tie mask, measured by the same rasterizer: the frame drawn with the
// default depth test (<=, the last of equal-depth fragments wins) and again with
// strict < (the first wins). Pixels that change are exactly where draw order
// decides between surfaces at equal depth, per MSAA sample and after the
// rasterizer's own vertex snapping.
function tieMask(T,scene,gl,view,width,height,w,h){
 const read=()=>{const pixels=new Uint8Array(w*h*4);gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,pixels);return pixels;},materials=new Set();
 scene.scene.traverse(node=>{for(const material of [].concat(node.material||[]))materials.add(material);});
 scene.draw(view,width,height);const lastWins=read(),saved=[...materials].map(m=>[m,m.depthFunc]);
 for(const [material]of saved)material.depthFunc=T.LessDepth;
 try{scene.draw(view,width,height);}finally{for(const [material,func]of saved)material.depthFunc=func;}
 const firstWins=read(),mask=new Uint8Array(w*h);
 for(let p=0;p<w*h;p++)for(let c=0;c<4;c++)if(lastWins[p*4+c]!==firstWins[p*4+c]){mask[p]=1;break;}
 return mask;
}
async function frames(arm,spec,explain=false){
 const {T,BuildingPreviewScene}=engines[arm],{width=1280,height=800}=spec,canvas=document.createElement('canvas');document.body.append(canvas);
 const scene=new BuildingPreviewScene(canvas,()=>{}),gl=scene.renderer.getContext(),out=[];
 try{
  for(const id of spec.providers){const load=await scene.prefabs.load(id);if(load.error)throw load.error;}
  await scene.open({map:{buildingPrefabs:{version:1,instances:[]}},size:240});
  await scene.prefabs.update({map:{buildingPrefabs:{version:1,instances:spec.instances}},size:240},scene.options);
  if(scene.diagnostics.length)throw Error(scene.diagnostics.join(' '));
  const models=[...scene.prefabs.models.values()];
  for(const viewSpec of spec.views){
   scene.options.showAllLevels=!viewSpec.cutaway;scene.options.roofs=!viewSpec.cutaway;scene.prefabs.setView();
   const framed=fit(T,viewSpec.framing==='first'?models.slice(0,1):models,width,height);scene.options.level=viewSpec.cutaway?0:framed.level;
   scene.draw(framed.view,width,height);scene.draw(framed.view,width,height);
   const w=scene.renderer.domElement.width,h=scene.renderer.domElement.height;
   const pixels=new Uint8Array(w*h*4);gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
   out.push({name:viewSpec.name,w,h,pixels,view:framed.view,ties:explain?tieMask(T,scene,gl,framed.view,width,height,w,h):null});
  }
 }finally{scene.dispose();canvas.remove();}
 return out;
}
// Image of differences: grey copy of A, red where B differs (brighter = larger delta).
function diffImage(w,h,a,b){
 const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const context=canvas.getContext('2d'),image=context.createImageData(w,h);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=((h-1-y)*w+x)*4,o=(y*w+x)*4,d=Math.max(Math.abs(a[i]-b[i]),Math.abs(a[i+1]-b[i+1]),Math.abs(a[i+2]-b[i+2]));
  const g=(a[i]+a[i+1]+a[i+2])/6;image.data[o]=d?Math.min(255,128+d*4):g;image.data[o+1]=d?0:g;image.data[o+2]=d?0:g;image.data[o+3]=255;}
 context.putImageData(image,0,0);return canvas.toDataURL('image/png');
}
window.runDiff=async function(spec){
 const fa=await frames('a',spec,spec.explain),fb=await frames('b',spec,spec.explain),views=[],differ={};
 for(let k=0;k<fa.length;k++){
  const A=fa[k],B=fb[k];if(A.w!==B.w||A.h!==B.h)throw Error('Frame sizes differ.');
  let differing=0,maxDelta=0,sum=0;const histogram=new Array(9).fill(0),box=[Infinity,Infinity,-Infinity,-Infinity],where=[];
  for(let p=0;p<A.w*A.h;p++){const i=p*4,d=Math.max(Math.abs(A.pixels[i]-B.pixels[i]),Math.abs(A.pixels[i+1]-B.pixels[i+1]),Math.abs(A.pixels[i+2]-B.pixels[i+2]),Math.abs(A.pixels[i+3]-B.pixels[i+3]));
   if(d){differing++;sum+=d;maxDelta=Math.max(maxDelta,d);histogram[Math.min(8,Math.ceil(Math.log2(d+1)))]++;const x=p%A.w,y=A.h-1-Math.floor(p/A.w);where.push([x,y]);box[0]=Math.min(box[0],x);box[1]=Math.min(box[1],y);box[2]=Math.max(box[2],x);box[3]=Math.max(box[3],y);}}
  if(where.length)differ[A.name]=where.slice(0,spec.tieLimit??400);
  views.push({name:A.name,pixels:A.w*A.h,differing,maxDelta,meanDelta:differing?sum/differing:0,histogramLog2:histogram,box:differing?box:null,sameView:JSON.stringify(A.view)===JSON.stringify(B.view),image:spec.images&&differing?diffImage(A.w,A.h,A.pixels,B.pixels):null});
 }
 // A differing pixel is explained when it is an order-dependent tie in either
 // tree. Control: the share of all unchanged pixels in the same box that are
 // ties; a tie mask that covered the box would explain nothing.
 if(spec.explain)views.forEach((view,k)=>{
  if(!view.differing)return;const A=fa[k],B=fb[k],w=A.w,h=A.h,at=([x,y])=>(h-1-y)*w+x,where=differ[view.name];
  const explained=where.filter(p=>A.ties[at(p)]||B.ties[at(p)]).length,[x0,y0,x1,y1]=view.box,moved=new Set(where.map(at));let boxTies=0,boxPixels=0;
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const p=at([x,y]);if(moved.has(p))continue;boxPixels++;if(A.ties[p]||B.ties[p])boxTies++;}
  view.ties={checked:where.length,explained,unexplained:where.filter(p=>!(A.ties[at(p)]||B.ties[at(p)])).slice(0,20),controlTieShare:boxPixels?boxTies/boxPixels:0,controlPixels:boxPixels};
 });
 return {scene:spec.name,views};
};
window.diffReady=true;
