// Read-only user review helper. No game writes, remote calls or browser ownership.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.join(project, 'dist');
const helper = path.join(project, 'artifacts/building-library-preview');
const owner = '01a18109-8bdd-73a2-b61a-3d2cd8f8fcb3';
const building = process.argv.find(arg => arg.startsWith('--building='))?.slice('--building='.length);
if (building && !/^[a-z0-9-]+$/.test(building)) throw Error('Use a building ID from the catalogue.');
fs.mkdirSync(helper, {recursive: true});
const stopFile = path.join(helper, 'STOP');
if (fs.existsSync(stopFile)) throw Error('STOP marker exists. Verify the prior helper exited before removing it.');
if (!fs.existsSync(path.join(root, 'buildings/index.html'))) throw Error('Run npm run build first.');
const startedAt = new Date(), expiresAt = new Date(startedAt.getTime() + 30 * 60 * 1000);
const processIdentity = process.platform === 'win32' ? JSON.parse(execFileSync('powershell.exe', ['-NoProfile', '-Command', `$p=Get-Process -Id ${process.pid};[pscustomobject]@{pid=$p.Id;creationFiletime=$p.StartTime.ToUniversalTime().ToFileTimeUtc().ToString();executable=$p.Path}|ConvertTo-Json -Compress`], {encoding: 'utf8', windowsHide: true})) : {pid: process.pid, executable: process.execPath};
const types = {'.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.png':'image/png', '.gltf':'model/gltf+json', '.bin':'application/octet-stream'};
const server = http.createServer((request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405).end(); return; }
  let file;
  try {
    const name = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (name.split('/').some(p => p.startsWith('.'))) { response.writeHead(403).end(); return; }
    file = path.resolve(root, '.' + name);
  } catch { response.writeHead(400).end(); return; }
  if (file !== root && !file.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
  if (file === root || fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { response.writeHead(404).end(); return; }
  response.writeHead(200, {'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff'});
  if (request.method === 'HEAD') response.end(); else fs.createReadStream(file).pipe(response);
});
let stopping = false;
const stop = reason => {
  if (stopping) return;
  stopping = true;
  clearInterval(watcher); clearTimeout(expiry);
  server.close(() => {
    fs.writeFileSync(path.join(helper, 'cleanup-receipt.json'), JSON.stringify({owner, process: processIdentity, reason, stoppedAt: new Date().toISOString(), port: record.port, httpClosed: !server.listening}, null, 2));
    process.exit(0);
  });
  server.closeAllConnections();
};
const watcher = setInterval(() => { if (fs.existsSync(stopFile)) stop('private STOP marker'); }, 300);
const expiry = setTimeout(() => stop('30 minute review expiry'), expiresAt.getTime() - Date.now());
process.on('SIGINT', () => stop('SIGINT')); process.on('SIGTERM', () => stop('SIGTERM'));
let record;
server.listen(0, '127.0.0.1', () => {
  record = {owner, project:'Nautilus Engine', purpose:building?'User review of native editable game-map buildings':'User review of the original building catalogue', process: processIdentity, startedAt: startedAt.toISOString(), expiresAt: expiresAt.toISOString(), port: server.address().port, stopFile, url:'http://127.0.0.1:' + server.address().port + (building?'/index.html?building='+building:'/buildings/index.html')};
  fs.writeFileSync(path.join(helper, 'process.json'), JSON.stringify(record, null, 2));
  console.log(JSON.stringify(record));
});
