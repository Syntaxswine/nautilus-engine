// Authenticate this bounded optional profile before exposing exact bbf4f8a
// preimages to the unchanged historical ledgers. Index actual current bytes.
import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
export const CRAWL_SETUP_BASE='bbf4f8adfebfd80ae7afe3744b5fab52b8a78366';
export const CRAWL_SETUP_REGISTRATION='docs/reviews/foliage-night-ledger/registration.json';
const manifestSHA='5d64ed3b775c6e5df1d900d07375df79cc1950b264df68221186a261c0810de5',root=fileURLToPath(new URL('../',import.meta.url)),sha=b=>createHash('sha256').update(b).digest('hex');
function metadata(read){const raw=read(CRAWL_SETUP_REGISTRATION);assert.equal(sha(raw),manifestSHA,'Crawl setup registration metadata changed.');const m=JSON.parse(raw);assert.equal(m.base,CRAWL_SETUP_BASE);return {raw,m};}
export function checkCrawlSetupRegistration(ports){
  const {read,object,indexed=()=>{},distribution}=ports,{raw,m}=metadata(read),before={},actual={};indexed(CRAWL_SETUP_REGISTRATION,raw);indexed('tools/crawl-setup-registration.mjs',read('tools/crawl-setup-registration.mjs'));
  for(const row of m.files){const bytes=read(row.path),message='Reviewed player bytes changed / Crawl setup source changed / root bytes changed'+(row.path==='apps/test-ground/host.js'?' / Traversal source changed':'')+': '+row.path;assert.equal(bytes.length,row.bytes,message);assert.equal(sha(bytes),row.sha256,message);indexed(row.path,bytes);if(row.beforeSha256){const old=object(CRAWL_SETUP_BASE,row.path);assert.equal(sha(old),row.beforeSha256,'Crawl setup accepted preimage changed: '+row.path);before[row.path]=old;actual[row.path]=bytes;}}
  if(distribution)for(const [profile,expected]of Object.entries(m.profiles)){const d=distribution(profile);assert.equal(d.name,expected.name);assert.deepEqual(d.exports,expected.exports,'Crawl setup profile exports changed: '+profile);assert.deepEqual(d.files,expected.files,'Crawl setup profile files changed: '+profile);}
  return {historicalPorts:{...ports,read:f=>before[f]||read(f),indexed(f,b){if(before[f]){assert.ok(b.equals(before[f]),'Crawl setup historical assertion requires exact accepted source: '+f);indexed(f,actual[f]);}else indexed(f,b);}},report:{status:'authenticated-optional-crawl-setup',base:CRAWL_SETUP_BASE,files:m.files.length,actualBytesPassedToIndexedPort:true,requiredGitCommits:[CRAWL_SETUP_BASE]}};
}
export function historicalCrawlSetupBytes(object,file,current){const {m}=metadata(f=>fs.readFileSync(path.join(root,f))),row=m.files.find(r=>r.path===file);if(!row?.beforeSha256||sha(current)!==row.sha256)return current;const before=object(CRAWL_SETUP_BASE,file);assert.equal(sha(before),row.beforeSha256);return before;}
