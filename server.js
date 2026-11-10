const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto'),{WebSocketServer}=require('ws');
const html=fs.readFileSync(path.join(__dirname,'public','index.html'));
const DB=path.join(__dirname,'data.json');
let D={users:{},tok:{}};try{D=JSON.parse(fs.readFileSync(DB))}catch(e){}
let dirty=0;const save=()=>{dirty=1};setInterval(()=>{if(dirty){dirty=0;fs.writeFile(DB,JSON.stringify(D),()=>{})}},3000);
const PRICE={b_classic:0,b_wood:150,b_ice:300,b_emerald:600,b_ruby:700,b_marble:900,b_obs:1200,p_classic:0,p_ivory:200,p_gold:800,p_neon:600,p_crystal:700,p_royal:1000};
const BOT=[400,550,700,850,1000,1200,1400,1650,1900,2200];
const hash=(p,s)=>crypto.scryptSync(p,s,32).toString('hex');
const pub=u=>({u:u.name,elo:u.elo,w:u.w,l:u.l,d:u.d,coins:u.coins,own:u.own});
const byTok=t=>{const n=D.tok[t];return n&&D.users[n]};
function record(u,res,opp){if(!u)return;const e=1/(1+Math.pow(10,(opp-u.elo)/400)),s=res=='w'?1:res=='d'?.5:0;u.elo=Math.max(100,u.elo+Math.round(32*(s-e)));u[res]++;u.coins+=res=='w'?50:res=='d'?10:5;save()}
const server=http.createServer((q,r)=>{
  if(q.url.startsWith('/api/')){let b='';q.on('data',c=>{b+=c;if(b.length>5000)q.destroy()});q.on('end',()=>{let j={};try{j=JSON.parse(b||'{}')}catch(e){}
    const out=(o,c=200)=>{r.writeHead(c,{'Content-Type':'application/json'});r.end(JSON.stringify(o))};
    const p=q.url.split('?')[0],u=byTok(j.t||'');
    if(p=='/api/items')return out(PRICE);
    if(p=='/api/register'||p=='/api/login'){const n=String(j.u||'').trim(),pw=String(j.p||'');
      if(!/^[A-Za-z0-9_]{3,16}$/.test(n)||pw.length<4)return out({e:'Username 3-16 letters/numbers, password 4+'},400);
      let x=D.users[n.toLowerCase()];
      if(p=='/api/register'){if(x)return out({e:'Username le liya gaya'},400);const s=crypto.randomBytes(8).toString('hex');x=D.users[n.toLowerCase()]={name:n,s,h:hash(pw,s),elo:800,w:0,l:0,d:0,coins:100,own:['b_classic','p_classic']};save()}
      else if(!x||x.h!==hash(pw,x.s))return out({e:'Galat username/password'},400);
      const t=crypto.randomBytes(16).toString('hex');D.tok[t]=n.toLowerCase();save();return out({t,me:pub(x)})}
    if(!u)return out({e:'Login karo'},401);
    if(p=='/api/me')return out(pub(u));
    if(p=='/api/buy'){const pr=PRICE[j.id];if(pr===undefined||u.own.includes(j.id))return out({e:'Invalid'},400);if(u.coins<pr)return out({e:'Coins kam hain'},400);u.coins-=pr;u.own.push(j.id);save();return out(pub(u))}
    if(p=='/api/solo'){const L=Math.min(10,Math.max(1,j.lv|0)),res=['w','l','d'].includes(j.res)?j.res:'l';record(u,res,BOT[L-1]);return out(pub(u))}
    out({e:'?'},404)});return}
  r.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});r.end(html)});
const wss=new WebSocketServer({server});const rooms=new Map();
wss.on('connection',(ws,req)=>{
  const sp=new URL(req.url,'http://x').searchParams,code=(sp.get('room')||'').replace(/[^a-z0-9]/gi,'').slice(0,20);
  if(!code){ws.close();return}
  let R=rooms.get(code);if(!R){R={set:new Set(),done:new Set(),host:null,guest:null};rooms.set(code,R)}
  if(R.set.size>=2){ws.close(1008,'full');return}
  R.set.add(ws);const role=sp.get('role'),user=byTok(sp.get('t')||'');if(role=='host')R.host=user;else R.guest=user;
  ws.on('message',d=>{if(d.length>16384)return;const s=d.toString();
    try{const m=JSON.parse(s);if(m.t=='st'&&m.d&&m.d.over&&m.d.gid&&!R.done.has(m.d.gid)){R.done.add(m.d.gid);const o=m.d.over,hw=o.w?(o.w==m.d.hc?'w':'l'):'d',gw=hw=='w'?'l':hw=='l'?'w':'d',ra=R.host?R.host.elo:800,rb=R.guest?R.guest.elo:800;record(R.host,hw,rb);record(R.guest,gw,ra)}}catch(e){}
    for(const o of R.set)if(o!==ws&&o.readyState===1)o.send(s)});
  ws.on('close',()=>{R.set.delete(ws);if(!R.set.size)rooms.delete(code)});
});
server.listen(process.env.PORT||3000,()=>console.log('Royal Chess running'));
