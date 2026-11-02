// Tool-only proof input inventory; no renderer/owner or consumer import.
export function verifyProofInputs({source,dependencies,decoderInputs,decoderInputPath}) {
 const declared=new Set(dependencies.map(r=>r.path));
 const literal=[...source.matchAll(/(?:fetch|loadAsync)\(\s*(['"])(\/[^'"\r\n]+)\1\s*\)/g)].map(m=>m[2].slice(1));
 if(!literal.includes(decoderInputPath))throw Error('Expected original decoder proof descriptor fetch disappeared');
 const indirect=decoderInputs.art.map(r=>r.path),all=[...new Set([...literal,...indirect])].sort();
 for(const path of all)if(!declared.has(path))throw Error('Undeclared browser proof input: '+path);
 return Object.freeze({literalInputs:Object.freeze([...new Set(literal)].sort()),indirectOriginalInputs:Object.freeze([...new Set(indirect)].sort()),allInputs:Object.freeze(all)});
}
