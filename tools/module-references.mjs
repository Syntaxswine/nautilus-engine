// Tools-only JavaScript dependency discovery. The foreground child uses Node's
// public module parser; it never links/evaluates application modules. No parser
// package, browser runtime or persistent helper is required (Node >=22).
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const childFlag='--module-reference-child',parserFile=fileURLToPath(import.meta.url);
const referenceCache=new Map(),hash=source=>createHash('sha256').update(source).digest('hex');
const MAX_PROBES=2048;
export class ModuleReferenceError extends Error {
  constructor(message,{filename,line,column}={}) {
    super((filename?filename+(line?':'+line+(column?':'+column:''):'')+': ':'')+message);
    this.name='ModuleReferenceError';this.code='ERR_MODULE_REFERENCES';
    if(filename)this.filename=filename;if(line)this.line=line;if(column)this.column=column;
  }
}
function location(source,offset,filename){
  const before=source.slice(0,offset),lines=before.split(/\r\n|[\n\r\u2028\u2029]/);
  return {filename,line:lines.length,column:lines.at(-1).length+1};
}
function reject(source,offset,filename,message){throw new ModuleReferenceError(message,location(source,offset,filename));}
function trivia(source,index){
  for(;;){
    while(index<source.length&&/\s/.test(source[index]))index++;
    if(source.startsWith('//',index)){const end=source.slice(index+2).search(/[\n\r\u2028\u2029]/);if(end<0)return source.length;index+=end+2;continue;}
    if(source.startsWith('/*',index)){const end=source.indexOf('*/',index+2);if(end<0)return source.length;index=end+2;continue;}
    return index;
  }
}
function parsed(source,filename){return new vm.SourceTextModule(source,{identifier:filename});}
function parseFailure(source,filename){try{parsed(source,filename);return null;}catch(error){return error;}}
function quotedEnd(source,start){
  const quote=source[start];
  for(let index=start+1;index<source.length;index++){
    if(source[index]==='\\'){index++;continue;}
    if(source[index]===quote)return index+1;
  }
  return -1;
}

function discover(source,filename){
  let module;
  try{module=parsed(source,filename);}catch(error){throw new ModuleReferenceError('Invalid or unsupported JavaScript module syntax: '+error.message,{filename});}
  const references=new Set(module.dependencySpecifiers);
  let probes=0;
  // Node exposes static module requests, but no dynamic-import AST. Probe only
  // candidate import calls/meta forms against the *same full module grammar*.
  // U+2060 is valid data in strings/comments/regex/templates, but invalid in a
  // JavaScript token. A second, strict-reserved-word probe distinguishes the
  // import operator from IdentifierName properties/methods such as obj.import().
  // No transformed source is emitted, linked or executed. Unexpected/ambiguous
  // grammar-probe failures reject instead of silently omitting a dependency.
  const reservedFailure=parseFailure('const value = implements("x");',filename);
  if(!reservedFailure)throw new ModuleReferenceError('This Node parser cannot classify dynamic import syntax.',{filename});
  // Private IdentifierNames and suffixes of Unicode identifiers are not the import operator.
  for(const match of source.matchAll(/(?<![#\p{ID_Continue}$\u200C\u200D])import(?![\p{ID_Continue}$\u200C\u200D])/gu)){
    const start=match.index,after=trivia(source,start+6);
    if(!['(','.'].includes(source[after]))continue;
    if(++probes>MAX_PROBES)reject(source,start,filename,'Module exceeds '+MAX_PROBES+' dynamic-import syntax probes; split this source into enumerable modules.');
    const prefix=source.slice(0,start),suffix=source.slice(start+6);
    if(!parseFailure(prefix+'import\u2060'+suffix,filename))continue;
    const reserved=parseFailure(prefix+'implements'+suffix,filename);
    if(!reserved)continue;
    if(reserved.message!==reservedFailure.message)reject(source,start,filename,'Cannot classify this import syntax safely: '+reserved.message);
    if(source[after]==='.'){
      const member=trivia(source,after+1),name=/^[A-Za-z_$][\w$]*/.exec(source.slice(member))?.[0];
      if(name==='meta')continue;
      reject(source,start,filename,'Unsupported import phase; only import.meta and literal import("./module.js") are enumerable.');
    }
    const argument=trivia(source,after+1),quote=source[argument];
    if(quote!=="'"&&quote!=='"')reject(source,start,filename,'Computed dynamic import is not enumerable; use a single quoted string literal as its first argument.');
    const end=quotedEnd(source,argument),next=end<0?-1:trivia(source,end);
    if(end<0||![',',')'].includes(source[next]))reject(source,start,filename,'Computed dynamic import is not enumerable; concatenation, templates and parenthesized expressions are unsupported.');
    // Parse the literal as a static module request to decode JS escapes without
    // eval, Function, expression execution or a second hand-written string lexer.
    const literal=source.slice(argument,end);
    let specifier;
    try{specifier=parsed('import '+literal+';',filename).dependencySpecifiers[0];}
    catch(error){reject(source,start,filename,'Unsupported dynamic import literal: '+error.message);}
    references.add(specifier);
  }
  return [...references].sort();
}
function cachedDiscover(source,filename,cache){
  const digest=hash(source);let specifiers=cache.get(digest);
  if(!specifiers){specifiers=discover(source,filename);cache.set(digest,specifiers);}
  return {hash:digest,specifiers};
}
/** Resolve only explicit ESM relative filenames. Batch discovery retains bare
 * specifiers; filesystem consumers must use this helper rather than path.resolve
 * on URL spellings or dot-prefixed package names. No URL loader is implied.
 */
export function resolveModuleFile(specifier,filename,{root}={}){
  if(typeof specifier!=='string'||typeof filename!=='string')throw new TypeError('Pass a module specifier and importer filename.');
  if(!specifier.startsWith('./')&&!specifier.startsWith('../')){
    if(specifier.startsWith('.'))throw new ModuleReferenceError('Relative module filenames must begin ./ or ../: '+specifier,{filename});
    return null;
  }
  if(/[\\?#%\u0000-\u001f\u007f]/.test(specifier)||specifier.endsWith(' '))throw new ModuleReferenceError('Unsupported relative URL spelling (encoding, query, fragment, backslash or URL-normalized whitespace): '+JSON.stringify(specifier),{filename});
  const file=path.resolve(path.dirname(filename),specifier);
  if(root&&!file.startsWith(path.resolve(root)+path.sep))throw new ModuleReferenceError('Module dependency escapes the project.',{filename});
  return file;
}
function childRequest(request){
  const cache=new Map(request.cache??[]),records=[];
  if(request.mode==='sources'){
    for(const record of request.records)records.push({filename:record.filename,...cachedDiscover(record.source,record.filename,cache)});
  }else if(request.mode==='graph'){
    const base=path.resolve(request.root),seen=new Set();
    function visit(input){
      const file=path.resolve(input);
      if(!file.startsWith(base+path.sep))throw new ModuleReferenceError('Module dependency escapes the project.',{filename:file});
      if(seen.has(file))return;seen.add(file);
      if(!fs.existsSync(file)||!fs.statSync(file).isFile())throw new ModuleReferenceError('Missing module dependency.',{filename:file});
      if(!/\.m?js$/.test(file)){records.push({filename:file,specifiers:[]});return;}
      const record={filename:file,...cachedDiscover(fs.readFileSync(file,'utf8'),file,cache)};records.push(record);
      for(const specifier of record.specifiers){
        const dependency=resolveModuleFile(specifier,file,{root:base});
        if(dependency===null)throw new ModuleReferenceError('Undeclared external runtime dependency: '+specifier,{filename:file});
        visit(dependency);
      }
    }
    request.entries.forEach(visit);
  }else throw Error('Unknown module-reference parser request.');
  return records;
}
function requestParser(request){
  const run=spawnSync(process.execPath,['--experimental-vm-modules','--no-warnings',parserFile,childFlag],{
    input:JSON.stringify({...request,cache:[...referenceCache]}),encoding:'utf8',windowsHide:true,
    timeout:60000,maxBuffer:64*1024*1024
  });
  if(run.error)throw new ModuleReferenceError('Module parser subprocess failed: '+run.error.message);
  let report;
  try{report=JSON.parse(run.stdout);}catch{throw new ModuleReferenceError('Module parser returned no valid report: '+(run.stderr||'exit '+run.status));}
  if(!report.ok){const error=new ModuleReferenceError(report.error.message);Object.assign(error,report.error);throw error;}
  if(run.status!==0)throw new ModuleReferenceError('Module parser failed: '+run.stderr);
  for(const record of report.records)if(record.hash)referenceCache.set(record.hash,record.specifiers);
  return report.records;
}
/** One foreground parser child for all uncached sources. Results are decoded,
 * deduplicated specifiers (static requests plus literal dynamic imports).
 * String/comment/regex/template data is not executed. Computed import arguments,
 * dynamic templates and unsupported future import phases fail with file/line.
 * This is not discovery of eval/Function/require/URL/Worker or asset references.
 */
export function moduleReferencesBatch(records){
  if(!Array.isArray(records)||records.some(record=>!record||typeof record.filename!=='string'||typeof record.source!=='string'))throw new TypeError('Pass {filename,source} module records.');
  const missing=records.filter(record=>!referenceCache.has(hash(record.source)));
  if(missing.length)requestParser({mode:'sources',records:missing});
  return records.map(record=>({filename:record.filename,specifiers:[...referenceCache.get(hash(record.source))]}));
}
/** One batched read-only parse child discovers a relative-file closure. Cached
 * source hashes are reused across profiles; changed content is always reparsed.
 * Filesystem resolution intentionally matches the existing explicit-file policy:
 * bare/URL imports, guessed extensions and URL query/fragment filenames reject.
 */
export function moduleReferenceGraph(entries,{root}={}){
  if(!Array.isArray(entries)||entries.some(entry=>typeof entry!=='string')||typeof root!=='string')throw new TypeError('Pass entry filenames and a root directory.');
  return requestParser({mode:'graph',entries,root});
}

if(process.argv[2]===childFlag&&path.resolve(process.argv[1])===parserFile){
  try{process.stdout.write(JSON.stringify({ok:true,records:childRequest(JSON.parse(fs.readFileSync(0,'utf8')))}));}
  catch(error){process.stdout.write(JSON.stringify({ok:false,error:{name:error.name,code:error.code??'ERR_MODULE_REFERENCES',message:error.message,...(error.filename?{filename:error.filename}:{}),...(error.line?{line:error.line,column:error.column}:{} )}}));process.exitCode=1;}
}
