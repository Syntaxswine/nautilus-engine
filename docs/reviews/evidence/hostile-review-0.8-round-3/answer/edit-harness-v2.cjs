const fs = require('fs'), f = process.argv[2];
let s = fs.readFileSync(f, 'utf8');
const swap = (a, b) => {if (s.split(a).length !== 2) throw Error('needle: ' + a.slice(0, 90)); s = s.replace(a, b);};
swap(`  {id: 'K3-no-per-copy-culling', why: 'every camera draws every copy: round 3 MF-B again', edits: [e(CB, 'const seen=!this.perObjectFrustumCulled||frustum.intersectsSphere(this.spheres[k]);', 'const seen=true;')], tests: COPY},
  {id: 'K4-culled-copy-draws', edits: [e(CB, 'this._multiDrawCounts[k]=seen?count:0;', 'this._multiDrawCounts[k]=count;')], tests: COPY},
  {id: 'K5-table-rewritten-per-camera', why: 'the D3D11 stall: the copy table uploaded for every camera', edits: [e(CB, '    this._multiDrawCount=n;\\n', '    this._multiDrawCount=n;this._indirectTexture.needsUpdate=true;\\n')], tests: COPY},
  {id: 'K6-empty-sub-draws-trail', edits: [e(CB, 'if(seen)n=k+1;', 'n=k+1;')], tests: COPY},`,
`  {id: 'K3-no-per-copy-culling', why: 'every camera draws every copy: round 3 MF-B again', edits: [e(CB, 'if(this.perObjectFrustumCulled&&!frustum.intersectsSphere(this.spheres[k])){run=-1;continue;}', '')], tests: COPY},
  {id: 'K4-runs-draw-nothing', edits: [e(CB, 'if(run<0||!runs){run=k;counts[k]=count;}', 'if(run<0||!runs){run=k;}')], tests: COPY},
  {id: 'K5-table-rewritten-per-camera', why: 'the D3D11 stall: the copy table uploaded for every camera', edits: [e(CB, 'this._multiDrawCount=n;this._multiDrawInstances=', 'this._indirectTexture.needsUpdate=true;this._multiDrawCount=n;this._multiDrawInstances=')], tests: COPY},
  {id: 'K6-empty-sub-draws-trail', edits: [e(CB, 'instances[run]++;n=run+1;', 'instances[run]++;n=k+1;')], tests: COPY},
  {id: 'K13-runs-never-used', why: 'one sub-draw per copy even with WEBGL_multi_draw (the f98d4cc behaviour)', edits: [e(CB, "const runs=!!renderer?.extensions?.has('WEBGL_multi_draw')", 'const runs=false')], tests: COPY},
  {id: 'K14-run-spans-a-culled-copy', why: 'a gap does not end a run: the culled copy is drawn', edits: [e(CB, '{run=-1;continue;}', '{continue;}')], tests: COPY},
  {id: 'K15-shader-reads-draw-id-only', why: 'every instance of a run drawn at its first copy', edits: [e(CB, "T.ShaderChunk[name]=T.ShaderChunk[name].replaceAll(READ,'getIndirectIndex( gl_DrawID + gl_InstanceID )');", '')], tests: COPY},
  {id: 'K16-runs-without-the-extension', why: 'three\\'s instanced fallback sets no draw id', edits: [e(CB, 'this._multiDrawInstances=runs?instances:null;', 'this._multiDrawInstances=instances;')], tests: COPY},`);
fs.writeFileSync(f, s); console.log('ok');
