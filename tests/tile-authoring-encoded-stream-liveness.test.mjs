import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {serve,road} from './fixtures/tile-authoring/encoded-stream.mjs';

function recorded(stats,code){
 assert.equal(stats.providerFailure.code,code);
 const receipt=JSON.parse(fs.readFileSync(new URL('../artifacts/encoded-stream/http-'+stats.port+'-closed.json',import.meta.url)));
 assert.equal(receipt.providerFailure.code,code);assert.equal(receipt.closed,true);assert.equal(receipt.remainingSockets,0);
}

test('encoded HTTP provider expiry rejects waiting work and preserves the first cause',{timeout:120000},async()=>{
 let stats;
 await assert.rejects(serve(road,async host=>{stats=host.stats;await host.firstWrite;},{lifetimeMs:50}),{code:'HTTP_PROVIDER_EXPIRED'});
 recorded(stats,'HTTP_PROVIDER_EXPIRED');
});

test('encoded HTTP provider wrong route rejects waiting work and records closed sockets',{timeout:120000},async()=>{
 let stats;
 await assert.rejects(serve(road,async host=>{
  stats=host.stats;const response=fetch(host.origin+'/absent').catch(cause=>({cause}));
  await host.firstWrite;await response;
 },{lifetimeMs:20000}),{code:'HTTP_PROVIDER_ROUTE'});
 recorded(stats,'HTTP_PROVIDER_ROUTE');
});

test('encoded HTTP provider early close rejects waiting work without losing its cause',{timeout:120000},async()=>{
 let stats;
 await assert.rejects(serve(road,async host=>{
  stats=host.stats;const response=fetch(host.origin+host.resource).catch(cause=>({cause}));
  await host.firstWrite;await response;
 },{mode:'reject',lifetimeMs:20000}),{code:'HTTP_PROVIDER_CLOSED_BEFORE_WRITE'});
 recorded(stats,'HTTP_PROVIDER_CLOSED_BEFORE_WRITE');
});
