// Private constructor authenticity is independent of unfinished runtime ports.
// The Core source verifier owns Kernel/authority/profile membership; this module
// never accepts callback predicates, copied DTOs or ready flags as permission.
import {kernelConstructionSourceForHost} from '../host-construction.js';
import {fail,need,own} from './data.js';

const compositions=new WeakMap();
const hookNames=[
 'assertPaired','requireCountedBootstrap','beginPrepare','captureRetainedIngress',
 'originalRequestId','ownsConnection','cancelOwnedPreparation','checkAllowed',
 'retirePreviousInput','captureSource','captureObligations','bindSourceOnce',
 'sourceCurrent','nativeReadiness','bindActualManagerCandidate','prepareInput',
 'requireOwnedPrepared','serializeBoundDocument','adoptActualTicket',
 'createActualOperation','beforeActualWal','recordActualWal','phaseRefusal',
 'retireBeforeStage','finishUnacquired','retainFailedPreparation',
 'selectsRetainedCommand','enterActualApply','enterActualRecovery',
 'validateActualCommit','acceptActualOutcome','refuseActualOutcome',
 'retainActualUnknown','retireReviewThroughManager',
 'retireSessionResourcesThroughSameManager','recoveryCanWrite',
 'retainBootstrapRecovery','requireBootstrapEscrow','beginBootstrapRetry',
 'finishBootstrapRetry','beginRestore','requireOwnedRestore','finishRestore',
 'refuseRestore','restorePresentation'
];
const unbound=(code,method)=>function(){fail(code,'The authentic private Host has no paired executable '+method+' port.');};

/** Return an authentic opaque producer even while final Native ports refuse.
 * bootstrap, when supplied, is an already-owned actual Core token. It grants
 * no new reservation or edit work and is rechecked at its real use site. */
export function createPrivateC2HostComposition(input){
 const {owner,kernel,authority,profile,bootstrap}=own(input,
  ['owner','kernel','authority','profile','bootstrap'],
  ['owner','kernel','authority','profile']);
 const source=kernelConstructionSourceForHost(kernel,{owner,authority,profile});
 let record,bootstrapAttempt=null;
 const c2PhasePorts=Object.freeze({kind:'nautilus-editor-c2-phase-ports',version:1,
  prepare:unbound('C2_HOST_PHASE_UNBOUND','prepare'),
  restore:unbound('C2_HOST_NATIVE_UNBOUND','restore')});
 const hooks=Object.fromEntries(hookNames.map(name=>[name,unbound('C2_HOST_'+(
  /Wal|Operation|Commit|Apply/.test(name)?'FINAL_BIND':
  /Recovery|Recover|BootstrapRetry|BootstrapEscrow/.test(name)?'RECOVERY':
  /Manager|Retire|Restore|Presentation|native/.test(name)?'NATIVE':
  /Source|Ingress|Obligations|Connection|Request|Prepare|Input/.test(name)?'SOURCE':'PHASE')+'_UNBOUND',name)]));
 hooks.assertPaired=function(input){
  const value=own(input,['codec','phasePorts','profile']);
  // The constructor already authenticates the captured opaque authority.
  // This prologue receives actual internal codec/profile values; bootstrap
  // separately validates its actual raw authority at the use site below.
  need(source.matchesActualCodec(value.codec)&&
   source.matchesActualProfile(value.profile)&&value.phasePorts===c2PhasePorts,
  'C2_HOST_PAIRING');
  return true;
 };
 hooks.requireCountedBootstrap=function(actualAuthority,codec){
  need(source.matchesActualAuthority(actualAuthority)&&source.matchesActualCodec(codec),
   'C2_HOST_PAIRING');
  need(bootstrap!==undefined,'C2_HOST_BOOTSTRAP_UNBOUND');
  const current=owner.snapshot(bootstrap);
  need(current.purpose==='bootstrap'&&current.requestId===null&&
   current.phase==='source'&&['opening','open'].includes(current.state),
  'C2_HOST_BOOTSTRAP_UNBOUND');
  // Session's boot restore carries an attempt wrapper. The work token remains
  // the exact original Core token; this cancellation signal mints no work.
  bootstrapAttempt??=Object.freeze({work:bootstrap,signal:new AbortController().signal});
  return bootstrapAttempt;
 };
 // This is the original Session construction site, not an extra history.
 // Core authenticates the current settled checkpoint and all five options,
 // keeps the one actual journal and refuses another successful construction.
 hooks.constructActualJournal=function(input){
  const value=own(input,['checkpoint','options']);
  return source.constructSessionJournal(value);
 };
 hooks.adoptActualManager=unbound('C2_HOST_NATIVE_UNBOUND','adoptActualManager');
 hooks.bindActualTargetAcquisition=unbound('C2_HOST_NATIVE_UNBOUND','bindActualTargetAcquisition');
 const c2Host=Object.freeze(hooks);
 record=Object.freeze({kernel,owner,authority,profile,c2Host,c2PhasePorts});
 const handle=Object.freeze({});
 compositions.set(handle,record);
 return handle;
}

/** Core calls this source-private verifier, never a caller-supplied resolver. */
export function hostCompositionSourceForKernel(handle){
 const record=compositions.get(handle);
 need(record,'C2_HOST_COMPOSITION_UNBOUND');
 kernelConstructionSourceForHost(record.kernel,{
  owner:record.owner,authority:record.authority,profile:record.profile});
 return record;
}
