import {inputData,fields,finite} from '../world-core/validation.js';
/** Upright rectangular-body aperture check; dimensions are measured metres.
 * It does not infer a portal from its leaf or change either body's dimensions.
 */
export function apertureReadiness(input){
  const data=inputData(input);fields(data,['body','aperture'],'');fields(data.body,['radiusM','heightM'],'/body');fields(data.aperture,['widthM','heightM'],'/aperture');
  finite(data.body.radiusM,.05,5,'/body/radiusM');finite(data.body.heightM,.1,10,'/body/heightM');finite(data.aperture.widthM,.01,64,'/aperture/widthM');finite(data.aperture.heightM,.01,64,'/aperture/heightM');
  if(data.body.heightM>data.aperture.heightM+1e-7)return {ok:false,code:'APERTURE_BODY_TOO_TALL',path:'/aperture/heightM',reason:'The measured body is taller than the native opening.',action:'Choose a genuinely fitting actor/opening or a separately supported stance; preserve the native model and collider scale.'};
  if(data.body.radiusM*2>data.aperture.widthM+1e-7)return {ok:false,code:'APERTURE_BODY_TOO_WIDE',path:'/aperture/widthM',reason:'The measured body footprint is wider than the native opening.',action:'Choose a fitting opening or actor profile; do not shrink the collision body.'};
  return {ok:true};
}
