import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as T from '../packages/render-effects/three.js';
import {geometryState} from '../candidates/tile-authoring/art/c2-runtime/geometry-state.mjs';
import {digest} from '../candidates/tile-authoring/art/c2-runtime/common.mjs';
function fixture(){const ids=new WeakMap();let serial=0;const ports={id:(o,k)=>{if(!ids.has(o))ids.set(o,k+'.'+(++serial));return ids.get(o);},hashBytes:a=>createHash('sha256').update(new Uint8Array(a.buffer,a.byteOffset,a.byteLength)).digest('hex')},g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([0,0,0,1,0,0,0,1,0],3));g.setIndex(new T.Uint16BufferAttribute([0,1,2],1));g.computeBoundingSphere();return {g,state:()=>geometryState(T,g,ports),fingerprint:()=>digest(geometryState(T,g,ports))};}
test('ordinary indexed static Three geometry has stable index layout and unbounded draw sentinel',()=>{const x=fixture(),s=x.state(),f=x.fingerprint();assert.equal(s.index.arrayType,'Uint16Array');assert.equal(s.index.itemSize,1);assert.equal(s.index.count,3);assert.equal(s.drawRange.count,'unbounded');assert.deepEqual(x.state(),s);assert.equal(x.fingerprint(),f);});
for(const[label,change]of[
 ['index identity',g=>g.setIndex(g.index.clone())],
 ['index raw data',g=>{g.index.array[1]=0;}],
 ['index typed layout',g=>g.setIndex(new T.Uint32BufferAttribute([0,1,2],1))],
 ['index array view identity',g=>{g.index.array=new Uint16Array(g.index.array.buffer);} ],
 ['index count',g=>{g.index.array=new Uint16Array([0,1,2,0,2,1]);g.index.count=6;}],
 ['index removal',g=>g.setIndex(null)],
 ['finite draw range',g=>g.setDrawRange(0,0)],
 ['draw start',g=>g.setDrawRange(1,2)],
 ['group insertion',g=>g.addGroup(0,3,0)],
 ['attribute identity',g=>g.setAttribute('position',g.attributes.position.clone())],
 ['attribute usage',g=>g.attributes.position.setUsage(T.DynamicDrawUsage)],
 ['attribute GPU type',g=>{g.attributes.position.gpuType=T.IntType;}],
 ['attribute normalized',g=>{g.attributes.position.normalized=true;}],
 ['attribute pending range',g=>g.attributes.position.addUpdateRange(0,3)],
 ['attribute upload callback',g=>g.attributes.position.onUpload(()=>{})],
 ['sphere center',g=>{g.boundingSphere.center.x+=.25;}],
 ['bounding box',g=>g.computeBoundingBox()],
 ['morph relative flag',g=>{g.morphTargetsRelative=true;}]
])test('geometry fingerprint detects '+label,()=>{const x=fixture(),before=x.fingerprint();change(x.g);assert.notEqual(x.fingerprint(),before);});
test('ordered group start/count/material layout is captured',()=>{const x=fixture();x.g.addGroup(0,3,0);const before=x.fingerprint();x.g.groups[0].materialIndex=1;assert.notEqual(x.fingerprint(),before);});
test('same-buffer same-pixel attribute window changes are detected',()=>{const x=fixture(),a=x.g.attributes.position,data=new Float32Array(18);data.set(a.array);data.set(a.array,9);a.array=new Float32Array(data.buffer,0,9);const before=x.fingerprint();a.array=new Float32Array(data.buffer,36,9);assert.notEqual(x.fingerprint(),before);});
for(const[label,change]of[
 ['interleaved',g=>g.setAttribute('position',new T.InterleavedBufferAttribute(new T.InterleavedBuffer(new Float32Array(9),3),3,0))],
 ['instanced attribute',g=>g.setAttribute('position',new T.InstancedBufferAttribute(new Float32Array(9),3))],
 ['morph attribute',g=>{g.morphAttributes.position=[g.attributes.position.clone()];}],
 ['invalid index layout',g=>{g.index.itemSize=3;}],
 ['nonfinite bounds',g=>{g.boundingSphere.radius=NaN;}]
])test('unsupported '+label+' state refuses instead of disappearing from the snapshot',()=>{const x=fixture();change(x.g);assert.throws(x.state,e=>e.code==='GEOMETRY_STATE_PROFILE'||e.code==='GEOMETRY_ATTRIBUTE_PROFILE');});

test('attribute and index metadata use actual slots without invoking hostile getters',()=>{const x=fixture(),before=x.fingerprint();let reads=0;for(const a of [x.g.attributes.position.array,x.g.index.array]){const real=a.buffer;for(const k of ['buffer','byteLength','byteOffset','length','constructor'])Object.defineProperty(a,k,{get(){reads++;throw Error('hostile array metadata');}});Object.defineProperty(a,Symbol.toStringTag,{get(){reads++;throw Error('hostile tag');}});Object.defineProperty(real,'byteLength',{get(){reads++;throw Error('hostile capacity');}});}assert.equal(x.fingerprint(),before);assert.equal(reads,0);});
test('BufferAttribute.array accessors refuse before they can substitute storage',()=>{const x=fixture();let reads=0;Object.defineProperty(x.g.attributes.position,'array',{get(){reads++;return new Float32Array(9);}});assert.throws(x.state,e=>e.code==='GEOMETRY_ATTRIBUTE_PROFILE');assert.equal(reads,0);});
