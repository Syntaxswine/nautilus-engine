// Read-only, loopback-only playtest preview with a real expiry and stop marker.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {parseArgs} from 'node:util';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.join(project, 'dist');
const helper = path.join(project, 'artifacts/train-playtest-preview');
const owner = '01a18107-b4af-78c0-850f-0235d4df307f';
const {values} = parseArgs({options: {port: {type: 'string', default: '0'}, 'expires-at': {type: 'string'}}});
const requestedPort = Number(values.port);
if (!Number.isInteger(requestedPort) || requestedPort < 0 || requestedPort > 65535) throw Error('Choose a loopback port from 0 to 65535.');
const entry = process.env.NAUTILUS_TRAIN_PREVIEW_ENTRY || 'examples/train-yard.html';
const lifetimeMs = Number(process.env.NAUTILUS_TRAIN_PREVIEW_MS || 48 * 60 * 60 * 1000);
if (!Number.isSafeInteger(lifetimeMs) || lifetimeMs < 1000 || lifetimeMs > 48 * 60 * 60 * 1000) {
  throw Error('Choose a preview lifetime between one second and 48 hours.');
}
if (!/^[a-zA-Z0-9_/-]+\.html$/.test(entry) || entry.includes('..')) throw Error('Choose a project-relative HTML entry.');
if (!fs.existsSync(path.join(root, entry))) throw Error('Build the train playtest before starting its preview.');
fs.mkdirSync(helper, {recursive: true});
const stopFile = path.join(helper, 'STOP');
if (fs.existsSync(stopFile)) throw Error('STOP marker exists. Verify the previous helper exited before deliberately removing it.');
const identity = process.platform === 'win32' ? JSON.parse(execFileSync('powershell.exe', ['-NoProfile', '-Command',
  `$p=Get-Process -Id ${process.pid};[pscustomobject]@{pid=$p.Id;creationFiletime=$p.StartTime.ToUniversalTime().ToFileTimeUtc().ToString();executable=$p.Path}|ConvertTo-Json -Compress`
], {encoding: 'utf8', windowsHide: true})) : {pid: process.pid, executable: process.execPath};
const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], {cwd: project, encoding: 'utf8', windowsHide: true}).trim();
const startedAt = new Date(), expiresAt = values['expires-at'] ? new Date(values['expires-at']) : new Date(startedAt.getTime() + lifetimeMs);
const remainingMs = expiresAt.getTime() - startedAt.getTime();
if (!Number.isFinite(remainingMs) || remainingMs < 1000 || remainingMs > 48 * 60 * 60 * 1000) {
  throw Error('Choose a future preview deadline within 48 hours.');
}
const types = {'.html':'text/html', '.js':'text/javascript', '.mjs':'text/javascript', '.css':'text/css',
  '.json':'application/json', '.png':'image/png', '.webp':'image/webp', '.jpg':'image/jpeg', '.svg':'image/svg+xml',
  '.gltf':'model/gltf+json', '.glb':'model/gltf-binary', '.bin':'application/octet-stream', '.mp3':'audio/mpeg', '.ogg':'audio/ogg', '.ttf':'font/ttf'};
const server = http.createServer((request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405, {'Allow':'GET, HEAD'}).end(); return; }
  let file;
  try {
    const name = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (name.split(/[\\/]/).some(part => part.startsWith('.'))) { response.writeHead(403).end(); return; }
    file = path.resolve(root, '.' + name);
  } catch { response.writeHead(400).end(); return; }
  if (file !== root && !file.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
  if (file === root) { response.writeHead(302, {'Location':'/' + entry}).end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { response.writeHead(404).end('Not found'); return; }
  response.writeHead(200, {'Content-Type': types[path.extname(file)] || 'application/octet-stream',
    'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff'});
  if (request.method === 'HEAD') response.end();
  else fs.createReadStream(file).on('error', () => response.destroy()).pipe(response);
});
let record, stopping = false;
function stop(reason) {
  if (stopping) return;
  stopping = true;
  clearInterval(watcher); clearTimeout(expiry);
  server.close(() => {
    fs.writeFileSync(path.join(helper, 'cleanup-receipt.json'), JSON.stringify({owner, process: identity, reason,
      port: record?.port, stoppedAt: new Date().toISOString(), httpClosed: !server.listening}, null, 2));
    process.exit(0);
  });
  server.closeAllConnections();
}
const watcher = setInterval(() => { if (fs.existsSync(stopFile)) stop('private STOP marker'); }, 300);
const expiry = setTimeout(() => stop('preview expiry'), Math.max(0, expiresAt.getTime() - Date.now()));
process.on('SIGINT', () => stop('SIGINT')); process.on('SIGTERM', () => stop('SIGTERM'));
server.on('error', error => { clearInterval(watcher); clearTimeout(expiry); console.error(error.message); process.exitCode = 1; });
server.listen(requestedPort, '127.0.0.1', () => {
  record = {owner, project:'Nautilus Engine', purpose:'User playtest of boarding, driving and riding both train circuits',
    process: identity, sourceCommit, startedAt: startedAt.toISOString(), expiresAt: expiresAt.toISOString(),
    port: server.address().port, stopFile, url:'http://127.0.0.1:' + server.address().port + '/' + entry};
  fs.writeFileSync(path.join(helper, 'process.json'), JSON.stringify(record, null, 2));
  console.log(JSON.stringify(record));
});
