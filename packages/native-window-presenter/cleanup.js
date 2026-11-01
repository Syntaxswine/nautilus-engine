// Only provider-owned nodes/geometries reach this helper. Use native Three
// remove/dispose once per resource; listener failures must not skip siblings.
export function createCleanup(operation){
  const errors=[],released=new Set(),parents=new Map();let failures=0;
  function attempt(action){try{return action();}catch(error){failures++;if(errors.length<64)errors.push(error);}}
  function remember(node,parent){if(parent){if(!parents.has(node))parents.set(node,new Set());parents.get(node).add(parent);}}
  function unlink(node,parent){
    if(!parent)return;
    // Final structural repair emits no second event. A native removed listener
    // can reparent the node before throwing; retrying remove would loop forever.
    for(let i=parent.children.length-1;i>=0;i--)if(parent.children[i]===node)parent.children.splice(i,1);
    if(node.parent===parent)node.parent=null;
  }
  function repair(){
    for(const node of released){
      for(const parent of parents.get(node)??[])unlink(node,parent);
      unlink(node,node.parent);
      for(const child of node.children)if(child.parent===node)child.parent=null;
      node.children.length=0;
    }
  }
  function release(nodes,geometries=[]){
    for(const node of nodes)released.add(node);
    for(const node of nodes){const parent=node.parent;remember(node,parent);if(parent)attempt(()=>parent.remove(node));}
    for(const geometry of geometries)attempt(()=>geometry.dispose());
    repair();
  }
  function restore(node,parent){
    unlink(node,node.parent);
    // Restore only this accepted owned root, without replaying a listener that
    // already refused native restoration. Borrowed siblings are preserved.
    if(!parent.children.includes(node))parent.children.push(node);node.parent=parent;
  }
  function finish(result,caught,primary){
    repair();
    if(failures){
      const all=caught?[primary,...errors]:errors;
      const error=new AggregateError(all.slice(0,64),operation+': lifecycle callbacks failed after consistent cleanup.');
      error.code='WINDOW_VIEW_LIFECYCLE_FAILED';error.operation=operation;error.failureCount=failures+(caught?1:0);throw error;
    }
    if(caught)throw primary;return result;
  }
  return {attempt,release,repair,restore,finish,hasErrors:()=>failures>0};
}
