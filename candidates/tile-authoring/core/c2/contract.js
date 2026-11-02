import grammar from './contract.schema.json' with {type:'json'};
import capture from './abi/proposal.schema.json' with {type:'json'};
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
export const SCHEMA=freeze(grammar),CAPTURE_SCHEMA=freeze(capture);
export const LIMITS=freeze({commandBytes:1000000,sourceBytes:4000000,outputBytes:4000000,inputBytes:6000000,plannerUnits:1000000,nodes:200000,depth:32,operations:1024,owners:32,mapRecipes:32,definitions:128,presets:128,artwork:256,maxSteps:256,maxClosure:32,maxSpatialTests:100000,maxGeometryWork:100000,neighbourRadiusM:0});
export const REQUIRED=freeze(['public-v1-source-validation','owner-local-level-top-v1']);
export const PROFILES=freeze({host:'nautilus-tile-authoring-c2-host-v1',appearance:'owner-local-rectangle-appearance-v1',ledger:'owned-appearance-transition-v1',decoder:'png-rgba8-srgb-straight-v1',sampler:'linear-premultiplied-bilinear-frame-v1',clip:'candidate.level-rectangle-top-v1'});
export const CAPS=freeze({declaredDecodedAllocationBytes:33554432,residentMarksAllViews:1024,rootsAllViews:2,trianglesAllViews:50000,cellsAllViews:1024,ownedAppearanceMaterialsAllViews:64,contributorsPerBin:8,binReferencesAllViews:32768,derivedBufferBytesAllViews:4194304,atlasPagesAllViews:4});
export const STAGE_A=freeze(['content.import','surface.layers','decoration.add','decoration.update','decoration.remove']);

export const STAGE_B=freeze([...STAGE_A,'preset.save']);
