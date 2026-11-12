// This artwork uses alpha as a finish mask. Browser image/canvas decoders may
// premultiply away RGB under zero alpha. Decode our bounded RGBA8 PNG closure as
// data instead. No image is blended, normalised or regenerated.
const paeth=(a,b,c)=>{const p=a+b-c,x=Math.abs(p-a),y=Math.abs(p-b),z=Math.abs(p-c);return x<=y&&x<=z?a:y<=z?b:c;};
export async function decodeVehiclePNG(input){
 const bytes=new Uint8Array(input),view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),idat=[];let width,height,ended=false;
 if(bytes.length<33||[137,80,78,71,13,10,26,10].some((n,i)=>bytes[i]!==n))throw Error('VEHICLE_PNG_SIGNATURE');
 for(let at=8;at+12<=bytes.length;){const size=view.getUint32(at),name=String.fromCharCode(...bytes.subarray(at+4,at+8));if(size>bytes.length-at-12)throw Error('VEHICLE_PNG_CHUNK');const data=bytes.subarray(at+8,at+8+size);
   if(name==='IHDR'){width=view.getUint32(at+8);height=view.getUint32(at+12);if(size!==13||!width||width>4096||!height||height>4096||data[8]!==8||data[9]!==6||data[10]||data[11]||data[12])throw Error('VEHICLE_PNG_PROFILE: use the approved noninterlaced RGBA8 PNGs.');}
   else if(name==='IDAT')idat.push(data);else if(name==='IEND'){ended=true;break;}at+=size+12;
 }
 if(!ended||!width||!idat.length)throw Error('VEHICLE_PNG_INCOMPLETE');const compressed=new Blob(idat),raw=new Uint8Array(await new Response(compressed.stream().pipeThrough(new DecompressionStream('deflate'))).arrayBuffer()),stride=width*4;
 if(raw.length!==(stride+1)*height)throw Error('VEHICLE_PNG_SIZE');const pixels=new Uint8Array(width*height*4);
 for(let y=0;y<height;y++){const filter=raw[y*(stride+1)];if(filter>4)throw Error('VEHICLE_PNG_FILTER');for(let x=0;x<stride;x++){const at=y*stride+x,a=x>=4?pixels[at-4]:0,b=y?pixels[at-stride]:0,c=y&&x>=4?pixels[at-stride-4]:0,v=raw[y*(stride+1)+1+x];pixels[at]=(v+(filter===1?a:filter===2?b:filter===3?Math.floor((a+b)/2):filter===4?paeth(a,b,c):0))&255;}}
 return {width,height,pixels,encodedBytes:bytes.length};
}
export async function loadVehicleSkin(T,url,{signal}={}){
 const response=await fetch(url,{signal});if(!response.ok)throw Error('VEHICLE_SKIN_HTTP: '+response.status);const decoded=await decodeVehiclePNG(await response.arrayBuffer());if(signal?.aborted)throw Object.assign(Error('Vehicle skin cancelled.'),{name:'AbortError'});
 const {width,height,pixels}=decoded,flipped=new Uint8Array(pixels.length),stride=width*4;for(let y=0;y<height;y++)flipped.set(pixels.subarray(y*stride,(y+1)*stride),(height-y-1)*stride);
 const texture=new T.DataTexture(flipped,width,height,T.RGBAFormat);texture.flipY=false;texture.premultiplyAlpha=false;texture.generateMipmaps=true;texture.minFilter=T.LinearMipmapLinearFilter;texture.magFilter=T.LinearFilter;texture.anisotropy=4;texture.userData={encodedBytes:decoded.encodedBytes,alpha:'finish-mask'};return texture;
}
