import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {moduleReferencesBatch,moduleReferenceGraph,resolveModuleFile,ModuleReferenceError} from '../tools/module-references.mjs';
const references=(source,filename='fixture.mjs')=>moduleReferencesBatch([{filename,source}])[0].specifiers;

test('module syntax, not English from/import/export text, determines static references',()=>{
  const source=[
    'const min=1,max=3;const message=\'Expected a finite number from \'+min+\' to \'+max+\'.\';',
    'const text="import(\'./fake-string.js\'); export * from \'./fake-export.js\'";',
    '// import "./fake-comment.js"; export * from "./fake-line.js";',
    '/* import("./fake-block.js"); from "./fake-from.js" */',
    'const raw=`import("./fake-template.js"); from "./fake-raw.js"`;',
    'import "./side-effect.js";',
    'import defaultValue, {',
    '  named as local',
    '} /* between clause and from */ from',
    '  "./multiline.js";',
    'export {',
    '  remote as alias',
    '} from /* between from and literal */ "./re-export.js";',
    'export * as namespace from "./namespace.js";',
    'export * from "./star.js";'
  ].join('\n');
  assert.deepEqual(references(source),['./multiline.js','./namespace.js','./re-export.js','./side-effect.js','./star.js']);
});

test('literal dynamic imports include comments, options, nested interpolation and JS escapes',()=>{
  const source=[
    'const first=import /* bridge */ ( /* before argument */ "./first.js" );',
    'const json=import("./data.json", {with:{type:"json"}});',
    'const escaped=import("./\\u0065scaped.js");',
    'const nested=`raw import("./fake.js") ${import("./interpolation.js")} ${String.raw`inner ${import("./nested.js")}`}`;',
    'import "./\\x73tatic.js";',
    'const url=import.meta.url;',
    'const duplicate=import("./first.js");'
  ].join('\n');
  assert.deepEqual(references(source),['./data.json','./escaped.js','./first.js','./interpolation.js','./nested.js','./static.js']);
});

test('property/method names and regular-expression data are not dynamic imports',()=>{
  const source=String.raw`
    const object={import(value){return value;}};
    object.import('./fake-method.js'); object?.import('./fake-optional.js');
    class Loader { import(value){return value;} }
    const pattern=/import\(['"]\.\/fake-regex\.js['"]\)/;
    const characterClass=/[f-import('.\/fakeclass')]/;
    const text="import('./fake-string.js')";
    const name=1; export {name as "import('./fake-export-name.js')",name as "implements('./fake-export-name.js')"};
  `;
  assert.deepEqual(references(source),[]);
});

test('private import-named methods are IdentifierNames while imports inside them remain dependencies',()=>{
  assert.deepEqual(references('class C{#import(x){return x}m(){return this.#import("fake")}}'),[]);
  assert.deepEqual(references('class C{#import(x){return import("./nested-private.js")}m(){return this.#import("fake")}}'),['./nested-private.js']);
  assert.deepEqual(references('class C{#πimport(x){return import("./unicode-private.js")}m(){return this.#πimport("fake")}}'),['./unicode-private.js']);
  assert.deepEqual(references('const previous=1;\nimport("./after-newline.js");'),['./after-newline.js']);
});

test('computed dynamic dependencies fail with file and actual import line',()=>{
  for(const expression of ['name','"./"+name','`./static-template.js`','`./${name}.js`','("./parenthesized.js")']){
    assert.throws(()=>references('// first line\nimport('+expression+');','computed.mjs'),error=>
      error instanceof ModuleReferenceError&&error.code==='ERR_MODULE_REFERENCES'&&error.filename==='computed.mjs'&&error.line===2&&error.column===1&&/not enumerable/.test(error.message));
  }
});

test('invalid JavaScript rejects and parser-only discovery never evaluates application code',()=>{
  assert.throws(()=>references('import {broken from "./bad.js";','broken.mjs'),/broken.mjs.*Invalid or unsupported JavaScript/);
  const source='throw Error("Application must never execute");\nimport "./compile-only.js";';
  assert.deepEqual(references(source),['./compile-only.js']);
});

test('batching returns independent results and does not miss references after content changes',()=>{
  const first=moduleReferencesBatch([{filename:'batch-a.mjs',source:'import "./a.js";'}, {filename:'batch-b.mjs',source:'export * from "./b.js";'}]);
  assert.deepEqual(first.map(record=>record.specifiers),[['./a.js'],['./b.js']]);first[0].specifiers.push('./mutated.js');
  assert.deepEqual(references('import "./a.js";','batch-a.mjs'),['./a.js']);
  assert.deepEqual(references('import "./changed.js";','batch-a.mjs'),['./changed.js']);
});

test('a batched graph follows literal lazy imports and cycles, and rejects missing/external/computed dependencies',()=>{
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'nautilus-module-references-'));
  const write=(name,text)=>fs.writeFileSync(path.join(folder,name),text);
  try{
    write('entry.mjs','import "./static.mjs";const lazy=import("./lazy.mjs");');
    write('static.mjs','export * from "./entry.mjs";');write('lazy.mjs','throw Error("Not executed");');
    const scan=()=>moduleReferenceGraph([path.join(folder,'entry.mjs')],{root:folder});
    assert.deepEqual(scan().map(record=>path.basename(record.filename)).sort(),['entry.mjs','lazy.mjs','static.mjs']);
    write('lazy.mjs','import "./missing.mjs";');assert.throws(scan,/Missing module dependency/);
    write('lazy.mjs','import "unregistered-package";');assert.throws(scan,/Undeclared external runtime dependency/);
    write('lazy.mjs','const lazy=import(globalThis.moduleName);');assert.throws(scan,/lazy.mjs:1:12.*not enumerable/);
    write('lazy.mjs','import "../outside-project.mjs";');assert.throws(scan,/escapes the project/);
  }finally{
    const resolved=fs.realpathSync(folder),temporary=fs.realpathSync(os.tmpdir());
    assert.ok(resolved.startsWith(temporary+path.sep)&&path.basename(resolved).startsWith('nautilus-module-references-'));
    fs.rmSync(resolved,{recursive:true,force:true});
  }
});


test('explicit-file resolution rejects URL spellings without changing batch enumeration',()=>{
  const folder=path.resolve(os.tmpdir(),'nautilus-module-resolution'),filename=path.join(folder,'entry.mjs');
  assert.equal(resolveModuleFile('./dep.mjs',filename,{root:folder}),path.join(folder,'dep.mjs'));
  assert.equal(resolveModuleFile('../dep.mjs',path.join(folder,'nested','entry.mjs'),{root:folder}),path.join(folder,'dep.mjs'));
  assert.equal(resolveModuleFile('./interior space.mjs',filename,{root:folder}),path.join(folder,'interior space.mjs'));
  assert.equal(resolveModuleFile('external-package',filename),null);
  assert.deepEqual(references('import "external-package";import "./dep.mjs#v1";'),['./dep.mjs#v1','external-package']);
  for(const specifier of ['./dep.mjs#v1','./dep.mjs?v1','./dep%2Emjs','./dir\\dep.mjs','./dep\nmjs','./dep.mjs ']){
    assert.throws(()=>resolveModuleFile(specifier,filename),error=>error instanceof ModuleReferenceError&&error.filename===filename&&/Unsupported relative URL spelling/.test(error.message));
  }
  for(const specifier of ['.foo','.','.../dep.mjs','.\\dep.mjs'])assert.throws(()=>resolveModuleFile(specifier,filename),/must begin \.\/ or \.\.\//);
});

test('graph rejects URL filesystem lookalikes before resolving their literal filenames',()=>{
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'nautilus-module-references-'));
  const write=(name,text)=>fs.writeFileSync(path.join(folder,name),text);
  try{
    write('dep.mjs','import "./hidden.mjs";');write('hidden.mjs','export const hidden=true;');
    write('dep.mjs#v1','This literal file must not hide dep.mjs imports.');
    write('dep%2Emjs','This encoded filename must not hide dep.mjs imports.');
    write('.foo','This dot-prefixed filename is not a relative ESM specifier.');
    const scan=()=>moduleReferenceGraph([path.join(folder,'entry.mjs')],{root:folder});
    for(const specifier of ['./dep.mjs#v1','./dep%2Emjs']){
      assert.ok(fs.existsSync(path.join(folder,specifier)));
      write('entry.mjs','import '+JSON.stringify(specifier)+';');
      assert.throws(scan,/entry.mjs.*Unsupported relative URL spelling/);
    }
    write('entry.mjs','import ".foo";');assert.throws(scan,/must begin \.\/ or \.\.\//);
    write('entry.mjs','import "./dep.mjs";');
    assert.deepEqual(scan().map(record=>path.basename(record.filename)).sort(),['dep.mjs','entry.mjs','hidden.mjs']);
  }finally{
    const resolved=fs.realpathSync(folder),temporary=fs.realpathSync(os.tmpdir());
    assert.ok(resolved.startsWith(temporary+path.sep)&&path.basename(resolved).startsWith('nautilus-module-references-'));
    fs.rmSync(resolved,{recursive:true,force:true});
  }
});
