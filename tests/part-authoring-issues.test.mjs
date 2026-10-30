import test from 'node:test';
import assert from 'node:assert/strict';
import {partAuthoringStatus,selectPartAuthoringIssue} from '../apps/editor/part-authoring-issues.js';

test('authoring status never grants play/export from a visual/functional label',()=>{
  for(const state of ['functional','decorative','incomplete','unsupported','preparing','unbound']) {
    const result=partAuthoringStatus({state});assert.equal(result.mayPlay,false);assert.equal(result.mayExport,false);
  }
  assert.equal(partAuthoringStatus({state:'functional',mayPlay:true,mayExport:false}).mayPlay,true);
  assert.equal(partAuthoringStatus({state:'preparing',mayPlay:true,mayExport:true}).mayPlay,false);
});

test('named readiness issue selects its exact source-map part/property and stale issues do nothing',()=>{
  const target={instanceId:'assembly:10',partId:'entry-leaf:9',propertyPath:'/initial/locked'},calls=[];
  const issue={code:'TEST_MISSING_POLICY',target,remedy:'Bind the selected lock policy.'};
  const select=value=>calls.push(['select',value]),focusProperty=value=>calls.push(['focus',value]);
  assert.equal(selectPartAuthoringIssue({issue,select,focusProperty}).code,'EDITOR_STALE_ISSUE');assert.deepEqual(calls,[]);
  assert.equal(selectPartAuthoringIssue({issue,issueToken:'doc-1:kit-1',currentToken:'doc-1:kit-2',select,focusProperty}).code,'EDITOR_STALE_ISSUE');assert.deepEqual(calls,[]);
  const result=selectPartAuthoringIssue({issue,issueToken:'doc-1:kit-2',currentToken:'doc-1:kit-2',select,focusProperty});assert.equal(result.ok,true);
  assert.deepEqual(calls,[['select',target],['focus','/initial/locked']]);assert.notEqual(result.target,target);
  assert.equal(selectPartAuthoringIssue({issue,issueToken:'x',currentToken:'x',select:()=>false,focusProperty}).code,'EDITOR_TARGET_UNAVAILABLE');
  const before=calls.length;
  assert.equal(selectPartAuthoringIssue({issue:{target:{...target,partId:''}},issueToken:'x',currentToken:'x',select,focusProperty}).code,'EDITOR_ISSUE_WITHOUT_TARGET');assert.equal(calls.length,before);
});
