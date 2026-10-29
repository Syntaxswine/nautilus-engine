// Proposed data only. No public export, content fetch, provider or game policy.
// Rebuild with --write; otherwise verify both reviewed binding files.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const review='docs/reviews/actor-height-intake/';
const inventory=read(review+'sources.json'),measure=read(review+'measurements.json');
const base='vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/';
const live='sites/tactical-animal/dist/aft/tactics/';
const study='sites/tactical-animal/dist/designer/a20b343a0234/tactics/';
const admin='assets/art/exposition-administration/';
function ref(sourceId,p){
 const source=inventory.sources.find(s=>s.id===sourceId),file=source?.files.find(f=>f.path===p);
 assert.ok(file,'Uninventoried reference: '+sourceId+':'+p);
 return {sourceId,repository:source.repository,commit:source.commit,...file};
}
function closure(id){const c=inventory.closures.find(c=>c.id===id);assert.ok(c);return {id:c.id,sourceId:c.source,fileCount:c.fileCount,bytes:c.bytes,nonThreeBytes:c.nonThreeBytes,manifest:review+'sources.json'};}
const factories={horse:['horse-light-model.js','createLightHorse'],goat:['goat-worker.js','createGoatWorker'],bull:['bull-worker.js','createBullWorker'],cow:['cow-worker.js','createCowWorker'],donkey:['donkey-worker.js','createDonkeyWorker'],sheep:['sheep-worker.js','createSheepWorker'],skunk:['skunk-worker.js','createSkunkWorker'],'pig-foreman':['pig-foreman.js','createPigForeman'],'pig-director':['pig-director.js','createPigDirector'],rabbit:['rabbit-worker.js','createRabbitWorker'],dog:['dog-guard.js','createDogWorker'],hen:['hen-worker.js','createHen']};
const shared={schemaVersion:1,status:'proposed-binding-data-only',baselineCommit:inventory.baselineCommit,
 publicExport:null,loaderImplementation:null,sourceManifest:review+'sources.json',measurementRecord:review+'measurements.json',
 rights:'Preserve source hashes and notices. Mixed or unspecified asset/code rights are not replaced by a new blanket license; provenance is not a redistribution grant.'};
const actor={...shared,kind:'actor-content-intake',units:'metres',
 space:{nativeWorldUnitsPerMetre:1,groundAxes:['x','z'],up:'+y',restForward:'+x',scale:[1,1,1],
  placement:'Keep a host placement/support Group outside worker.root: pose providers reset the inner root.',
  heading:'Model pose(mode,heading) rotates +Y by degrees. Farmyard locomotion takes ground heading degrees and rotates -Y. Host heading conversion applies once; do not rotate both roots.'},
 actors:measure.actors.nautilus.map(a=>({
  proposedId:'aft:'+a.id,sourceSpecies:a.id,label:a.label,
  availability:'already vendored native body; public actor loader pending',
  factory:{...ref('nautilus',base+factories[a.id][0]),export:factories[a.id][1]},
  meshData:ref('nautilus',a.data),
  normalPaint:ref('nautilus',path.posix.normalize(base+a.paint)),paintFrame:a.frame,
  neutralBounds:a.neutralBounds,neutralHeight:a.height,restBodyGeometry:a.body,
  authoringSourceTriangles:a.sourceTriangles,boneNames:a.boneNames,
  equipment:a.hasEquipmentAPI?{method:'equipWeapon',rightPalm:{bone:'hand1',localPoint:[.052,-.010,0]},leftPalm:{bone:'hand-1',localPoint:[.052,-.010,0]},
   semantics:'Contact points, not automatic item ownership. Weapon grip/support/stock/muzzle anchors remain weapon-local.'}:
   {method:null,reason:'Bird has a separate eleven-bone rig and no equipWeapon on the native factory. A supported wing/prop adapter is required; reject generic mammal equipment.'},
  outfits:{normal:'existing projected painterly turnaround and species layers',
   redHats:a.id==='pig-foreman'?'No alternate application in createAnimalPaint; original foreman paint remains':a.id==='hen'||a.id==='pig-director'?'existing tailored red-hat paint':'existing shared red-hat uniform projection',
   ...(a.id==='donkey'?{blueHawaiian:'existing procedural guide shirt and straw-hat assembly; separate cosmetic selection'}:{})},
  factoryAnimationClipCount:0,animationForm:'Procedural skeleton/IK APIs; no pre-exported glTF/FBX AnimationClip is present on these factory roots.'
 })),
 existingWeapons:measure.weapons.nautilus.map(w=>({...w,source:ref('nautilus',base+(w.id==='grenade'?'grenade-model.js':'weapon-models.js'))})),
 motionProviders:[
  {id:'native-carry',sourceId:'nautilus',api:'worker.pose("carry", headingDegrees)',time:'static pose',support:'eleven mammal factories; bird equipment requires its own adapter',verification:'native default carry contacts measured for both pinned source families'},
  {id:'farmyard-distance-gait',source:ref('farmyard',live+'worker-locomotion.js'),export:'createWorkerLocomotion',api:'apply({distance,blend,heading,pose})',time:'distance in metres, blend 0..1, heading in degrees',support:'existing mammal IK and bird-specific branch',verification:'Misha standing/kneeling/prone rest and movement sampled; other species motion remains intake review'},
  {id:'farmyard-battle-posture',source:ref('farmyard',live+'battle-posture.js'),export:'createBattlePosture',api:'apply(sample); ground() when required by down pose',time:'host-owned stance blend',support:'profile-driven kneel/prone/down; mutates cloth and tail geometry/weights',verification:'six Misha stance/gait combinations measured'},
  {id:'farmyard-armed-idle',source:ref('farmyard',live+'armed-idle-motion.js'),export:'createArmedIdle',api:'at(timeSeconds, options); dispose()',time:'guard loop 12 seconds, mercenary loop 16 seconds',verification:'source/closure inspected; not sampled or visually accepted in this checkpoint'},
  {id:'farmyard-mammal-study',source:ref('farmyard',live+'animal-motion.js'),export:'createMammalMotion',api:'apply(timeSeconds, options); restore(); dispose()',time:'authored study timeline',verification:'source/closure inspected; not a gameplay controller'},
  {id:'farmyard-prone-study',source:ref('farmyard',live+'animal-prone-motion.js'),export:'createProneMotion',api:'apply(timeSeconds, options); restore(); dispose()',time:'duration 12 seconds; shot presentation marker 6.2 seconds',support:'explicitly horse only',verification:'source restriction preserved; do not advertise it for Misha'},
  {id:'farmyard-grenade-throw-study',source:ref('farmyard',study+'grenade-throw-motion.js'),export:'createGrenadeThrow',api:'at(timeSeconds); diagnostics(); dispose()',time:'4.6 seconds',support:'requires a grenade prop, authored foot meshes and compatible skeleton; Misha donkey sampled',verification:'twelve source times plus release/reseek/rejection probes'}
 ],
 firstRockWorkflowCandidate:{
  identity:{existingPresetId:'demolition',existingName:'Misha',species:'donkey',source:ref('farmyard',live+'quickplay-presets.js')},
  factory:{...ref('farmyard',live+'donkey-worker.js'),export:'createDonkeyWorker'},
  bodyData:ref('farmyard',live+'donkey-10k-data.json'),
  carriedWeapon:'pistol',throwReferenceProp:'grenade',normalSkin:'donkey-worker-model-paint-v1.png',
  liveRenderer:ref('farmyard','sites/tactical-animal/dist/field-view.js'),
  liveBehavior:'Live FieldView draws the grenade trajectory/effect. It does not invoke the detailed designer body-throw study.',
  markers:{clipId:'farmyard-grenade-throw-study',durationSeconds:4.6,
   semanticEvents:[{id:'prop-pin-pulled',seconds:.50},{id:'prop-pin-dropped',seconds:.70},{id:'front-foot-planted',seconds:1.60},{id:'prop-release',seconds:1.92},{id:'prop-lever-released',seconds:1.945}],
   rockRelevantMarker:'prop-release',releaseNormalizedTime:1.92/4.6,releaseCenterLocal:measure.motion.throw.releaseCenter,
   timePolicy:'Host animation clock. A marker is a presentation notification with command/clip-instance identity; seeking, reload and replay must not emit a second action.'},
  blockers:['The source throws only grenade.id === "grenade" and includes pin, lever and demonstration projectile physics. A rock needs a reviewed body-motion/hand adapter; do not rename the rock to grenade.',
   'rock-v1 throwRock already returns the authoritative release receipt and inventory delta. The host must align animation to its one committed release, recheck permission/origin and deduplicate command IDs; a clip marker never commits an extra throw, impact, noise or cost.',
   'Select one shared Three namespace for model, animation, renderer and attachments. Source-relative donor Three imports need a deliberate optional adapter even though both reviewed revisions report r180.',
   'Retarget held prop and support/collision origin at the host world transform without rescaling the actor or substituting the study flight for rock-v1 sweeps.',
   'Measured Misha standing height is 1.7619365453720093 m. The sampled prone surface minimum is -0.1216023834274016 m before any separate grounding. The existing live caller grounds down/casualty poses only; prone support and door clearance need a reviewed binding.'],
  measuredClearance:measure.motion.supportFindings,
  closures:[closure('farmyard-misha-normal'),closure('farmyard-throw-study')]
 },
 ownership:{
  host:['renderer, scene, camera, placement/support transform, authoritative actors/inventory, animation clock, command/event ledger, game policies, shared Three namespace'],
  bodyInstance:['generated mesh geometries, body/grey materials, default rifle, grip/cuff geometry and materials, skeleton and any generated bone texture'],
  replacementEquipment:'Caller owns replacement weapons, mounts and hoses. Existing mammal worker.dispose owns its default rifle, not a separately equipped weapon; release each identity once.',
  paint:'createAnimalPaint owns fetched textures, projection render target and depth texture, validity DataTexture, paint material, species layers and cosmetic helpers. createModelPaint disposes its input texture; do not pass a borrowed host texture without an explicit lease/clone adapter. The high-level paint wrapper also disposes its tracked loads, so exactly-once resource ownership needs review.',
  motion:'Stop/restore procedural drivers before releasing the body; some drivers replace weights/skeletons or mutate tail/cloth data. Current dispose APIs are not one uniform lifecycle.',
  asynchronous:'A future loader needs cancellation/generation tickets, partial-load rollback, late-texture disposal and shared-data leases. Import alone must not fetch, create a renderer or start a clock.',
  notOwned:['host renderer, camera, scene, outside placement transform, authoritative gameplay state, shared source-data cache, borrowed textures/materials unless explicitly leased'],
  estimate:'Paint projection declares a 2048 x 1024 colour/depth target plus per-image validity mask. Counts/format give an allocation estimate; no GPU/device budget was measured.'},
 closureInventory:[closure('existing-nautilus-actor-library'),closure('farmyard-all-actors-and-motion')],
 recommendation:'Keep the existing vendored art identities. Prepare one lazy Misha binding and a presentation-only body-throw adapter before accepting a broad actor loader; preserve bird-specific equipment restrictions.'};

const roles={1:['pavilion-floor','First pavilion floor / rotunda'],3:['pavilion-floor','Second pavilion floor'],5:['pavilion-floor','Third pavilion floor'],7:['pavilion-floor','Fourth pavilion floor'],9:['roof-and-lower-gallery','Pavilion roofs and lower gallery'],19:['upper-terrace','Upper colonnade terrace'],23:['dome-spring-ring','Narrow dome spring ring']};
const height={...shared,kind:'tall-building-intake',assetId:'exposition-administration-1893',
 factory:{...ref('administration',admin+'index.js'),export:'createAdministrationBuilding'},
 sourcePlan:ref('administration',admin+'plan.js'),sourceMetadata:ref('administration',admin+'metadata.json'),
 units:'metres',space:{up:'+y',groundAxes:['x','z'],forward:'front is -z; rear is +z',
  origin:'ground at centre of the front footprint',scale:[1,1,1],worldUnitsPerMetre:1,
  placement:'integer X/Z metres; Y a multiple of 2.12 m; quarterTurns 0..3; factory rotates -quarterTurns * pi/2',
  localBounds:measure.height.localBounds},
 dimensions:{bodyFootprintMetres:[80,80],fullEnvelopeMetres:[92,76.32,92],slabThickness:.12,wallHeight:2,wallThickness:.16,
  nativeDatumInterval:2.12,firstFloorAboveGround:2.12,ordinaryDoorLeaf:[1,1.65,.12]},
 countSemantics:{pavilionStories:4,authoredSurfaceRecords:7,nativeHeightMarkers:37,
  fifteenConnectedOccupiedStoriesVerified:false,
  meaning:'The 0..36 markers are height datums. Most are structural divisions or open voids, not occupied floors; floor index is not a story count.'},
 surfaces:measure.height.floors.map(f=>({id:f.id,sourceLevel:f.nativeLevel,localSurfaceY:f.localSurfaceY,
  role:roles[f.nativeLevel][0],label:roles[f.nativeLevel][1],polygons:f.polygons,holes:f.holes,
  thickness:.12,sourceUse:f.use,navigation:'unassigned; geometry-only candidate',
  ...(f.nativeLevel===9?{regionSplitRequired:'Source combines roofs and lower gallery in one surface record. Bind regions explicitly before roof/walking policy.'}:{}),
  ...(f.nativeLevel>=19?{access:'No source stair/traversal route to this surface. Do not invent a connection.'}:{})})),
 crown:{sourceMarker:36,localHeight:76.32,role:'decorative-crown',occupiedFloor:false,createFloor:false},
 plinth:{groundY:0,firstOccupiedPlateY:2.12,foundationStartsY:0,occupiedBasementVerified:false},
 stairs:measure.height.stairs.map(p=>({id:p.id,centre:[p.x,p.z],headingRadians:p.heading,
  sourceLevels:[1,3,5,7],localSurfaceElevations:[2.12,6.36,10.6,14.84],treads:72,treadRiseMetres:2.12/12,
  outerRadius:3.4,innerRadius:1.3,
  proposedLinks:[[1,3],[3,5],[5,7]].map(([a,b])=>({fromSourceLevel:a,toSourceLevel:b,fromY:a*2.12,toY:b*2.12,treads:24,status:'art geometry; require swept clearance, landing, collision and traversal validation'}))})),
 openings:{ordinaryLeafWidth:1,ordinaryLeafHeight:1.65,
  source:'PLAN.runs[].openings provides local run x, width, bottom, height, kind and arch radius; PLAN.rooms identifies thirteen front offices. Source metadata also supplies compiled structural fragments.',
  characterClearance:'Misha neutral mesh is taller than the 1.65 m ordinary leaf. A future query/stance adapter must validate actual openings and actor clearance; do not resize either mesh.',
  entryApproaches:'Four source exterior approaches use twelve treads each from ground to 2.12 m. Gameplay traversal unassigned.'},
 geometry:{measured:measure.height.diagnostics,closure:closure('administration-runtime'),
  sourceEngine:{repository:'https://github.com/Syntaxswine/nautilus-engine',commit:'90054d07134116a5d9661f8318a76fe68f922aad',
   path:'vendor/nautilus-engine/90054d07134116a5d9661f8318a76fe68f922aad/packages/map-core/wall-runs.js',
   resolution:'Already nested inside this Tinderbox commit; exact bytes included in the seven-file closure. No current Nautilus vendor/root changes.'},
  legacyFragments:'Five independently validated six-layer wall fragments with vertical offsets. These do not constitute one valid legacy six-layer map.',
  proposedHeightCapacity:'Highest surface datum 23 is within a zero-based 32-position proposal. Crown datum 36 must remain a finite decorative geometry height; it must not become an extra navigable floor or be clamped away.'},
 ownership:{host:['one shared Three namespace, scene/placement, appearance source materials/textures, physical-material assignment, query/traversal/fire state'],
  factory:['generated geometries, cloned/default materials, InstancedMesh allocations'],
  dispose:'Remove root and call idempotent building.dispose(). Borrowed source materials/maps/textures remain host-owned. setAppearance stages replacement clones and disposes old clones.',
  measured:measure.height.disposal},
 limits:['No fifteen-story navigable fixture was found or verified in this bounded source review. This is an existing high-building and vertical-void candidate, not acceptance of the separate fifteen-story gameplay requirement.',
  'Collision, roof/galleries, actor support, stair links, access to upper terraces, high-floor projectiles, fire/collapse and performance are not integrated.',
  'Do not relabel source marker 36 as an occupied floor, flatten to the legacy top/canopy layer or rescale the model.',
  'The 614274-triangle landmark is not a measured phone rendering budget. Detailed interiors/cutaways and exterior quality require explicit optional profiles.'],
 recommendation:'Accept the small binding inventory as a tall-height/void audit candidate. Keep the heavy landmark optional; use a separately validated fifteen-story connected fixture for world-contract acceptance.'};

for(const [name,data]of [['actor-intake-v1.json',actor],['tall-building-intake-v1.json',height]]){
 const target=path.join(root,'packages/assets/bindings',name),text=JSON.stringify(data,null,2)+'\n';
 if(process.argv.includes('--write'))fs.writeFileSync(target,text);else assert.equal(fs.readFileSync(target,'utf8'),text,'Binding differs from reviewed inventory: '+name);
}
console.log('Verified proposed bindings: 12 existing actors, 13 weapons, Misha release markers and seven Administration surface records. No public loader/export.');
