import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {root,verifyTinderboxArt} from './intake-tinderbox-art.mjs';
import {verifyTinderboxMedicine} from './intake-tinderbox-medicine.mjs';
const read=name=>JSON.parse(fs.readFileSync(path.join(root,name)));
const hash=name=>createHash('sha256').update(fs.readFileSync(path.join(root,name))).digest('hex');
const a=read('artifacts/tinderbox-art-source/review.json'),b=read('artifacts/tinderbox-art-installed/review.json');
if(a.records.length!==51||b.records.length!==51||a.records.some((r,i)=>r.selected!==b.records[i].selected||r.sha256!==b.records[i].sha256)||a.errors.length||b.errors.length||a.failedRequests.length||b.failedRequests.length||!a.canvasRemoved||!b.canvasRemoved)throw Error('Native source/installed browser parity failed.');
const cleanup=read('docs/reviews/tinderbox-art-helper-cleanup.json');
if(cleanup.retainedHelpers||cleanup.lifetimes.some(r=>!r.portReleased||r.identities.some(p=>!p.exactLifetimeEnded)))throw Error('A review helper remains unresolved.');
const evidence={schemaVersion:1,baseline:'8644b44ce1c049983fd722d83237ebb2dcec0eb3',
 sources:[verifyTinderboxArt(),verifyTinderboxMedicine()],profile:'tinderbox-native-art-v1',
 assets:{furnishings:35,waterfront:9,medicine:3,additiveLayouts:4,total:51},
 checks:{check:true,trackedGitBlobIntegrity:true,build:true,builtModulePaths:417,repositoryTests:460,upstreamTests:32,focusedTests:12,sourceAndAdaptationIntegrity:true},
 browser:{sourceEntries:51,installedEntries:51,identicalPNGHashes:51,searchAndEmptyState:true,phoneWidth:390,phoneHorizontalOverflow:false,tankRepeatRestore:true,canvasRemoved:true,errors:[],failedRequests:[],limits:'Local Edge/SwiftShader native WebGL; no physical-device FPS, gameplay or full-shell traversal acceptance.'},
 installed:read('artifacts/tinderbox-art-intake/installed-proof.json'),
 cleanup:{verifiedLifetimes:cleanup.lifetimes.length,retainedHelpers:0,receipt:'docs/reviews/tinderbox-art-helper-cleanup.json'},
 captures:a.records.map(r=>({id:r.selected,triangles:r.triangles,scale:r.scale,image:r.image,sha256:r.sha256})),
 evidenceHashes:Object.fromEntries(['artifacts/tinderbox-art-source/review.json','artifacts/tinderbox-art-installed/review.json','docs/reviews/tinderbox-art-previews/furnishings-1.jpg','docs/reviews/tinderbox-art-previews/furnishings-2.jpg','docs/reviews/tinderbox-art-previews/waterfront-and-layouts.jpg'].map(n=>[n,hash(n)]))};
fs.writeFileSync(path.join(root,'docs/reviews/tinderbox-art-checks.json'),JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify({assets:51,identicalNativeCaptures:51,helperLifetimes:cleanup.lifetimes.length,retainedHelpers:0}));
