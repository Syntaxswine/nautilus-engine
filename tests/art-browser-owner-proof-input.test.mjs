import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {verifyProofInputs} from '../candidates/tile-authoring/browser-art/owner-v1/proof-input-audit.mjs';
const root=new URL('../',import.meta.url),decoderInputPath='candidates/tile-authoring/art/c2-decoder-proof/inputs.json',input=JSON.parse(fs.readFileSync(new URL('candidates/tile-authoring/browser-art/owner-v1/inputs.json',root))),source=fs.readFileSync(new URL('candidates/tile-authoring/browser-art/owner-v1/tests/browser.mjs',root),'utf8'),decoderInputs=JSON.parse(fs.readFileSync(new URL(decoderInputPath,root)));
const run=dependencies=>verifyProofInputs({source,dependencies,decoderInputs,decoderInputPath});
test('declared proof closure includes exact decoder descriptor and all indirect original images',()=>{const r=run(input.dependencies);assert(r.literalInputs.includes(decoderInputPath));assert.equal(r.indirectOriginalInputs.length,decoderInputs.art.length);assert(Object.isFrozen(r.allInputs));});
test('preserved original inventory omission fails before claiming exact-snapshot proof',()=>assert.throws(()=>run(input.dependencies.filter(r=>r.path!==decoderInputPath)),/Undeclared browser proof input/));
test('an undeclared indirect original image is refused too',()=>assert.throws(()=>run(input.dependencies.filter(r=>r.path!==decoderInputs.art[0].path)),/Undeclared browser proof input/));
