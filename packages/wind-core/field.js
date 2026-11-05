// A baked wind field: cell-centred velocities a game can sample without running the solver.
export const WIND_FIELD_KIND='nautilus-wind-field';
export const WIND_FIELD_VERSION=1;
export function bakeWindField(solver,{mean=true}={}){
  const g=solver.grid,useMean=mean&&solver.averagedSteps>0;
  return{kind:WIND_FIELD_KIND,version:WIND_FIELD_VERSION,origin:[...g.origin],cell:g.cell,size:[...g.size],axes:['x','height','z'],units:'m/s',
    wind:solver.wind?{...solver.wind}:null,mean:useMean,averagedSteps:useMean?solver.averagedSteps:0,time:solver.time,steps:solver.steps,
    velocity:solver.cellVelocities({mean:useMean}),solid:Uint8Array.from(solver.solid,value=>value?1:0)};
}
function checkField(field){
  if(field?.kind!==WIND_FIELD_KIND||field.version!==WIND_FIELD_VERSION)throw Error('Not a version '+WIND_FIELD_VERSION+' Nautilus wind field.');
  const[nx,ny,nz]=field.size||[];if(![nx,ny,nz].every(n=>Number.isInteger(n)&&n>=1)||!(field.cell>0)||!Array.isArray(field.origin)||field.origin.length!==3||!field.origin.every(Number.isFinite))throw Error('A wind field needs its origin, cell and size.');
  if(!(field.velocity instanceof Float32Array)||field.velocity.length!==nx*ny*nz*3)throw Error('A wind field needs three Float32 velocity components per cell.');
  if(!(field.solid instanceof Uint8Array)||field.solid.length!==nx*ny*nz)throw Error('A wind field needs one solid flag per cell.');
}
// The mean of several baked fields of one wind on one grid, such as bakes of one bearing with
// different gust seeds. Values are summed in double precision in the order given and stored as
// Float32; steps, averaged steps and solver time add up, and `runs` counts the fields. Every
// field must share the grid, the wind and the solid cells.
export function averageWindFields(fields){
  if(!Array.isArray(fields)||!fields.length)throw Error('Average at least one wind field.');
  for(const f of fields)checkField(f);
  const a=fields[0],w=a.wind,n=fields.length,length=a.velocity.length,cells=a.solid.length;
  for(const f of fields){
    if(f.cell!==a.cell||f.size.some((v,i)=>v!==a.size[i])||f.origin.some((v,i)=>v!==a.origin[i]))throw Error('Averaged wind fields must share one grid.');
    const v=f.wind;if(w?v?.speed!==w.speed||v.fromDeg!==w.fromDeg||v.z0!==w.z0||v.referenceHeight!==w.referenceHeight:v)throw Error('Averaged wind fields must share one wind.');
    for(let c=0;c<cells;c++)if(f.solid[c]!==a.solid[c])throw Error('Averaged wind fields must share their solid cells.');
  }
  const sum=new Float64Array(length),velocity=new Float32Array(length),total=key=>fields.reduce((s,f)=>s+(f[key]||0),0);
  for(const f of fields){const v=f.velocity;for(let i=0;i<length;i++)sum[i]+=v[i];}
  for(let i=0;i<length;i++)velocity[i]=sum[i]/n;
  return{kind:WIND_FIELD_KIND,version:WIND_FIELD_VERSION,origin:[...a.origin],cell:a.cell,size:[...a.size],axes:['x','height','z'],units:'m/s',wind:w?{...w}:null,mean:fields.every(f=>f.mean===true),
    averagedSteps:total('averagedSteps'),time:total('time'),steps:total('steps'),runs:n,velocity,solid:Uint8Array.from(a.solid)};
}
// Trilinear between cell centres; positions outside the grid use its nearest edge, and
// solid cells hold zero velocity.
export function sampleWindField(field,x,y,z,out=[0,0,0]){
  const size=field.size,nx=size[0],ny=size[1],nz=size[2],h=field.cell,o=field.origin,vel=field.velocity;
  let fx=(x-o[0])/h-.5,fy=(y-o[1])/h-.5,fz=(z-o[2])/h-.5,i=0,j=0,k=0,tx=0,ty=0,tz=0,sx=0,sy=0,sz=0;
  if(nx>1){if(fx<0)fx=0;else if(fx>nx-1)fx=nx-1;i=fx|0;if(i>nx-2)i=nx-2;tx=fx-i;sx=3;}
  if(ny>1){if(fy<0)fy=0;else if(fy>ny-1)fy=ny-1;j=fy|0;if(j>ny-2)j=ny-2;ty=fy-j;sy=3*nx;}
  if(nz>1){if(fz<0)fz=0;else if(fz>nz-1)fz=nz-1;k=fz|0;if(k>nz-2)k=nz-2;tz=fz-k;sz=3*nx*ny;}
  const c=3*(i+nx*(j+ny*k));
  for(let a=0;a<3;a++){
    const n=c+a,v000=vel[n],v100=vel[n+sx],v010=vel[n+sy],v110=vel[n+sy+sx],v001=vel[n+sz],v101=vel[n+sz+sx],v011=vel[n+sz+sy],v111=vel[n+sz+sy+sx];
    const b00=v000+(v100-v000)*tx,b10=v010+(v110-v010)*tx,b01=v001+(v101-v001)*tx,b11=v011+(v111-v011)*tx,c0=b00+(b10-b00)*ty,c1=b01+(b11-b01)*ty;out[a]=c0+(c1-c0)*tz;
  }
  return out;
}
const ALPHABET='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function toBase64(bytes){
  const parts=[];let line='';
  for(let i=0;i<bytes.length;i+=3){const a=bytes[i],b=i+1<bytes.length?bytes[i+1]:0,c=i+2<bytes.length?bytes[i+2]:0,n=a<<16|b<<8|c;
    line+=ALPHABET[n>>18&63]+ALPHABET[n>>12&63]+(i+1<bytes.length?ALPHABET[n>>6&63]:'=')+(i+2<bytes.length?ALPHABET[n&63]:'=');if(line.length>=8192){parts.push(line);line='';}}
  parts.push(line);return parts.join('');
}
function fromBase64(text){
  if(typeof text!=='string'||text.length%4)throw Error('Invalid base64 payload.');
  const lookup=new Int16Array(128).fill(-1);for(let i=0;i<64;i++)lookup[ALPHABET.charCodeAt(i)]=i;
  const pad=text.endsWith('==')?2:text.endsWith('=')?1:0,bytes=new Uint8Array(text.length/4*3-pad);
  for(let i=0,o=0;i<text.length;i+=4){let n=0;for(let k=0;k<4;k++){const ch=text.charCodeAt(i+k),value=ch===61&&i+k>=text.length-pad?0:lookup[ch]??-1;if(value<0)throw Error('Invalid base64 payload.');n=n<<6|value;}
    bytes[o++]=n>>16&255;if(o<bytes.length)bytes[o++]=n>>8&255;if(o<bytes.length)bytes[o++]=n&255;}
  return bytes;
}
// JSON-safe form: velocities as little-endian Float32 and solid flags as bytes, both base64.
export function encodeWindField(field){
  checkField(field);const bytes=new Uint8Array(field.velocity.length*4),view=new DataView(bytes.buffer);
  for(let n=0;n<field.velocity.length;n++)view.setFloat32(n*4,field.velocity[n],true);
  return{...field,velocity:{encoding:'base64-float32le',data:toBase64(bytes)},solid:{encoding:'base64-uint8',data:toBase64(field.solid)}};
}
export function decodeWindField(json){
  const record=typeof json==='string'?JSON.parse(json):json;
  if(record?.velocity?.encoding!=='base64-float32le'||record?.solid?.encoding!=='base64-uint8')throw Error('Unsupported wind field encoding.');
  const bytes=fromBase64(record.velocity.data);if(bytes.length%4)throw Error('Velocity bytes are not whole Float32 values.');
  const view=new DataView(bytes.buffer),velocity=new Float32Array(bytes.length/4);for(let n=0;n<velocity.length;n++)velocity[n]=view.getFloat32(n*4,true);
  const field={...record,velocity,solid:fromBase64(record.solid.data)};checkField(field);return field;
}
// Moves passive tracers (smoke puffs, say) with midpoint steps through any velocity source
// sample(x, y, z, out). rise is an upward drift in m/s standing in for buoyancy, one number
// or one per tracer; it does not feed back on the air. spread is a random-walk diffusivity in
// m^2/s and needs a host random() in [0, 1). Tracers stay at or above the ground.
export function advectTracers(sample,positions,dt,{count=Math.floor(positions.length/3),rise=0,spread=0,random=null}={}){
  if(typeof sample!=='function')throw Error('advectTracers needs a sample(x, y, z, out) function.');
  if(!(dt>=0&&Number.isFinite(dt)))throw Error('The tracer time step must be finite and non-negative.');
  if(spread>0&&typeof random!=='function')throw Error('A tracer spread needs a host random() so runs stay reproducible.');
  const each=typeof rise!=='number';if(each&&!(rise?.length>=count))throw Error('Per-tracer rise needs one value per tracer.');
  const a=[0,0,0],b=[0,0,0],jitter=spread>0?Math.sqrt(2*spread*dt):0;
  const gauss=()=>{const r=Math.sqrt(-2*Math.log(1-random())),t=2*Math.PI*random();return r*Math.cos(t);};
  for(let n=0;n<count;n++){
    const o=n*3,x=positions[o],y=positions[o+1],z=positions[o+2],up=each?rise[n]:rise;
    sample(x,y,z,a);a[1]+=up;
    sample(x+.5*dt*a[0],y+.5*dt*a[1],z+.5*dt*a[2],b);b[1]+=up;
    let X=x+dt*b[0],Y=y+dt*b[1],Z=z+dt*b[2];
    if(jitter){X+=jitter*gauss();Y+=jitter*gauss();Z+=jitter*gauss();}
    positions[o]=X;positions[o+1]=Y<0?0:Y;positions[o+2]=Z;
  }
  return positions;
}
