const http=require('http'),fs=require('fs'),path=require('path'),{WebSocketServer}=require('ws');
const html=fs.readFileSync(path.join(__dirname,'public','index.html'));
const server=http.createServer((q,r)=>{r.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});r.end(html)});
const wss=new WebSocketServer({server});
const rooms=new Map();
wss.on('connection',(ws,req)=>{
  const code=(new URL(req.url,'http://x').searchParams.get('room')||'').replace(/[^a-z0-9]/gi,'').slice(0,20);
  if(!code){ws.close();return}
  let set=rooms.get(code);if(!set){set=new Set();rooms.set(code,set)}
  if(set.size>=2){ws.close(1008,'full');return}
  set.add(ws);
  ws.on('message',d=>{if(d.length>8192)return;for(const o of set)if(o!==ws&&o.readyState===1)o.send(d.toString())});
  ws.on('close',()=>{set.delete(ws);if(!set.size)rooms.delete(code)});
});
server.listen(process.env.PORT||3000,()=>console.log('chess server running'));
