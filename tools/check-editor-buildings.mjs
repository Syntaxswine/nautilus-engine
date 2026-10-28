import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {DESIGNS} from '../packages/building-catalog/index.js';
import {openDocument} from '../packages/map-core/index.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),out=path.join(root,'assets/buildings/editor'),index=JSON.parse(fs.readFileSync(path.join(out,'index.json')));
const tracked=process.argv.includes('--tracked')?new Set(execFileSync('git',['-c','safe.directory='+root.replaceAll('\\','/'),'-C',root,'ls-files','-z'],{encoding:'utf8'}).split('\0')):null;
if(index.buildings.length!==DESIGNS.length||new Set(index.buildings.map(b=>b.id)).size!==DESIGNS.length)throw Error('Native building catalogue identity mismatch.');
for(const input of index.inputs){const bytes=fs.readFileSync(path.join(root,input.file));if(createHash('sha256').update(bytes).digest('hex')!==input.sha256)throw Error('Stale editable building exports: '+input.file);if(tracked&&!tracked.has(input.file))throw Error('Untracked native building source: '+input.file);}
if(tracked&&!tracked.has('assets/buildings/editor/index.json'))throw Error('Untracked editable building index.');
for(const entry of index.buildings){
 for(const f of entry.files){const relative='assets/buildings/editor/'+f.file,data=fs.readFileSync(path.join(out,f.file));if(data.length!==f.bytes||createHash('sha256').update(data).digest('hex')!==f.sha256)throw Error('Changed editor export: '+f.file);if(tracked&&!tracked.has(relative))throw Error('Untracked native map dependency: '+relative);}
 const map=JSON.parse(fs.readFileSync(path.join(out,entry.id+'.map.json'))),doc=openDocument(map);if(doc.validate().length)throw Error('Invalid native editor map: '+entry.id);
 if(entry.blockAvailable){const block=openDocument(JSON.parse(fs.readFileSync(path.join(out,entry.id+'.block.json'))));if(!block.block||block.validate().length)throw Error('Invalid reusable native block.');}
}
console.log('Verified '+index.buildings.length+' editable native maps, '+index.buildings.filter(b=>b.blockAvailable).length+' reusable blocks, native JSON validation and all export hashes.');
