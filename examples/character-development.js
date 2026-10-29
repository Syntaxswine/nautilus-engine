import {STAT_DEFINITIONS,RULES_CONTRACT} from '../packages/rules-core/index.js';
import {createDevelopmentHost,MAX_IMPORT_BYTES} from './character-development-host.js';

const $=id=>document.getElementById(id), dialog=$('development'), abort=new AbortController(), rows=new Map();
const listen=(target,event,handler)=>target.addEventListener(event,handler,{signal:abort.signal});
export const SAVE_KEY='nautilus:character-development:v1';
const copy=value=>structuredClone(value), number=value=>new Intl.NumberFormat('en',{maximumFractionDigits:2}).format(value);
let host=null, launcher=null, raw={}, history=[], retired=false, importTicket=0;
const empty=()=>Object.fromEntries(STAT_DEFINITIONS.map(stat=>[stat.key,'0']));
function message(text,error=false){$('record-status').textContent=text;$('record-status').classList.toggle('error',error);}
function saveMessage(text,error=false){$('save-status').textContent=text;$('save-status').classList.toggle('error',error);}
function node(tag,className,text){const element=document.createElement(tag);if(className)element.className=className;if(text!==undefined)element.textContent=text;return element;}

function buildRows(){
 for(const stat of STAT_DEFINITIONS){
  const row=node('div','stat-row');row.dataset.stat=stat.key;
  const title=node('div'),label=node('label','stat-label',stat.label),value=node('span','stat-value');
  label.htmlFor='allocate-'+stat.key;title.append(label,value);
  const adjust=node('div','stat-adjust'),minus=node('button','', '−'),input=node('input'),plus=node('button','','+');
  minus.type=plus.type='button';minus.setAttribute('aria-label','Decrease '+stat.label+' allocation');plus.setAttribute('aria-label','Increase '+stat.label+' allocation');
  input.id='allocate-'+stat.key;input.type='text';input.inputMode='numeric';input.setAttribute('role','spinbutton');input.setAttribute('aria-label','Allocate points to '+stat.label);input.setAttribute('aria-valuemin','0');input.setAttribute('aria-valuemax',String(RULES_CONTRACT.statMaximum));input.setAttribute('aria-describedby','development-help');input.autocomplete='off';
  adjust.append(minus,input,plus);
  const practice=node('div','practice'),practiceLabel=node('span','','Practice'),practiceValue=node('span'),meter=node('meter'),reason=node('span','practice-reason');
  meter.setAttribute('aria-label',stat.label+' practice');practice.append(practiceLabel,practiceValue,meter,reason);
  row.append(title,adjust,practice);$(stat.kind==='attribute'?'attributes':'skills').append(row);
  rows.set(stat.key,{row,label,value,minus,input,plus,meter,practiceValue,reason});
  listen(input,'input',()=>change(stat.key,input.value));
  listen(minus,'click',()=>adjustBy(stat.key,-1));listen(plus,'click',()=>adjustBy(stat.key,1));
  listen(input,'keydown',event=>{if(['ArrowUp','ArrowDown','Home'].includes(event.key)){event.preventDefault();if(event.key==='Home')change(stat.key,'0');else adjustBy(stat.key,event.key==='ArrowUp'?1:-1);}});
 }
}
function change(key,value){if(raw[key]===value)return;history.push(copy(raw));raw[key]=value;renderDraft();}
function adjustBy(key,delta){const value=/^\d+$/.test(raw[key])?Number(raw[key]):0;change(key,String(Math.max(0,value+delta)));rows.get(key).input.focus({preventScroll:true});}
function parseDraft(){
 const allocation={};let spent=0;
 for(const stat of STAT_DEFINITIONS){
  const value=raw[stat.key];if(!/^\d+$/.test(value)||!Number.isSafeInteger(Number(value)))return {ok:false,error:'Use a whole number of points for '+stat.label+'. Enter 0 to leave it unchanged.',spent:null};
  const amount=Number(value);if(amount>0)allocation[stat.key]=amount;spent+=amount;
 }
 return {ok:true,allocation,spent};
}
function resources(container,values){
 container.replaceChildren(...['hp','ap','stamina'].map(key=>{
  const resource=node('div','resource '+key),title=node('span','',key==='hp'?'HP':key==='ap'?'AP':'Stamina'),value=node('strong'),current=values[key];
  value.append(document.createTextNode(number(current.current)+' '),node('small','','/ '+number(current.max)));
  const bar=node('progress');bar.value=current.current;bar.max=current.max;bar.setAttribute('aria-label',title.textContent+' '+current.current+' of '+current.max);
  resource.append(title,value,bar);return resource;
 }));
}
function derived(preview,before,after){
 const items=[
  ...['hp','ap','stamina'].map(key=>({key,label:key==='hp'?'HP':key==='ap'?'AP':'Stamina',before:number(before.resources[key].current)+' / '+number(before.resources[key].max),after:number(after.resources[key].current)+' / '+number(after.resources[key].max)})),
  ...before.derived.map(value=>({key:value.key,label:value.label,before:number(value.value)+(value.unit||''),after:number(after.derived.find(next=>next.key===value.key).value)+(value.unit||'')}))
 ];
 $('derived-preview').replaceChildren(...items.map(item=>{const wrap=node('div'),term=node('dt','',item.label),description=node('dd','',item.before+(item.before===item.after?'':' → '+item.after));if(item.before!==item.after)description.classList.add('effect-change');wrap.dataset.effect=item.key;wrap.append(term,description);return wrap;}));
}
function renderRecord(){
 const active=!!host;for(const control of [$('develop'),$('notice-develop'),$('save'),$('export'),...document.querySelectorAll('[data-outcome]')])control.disabled=!active;
 try{$('reload').disabled=localStorage.getItem(SAVE_KEY)===null;}catch{$('reload').disabled=false;}
 $('replay-outcome').disabled=!active||!host.canReplay;
 if(!active)return;
 const data=host.inspect();$('character-name').textContent=data.name;$('level').textContent=data.level;$('banked').textContent=data.points;
 $('xp-label').textContent=number(data.xp.total)+' XP';$('xp-meter').max=data.xp.needed;$('xp-meter').value=data.xp.within;
 $('next-level').textContent=number(data.xp.toNext)+' XP to level '+(data.level+1);$('reward-rule').textContent=data.rewardPoints+' points for each level. Keep them until you are ready.';
 resources($('resources'),data.resources);
 $('committed-stats').replaceChildren(...data.stats.flatMap(stat=>[node('dt','',stat.label),node('dd','',String(stat.value))]));
 $('recent').replaceChildren(...(data.recent.length?data.recent:[{text:'No development recorded yet.'}]).slice(-6).reverse().map(entry=>node('li','',entry.text)));
 if(dialog.open)renderDraft();
}
function renderDraft(){
 if(!host||!dialog.open)return;
 const before=host.inspect(),parsed=parseDraft(),preview=parsed.ok?host.preview(parsed.allocation):{ok:false,error:parsed.error};
 const spent=parsed.spent,remaining=spent===null?null:before.points-spent,after=preview.ok?preview.after:before;
 $('development-character').textContent=before.name+' · Level '+before.level;$('available-points').textContent=before.points;
 $('staged-points').textContent=spent===null?'—':spent;$('remaining-points').textContent=remaining===null?'—':remaining;$('remaining-points').classList.toggle('invalid',remaining!==null&&remaining<0);
 $('allocation-confirm').disabled=!preview.ok||!spent;$('allocation-undo').disabled=!history.length;$('allocation-reset').disabled=Object.values(raw).every(value=>value==='0');
 $('allocation-status').hidden=preview.ok||spent===0;$('allocation-status').textContent=preview.ok?'':preview.error;
 for(const stat of before.stats){
  const row=rows.get(stat.key),amount=/^\d+$/.test(raw[stat.key])?Number(raw[stat.key]):null;
  if(row.input.value!==raw[stat.key])row.input.value=raw[stat.key];
  const candidate=after.stats.find(value=>value.key===stat.key).value;
  row.value.textContent=stat.value+(candidate!==stat.value?' → '+candidate:'')+' / '+RULES_CONTRACT.statMaximum;row.value.classList.toggle('changed',candidate!==stat.value);
  const invalid=amount===null||stat.value+amount>RULES_CONTRACT.statMaximum;
  row.input.setAttribute('aria-invalid',String(invalid));row.input.setAttribute('aria-valuemax',String(RULES_CONTRACT.statMaximum-stat.value));
  if(amount!==null)row.input.setAttribute('aria-valuenow',String(amount));else row.input.removeAttribute('aria-valuenow');
  row.minus.disabled=amount===0;row.plus.disabled=amount===null||stat.value+amount>=RULES_CONTRACT.statMaximum||remaining===null||remaining<=0;
  row.meter.min=0;row.meter.max=stat.practice.threshold;row.meter.value=stat.practice.current;
  row.practiceValue.textContent=stat.practice.atCap?'Stat at 100':number(stat.practice.current)+' / '+number(stat.practice.threshold);row.reason.textContent=stat.practice.reason||'No recent practice.';
 }
 derived(preview,before,after);
}
function openDevelopment(){
 if(!host||dialog.open)return;launcher=document.activeElement;raw=empty();history=[];dialog.showModal();renderDraft();$('development-close').focus();
}
function closeDevelopment(){if(dialog.open)dialog.close();}
function closeEffects(){
 raw=empty();history=[];
 if(host)message(host.inspect().points+' points kept for later.');
 const target=launcher?.isConnected&&!launcher.disabled?launcher:$('develop');target?.focus({preventScroll:true});launcher=null;
}
function showOutcome(result){
 if(!result.ok){message(result.error,true);return;}
 renderRecord();message(result.replayed?'This sample result was already recorded.':result.message);
 if(result.levelsGained>0){$('level-notice-title').textContent='Level '+host.inspect().level+' reached';$('level-notice-detail').textContent=result.pointsAwarded+' development points earned. Spend them when you are ready.';$('level-notice').hidden=false;}
}
function recordOutcome(key){if(!host)return;showOutcome(host.outcome(key));}
function replaceRecord(text){
 const next=createDevelopmentHost({saved:text});next.inspect();host=next;
 if(dialog.open)dialog.close();raw=empty();history=[];$('level-notice').hidden=true;renderRecord();message('Character record opened. Points, practice and current resources are preserved.');
}
function save(){
 if(!host)return false;
 try{localStorage.setItem(SAVE_KEY,host.serialize());saveMessage('Confirmed character record saved in this browser.');$('reload').disabled=false;return true;}
 catch{saveMessage('Browser save failed. Export your character to keep a copy.',true);return false;}
}
function reload(){
 ++importTicket;$('import').value='';
 try{const text=localStorage.getItem(SAVE_KEY);if(text===null){saveMessage('No browser save found. Save this character or import an exported record.',true);return false;}replaceRecord(text);saveMessage('Browser save reloaded.');return true;}
 catch(error){saveMessage('Save rejected: '+error.message+' Your current record is unchanged.',true);return false;}
}
function download(text,name){const url=URL.createObjectURL(new Blob([text],{type:'application/json'})),anchor=document.createElement('a');anchor.href=url;anchor.download=name;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),0);}
buildRows();
listen($('develop'),'click',openDevelopment);listen($('notice-develop'),'click',openDevelopment);listen($('dismiss-notice'),'click',()=>{$('level-notice').hidden=true;});
listen($('development-close'),'click',closeDevelopment);listen($('bank-points'),'click',closeDevelopment);listen(dialog,'close',closeEffects);
listen($('allocation-undo'),'click',()=>{if(history.length){raw=history.pop();renderDraft();}});
listen($('allocation-reset'),'click',()=>{history.push(copy(raw));raw=empty();renderDraft();});
listen($('allocation-confirm'),'click',()=>{
 const parsed=parseDraft();if(!host||!parsed.ok||!parsed.spent)return;
 const result=host.allocate(parsed.allocation);if(!result.ok){$('allocation-status').hidden=false;$('allocation-status').textContent=result.error;return;}
 raw=empty();history=[];renderRecord();renderDraft();message('Allocation confirmed. '+host.inspect().points+' points remain.');$('bank-points').focus();
});
for(const button of document.querySelectorAll('[data-outcome]'))listen(button,'click',()=>recordOutcome(button.dataset.outcome));
listen($('replay-outcome'),'click',()=>{if(host)showOutcome(host.replay());});listen($('save'),'click',save);listen($('reload'),'click',reload);
listen($('export'),'click',()=>{if(host){download(host.serialize(),'nautilus-character-progression.json');saveMessage('Character exported with points, practice and reward history.');}});
listen($('import'),'change',async()=>{
 const ticket=++importTicket,file=$('import').files[0];if(!file)return;
 try{if(file.size>MAX_IMPORT_BYTES)throw new Error('This file exceeds the progression export size limit. Choose a supported export.');const text=await file.text();if(ticket!==importTicket||retired)return;replaceRecord(text);saveMessage('Imported character opened. Use Save in browser to keep it here.');}
 catch(error){if(ticket===importTicket&&!retired)saveMessage('Import rejected: '+error.message+' Choose a versioned progression export.',true);}
 finally{if(ticket===importTicket)$('import').value='';}
});
listen($('open-sample'),'click',()=>{++importTicket;$('import').value='';host=createDevelopmentHost();if(dialog.open)dialog.close();$('level-notice').hidden=true;renderRecord();message('Reference Mechanic opened. Browser save is kept until you choose Save.');});
try{
 const saved=localStorage.getItem(SAVE_KEY);host=saved===null?createDevelopmentHost():createDevelopmentHost({saved});renderRecord();message(saved===null?'Reference Mechanic opened. Record sample outcomes or inspect development.':'Saved character opened. Unspent points and practice are preserved.');
}catch(error){message('Character record could not open: '+error.message+' Import a valid progression export or open the sample record.',true);}
function dispose(){if(retired)return;retired=true;++importTicket;abort.abort();if(dialog.open)dialog.close();}
listen(window,'pagehide',dispose);
window.characterDemo={
 inspect:()=>({record:host?.inspect()||null,bundle:host?.state()||null,draft:copy(raw),history:history.length,open:dialog.open,retired}),
 serialize:()=>host?.serialize(),open:openDevelopment,close:closeDevelopment,save,reload,
 import:text=>{++importTicket;$('import').value='';try{replaceRecord(text);return {ok:true};}catch(error){saveMessage('Import rejected: '+error.message,true);return {ok:false,error:error.message};}},
 outcome:key=>{const result=host.outcome(key);showOutcome(result);return result;},replay:()=>{const result=host.replay();showOutcome(result);return result;},dispose
};
