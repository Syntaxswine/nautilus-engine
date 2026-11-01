// Art-only sweep of detached path samples. The installed core owns curve sampling,
// placement, RecipePort matching and persistence; this provider never repeats it.
const q=v=>Math.round(v*1e6)/1e6;
export function createProfileSweepStudy(T,{pathSamples,profile,material}={}){
 if(!T?.BufferGeometry||!material||!Array.isArray(pathSamples)||pathSamples.length<2||pathSamples.length>2048||!Array.isArray(profile)||profile.length<3||profile.length>32)throw Error('Supply host Three/material, 2–2048 sampled path stations and a closed 3–32 vertex profile.');
 for(const p of pathSamples)if(!Array.isArray(p?.position)||p.position.length!==3||!p.position.every(v=>Number.isFinite(v)&&Math.abs(v)<=512)||!Array.isArray(p.tangent)||p.tangent.length!==2||!p.tangent.every(Number.isFinite)||Math.abs(Math.hypot(...p.tangent)-1)>1e-9)throw Error('Use detached engine [x,y,h] positions and unit plan tangents.');
 for(const p of profile)if(!Array.isArray(p)||p.length!==2||!p.every(v=>Number.isFinite(v)&&Math.abs(v)<=16))throw Error('Use bounded [offset,height] profile coordinates.');
 const area=profile.reduce((s,a,i)=>{const b=profile[(i+1)%profile.length];return s+a[0]*b[1]-b[0]*a[1];},0)/2;if(area<=1e-8)throw Error('Use a noncollapsed counterclockwise section.');
 // Fixed section refinement survives any caller's independent path LOD choice.
 const section=[];for(let i=0;i<profile.length;i++){const a=profile[i],b=profile[(i+1)%profile.length],dx=b[0]-a[0],dh=b[1]-a[1],length=Math.hypot(dx,dh);if(length<1e-6)throw Error('Collapsed profile edge.');const count=Math.ceil(length*32);for(let j=0;j<count;j++)section.push({point:[a[0]+dx*j/count,a[1]+dh*j/count],normal:[dh/length,-dx/length]});}
 if(section.length>2048||(pathSamples.length-1)*section.length>65536)throw Error('Sweep exceeds the 65,536 quad art budget.');
 const rings=pathSamples.map(p=>section.map(s=>{const right=[-p.tangent[1],p.tangent[0]],position=[q(p.position[0]+right[0]*s.point[0]),q(p.position[1]+right[1]*s.point[0]),q(p.position[2]+s.point[1])];return {enginePosition:position,threePosition:[position[0],position[2],position[1]],normal:[right[0]*s.normal[0],s.normal[1],right[1]*s.normal[0]],uvMetres:[q(position[0]+position[1]),position[2]]};}));
 const positions=[],normals=[],uvs=[];function tri(a,b,c){const ab=b.threePosition.map((v,i)=>v-a.threePosition[i]),ac=c.threePosition.map((v,i)=>v-a.threePosition[i]),cross=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]];if(Math.hypot(...cross)<1e-12)throw Error('Sweep collapsed; increase radius or reduce profile thickness.');if(cross.reduce((n,v,i)=>n+v*a.normal[i],0)<0)[b,c]=[c,b];for(const p of [a,b,c]){positions.push(...p.threePosition);normals.push(...p.normal);uvs.push(...p.uvMetres);}}
 for(let i=1;i<rings.length;i++){if(Math.hypot(...pathSamples[i].position.map((v,j)=>v-pathSamples[i-1].position[j]))<1e-6)throw Error('Collapsed path station.');for(let j=0;j<section.length;j++){const k=(j+1)%section.length,a=rings[i-1][j],b=rings[i][j],c=rings[i][k],d=rings[i-1][k];tri(a,b,c);tri(a,c,d);}}
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geometry.setAttribute('color',new T.Float32BufferAttribute(Array(positions.length).fill(1),3));geometry.computeBoundingSphere();const root=new T.Group();root.add(new T.Mesh(geometry,material));const ends=[rings[0],rings.at(-1)];root.userData={appearanceOnly:true,ends,qualification:'Open-ended art sweep of supplied path samples; no support, collision, matching or save authority.'};let disposed=false;
 return {root,ends,dispose(){if(disposed)return;disposed=true;geometry.dispose();root.removeFromParent();root.clear();}};
}
// Demonstration fixtures only. Replace with sampleTileCurve from the actual
// borrowed core instance after its fixed checkpoint is registered by Root.
export function sweepStudy(kind='fence'){
 const pathSamples=Array.from({length:65},(_,i)=>{const a=-.75+i/64*1.5;return {position:[5+5*Math.sin(a),5-5*Math.cos(a),kind==='cornice'?2.12:0],tangent:[Math.cos(a),Math.sin(a)]};});
 const profile=kind==='cornice'?[[-.12,0],[.12,0],[.12,.12],[.24,.12],[.24,.22],[.31,.22],[.31,.32],[-.12,.32]]:[[-.035,0],[.035,0],[.035,1.25],[-.035,1.25]];
 return {pathSamples,profile};
}
