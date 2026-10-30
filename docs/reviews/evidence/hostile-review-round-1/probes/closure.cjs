// Compute a JS import closure from git objects (read-only) for one commit.
const {execFileSync}=require('child_process');const path=require('path').posix;
const [repo,sha,...entries]=process.argv.slice(2);
const seen=new Set(),queue=[...entries];
while(queue.length){const f=queue.pop();if(seen.has(f))continue;seen.add(f);
 if(!/\.m?js$/.test(f))continue;
 let text;try{text=execFileSync('git',['-C',repo,'show',sha+':'+f],{maxBuffer:1<<28}).toString();}catch(e){console.error('MISSING '+f);continue;}
 for(const m of text.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)['"]([^'"]+)['"]/g)){if(!m[1].startsWith('.'))continue;queue.push(path.normalize(path.join(path.dirname(f),m[1])));}
}
console.log([...seen].sort().join('\n'));
