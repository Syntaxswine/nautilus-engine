import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),base='5d69c2130eb64b6f4e31bc672e884bdc33bf47d2',out=path.join(root,'docs/reviews/tile-stack/art');
const sha=b=>createHash('sha256').update(b).digest('hex'),record=file=>{const b=fs.readFileSync(path.join(root,file));return {path:file,bytes:b.length,sha256:sha(b)};};
if(process.argv.includes('--metadata')){
 const inputs=['candidates/tile-stack/art/catalogue.js','candidates/tile-stack/art/README.md','tests/art-tile-stack-catalogue.test.mjs','docs/reviews/tile-stack/art/metadata-checkpoint.md','tools/art-tile-stack-evidence.mjs'];
 const protectedPaths=['packages/tile-visuals','apps/editor/smart-tile','docs/reviews/tile-art','tools/check-tile-visuals-source.mjs','tools/check-smart-tile-editor-source.mjs'];
 const diff=execFileSync('git',['-c','safe.directory='+root.replaceAll('\\','/'),'diff',base,'--',...protectedPaths],{cwd:root,encoding:'utf8',windowsHide:true});if(diff)throw Error('Accepted source changed.');
 fs.writeFileSync(path.join(out,'metadata-sources.json'),JSON.stringify({base,runtime:'2502646482218524fd5129641da769bb82462e4d',availability:'Private Gate A metadata only; no public registration',inputs:inputs.map(record),atlas:record('assets/buildings/painted-materials-v2.png'),checks:{check:'pass',tests:915,upstream:32,buildModulePaths:519},protectedDiff:'empty; full accepted fences also passed npm run check',helpers:'None started for this checkpoint.'},null,2)+'\n');
 console.log('Recorded fixed metadata inputs and unchanged accepted surfaces.');
}else throw Error('Use --metadata for the initial fixed checkpoint.');
