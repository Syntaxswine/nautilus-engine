import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)),sha=b=>createHash('sha256').update(b).digest('hex');
export function checkSharedStealthSource({tracked=false}={}){
  const manifest='docs/reviews/shared-stealth/sources.json',m=JSON.parse(fs.readFileSync(path.join(root,manifest))),files=new Set([manifest,'tools/check-shared-stealth.mjs','tools/shared-stealth-registration.mjs','docs/reviews/shared-stealth/registration.json']);let originals=0;
  if(m.kind!=='nautilus-shared-stealth-sources'||m.version!==1||m.base!=='7e9052dcf6a2aa00c6d38130f5f2345b86ceb593')throw Error('Shared stealth source identity changed.');
  for(const source of m.sources){if(!/^[a-f0-9]{40}$/.test(source.commit))throw Error('Complete shared stealth source pin required.');for(const r of source.files){if(!r.original.startsWith('vendor/')||r.original.includes('..'))throw Error('Invalid original path.');const bytes=fs.readFileSync(path.join(root,r.original));if(bytes.length!==r.bytes||sha(bytes)!==r.sha256)throw Error('Shared stealth original changed: '+r.original);files.add(r.original);originals++;}}
  const registration=JSON.parse(fs.readFileSync(path.join(root,'docs/reviews/shared-stealth/registration.json')));registration.files.forEach(r=>files.add(r.path));
  if(tracked){const indexed=new Set(execFileSync('git',['ls-files','-z'],{cwd:root,encoding:'utf8',windowsHide:true}).split('\0'));for(const file of files)if(!indexed.has(file))throw Error('Shared stealth source is not tracked: '+file);}
  return {sources:m.sources.length,originals,tracked};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(checkSharedStealthSource({tracked:process.argv.includes('--tracked')})));
