import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), root = path.join(project, 'dist');
const preview = path.join(project, 'artifacts/preview');fs.mkdirSync(preview, {recursive:true});
const stopFile = path.join(preview, 'STOP');if (fs.existsSync(stopFile)) fs.unlinkSync(stopFile);
if (!fs.existsSync(path.join(root, 'index.html'))) throw Error('Run npm run build first.');
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.jpg':'image/jpeg','.txt':'text/plain'};
const server = http.createServer((request,response)=>{
  let file;try{file=path.resolve(root,'.'+decodeURIComponent(new URL(request.url,'http://localhost').pathname));}catch{response.writeHead(400);response.end();return;}
  if (file!==root&&!file.startsWith(root+path.sep)){response.writeHead(403);response.end();return;}
  if(file===root||fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
  if(!fs.existsSync(file)||!fs.statSync(file).isFile()){response.writeHead(404);response.end('Not found');return;}
  response.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});fs.createReadStream(file).pipe(response);
});
const stop=()=>{clearInterval(watcher);clearTimeout(expiry);server.close(()=>process.exit(0));server.closeAllConnections();};
const watcher=setInterval(()=>{if(fs.existsSync(stopFile))stop();},500),expiry=setTimeout(stop,30*60*1000);
process.on('SIGINT',stop);process.on('SIGTERM',stop);
server.listen(Number(process.env.PORT||4517),'127.0.0.1',()=>{const record={pid:process.pid,task:'01a1806f-707a-7322-9ce3-cd6a3014e872',project:'nautilus-engine',executable:process.execPath,purpose:'Temporary editor verification',port:server.address().port,startedAt:new Date().toISOString(),expiresAt:new Date(Date.now()+30*60*1000).toISOString(),stopFile};fs.writeFileSync(path.join(preview,'process.json'),JSON.stringify(record,null,2));console.log(JSON.stringify({...record,url:'http://127.0.0.1:'+record.port}));});
