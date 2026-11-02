import {createBuiltinEncodedStream} from '../../../apps/editor/tile-authoring/c2/encoded-stream.js';
import type {Pin,ImageBlob} from '../../../packages/tile-authoring-core/index.js';
declare const pin:Pin,blob:ImageBlob;
const reader=createBuiltinEncodedStream({artwork:pin});
const acceptedPort:{open(blob:ImageBlob,options:{signal:AbortSignal}):AsyncIterable<Uint8Array>}=reader;
acceptedPort.open(blob,{signal:new AbortController().signal});
// @ts-expect-error no arbitrary URL belongs in the byte owner port.
reader.open('https://example.invalid/other.png',{signal:new AbortController().signal});
// @ts-expect-error no fetch/cost/counter provider can be injected by command data.
createBuiltinEncodedStream({artwork:pin,fetch:()=>({ok:true})});
