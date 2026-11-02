import test from 'node:test';import assert from 'node:assert/strict';
import {formFromFields,formInputOwner,createFormProducer,fieldDefaults,valuesForMark} from '../form-producer.mjs';
import {complete,painted,pin,metadata,inspectSurface,sourceExpected,selection} from '../../c2-host-bridge/tests/fixture.mjs';
import {validateUIShape} from '../../c2-host-bridge/vendor/ui5a7/root/candidates/tile-authoring/ui/c2-runtime/contract.js';
import {canonicalMaskData} from '../../c2-host-bridge/query.mjs';
const artwork=pin(metadata.listSharedArtwork().find(r=>r.id==='artist.graphic.road-number-0'));
const read=()=>({overlay:{chosenArtwork:artwork,selection:{selectedLayerId:'layer.fixture'},palette:[{artwork,origin:'builtin-offer'}]}});
test('intrinsic actual first/add form producer seeds untouched placeholders from exact original defaults',()=>{
 const defaults=metadata.sharedArtworkDefaults(artwork);
 for(const kind of ['first-mark','decoration.add']){const form=formFromFields(read(),{...fieldDefaults},new Set(),kind);assert.deepEqual(form.graphic,{form:defaults.form,transform:defaults.transform,opacity:defaults.opacity,tintLinearRGB:defaults.tintLinearRGB,mask:defaults.mask});assert.deepEqual(formInputOwner.touched(null,form),[]);assert.ok(Object.isFrozen(form));assert.ok(Object.isFrozen(form.graphic.transform));assert.deepEqual(validateUIShape('Form',form),form);assert.equal('touched' in form,false);assert.equal('permission' in form,false);}
 const fields=valuesForMark(null,artwork);assert.equal(fields.width,String(defaults.transform.sizeM[0]));assert.equal(fields.height,String(defaults.transform.sizeM[1]));assert.equal(fields.mask,'all-surface');
});
test('intrinsic touches are explicit, frozen, private per producer and deny copies/forgeries',()=>{
 const values={...fieldDefaults,width:'2.75',opacity:'.35',rotation:'.123'},form=formFromFields(read(),values,new Set(['width','opacity','rotation']),'first-mark'),touches=formInputOwner.touched(null,form),defaults=metadata.sharedArtworkDefaults(artwork);
 assert.deepEqual(touches,['sizeM','rotationRad','opacity']);assert.ok(Object.isFrozen(touches));assert.equal(form.graphic.transform.sizeM[0],2.75);assert.equal(form.graphic.transform.sizeM[1],defaults.transform.sizeM[1]);assert.equal(form.graphic.opacity,.35);assert.equal(form.graphic.transform.rotationRad,.123);assert.throws(()=>touches.push('mask'));assert.throws(()=>{form.graphic.opacity=.9;});
 for(const fake of [structuredClone(form),{...form},null,{}])assert.equal(formInputOwner.touched(null,fake),null);
 const foreign=createFormProducer(),other=foreign.formFromFields(read(),values,new Set(['width']),'first-mark');assert.equal(formInputOwner.touched(null,other),null);assert.equal(foreign.formInputOwner.touched(null,form),null);
 assert.throws(()=>formFromFields(read(),values,{has(){return true;}},'first-mark'),{code:'C2_FORM_TOUCH_SOURCE'});
});
test('explicit update producer preserves untouched radians, pivots and mask rather than reseeding originals',()=>{
 const d=painted(artwork),target=inspectSurface(d,sourceExpected(d),selection(d)),mark=structuredClone(d.authoring.decorations.chunks[0].marks[0]),r=read();mark.graphic.mask=canonicalMaskData({kind:'grid-cells',cells:[{i:0,j:0},{i:1,j:0},{i:3,j:2}]},target);const original=structuredClone(mark);r.overlay.selection.selectedMark=mark;r.overlay.selection.selectedLayerId=mark.layerId;const form=formFromFields(r,{...valuesForMark(mark),opacity:'.2'},new Set(['opacity']),'decoration.update');assert.deepEqual(form.changes,[{field:'opacity',value:.2}]);assert.equal(mark.graphic.transform.rotationRad,.234567);assert.deepEqual(mark.graphic.transform.pivotUV,[.31,.72]);assert.deepEqual(mark.graphic.mask,original.graphic.mask);assert.equal(mark.graphic.mask.kind,'grid-spans');
});
