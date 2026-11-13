// Test-only consumer orchestration. All movement/door/item rules come from public entries.
import {createWorld,openWorld} from '@nautilus-engine/map-core/world';
import {createInteractionState,openInteractionState,createInteractionActor,openInteractionActor,createInteractionQueries,previewInteraction,applyInteraction,walkActor} from '@nautilus-engine/map-core/interactions';
import {createRock,openRock,serializeRock,pickupRock} from '@nautilus-engine/map-core/items';
import {createVehicle,createVehicleSession,createVehicleQueries,vehicleContactShape,vehicleBounds} from '@nautilus-engine/map-core/vehicles';
import {traversalBaseline,observeVehicles} from './driving.js';
import {REGISTRY,identity,defaultRecipe,validateRecipe,contentFor,plotContent,slotById,objectiveById} from './registry.js';
import {clone,freeze,canonical,insist,fields,refusal,accepted} from './data.js';

function makeWorld(content,worldId=content.world.id) {const world=createWorld({...content.world,id:worldId});world.surfaces=clone(content.surfaces);return openWorld(world);}
function initial(recipe,spawn) {
  const content=contentFor(recipe,spawn),sandboxId='sandbox-'+globalThis.crypto.randomUUID().replaceAll('-','').slice(0,12),world=makeWorld(content,'ground-'+sandboxId);
  return {kind:'nautilus-test-ground-state',version:2,sandboxId,recipe:clone(recipe),revision:0,serial:0,sceneryRevision:0,plotGenerations:{west:0,east:0},world,
    interactions:createInteractionState({worldId:world.id,...content.interactions}),actor:createInteractionActor(content.actors[0]),resources:clone(REGISTRY.resources),
    rocks:recipe.plots.map(p=>plotContent(p).rock).filter(Boolean).map(createRock),events:[],receipts:[],traversal:traversalBaseline(),
    vehicles:{kind:'nautilus-road-vehicles',version:2,id:'night-ledger-ground-road',revision:0,occupancyRevision:0,vehicles:content.vehicles.map(createVehicle),occupancy:[],collisionProfile:'oriented-slide-v1'}};
}
function validateState(input) {
  const s=clone(input);fields(s,['kind','version','sandboxId','recipe','revision','serial','sceneryRevision','plotGenerations','world','interactions','actor','resources','rocks','events','receipts','vehicles','traversal']);
  insist(s.kind==='nautilus-test-ground-state'&&s.version===2,'SAVE_VERSION','Use complete test ground state v2 with its explicit traversal profile. Earlier package installations retain v1 behavior.');
  const valid=validateRecipe(s.recipe);insist(valid.ok,valid.code,valid.reason);
  for(const key of ['revision','serial','sceneryRevision'])insist(Number.isSafeInteger(s[key])&&s[key]>=0&&s[key]<1e9,'INVALID_REVISION','Invalid saved revision.');
  fields(s.plotGenerations,['west','east']);for(const n of Object.values(s.plotGenerations))insist(Number.isSafeInteger(n)&&n>=0,'INVALID_GENERATION','Invalid plot generation.');
  s.world=openWorld(s.world);s.interactions=openInteractionState(s.interactions);s.actor=openInteractionActor(s.actor);
  insist(/^sandbox-[a-f0-9]{12}$/.test(s.sandboxId),'SAVE_IDENTITY','Restore the saved sandbox event/receipt namespace.');
  const content=contentFor(s.recipe),authored=makeWorld(content,'ground-'+s.sandboxId);
  const metrics=traversalBaseline();fields(s.traversal,Object.keys(metrics));insist(s.traversal.profile===metrics.profile,'TRAVERSAL_PROFILE_UNSUPPORTED','Restore the original movement policy.');
  for(const key of Object.keys(metrics).filter(k=>!['profile','contacts'].includes(k)))insist(Number.isFinite(s.traversal[key])&&s.traversal[key]>=0,'INVALID_TRAVERSAL','Restore finite confirmed movement counters.');
  insist(Array.isArray(s.traversal.contacts)&&s.traversal.contacts.length<=64,'CONTACT_HISTORY_LIMIT','Keep bounded contact evidence.');
  insist(canonical(s.world)===canonical(authored)&&s.actor.id==='player','CHANGED_SCENERY','Restore exact authored geometry and player identity.');
  const definitions=doors=>doors.map(({open,locked,...rest})=>rest);
  insist(s.interactions.worldId===s.world.id&&canonical(definitions(s.interactions.doors))===canonical(definitions(content.interactions.doors))&&!s.interactions.stairs.length,'CHANGED_BINDINGS','Restore exact interaction bindings.');
  fields(s.resources,['health','ap','stamina','inventory']);for(const k of ['health','ap','stamina'])insist(Number.isFinite(s.resources[k])&&s.resources[k]>=0&&s.resources[k]<=1e6,'INVALID_RESOURCES','Restore exact finite spent resources.');
  insist(Array.isArray(s.resources.inventory)&&s.resources.inventory.length<=REGISTRY.policy.inventoryCapacity,'INVALID_INVENTORY','Inventory exceeds the fixture capacity.');
  s.rocks=s.rocks.map(openRock);const authoredRocks=s.recipe.plots.map(p=>plotContent(p).rock).filter(Boolean);
  insist(canonical(s.rocks.map(r=>r.id).sort())===canonical(authoredRocks.map(r=>r.id).sort()),'CHANGED_ITEMS','Restore every authored item instance.');
  const unique=new Set();for(const item of s.resources.inventory){fields(item,['itemId','instanceId','quantity']);const rock=s.rocks.find(r=>r.id===item.instanceId);insist(!unique.has(item.instanceId)&&item.itemId==='item:rock'&&item.quantity===1&&rock?.phase==='carried'&&rock.ownerId==='player','INVENTORY_MISMATCH','Inventory must match carried instances exactly.');unique.add(item.instanceId);}
  for(const rock of s.rocks) {const definition=authoredRocks.find(r=>r.id===rock.id);insist(rock.phase==='carried'?unique.has(rock.id):rock.phase==='world'&&canonical(rock.position)===canonical(definition.position),'ITEM_OWNERSHIP_MISMATCH','Restore item ownership and its original world location.');}
  insist(Array.isArray(s.events)&&s.events.length<=256&&new Set(s.events.map(e=>e.id)).size===s.events.length&&s.events.every(e=>e.sandboxId===s.sandboxId),'INVALID_EVENTS','Keep unique bounded committed event IDs in their original sandbox.');
  insist(Array.isArray(s.receipts)&&s.receipts.length<=128&&new Set(s.receipts.map(r=>r.commandId)).size===s.receipts.length,'INVALID_RECEIPTS','Keep unique bounded durable command receipts.');
  for(const record of s.receipts) {fields(record,['commandId','request','receipt']);insist(record.receipt.commandId===record.commandId&&record.receipt.receiptId===s.sandboxId+'/receipt/'+record.commandId&&record.receipt.ok&&record.receipt.committed&&record.request.commandId===record.commandId,'INVALID_RECEIPTS','Restore complete accepted request and receipt identities.');}
  const queries=createInteractionQueries(s.world,{actors:()=>[s.actor],movementProfile:'disc-slide-v1'});queries.validateBindings(s.interactions);
  if(!s.vehicles.occupancy.length){const pose=queries.walk({state:s.interactions,actor:s.actor,from:s.actor.position,to:s.actor.position});insist(pose.ok,pose.code,pose.reason);}
  return s;
}
export function createGroundHost({recipe=defaultRecipe(),spawn,checkpoint,persist=()=>{},permissions=()=>true}={}) {
  const v=validateRecipe(recipe);insist(v.ok,v.code,v.reason);
  let state=freeze(validateState(checkpoint||initial(v.recipe,spawn))),retired=false,committing=false;
  let connector;
  const listeners=new Set(),emit=()=>{for(const fn of [...listeners])try{fn();}catch{}},queries=(s,ignoreVehicleId)=>createInteractionQueries(s.world,{actors:()=>s.vehicles.occupancy.length?[]:[s.actor],movementProfile:'disc-slide-v1',obstacles:()=>s.vehicles.vehicles.filter(v=>v.id!==ignoreVehicleId).map(v=>vehicleContactShape(v))});
  function publish(candidate,{durable=false}={}) {
    insist(!retired&&!committing,'HOST_UNAVAILABLE','The fixture host is retired or already committing.');
    const prior=state;committing=true;
    try {if(durable)persist(clone(candidate));insist(state===prior,'STALE_TRANSACTION','The source changed during persistence.');state=freeze(candidate);}
    finally{committing=false;}
    emit();return state;
  }
  let vehicleQueries,queryRevision=-1;
  const roadQueries=()=>{if(queryRevision!==state.sceneryRevision){queryRevision=state.sceneryRevision;vehicleQueries=createVehicleQueries(state.world,{obstacles:()=>state.interactions.doors.flatMap(d=>{const bounds=d.open?d.openBounds:d.closedBounds;return bounds?[{id:d.id,bounds}]:[];})});}return vehicleQueries;};
  connector=createVehicleSession({id:'night-ledger-ground-road',vehicles:contentFor(state.recipe).vehicles,checkpoint:state.vehicles,collisionProfile:'oriented-slide-v1',
    queries:{check:(...a)=>roadQueries().check(...a),checkVehicle:(...a)=>roadQueries().checkVehicle(...a),resolve:(...a)=>roadQueries().resolve(...a)},
    canReach:({actor,from,to,ignoreVehicleId})=>queries(state,ignoreVehicleId).walk({state:state.interactions,actor,from,to}),
    actors:{read:id=>id==='player'?state.actor:null,list:()=>[state.actor],transact(updates,accept,staged){
      if(retired||committing||updates.some(u=>u.before.id!=='player'||u.before.revision!==state.actor.revision))return refusal('STALE_ACTOR','The authoritative player changed.');
      const prior=state,next=clone(state);for(const update of updates)next.actor=openInteractionActor(update.after);next.vehicles=clone(staged);next.revision++;
      observeVehicles(next.traversal,state.vehicles,staged,connector.read().contacts||[]);
      // Persist a complete candidate before publishing either authority. A failed
      // write must leave seats, actor pose, resources and leases unchanged.
      const durable=staged.occupancyRevision!==state.vehicles.occupancyRevision;
      committing=true;try{if(durable)persist(clone(next));insist(state===prior,'STALE_TRANSACTION','The retained source changed.');accept();state=freeze(next);}finally{committing=false;}
      emit();return accepted();
    }}});
  if(!state.vehicles.occupancy.length){const pose=queries(state).walk({state:state.interactions,actor:state.actor,from:state.actor.position,to:state.actor.position});if(!pose.ok){connector.dispose();insist(false,pose.code,pose.reason);}}
  const offer=()=>canonical({recipe:state.recipe,revision:state.revision,actor:state.actor,resources:state.resources,interactions:state.interactions,rocks:state.rocks,plotGenerations:state.plotGenerations,vehicles:state.vehicles});
  function readiness(actionId) {
    if(state.vehicles.occupancy.length)return refusal('VEHICLE_OCCUPIED','Exit before using a ground object.');
    const door=state.interactions.doors.find(d=>actionId===d.id+(d.open?'/close':'/open'));
    if(door){const plan=previewInteraction(state.interactions,state.actor,{targetId:door.id,kind:door.open?'close-door':'open-door'},queries(state));return {...plan,targetId:door.id,cost:door.open?REGISTRY.policy.closeDoorAP:REGISTRY.policy.openDoorAP,label:plan.label||(door.open?'Close ':'Open ')+door.label,type:'door'};}
    const rock=state.rocks.find(r=>actionId===r.id+'/pickup');if(rock){const r=pickupRock(rock,{commandId:'readiness',rockId:rock.id,expectedRevision:rock.revision,actorId:state.actor.id,actorPosition:state.actor.position,permitted:!!permissions({type:'pickup',targetId:rock.id,state:clone(state)}),capacity:state.resources.inventory.length<REGISTRY.policy.inventoryCapacity});return {...r,targetId:rock.id,cost:REGISTRY.policy.pickupRockAP,label:'Pick up '+rock.id.replace(':rock',' rock'),type:'item'};}
    return refusal('UNKNOWN_ACTION','Read the current action for this target.');
  }
  function requestAction(input) {
    try {
      fields(input,['commandId','actionId','offer']);insist(typeof input.commandId==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,39}$/.test(input.commandId),'COMMAND_ID','Supply a stable ASCII command ID of at most 40 characters.');
      insist(!retired&&!committing,'HOST_UNAVAILABLE','This host cannot accept a command.');
      const duplicate=state.receipts.find(r=>r.commandId===input.commandId);
      if(duplicate){insist(canonical(duplicate.request)===canonical(input),'COMMAND_ID_CONFLICT','This command ID already identifies a different request.');return {...clone(duplicate.receipt),repeated:true};}
      insist(input.offer===offer(),'STALE_ACTION','Actor, resources, item source or scenery changed. Read a fresh offer.');
      const before=state,ready=readiness(input.actionId);insist(ready.ok,ready.code,ready.reason);
      insist(permissions({type:ready.type,targetId:ready.targetId,state:clone(state)}),'PERMISSION_DENIED','Current fixture permission denied the action.');
      insist(state.resources.ap>=ready.cost,'INSUFFICIENT_AP','The fixture action needs '+ready.cost+' AP.');
      insist(state.receipts.length<128&&state.events.length<255,'RECEIPT_LIMIT','Export this sandbox and explicitly reset before adding more commands.');
      const candidate=clone(state),source=canonical({actor:state.actor,resources:state.resources,rock:ready.type==='item'?state.rocks.find(r=>r.id===ready.targetId):null});let events=[];
      if(ready.type==='door') {
        const result=applyInteraction(state.interactions,state.actor,ready.command,queries(state));insist(result.ok,result.code,result.reason);
        if(state.recipe.probe!=='acknowledge-without-door-effect'){candidate.interactions=result.state;candidate.actor=result.actor;events=result.events;}
      } else {
        const rock=state.rocks.find(r=>r.id===ready.targetId),result=pickupRock(rock,{commandId:state.sandboxId+':'+input.commandId,rockId:rock.id,expectedRevision:rock.revision,actorId:state.actor.id,actorPosition:state.actor.position,permitted:true,capacity:state.resources.inventory.length<REGISTRY.policy.inventoryCapacity});
        insist(result.ok,result.code,result.reason);insist(result.expected===serializeRock(rock),'STALE_ITEM_SOURCE','The complete staged item source differs.');
        insist(result.inventoryDelta.length===1&&result.inventoryDelta[0].quantity===1&&!candidate.resources.inventory.some(i=>i.instanceId===rock.id),'INVENTORY_DELTA','Expected one new inventory instance.');
        candidate.rocks=candidate.rocks.map(r=>r.id===rock.id?result.rock:r);const delta=result.inventoryDelta[0];candidate.resources.inventory.push({itemId:delta.itemId,instanceId:delta.instanceId,quantity:delta.quantity});events=result.events;
      }
      insist(state===before&&source===canonical({actor:state.actor,resources:state.resources,rock:ready.type==='item'?state.rocks.find(r=>r.id===ready.targetId):null}),'STALE_TRANSACTION','Actor/resources/item source changed before commit.');
      candidate.resources.ap-=ready.cost;candidate.serial++;candidate.revision++;
      const receipt=accepted({commandId:input.commandId,receiptId:state.sandboxId+'/receipt/'+input.commandId,targetId:ready.targetId,actionId:input.actionId,cost:{policy:REGISTRY.policy.id,version:1,ap:ready.cost},repeated:false});
      for(const event of events)if(!candidate.events.some(e=>e.id===event.id))candidate.events.push({...event,sourceCommandId:event.commandId||null,sandboxId:state.sandboxId,commandId:input.commandId});
      candidate.receipts.push({commandId:input.commandId,request:clone(input),receipt});publish(candidate,{durable:true});return receipt;
    } catch(error) {return refusal(error.code||'COMMIT_FAILED',error.message);}
  }
  const actions={id:'ground.interactions',read(){if(retired)return {context:'retired',actions:[]};const ids=[...state.interactions.doors.map(d=>d.id+(d.open?'/close':'/open')),...state.rocks.filter(r=>r.phase==='world').map(r=>r.id+'/pickup')];
    return {context:offer(),actions:ids.filter(id=>{const p=state.interactions.doors.find(d=>id.startsWith(d.id+'/'))?.position||state.rocks.find(r=>id===r.id+'/pickup')?.position;return p&&Math.hypot(p.x-state.actor.position.x,p.y-state.actor.position.y)<=3;}).map(id=>{const r=readiness(id);return {id,target:{id:r.targetId},verb:r.type==='item'?'pickup':id.endsWith('/open')?'open':'close',label:r.label||id,enabled:r.ok&&state.resources.ap>=r.cost,reason:r.ok?(state.resources.ap>=r.cost?null:'Insufficient fixture AP'):r.reason};})};},
    request(actionId,expected){return requestAction({commandId:'manual:'+(state.serial+1),actionId,offer:expected});}};
  function prepareRecipe(input) {
    const valid=validateRecipe(input);if(!valid.ok)return valid;
    try {
      insist(!retired&&!committing,'HOST_UNAVAILABLE','The fixture host is unavailable.');
      insist(valid.recipe.seed===state.recipe.seed,'SCENE_RESTART_REQUIRED','Changing the seed requires an explicit sandbox reset with the new recipe.');
      insist(canonical(valid.recipe.driving)===canonical(state.recipe.driving),'SCENE_RESTART_REQUIRED','Use Try / reset to change the occupied driving course.');
      const prior=state,candidate=clone(state),changed=valid.recipe.plots.filter(p=>canonical(p)!==canonical(state.recipe.plots.find(q=>q.slot===p.slot)));
      for(const p of changed){const slot=slotById(p.slot),a=state.actor,r=a.radiusM;
        insist(!(a.position.x+r>=slot.origin.x&&a.position.x-r<=slot.origin.x+slot.sizeM&&a.position.y+r>=slot.origin.y&&a.position.y-r<=slot.origin.y+slot.sizeM),'PLOT_OCCUPIED','Leave '+slot.name+' before replacing it, or explicitly restart the sandbox.');
        insist(!state.rocks.some(item=>item.id.startsWith(p.slot+':')&&item.phase!=='world'),'OWNED_RESOURCE_IN_USE','A carried item still belongs to '+slot.name+'. Keep its fixture or explicitly reset the sandbox.');
        candidate.plotGenerations[p.slot]++;
      }
      candidate.recipe=valid.recipe;candidate.revision++;
      if(changed.length){const content=contentFor(valid.recipe);candidate.world=makeWorld(content,state.world.id);candidate.sceneryRevision++;
        candidate.interactions.doors=valid.recipe.plots.map(p=>changed.some(q=>q.slot===p.slot)?plotContent(p).door:clone(state.interactions.doors.find(d=>d.id===p.slot+'/door')));candidate.interactions.revision++;
        candidate.rocks=valid.recipe.plots.flatMap(p=>{const spec=plotContent(p).rock;return !spec?[]:[changed.some(q=>q.slot===p.slot)?createRock(spec):clone(state.rocks.find(r=>r.id===spec.id))];});
      }
      validateState(candidate);let used=false;
      return {ok:true,snapshot:clone(candidate),changedSlots:changed.map(p=>p.slot),commit(){try{insist(!used&&state===prior,'STALE_PREPARATION','The accepted scene changed after preparation.');used=true;publish(candidate,{durable:true});return accepted({changedSlots:changed.map(p=>p.slot)});}catch(e){return refusal(e.code||'COMMIT_FAILED',e.message);}},dispose(){used=true;}};
    }catch(e){return refusal(e.code||'PREPARATION_FAILED',e.message);}
  }
  function walk(actorId,vector,seconds){if(retired||committing)return refusal('HOST_UNAVAILABLE','The host is unavailable.');if(actorId!=='player')return refusal('ACTOR_UNAVAILABLE','Use the current player.');if(state.vehicles.occupancy.length)return refusal('VEHICLE_OCCUPIED','Exit before walking.');if(state.recipe.probe==='acknowledge-without-motion')return accepted({probe:'no-motion'});
    const result=walkActor(state.interactions,state.actor,{direction:vector,seconds},queries(state));if(!result.ok)return refusal(result.code,result.reason);if(result.actor.revision===state.actor.revision)return {...accepted(),committed:false};const next=clone(state);next.actor=result.actor;next.revision++;next.traversal.walkDistanceM+=result.movement?.distanceM||0;if(result.movement?.contacts.length){next.traversal.walkSlideDistanceM+=result.movement.distanceM;next.traversal.contacts.push(...result.movement.contacts.map(c=>({...clone(c),actorId:'player',step:next.traversal.steps})));next.traversal.contacts=next.traversal.contacts.slice(-64);}publish(next);return accepted({movement:result.movement});}
  const host={actions,connector,actorIds:['player'],get actors(){return [clone(state.actor)];},subscribe(fn){listeners.add(fn);return ()=>listeners.delete(fn);},read:()=>clone(state),offer,requestAction,prepareRecipe,save:()=>JSON.stringify(state),walk,
    readPose(){return clone({actorId:state.actor.id,revision:state.actor.revision,position:state.actor.position,mode:connector.readForActor('player').mode});},
    scene:{content:clone(identity),actorIds:['player'],actionProviders:[actions],read(){const s=connector.readForActor('player'),v=s.vehicle;return {version:1,actorId:'player',mode:s.mode,contextId:s.contextId,walkingAllowed:!retired&&s.walkingAllowed,position:clone(state.actor.position),transport:v?{kind:'road-vehicle',connectorId:connector.id,vehicleId:v.id,seatId:s.seatId}:null,cameraFrame:v?{version:1,kind:'road-vehicle',connectorId:connector.id,vehicleId:v.id,centre:clone(v.position),headingRad:v.headingRad,bounds:vehicleBounds(v)}:null,status:['health','ap','stamina'].map(id=>({id,label:id,value:String(state.resources[id])}))};},subscribe(fn){listeners.add(fn);return ()=>listeners.delete(fn);}},
    walking:{request(intent){if(intent.version!==1)return refusal('COMMAND_VERSION','Use a versioned walking intent.');return walk(intent.actorId,intent.vector,intent.seconds);}},
    passage(slotId){const slot=slotById(slotId);insist(slot,'UNKNOWN_PLOT','Select a known plot.');const {x,y}=slot.origin;return clone(queries(state).walk({state:state.interactions,actor:state.actor,from:{x:x+8,y:y+13.4,h:0},to:{x:x+8,y:y+10.4,h:0}}));},
    advance(seconds=0){insist(!retired,'HOST_RETIRED','Host retired.');if(state.recipe.probe!=='acknowledge-without-motion'){const r=connector.advance(seconds);if(!r.ok)return r;}const next=clone(state);next.traversal.steps++;publish(next);return accepted();},dispose(){if(retired)return;retired=true;connector.dispose();listeners.clear();}};
  return Object.freeze(host);
}
