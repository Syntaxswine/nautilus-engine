// Source-only Node proof. Installed proof uses normal package resolution.
import {registerHooks} from 'node:module';
import fs from 'node:fs';
const root=new URL('../../../',import.meta.url),pkg=JSON.parse(fs.readFileSync(new URL('package.json',root)));
registerHooks({resolve(specifier,context,next){if(specifier==='@nautilus-engine/map-core'||specifier.startsWith('@nautilus-engine/map-core/')){const key=specifier==='@nautilus-engine/map-core'?'.':'.'+specifier.slice('@nautilus-engine/map-core'.length),target=pkg.exports[key];if(!target)throw Error('Undeclared public entry: '+specifier);return {url:new URL(target,root).href,shortCircuit:true};}return next(specifier,context);}});
