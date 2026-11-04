// Mutation sweep for tests/wind-core.test.mjs. Each mutant breaks one physical or plumbing
// rule in a private temporary copy; the source tree is never written. Exits non-zero when an
// expected kill survives, an anchor is missing, or the neutral control fails.
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),three='vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor';
const box=fs.mkdtempSync(path.join(os.tmpdir(),'nautilus-wind-mutants-'));
// [id, expected, file, find, replace]. 'equivalent' marks mutants no current test can see.
const MUTANTS=[
  ['M01 pressure update sign on u faces','killed','solver.js','u[f]-=(i<nx?p[c]:0)-(i>0?p[c-1]:0);','u[f]+=(i<nx?p[c]:0)-(i>0?p[c-1]:0);'],
  ['M02 no MacCormack correction','killed','solver.js','un[f]=c<MN[f]||c>MX[f]?F[f]:c;}','un[f]=F[f];}'],
  ['M03 no limiter revert','equivalent','solver.js','vn[f]=c<MN[f]||c>MX[f]?F[f]:c;}','vn[f]=c;}'],
  ['M04 outside samples ignore inflow and walls','killed','solver.js',"if(!hit||hit.type==='slip'||hit.type==='outflow')return NaN;",'return NaN;'],
  ['M05 wall ghost becomes slip in diffusion','killed','solver.js',"return b.type==='wall'?2*b.velocity[comp]-value:","return b.type==='wall'?value:"],
  ['M06 inflow faces get no turbulence','killed','solver.js','function updateInflow(t){\n    if(!gust)return;','function updateInflow(t){\n    return;'],
  ['M07 cut-off air left as air','killed','solver.js','cutOff=0;for(let c=0;c<cells;c++)if(!solid[c]&&!seen[c]){solid[c]=3;cutOff++;}','cutOff=0;'],
  ['M08 running mean off by one','killed','solver.js','averaged++;const f=1/averaged;','averaged++;const f=1/(averaged+1);'],
  ['M09 MIC tau dropped (plain IC)','killed','solver.js','const tau=.97,sigma=.25;','const tau=0,sigma=.25;'],
  ['M10 voxelizer skips the plane test','killed','voxels.js','if(Math.abs(nx*v0x+ny*v0y+nz*v0z)>hs*(Math.abs(nx)+Math.abs(ny)+Math.abs(nz)))return false;',''],
  ['M11 voxelizer skips the edge axes','killed','voxels.js','return!(separated(','return true||!(separated('],
  ['M12 flood fill not seeded from the top','killed','voxels.js','for(let k=0;k<nz;k++)for(let i=0;i<nx;i++)push(i+nx*(ny-1+ny*k));',''],
  ['M13 bearing convention mirrored','killed','profile.js','return[snap(-Math.sin(a)),snap(Math.cos(a))];','return[snap(Math.sin(a)),snap(Math.cos(a))];'],
  ['M14 von Karman 0.40','killed','profile.js','export const VON_KARMAN=0.41;','export const VON_KARMAN=0.40;'],
  ['M15 surface-layer sigmas 2.0','killed','turbulence.js','SURFACE_LAYER_SIGMA=Object.freeze([2.5,1.9,1.25]);','SURFACE_LAYER_SIGMA=Object.freeze([2.0,1.9,1.25]);'],
  ['M16 turbulence not convected','killed','turbulence.js','const X=x-convection*direction[0]*t,Z=z-convection*direction[1]*t;','const X=x,Z=z;'],
  ['M17 tracers single Euler step','killed','field.js','sample(x+.5*dt*a[0],y+.5*dt*a[1],z+.5*dt*a[2],b);b[1]+=up;','b[0]=a[0];b[1]=a[1];b[2]=a[2];'],
  ['M18 field sample off by half a cell','killed','field.js','let fx=(x-o[0])/h-.5,','let fx=(x-o[0])/h,'],
  ['M19 world matrix ignored in objectTriangles','killed','meshes.js','out[n++]=e[0]*x+e[4]*y+e[8]*z+e[12];','out[n++]=x;'],
  ['M20 base64 drops the last byte','killed','field.js','bytes[o++]=n>>16&255;if(o<bytes.length)bytes[o++]=n>>8&255;if(o<bytes.length)bytes[o++]=n&255;','bytes[o++]=n>>16&255;if(o<bytes.length)bytes[o++]=n>>8&255;if(o<bytes.length-1)bytes[o++]=n&255;'],
  ['M21 neutral control (comment only)','survives','solver.js','export const WIND_SOLVER_VERSION=1;','export const WIND_SOLVER_VERSION=1;// neutral'],
];
let failures=0;const results=[];
try{
  for(const rel of['tests/wind-core.test.mjs','packages/render-effects/three.js',three+'/three.module.js',three+'/three.core.js',...['wind-core','building-catalog'].flatMap(p=>fs.readdirSync(path.join(root,'packages',p)).map(f=>'packages/'+p+'/'+f))]){
    fs.mkdirSync(path.dirname(path.join(box,rel)),{recursive:true});fs.copyFileSync(path.join(root,rel),path.join(box,rel));}
  fs.writeFileSync(path.join(box,'package.json'),'{"type":"module"}');
  for(const[id,expected,file,find,replace]of MUTANTS){
    const target=path.join(box,'packages/wind-core',file),original=fs.readFileSync(target,'utf8'),count=original.split(find).length-1;
    if(count!==1){results.push({id,expected,verdict:'ANCHOR '+count});failures++;console.log(id.padEnd(46),'ANCHOR',count);continue;}
    fs.writeFileSync(target,original.replace(find,replace));let verdict,failed=[];const started=Date.now();
    try{execFileSync(process.execPath,['--test','tests/wind-core.test.mjs'],{cwd:box,stdio:'pipe',timeout:300000});verdict='survived';}
    catch(error){verdict=error.signal?'timeout':'killed';failed=[...String(error.stdout||'').matchAll(/^✖ (.+?) \(\d/gm)].map(m=>m[1]).filter((v,i,a)=>a.indexOf(v)===i);}
    finally{fs.writeFileSync(target,original);}
    const ok=expected==='equivalent'?true:expected==='survives'?verdict==='survived':verdict==='killed';if(!ok)failures++;
    results.push({id,expected,verdict,seconds:Math.round((Date.now()-started)/1000),failed});console.log(id.padEnd(46),verdict.padEnd(9),ok?'':'UNEXPECTED',failed.slice(0,2).join(' | '));
  }
}finally{fs.rmSync(box,{recursive:true,force:true});}
const killed=results.filter(r=>r.verdict==='killed').length,real=MUTANTS.filter(m=>m[1]!=='survives').length;
console.log(JSON.stringify({killed,real,equivalentSurvivors:results.filter(r=>r.expected==='equivalent'&&r.verdict==='survived').map(r=>r.id.slice(0,3)),unexpected:failures}));
if(failures)process.exit(1);
