// Keep module/renderer failures visible even when the editing entry cannot finish.
window.addEventListener('error',event=>{
  if(!event.message)return;
  const status=document.getElementById('status'),diagnostics=document.getElementById('diagnostics');
  if(status)status.textContent='Editor error: '+event.message;
  if(diagnostics)diagnostics.textContent+='\n'+event.message;
});
