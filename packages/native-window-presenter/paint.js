// Selected literal finish/skin formulas adapted from the audited native source.
// Source hashes and notices: source.json and NOTICE.md. No renderer allocation.
export const WINDOW_PAINT_RECIPES=Object.freeze({
  glass:Object.freeze({color:0x8eafb0,roughness:.3,metalness:.25,transparent:true,opacity:.56,depthWrite:false}),
  shine:Object.freeze({color:0xe2ebe0,transparent:true,opacity:.7,depthWrite:false}),
  finishes:Object.freeze(Object.fromEntries([['steel',0x514f3c,0x9a9c83],['sage',0x65765c,0xa5b093],['ivory',0xc7c1a7,0xf0e5c8]].map(([id,color,edge])=>[id,Object.freeze({frame:Object.freeze({color,roughness:.82,metalness:.32}),edge:Object.freeze({color:edge,roughness:.7,metalness:.35,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1})})]))),
  wall:Object.freeze({roughness:.94,color:0xffffff}),textureSize:128,textureColourSpace:'sRGB',textureWrap:'repeat'
});
export function nativeWindowSurfacePixels(kind){
  if(!['brick','concrete','corrugated'].includes(kind))throw TypeError('Use a native window wall skin.');
  const size=128,data=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const u=x/size,v=y/size,noise=((x*73+y*97+(x*y)%31)%17)-8;let color;
    if(kind==='brick'){const course=Math.floor(v/.2),a=(u+(course%2)*.25)%.5,b=v%.2;color=a<.018||b<.015?[111,107,88]:[151+course%3*7,101+course%2*5,73];}
    else if(kind==='corrugated'){const rib=Math.floor(u*16)%4===0?-25:0;color=[111+rib,125+rib,117+rib];}
    else color=[127,128,113];
    const i=(y*size+x)*4;for(let c=0;c<3;c++)data[i+c]=color[c]+noise;data[i+3]=255;
  }
  return {data,width:size,height:size};
}
export function surfaceUV(position,normal){if(Math.abs(normal[1])>.5)return [position[0],position[2]];return [Math.abs(normal[0])>.5?position[2]:position[0],position[1]];}
