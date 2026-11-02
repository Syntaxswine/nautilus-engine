import * as installedGrenades from '@nautilus-engine/core/grenades';
import {GrenadeAim as InstalledGrenadeAim} from '@nautilus-engine/core/grenades/aim';
const grenadeFixture=installedGrenades.createGrenadeExample();
const grenadeCommand={version:1,id:'installed-grenade',expectedRevision:0,actorId:grenadeFixture.control.actorId,point:{x:23,y:10}};
assert.equal(installedGrenades.previewGrenade(grenadeFixture,grenadeCommand).ok,true);
const grenadeAccepted=installedGrenades.stageGrenade(grenadeFixture,grenadeCommand);assert.equal(grenadeAccepted.ok,true);
const grenadeRestored=installedGrenades.openGrenadeState(installedGrenades.serializeGrenadeState(grenadeAccepted.next));
const grenadeRetry=installedGrenades.stageGrenade(grenadeRestored,grenadeCommand);assert.equal(grenadeRetry.repeated,true);
assert.equal(grenadeRetry.next.actors.find(actor=>actor.id===grenadeFixture.control.actorId).grenades,2);
const installedAim=new InstalledGrenadeAim();installedAim.start();assert.ok(installedAim.aim({x:2,y:2},{x:1,y:0},10));installedAim.cancel();
assert.equal(installedGrenades.GRENADE_CONTRACT.presentation,'transient-not-saved');
assert.ok(fs.readFileSync(new URL('docs/grenades.md',new URL('node_modules/@nautilus-engine/core/',import.meta.url)),'utf8').includes('grenade'));
console.log('Installed grenade profile: public preview, transaction, save/retry, controls and builder guide pass.');

// The original game is a test-only host beside the installed package.
// It is never included in the distributed engine runtime.
import * as grenadeSource from './grenade-proof/sites/tactical-animal/dist/solo-game.js';
const sourceGame=grenadeSource.createSoloGame({...grenadeSource.DEFAULT_BUILD,utility:'grenade'});
const sourceHero=grenadeSource.hero(sourceGame);
sourceHero.x=4;sourceHero.y=25;sourceHero.ap=12;sourceHero.weapon='smg';
for(const guard of sourceGame.units.slice(1)){guard.x=36;guard.y=27;guard.alert=true;}
sourceGame.engaged=true;sourceGame.phase='player';grenadeSource.refresh(sourceGame,{forceFog:true});
const sourceBefore=grenadeSource.encodeSave(sourceGame);
const installed=await import('@nautilus-engine/core/grenades');
const sourceContext=installed.projectFarmyardGrenadeContext(sourceGame,{geometry:grenadeSource.geometry(sourceGame)});
const sourceSidecar=installed.createGrenadeState({id:'installed-original-game',...sourceContext});
const sourceCommand={version:1,id:'source-parity',expectedRevision:0,actorId:sourceSidecar.control.actorId,point:{x:10,y:25}};
const sourceStaged=installed.stageGrenade(sourceSidecar,sourceCommand);
assert.equal(sourceStaged.ok,true);
assert.equal(grenadeSource.encodeSave(sourceGame),sourceBefore);
assert.equal(grenadeSource.Core.throwGrenade(sourceGame,sourceHero,sourceCommand.point),true);
const sourceAfter=installed.projectFarmyardGrenadeContext(sourceGame,{geometry:grenadeSource.geometry(sourceGame)});
assert.deepEqual(sourceStaged.next.actors,sourceAfter.actors);
assert.deepEqual(sourceStaged.next.control,sourceAfter.control);
assert.equal(sourceHero.weapon,'smg');
assert.equal(sourceHero.ammo.grenade,2);
assert.equal(installed.openGrenadeState(installed.serializeGrenadeState(sourceStaged.next)).actors[0].ap,sourceHero.ap);
console.log('Installed grenade module and actual pinned Farmyard game: public projection, command parity, finite stock and reload pass.');

for(const id of ['@nautilus-engine/core/grenades/ui','@nautilus-engine/core/grenades/style.css','@nautilus-engine/core/grenades/view'])await assert.rejects(()=>import(id),{code:'ERR_PACKAGE_PATH_NOT_EXPORTED'});
