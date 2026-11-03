import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {moduleReferencesBatch} from '../tools/module-references.mjs';
import {distribution} from '../tools/distribution.mjs';
import {tileStackReviewHostFiles,tileStackInstalledHostPlan} from '../tools/verify-tile-stack-editor-review.mjs';
import {tileAuthoringReviewHostFiles,tileAuthoringInstalledHostPlan,TILE_AUTHORING_REVIEW_BINDINGS,TILE_AUTHORING_INTERNAL_BINDINGS} from '../tools/tile-authoring-editor-review-inputs.mjs';

test('installed custom-tile review resolves every real host import inside its declared delivery',()=>{
 const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
 const hostFiles=tileAuthoringReviewHostFiles(tileStackReviewHostFiles(root));
 const plan=tileAuthoringInstalledHostPlan({files:new Map(hostFiles.map(file=>[file,fs.readFileSync(path.join(root,file))]))});
 const delivered=new Set(hostFiles);
 for(const profile of ['core','renderer'])for(const file of distribution(profile).files)delivered.add('node_modules/@nautilus-engine/'+profile+'/'+file);
 const bindings=new Map(TILE_AUTHORING_REVIEW_BINDINGS.map(b=>[b.specifier,'node_modules/@nautilus-engine/'+b.profile+'/'+b.file]));
 const references=moduleReferencesBatch([...plan.files].filter(([file])=>/\.(?:m?js)$/.test(file)).map(([filename,bytes])=>({filename,source:bytes.toString()})));
 for(const row of references)for(const specifier of row.specifiers){
  const target=specifier.startsWith('.')?path.posix.normalize(path.posix.join(path.posix.dirname(row.filename),specifier)):bindings.get(specifier);
  assert.ok(target&&delivered.has(target),'Undelivered installed host import: '+row.filename+' -> '+specifier);
 }
 for(const binding of TILE_AUTHORING_INTERNAL_BINDINGS)assert.ok(delivered.has('node_modules/@nautilus-engine/'+binding.profile+'/'+binding.file));
});

test('installed stacked-tile review resolves its shared observation helper inside Core',()=>{
 const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),plan=tileStackInstalledHostPlan(root);
 const file='apps/editor/smart-tile/checkpoint.js',changes=plan.adaptations.filter(row=>row.file===file);let text=fs.readFileSync(path.join(root,file),'utf8');
 for(const change of changes){assert.equal(text.split(change.from).length,2);text=text.replace(change.from,change.to);}
 const delivered=new Set(distribution('core').files.map(file=>'node_modules/@nautilus-engine/core/'+file));
 for(const row of moduleReferencesBatch([{filename:file,source:text}]))for(const specifier of row.specifiers)if(specifier.includes('authoring-runtime/observation.js'))assert.ok(delivered.has(path.posix.normalize(path.posix.join(path.posix.dirname(file),specifier))),'Stack host must use its actual installed observation helper');
 assert.ok(changes.some(row=>row.from.includes('authoring-runtime/observation.js')));
});
