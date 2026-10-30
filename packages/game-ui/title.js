/** Optional DOM presentation. No renderer, storage, audio, navigation or game loop is created. */
let instance=0;
export function mountTitleScreen(container,options={}){
  const doc=container?.ownerDocument;
  if(!doc||typeof options.title!=='string'||!options.title.trim()||typeof options.onStart!=='function')throw Error('Provide a container, game title and onStart callback.');
  if(options.checkSave&&typeof options.onContinue!=='function')throw Error('A saved-game check requires an onContinue callback.');
  const labels={start:'New game',continue:'Continue',settings:'Settings',credits:'Credits',retry:'Check again',confirm:'Start a new game?',warning:'Starting again may replace your saved progress.',cancel:'Keep playing',confirmStart:'Start new game',close:'Back',checking:'Checking saved progress…',empty:'Your next journey starts here.',...options.labels};
  const create=(tag,className,text)=>{const node=doc.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;};
  const element=create('section','nautilus-title'),art=create('div','ng-art'),menu=create('div','ng-menu'),heading=create('h1','ng-title',options.title);
  heading.id='nautilus-game-title-'+(++instance);element.setAttribute('aria-labelledby',heading.id);
  const previousFocus=doc.activeElement,removers=[];let disposed=false,busy=false,checking=true,save=null,saveError=false,saveTicket=0,actionTicket=0,saveController,actionController,lastDialogButton;
  const listen=(node,type,fn)=>{node.addEventListener(type,fn);removers.push(()=>node.removeEventListener(type,fn));};
  if(options.art){
    const url=new URL(options.art.src,doc.baseURI);
    if(!['http:','https:','file:','blob:'].includes(url.protocol))throw Error('Use an image URL for title artwork.');
    const img=create('img');img.src=url.href;img.alt=options.art.alt||'';img.decoding='async';art.append(img);
    if(options.art.caption)art.append(create('span','ng-art-caption',options.art.caption));
  }else art.setAttribute('aria-hidden','true');
  menu.append(create('p','ng-eyebrow',options.eyebrow||'A NEW JOURNEY'),heading,create('p','ng-tagline',options.tagline||''));
  const nav=create('nav','ng-actions');nav.setAttribute('aria-label',options.menuLabel||'Main menu');
  const buttons={};
  for(const key of ['continue','start','settings','credits']){buttons[key]=create('button','ng-button',labels[key]);buttons[key].type='button';buttons[key].dataset.action=key;nav.append(buttons[key]);}
  buttons.continue.hidden=typeof options.onContinue!=='function';buttons.settings.hidden=typeof options.onSettings!=='function';
  buttons.credits.hidden=!Array.isArray(options.credits)||!options.credits.length;
  const status=create('p','ng-status',labels.checking),summary=create('p','ng-save-summary'),retry=create('button','ng-retry',labels.retry);
  status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.id=heading.id+'-status';retry.type='button';retry.hidden=true;
  buttons.continue.setAttribute('aria-describedby',status.id);
  menu.append(nav,status,summary,retry,create('p','ng-edition',options.edition||''));element.append(art,menu);
  const confirm=create('dialog','ng-dialog'),credits=create('dialog','ng-dialog');confirm.setAttribute('aria-labelledby',heading.id+'-confirm');credits.setAttribute('aria-labelledby',heading.id+'-credits');
  const confirmTitle=create('h2','',labels.confirm);confirmTitle.id=heading.id+'-confirm';
  const cancel=create('button','ng-button',labels.cancel),confirmStart=create('button','ng-button ng-primary',labels.confirmStart),confirmActions=create('div','ng-dialog-actions');
  cancel.type=confirmStart.type='button';confirmActions.append(cancel,confirmStart);confirm.append(confirmTitle,create('p','',options.newGameWarning||labels.warning),confirmActions);
  const creditTitle=create('h2','',labels.credits);creditTitle.id=heading.id+'-credits';credits.append(creditTitle);
  for(const credit of options.credits||[])credits.append(create('p','',String(credit)));
  const closeCredits=create('button','ng-button',labels.close);closeCredits.type='button';credits.append(closeCredits);element.append(confirm,credits);container.append(element);
  function render(){
    element.setAttribute('aria-busy',String(checking||busy));
    for(const button of Object.values(buttons))button.disabled=checking||busy||saveError;
    buttons.continue.disabled ||= !save?.available;
    buttons.continue.classList.toggle('ng-primary',!!save?.available);
    buttons.start.classList.toggle('ng-primary',!save?.available);
    summary.textContent=save?.available?save.summary:'';
    retry.hidden=!saveError;retry.disabled=checking||busy;
  }
  function notifyVisibility(visible){options.onVisibilityChange?.(visible);}
  function closeDialogs(){for(const dialog of [confirm,credits])if(dialog.open)dialog.close();}
  function cancelPending(){saveTicket++;actionTicket++;saveController?.abort();actionController?.abort();busy=false;}
  function hide(){
    if(disposed||element.hidden)return;
    cancelPending();element.hidden=true;closeDialogs();notifyVisibility(false);options.focusGame?.();
  }
  async function refreshSave({focus=false}={}){
    if(disposed||busy)return false;
    const ticket=++saveTicket;saveController?.abort();saveController=new AbortController();checking=true;saveError=false;save=null;status.textContent=labels.checking;render();
    try{
      const result=await (options.checkSave?.({signal:saveController.signal})??{available:false,summary:''});
      if(disposed||ticket!==saveTicket||element.hidden)return false;
      if(!result||typeof result.available!=='boolean'||result.summary!==undefined&&typeof result.summary!=='string')throw Error('Invalid saved-game metadata.');
      save={available:result.available,summary:(result.summary||'').slice(0,200)};checking=false;status.textContent=save.available?'Saved progress is ready.':labels.empty;render();
      if(focus)(save.available?buttons.continue:buttons.start).focus();
      return true;
    }catch(error){
      if(disposed||ticket!==saveTicket||element.hidden)return false;
      checking=false;saveError=true;status.textContent='Saved progress could not be checked. Try again.';render();options.onError?.(error,'check-save');if(focus)retry.focus();return false;
    }
  }
  async function run(key){
    if(disposed||busy||checking||saveError)return;
    const callback={start:options.onStart,continue:options.onContinue,settings:options.onSettings}[key];if(typeof callback!=='function')return;
    busy=true;const ticket=++actionTicket;actionController?.abort();actionController=new AbortController();
    status.textContent=key==='start'?'Preparing your new game…':key==='continue'?'Opening saved progress…':'Opening settings…';render();
    try{
      await callback({signal:actionController.signal,save:save?{...save}:null});
      if(disposed||ticket!==actionTicket||element.hidden)return;
      busy=false;
      if(key==='settings'){status.textContent='Ready when you are.';render();buttons.settings.focus();}
      else hide();
    }catch(error){
      if(disposed||ticket!==actionTicket||element.hidden)return;
      busy=false;status.textContent=key==='continue'?'Your saved game could not be opened. Try again.':key==='start'?'The new game could not be started. Try again.':'Settings could not be opened. Try again.';
      render();options.onError?.(error,key);buttons[key].focus();
    }
  }
  listen(buttons.start,'click',()=>{if(save?.available){lastDialogButton=buttons.start;confirm.showModal();cancel.focus();}else void run('start');});
  listen(buttons.continue,'click',()=>void run('continue'));listen(buttons.settings,'click',()=>void run('settings'));
  listen(buttons.credits,'click',()=>{lastDialogButton=buttons.credits;credits.showModal();closeCredits.focus();});
  listen(cancel,'click',()=>confirm.close());listen(confirmStart,'click',()=>{confirm.close();void run('start');});
  listen(closeCredits,'click',()=>credits.close());listen(retry,'click',()=>void refreshSave({focus:true}));
  for(const dialog of [confirm,credits])listen(dialog,'keydown',event=>{if(event.key!=='Tab')return;const targets=[...dialog.querySelectorAll('button:not(:disabled)')],first=targets[0],last=targets.at(-1);if(event.shiftKey&&doc.activeElement===first||!event.shiftKey&&doc.activeElement===last){event.preventDefault();(event.shiftKey?last:first).focus();}});
  for(const dialog of [confirm,credits])listen(dialog,'close',()=>{if(!disposed&&!element.hidden)lastDialogButton?.focus();});
  render();notifyVisibility(true);const ready=refreshSave({focus:options.focus!==false});
  return Object.freeze({
    element,ready,refreshSave,hide,
    async show(){if(disposed)throw Error('Title screen was disposed.');cancelPending();element.hidden=false;closeDialogs();notifyVisibility(true);return refreshSave({focus:true});},
    dispose(){
      if(disposed)return;disposed=true;cancelPending();closeDialogs();removers.forEach(remove=>remove());const hadFocus=element.contains(doc.activeElement);element.remove();notifyVisibility(false);
      if(hadFocus&&previousFocus?.isConnected)previousFocus.focus();
    }
  });
}