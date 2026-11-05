// Mutation sweep for tests/wind-smoke.test.mjs: one fault at a time in the bearing blend and the
// smoke component, in a private temporary copy; the source tree is never written. Exits non-zero
// when an expected kill survives, an anchor is missing, or the neutral control fails.
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const box=fs.mkdtempSync(path.join(os.tmpdir(),'nautilus-smoke-mutants-'));
// [id, expected, file, find, replace]. 'equivalent' marks mutants no current test can see.
const MUTANTS=[
  ['B01 bracket misses a bake bearing it sits on','killed','bearings.js','for(let k=0;k<n&&bearings[k]<=theta;k++)i=k;','for(let k=0;k<n&&bearings[k]<theta;k++)i=k;'],
  ['B02 slerp weights swapped','killed','bearings.js','wa=Math.sin((1-t)*d)/Math.sin(d);wb=Math.sin(t*d)/Math.sin(d);','wa=Math.sin(t*d)/Math.sin(d);wb=Math.sin((1-t)*d)/Math.sin(d);'],
  ['B03 linear weights swapped','killed','bearings.js','let wa=1-t,wb=t,limit=1;','let wa=t,wb=1-t,limit=1;'],
  ['B04 keep-speed without its cap','killed','bearings.js','if(g>limit)g=limit;',''],
  ['B05 blend ignores the speed','killed','bearings.js',',s=speed/a.wind.speed;',',s=1;'],
  ['B06 solids from the first neighbour only','killed','bearings.js','if(ua&&sa[c]||ub&&sb[c])','if(ua&&sa[c])'],
  ['B07 solids from a neighbour of weight 0','killed','bearings.js','if(ua&&sa[c]||ub&&sb[c])','if(sa[c]||sb[c])'],
  ['B08 bake skips its warm-up','killed','bearings.js','for(let n=steps(warmup);n>0;n--)','for(let n=0;n>0;n--)'],
  ['B09 bake never averages','killed','bearings.js','solver.startAveraging();for(let n=Math.max(1,steps(average))','for(let n=Math.max(1,steps(average))'],
  ['B10 every bearing baked at the first','killed','bearings.js','wind:{...wind,fromDeg}','wind:{...wind,fromDeg:list[0]}'],
  ['B11 averaging steps not counted when unconverged','killed','bearings.js','for(let n=Math.max(1,steps(average));n>0;n--)if(!solver.step().converged)missed++;','for(let n=Math.max(1,steps(average));n>0;n--)solver.step();'],
  ['B12 flow-through measured on the height','killed','bearings.js','Math.max(grid?.size?.[0],grid?.size?.[2])*grid?.cell','grid?.size?.[1]*grid?.cell'],
  ['B13 set check ignores the grid origin','killed','bearings.js','||f.origin.some((v,i)=>v!==a.origin[i])',''],
  ['B14 set check ignores each field\'s bearing','killed','bearings.js','w.fromDeg!==b||',''],
  ['B15 sampler cache ignores the speed','killed','bearings.js',"const next=bearing+' '+u;",'const next=String(bearing);'],
  ['B16 decode skips the set check','killed','bearings.js','return checkBearings({...record,fields:record.fields.map(decodeWindField)});','return{...record,fields:record.fields.map(decodeWindField)};'],
  ['B17 bracket starts at the first bearing','killed','bearings.js','let i=n-1;for(let k=0;','let i=0;for(let k=0;'],
  ['B18 the sampler defaults to slerp','killed','bearings.js',"export function createWindBearingSampler(set,{fromDeg,speed,blend='linear'}={}){","export function createWindBearingSampler(set,{fromDeg,speed,blend='slerp'}={}){"],
  ['B19 every seed bakes the turbulence\'s own seed','killed','bearings.js','turbulence:seed===null||!gusts?turbulence:{...turbulence,seed}','turbulence'],
  ['B20 a count of seeds starts at 1','killed','bearings.js','const first=turbulence?.seed??1,','const first=1,'],
  ['B21 repeated seeds accepted','killed','bearings.js','||new Set(list).size!==list.length)throw',')throw'],
  ['B22 seeds accepted without gusts','killed','bearings.js','if(list.length>1&&!(turbulence&&turbulence.gain!==0))throw','if(false)throw'],
  ['B23 unconverged steps of the last seed only','killed','bearings.js','for(const seed of seedList??[null]){','for(const seed of seedList??[null]){missed=0;'],
  ['B24 a lone given seed not recorded on its field','killed','bearings.js','if(seedList)field.seeds=[...seedList];','if(seedList&&runs.length>1)field.seeds=[...seedList];'],
  ['B25 a bake without seeds records them as null','killed','bearings.js','...seedList?{seeds:[...seedList]}:{},','seeds:seedList,'],
  ['F01 the seed mean is their sum','killed','field.js','velocity[i]=sum[i]/n;','velocity[i]=sum[i];'],
  ['F02 the mean keeps the first field\'s averaged steps','killed','field.js','averagedSteps:total(\'averagedSteps\')','averagedSteps:a.averagedSteps'],
  ['F03 the mean ignores the solid cells','killed','field.js','for(let c=0;c<cells;c++)if(f.solid[c]!==a.solid[c])throw','for(let c=0;c<0;c++)if(f.solid[c]!==a.solid[c])throw'],
  ['F04 the mean ignores the terrain','killed','field.js','||v.z0!==w.z0',''],
  ['F05 the mean shares the first field\'s solid array','killed','field.js','solid:Uint8Array.from(a.solid)}','solid:a.solid}'],
  ['F06 the mean of instantaneous fields called a mean','killed','field.js','mean:fields.every(f=>f.mean===true)','mean:true'],
  ['S01 rise taken at the step start','killed','smoke.js','Math.exp(-(ages[n]+.5*dt)/cooling[n])','Math.exp(-ages[n]/cooling[n])'],
  ['S02 rise never cools','killed','smoke.js','up[n]=warmth[n]*Math.exp(-(ages[n]+.5*dt)/cooling[n]);','up[n]=warmth[n];'],
  ['S03 no solid test','killed','smoke.js','if(before)for(let n=0,o=0;n<count;n++,o+=3)if(!blocked(','if(false)for(let n=0,o=0;n<count;n++,o+=3)if(!blocked('],
  ['S04 puffs inside a solid are held too','killed','smoke.js','if(!blocked(before[o],before[o+1],before[o+2])&&crosses(','if(crosses('],
  ['S05 no bounds','killed','smoke.js','const outside=(x,y,z)=>bounds!==null&&(','const outside=(x,y,z)=>false&&('],
  ['S06 no lifetime','killed','smoke.js','if(ages[n]>lifetime||outside(','if(outside('],
  ['S07 emission remainder dropped','killed','smoke.js','e.debt+=e.rate*dt;','e.debt=e.rate*dt;'],
  ['S08 removal forgets the warmth','killed','smoke.js','ages[n]=ages[last];warmth[n]=warmth[last];cooling[n]=cooling[last];','ages[n]=ages[last];'],
  ['S09 walk never reaches the tracers','killed','smoke.js','{count,rise:up,spread,random:spread>0?random:null}','{count,rise:up}'],
  ['S10 no jitter','killed','smoke.js','let x=e.x+jitter*(2*random()-1),z=e.z+jitter*(2*random()-1);','let x=e.x,z=e.z;'],
  ['S11 reset keeps the random stream','killed','smoke.js','api.clear();random=seededRandom(seed);','api.clear();'],
  ['S12 field solids read k-major','killed','smoke.js','solid[i+nx*(j+ny*k)]!==0','solid[k+nz*(j+ny*i)]!==0'],
  ['S14 the segment test is ignored','killed','smoke.js',"const segment=typeof blocked?.segment==='function'?blocked.segment:null;",'const segment=null;'],
  ['S15 sweep is ignored','killed','smoke.js','if(sweep>0)for(let s=1,','if(false)for(let s=1,'],
  ['S16 jitter may cross a wall','killed','smoke.js','if(blocked&&!blocked(e.x,e.y,e.z)&&crosses(e.x,e.y,e.z,x,e.y,z)){x=e.x;z=e.z;}',''],
  ['S17 the walk ignores the end cell','killed','smoke.js','if(at(i,j,k))return true;if(i===ie&&j===je&&k===ke)return false;','if(i===ie&&j===je&&k===ke)return false;if(at(i,j,k))return true;'],
  ['S18 the walk misplaces its first x boundary','killed','smoke.js','let nexti=dx>0?(i+1-X)*ti:','let nexti=dx>0?(i+2-X)*ti:'],
  // A tie means the move runs through a cell edge, touching all four cells there at one point;
  // either order reports a touched cell, so no test can prefer one.
  ['S19 the walk breaks ties toward y','equivalent','smoke.js','if(nexti<=nextj&&nexti<=nextk)','if(nexti<nextj&&nexti<=nextk)'],
  ['S13 neutral control (comment only)','survives','smoke.js','// The box a wind field covers, as smoke bounds.','// The box a wind field covers, as smoke bounds (neutral).'],
];
let failures=0;const results=[];
try{
  for(const rel of['tests/wind-smoke.test.mjs',...fs.readdirSync(path.join(root,'packages/wind-core')).map(f=>'packages/wind-core/'+f)]){
    fs.mkdirSync(path.dirname(path.join(box,rel)),{recursive:true});fs.copyFileSync(path.join(root,rel),path.join(box,rel));}
  fs.writeFileSync(path.join(box,'package.json'),'{"type":"module"}');
  for(const[id,expected,file,find,replace]of MUTANTS){
    const target=path.join(box,'packages/wind-core',file),original=fs.readFileSync(target,'utf8'),count=original.split(find).length-1;
    if(count!==1){results.push({id,expected,verdict:'ANCHOR '+count});failures++;console.log(id.padEnd(50),'ANCHOR',count);continue;}
    fs.writeFileSync(target,original.replace(find,replace));let verdict,failed=[];const started=Date.now();
    try{execFileSync(process.execPath,['--test','tests/wind-smoke.test.mjs'],{cwd:box,stdio:'pipe',timeout:300000,maxBuffer:64*1024*1024});verdict='survived';}
    catch(error){verdict=error.signal?'timeout':error.status===1?'killed':'error '+error.status;failed=[...String(error.stdout||'').matchAll(/^✖ (.+?) \(\d/gm)].map(m=>m[1]).filter((v,i,a)=>a.indexOf(v)===i);}
    finally{fs.writeFileSync(target,original);}
    const ok=expected==='equivalent'?true:expected==='survives'?verdict==='survived':verdict==='killed';if(!ok)failures++;
    results.push({id,expected,verdict,seconds:Math.round((Date.now()-started)/1000),failed});console.log(id.padEnd(50),verdict.padEnd(9),ok?'':'UNEXPECTED',failed.slice(0,2).join(' | '));
  }
}finally{fs.rmSync(box,{recursive:true,force:true});}
const killed=results.filter(r=>r.verdict==='killed').length,real=MUTANTS.filter(m=>m[1]!=='survives').length;
console.log(JSON.stringify({killed,real,equivalentSurvivors:results.filter(r=>r.expected==='equivalent'&&r.verdict==='survived').map(r=>r.id.slice(0,3)),unexpected:failures}));
if(failures)process.exit(1);
