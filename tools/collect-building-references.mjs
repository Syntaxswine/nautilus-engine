// Public reference intake only. Downloaded reference media stays in ignored art artifacts.
import fs from 'node:fs';import path from 'node:path';import{fileURLToPath}from'node:url';import{createHash}from'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),out=path.join(root,'artifacts/building-catalog/references');fs.mkdirSync(out,{recursive:true});
const seeds=JSON.parse(fs.readFileSync(path.join(root,'art/buildings/reference-seeds.json'))),records=[];
const hash=b=>createHash('sha256').update(b).digest('hex');
async function read(url){const r=await fetch(url,{signal:AbortSignal.timeout(18000),headers:{'User-Agent':'Nautilus Art Reference Research/1.0'}});if(!r.ok)throw Error('HTTP '+r.status);return Buffer.from(await r.arrayBuffer());}
async function media(record,url,role,index){try{const b=await read(url),ext=/\.svg(?:\?|$)/i.test(url)?'.svg':'.jpg',file=record.id+'-'+role+'-'+index+ext;fs.writeFileSync(path.join(out,file),b);return{url,role,file:'artifacts/building-catalog/references/'+file,bytes:b.length,sha256:hash(b)};}catch(error){return{url,role,error:error.message};}}
async function collect(seed){const record={...seed,observedAt:new Date().toISOString(),access:'public viewing; reference imagery is not included in the shipped model pack',images:[]};try{
 if(seed.kind==='habs'){
  const bytes=await read(seed.url+'?fo=json'),data=JSON.parse(bytes);record.title=data.item?.title||seed.title;record.metadataSha256=hash(bytes);record.resources=[];record.rightsObservation=data.item?.rights_advisory||data.item?.rights||null;
  for(const resource of data.resources||[]){if(!/sheet|photo/i.test(resource.url||''))continue;const role=/sheet/.test(resource.url)?'plan':'exterior',files=resource.files||[];record.resources.push({url:resource.url,role,count:files.length});let index=0;
   for(const versions of files){index++;if(role==='exterior'&&index>2)break;const image=versions.filter(f=>/image\/(jpeg|jpg)/.test(f.mimetype||'')&&f.width>=640&&f.width<=1600).sort((a,b)=>b.width-a.width)[0];if(image)record.images.push(await media(record,image.url,role,index));}
  }
 }else{
  const bytes=await read(seed.url),text=bytes.toString().replaceAll('\\u002F','/').replaceAll('\\/','/').replaceAll('&amp;','&');record.metadataSha256=hash(bytes);fs.writeFileSync(path.join(out,seed.id+'.html'),bytes);
  const urls=[...new Set(text.match(/https?:[^"<>\s\\]+\.(?:jpg|png|webp|svg)(?:\?[^"<>\s\\]*)?/gi)||[])].filter(u=>!/[?&]w=|_revl|_revR/i.test(u));
  const plans=urls.filter(u=>/_fp_|floor.?plan|blackline|main.?level|first.?floor|second.?floor/i.test(u)).slice(0,5),exteriors=urls.filter(u=>/rend_.*_[abcde]\d?\.|elev|exterior|front/i.test(u)&&!plans.includes(u)).slice(0,2);
  for(const [i,url]of plans.entries())record.images.push(await media(record,url,'plan',i+1));for(const[i,url]of exteriors.entries())record.images.push(await media(record,url,'exterior',i+1));record.imageCandidates=urls.slice(0,40);
 }
 record.status='opened';record.pairedImages=record.images.some(i=>i.role==='plan'&&!i.error)&&record.images.some(i=>i.role==='exterior'&&!i.error);
 }catch(error){record.status='unavailable';record.error=error.message;}records.push(record);console.log(JSON.stringify({id:record.id,status:record.status,plans:record.images.filter(i=>i.role==='plan'&&!i.error).length,exteriors:record.images.filter(i=>i.role==='exterior'&&!i.error).length,paired:record.pairedImages}));}
let index=0;await Promise.all(Array.from({length:4},async()=>{while(index<seeds.length)await collect(seeds[index++]);}));records.sort((a,b)=>seeds.findIndex(s=>s.id===a.id)-seeds.findIndex(s=>s.id===b.id));
fs.writeFileSync(path.join(root,'art/buildings/reference-register.json'),JSON.stringify({schemaVersion:1,purpose:'Reference observations for original game art; not measured reconstructions or a construction-plan redistribution',records},null,2));
const cards=records.map(r=>'<section><h2>'+r.id+' · '+r.title+'</h2><div>'+r.images.filter(i=>!i.error).map(i=>'<figure><img src="./references/'+path.basename(i.file)+'"><figcaption>'+i.role+' · '+path.basename(i.file)+'</figcaption></figure>').join('')+'</div></section>').join('');
fs.writeFileSync(path.join(root,'artifacts/building-catalog/reference-review.html'),'<!doctype html><meta charset="utf-8"><title>Building reference review</title><style>body{background:#eee8d7;font:16px system-ui;padding:24px}section{margin:36px 0}section>div{display:flex;flex-wrap:wrap;gap:16px}figure{margin:0}img{width:440px;height:340px;object-fit:contain;background:white}figcaption{max-width:440px}</style>'+cards);
console.log(JSON.stringify({references:records.length,opened:records.filter(r=>r.status==='opened').length,paired:records.filter(r=>r.pairedImages).length,images:records.reduce((n,r)=>n+r.images.filter(i=>!i.error).length,0)}));
