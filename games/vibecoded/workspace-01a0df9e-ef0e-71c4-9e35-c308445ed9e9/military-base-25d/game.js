/* ============================================================
   BUILD A MILITARY BASE — 2.5D fan remake
   Flat 2D picture sprites on an angled plane. No 3D models.
   ============================================================ */
'use strict';

// ================= helpers =================
const $ = s => document.querySelector(s);
const clamp = (v,a,b)=> v<a?a:(v>b?b:v);
const clamp01 = v => clamp(v,0,1);
const dist = (a,b)=> Math.hypot(a.x-b.x, a.y-b.y);
const rnd = (a=1,b)=> b===undefined ? Math.random()*a : a+Math.random()*(b-a);
const pick = arr => arr[Math.floor(Math.random()*arr.length)];
const fmt = n => {
  n = Math.floor(n);
  if (n>=1e9) return (n/1e9).toFixed(2)+'B';
  if (n>=1e6) return (n/1e6).toFixed(2)+'M';
  if (n>=1e4) return (n/1e3).toFixed(1)+'k';
  return n.toLocaleString('en-US');
};
const fmtTime = s => { s=Math.max(0,Math.ceil(s)); return Math.floor(s/60)+':'+String(s%60).padStart(2,'0'); };
const lerp=(a,b,t)=>a+(b-a)*t;

// ================= data =================
const WORLD = {w:3800, h:3800};
const ISLAND = {x:60, y:60, w:3680, h:3680};
const PLOT  = {x:1390, y:2750, w:12, h:7};          // player plot = SOUTH (85px grid slots)
const SLOT  = 85;

// 7 bot bases arranged in a star around the city (see map layout)
const BOT_DEFS = [
  {name:'BOT 1', dir:'NORTH',     plot:{x:1390, y:350}},
  {name:'BOT 2', dir:'NORTHEAST', plot:{x:2540, y:550}},
  {name:'BOT 3', dir:'EAST',      plot:{x:2540, y:1600}},
  {name:'BOT 4', dir:'SOUTHEAST', plot:{x:2540, y:2550}},
  {name:'BOT 5', dir:'SOUTHWEST', plot:{x:240,  y:2550}},
  {name:'BOT 6', dir:'WEST',      plot:{x:240,  y:1600}},
  {name:'BOT 7', dir:'NORTHWEST', plot:{x:240,  y:550}},
];
// Bot base presets: [buildingType, gx, gy] on a 12x7 grid
const PRESETS = [
  {id:'empty',    label:'BASE 0 · EMPTY',           tier:0, b:[]},
  {id:'scrap',    label:'BASE 1 · SCRAP (BAD)',     tier:1, b:[['solar',1,1],['solar',3,1],['oil',5,1],['rock',2,4],['tree',8,4],['flag',10,2]]},
  {id:'village',  label:'BASE 2 · VILLAGE (POOR)',  tier:2, b:[['solar',1,1],['solar',3,1],['oil',5,1],['barracks',7,1],['data',1,3],['tree',10,4],['wall',7,0],['wall',8,0]]},
  {id:'standard', label:'BASE 3 · STANDARD (AVERAGE)',tier:3, b:[['oil',1,1],['oil',3,1],['data',5,1],['data',5,3],['barracks',8,1],['tankfac',8,3],['logistics',1,4],['depot',3,4],['wall',8,0],['wall',9,0],['wall',10,0],['flag',11,4]]},
  {id:'fortified',label:'BASE 4 · FORTIFIED (GOOD)',tier:4, b:[['data',1,1],['data',4,1],['oil',7,1],['research',9,1],['barracks',1,3],['tankfac',4,3],['heliport',7,3],['logistics',1,5],['depot',4,5],['wall',7,0],['wall',8,0],['wall',9,0],['wall',10,0],['wall',11,0],['flag',11,4]]},
  {id:'industrial',label:'BASE 5 · INDUSTRIAL (GREAT)',tier:5, b:[['industrial',1,1],['data',4,1],['research',7,1],['afbase',9,1],['barracks',1,4],['tankfac',4,4],['heliport',7,4],['logistics',1,5],['depot',4,5],['wall',0,0],['wall',1,0],['wall',2,0],['wall',3,0],['wall',9,0],['wall',10,0],['wall',11,0],['flag',11,5]]},
  {id:'mechlab',  label:'BASE 6 · MECH LAB (INSANE)',tier:6, b:[['industrial',1,1],['industrial',4,1],['mechi',7,1],['research',10,1],['afbase',1,4],['barracks',5,4],['tankfac',8,4],['heliport',10,4],['logistics',4,5],['depot',6,5],['wall',7,0],['wall',8,0],['wall',9,0],['flag',0,5]]},
  {id:'golden',   label:'BASE 7 · GOLDEN UTOPIA (MAX)',tier:7, b:[['goldenTurbine',1,1],['goldenTurbine',3,1],['goldenTurbine',5,1],['goldenTurbine',7,1],['zeppeldock',9,1],['industrial',1,3],['industrial',4,3],['mechi',7,3],['goldenCrane',10,4],['afbase',1,5],['barracks',4,5],['tankfac',6,5],['goldenMechStat',11,6],['depot',9,6],['goldenBomb',0,1],['wall',7,0],['wall',8,0],['wall',9,0],['flag',0,6]]},
];
const PRESET_MAP = Object.fromEntries(PRESETS.map(p=>[p.id,p]));
const plotAt = (gx,gy)=> ({ x: PLOT.x + gx*SLOT, y: PLOT.y + gy*SLOT });
const plotOrigin = owner => owner==='p' ? PLOT : BOT_DEFS[owner].plot;
function bPos(b){ const o=plotOrigin(b.owner??"p"); const d=BUILD[b.type]; const x=o.x+(b.gx+d.w/2)*SLOT, y=o.y+(b.gy+d.h)*SLOT; b.x=x; b.y=y; return {x,y}; } // anchor: bottom-center (caches b.x/b.y)
function botCenter(i){ const p=BOT_DEFS[i].plot; return {x:p.x+SLOT*6, y:p.y+SLOT*3.5}; }

const RAR = {
  common:{c:'#8f9aa8'}, rare:{c:'#4a90e2'}, epic:{c:'#a35ad6'},
  legend:{c:'#f5a53f'}, myth:{c:'#ef5350'}, gold:{c:'#ffd54f'},
};

// buildings: w/h in grid slots
const BUILD = {
  solar:      {name:'Solar Array',       tab:'production', cost:300,    w:1,h:1, income:1,   power:3,    rar:'common', hp:150,  info:'$1/s passive income'},
  oil:        {name:'Oil Drill',         tab:'production', cost:1000,   w:1,h:1, income:4,   power:10,   rar:'common', hp:250,  info:'$4/s passive income'},
  data:       {name:'Data Center',       tab:'production', cost:5000,   w:2,h:1, income:15,  power:50,   rar:'rare',   hp:400,  info:'$15/s passive income'},
  cookie:     {name:'Cookie Stand',      tab:'production', cost:8000,   w:1,h:1, income:6,   power:20,   rar:'rare',   hp:200,  info:'$6/s • who needs a cookie stand in a military base?'},
  research:   {name:'Research Lab',      tab:'production', cost:25000,  w:2,h:2, income:12,  power:250,  rar:'epic',   hp:800,  info:'$12/s • unlocks nothing, looks smart'},
  industrial: {name:'Industrial Drill',  tab:'production', cost:60000,  w:2,h:2, income:120, power:600,  rar:'legend', hp:1200, info:'$120/s • legendary money machine', req:3000},
  logistics:  {name:'Logistics Warehouse',tab:'special',  cost:2500,   w:2,h:1, income:0,   power:25,   rar:'common', hp:300,  info:'+10% total income (max 5 placed)'},
  depot:      {name:'Supply Depot',      tab:'special',  cost:2000,   w:1,h:1, income:0,   power:20,   rar:'common', hp:300,  info:'+10 unit capacity (max 100)'},
  barracks:   {name:'Barracks',          tab:'units',    cost:1500,   w:2,h:1, unit:'rifle', spawnEvery:8,  power:150,  rar:'common', hp:400,  info:'Trains a Rifleman every 8s'},
  tankfac:    {name:'Tank Factory',      tab:'units',    cost:6000,   w:2,h:1, unit:'tank',  spawnEvery:15, power:600,  rar:'rare',   hp:700,  info:'Builds a Tank every 15s'},
  heliport:   {name:'Heliport',          tab:'units',    cost:25000,  w:2,h:2, unit:'heli',  spawnEvery:20, power:2500, rar:'epic',   hp:1000, info:'Deploys a Helicopter every 20s', req:2000},
  afbase:     {name:'Air Force Base',    tab:'units',    cost:120000, w:3,h:2, unit:'jet',   spawnEvery:25, power:12000,rar:'legend', hp:1500, info:'Builds a Jet every 25s', req:10000},
  mechi:      {name:'Mech Bay',          tab:'units',    cost:600000, w:3,h:3, unit:'mech',  spawnEvery:40, power:60000,rar:'myth',   hp:2000, info:'Forges a Mini Mecha every 40s', req:50000},
  stealthlab: {name:'Stealth Bay',       tab:'units',    cost:15000,  w:2,h:2, unit:'spectre',spawnEvery:22,power:3000, rar:'epic',   hp:800,  info:'Deploys a Spectre (STEALTH) every 22s — needs detection to counter', req:3000},
  zeppeldock: {name:'Zeppelin Dock',     tab:'units',    cost:1500000,w:3,h:2, unit:'zeppelin',spawnEvery:60,power:150000,rar:'myth',  hp:2500, info:'Moors a Zeppelin every 60s', req:150000},
  goldenTurbine:{name:'Golden Wind Turbine',tab:'production', cost:null,w:1,h:1, income:400,power:12000, rar:'gold',  hp:2000, info:'$400/s • survives rebirth • crate only'},
  tree:       {name:'Pine Tree',         tab:'decor',    cost:150,    w:1,h:1, income:0,   power:1,    rar:'common', hp:100,  info:'Cosmetic. Protects moths.'},
  rock:       {name:'Rock',              tab:'decor',    cost:150,    w:1,h:1, income:0,   power:1,    rar:'common', hp:100,  info:'Cosmetic. Very natural.'},
  flag:       {name:'Flag',              tab:'decor',    cost:200,    w:1,h:1, income:0,   power:2,    rar:'common', hp:100,  info:'Cosmetic. Wave it with pride.'},
  wall:       {name:'Wall',              tab:'decor',    cost:250,    w:1,h:1, income:0,   power:10,   rar:'common', hp:600,  info:'Cosmetic. Defends nothing.'},
  goldenCrane:  {name:'Golden Crane',       tab:'decor', cost:null, w:2,h:1, income:0, power:12000, rar:'gold', hp:2000, info:'Golden decor • crate only'},
  goldenBomb:   {name:'Golden Nuclear Bomb',tab:'decor', cost:null, w:1,h:1, income:0, power:12000, rar:'gold', hp:2000, info:'Golden decor • crate only'},
  goldenMechStat:{name:'Golden Mech Statue', tab:'decor',cost:null, w:1,h:1, income:0, power:12000, rar:'gold', hp:2000, info:'Golden decor • crate only'},
};

// Unit TYPE TAGS: 'land' | 'air' | 'armored' | 'stealth'  (a unit can hold several)
//  air     -> flies over water (no pathfinding)
//  armored -> flat damage reduction (armor)
//  stealth -> invisible/untargetable unless DETECTED (unit.detect range, in combat, or point-blank)
const UNITS = {
  rifle:    {hp:40,   dmg:4,  speed:95,  range:170, rate:1.0, power:15,   reward:25,  name:'Rifleman',   types:['land']},
  tank:     {hp:240,  dmg:18, speed:55,  range:270, rate:1.6, power:120,  reward:120, name:'Tank',       types:['land','armored'], armor:6},
  heli:     {hp:170,  dmg:22, speed:140, range:320, rate:1.4, power:500,  reward:250, name:'Helicopter', types:['air'], detect:260},
  jet:      {hp:130,  dmg:40, speed:230, range:400, rate:1.8, power:2000, reward:600, name:'Jet',        types:['air','armored'], armor:4, detect:340},
  mech:     {hp:900,  dmg:60, speed:42,  range:330, rate:2.0, power:8000, reward:1500,name:'Mini Mecha', types:['land','armored'], armor:14, detect:220},
  zeppelin: {hp:1400, dmg:80, speed:36,  range:520, rate:2.6, power:15000,reward:3000,name:'Zeppelin',   types:['air','armored'], armor:20},
  spectre:  {hp:95,   dmg:15, speed:125, range:150, rate:1.1, power:700,  reward:320, name:'Spectre',    types:['land','stealth'], stealth:true},
};
const isAir = u => u.boss?false:UNITS[u.type].types.includes('air');
const isStealth = u => u.boss?false:UNITS[u.type].stealth;
const unitArmor = u => u.boss?BOSS.armor:UNITS[u.type].armor||0;
const unitDetect = u => u.boss?0:UNITS[u.type].detect||0;
const BOSS = {hp:2600, dmg:30, speed:26, range:90, rate:1.5, power:50000, reward:25000, name:'MECHA WORM', types:['land','armored'], armor:2};

const CRATE_TABLES = {
  standard: [['solar',3],['oil',2],['tree',2],['rock',2],['flag',1],['cookie',1]],
  elite:    [['data',3],['cookie',2],['logistics',2],['depot',2],['tankfac',2],['stealthlab',1],['tree',1]],
  premium:  [['industrial',3],['afbase',2],['mechi',1],['zeppeldock',1],['stealthlab',1],['goldenTurbine',1]],
  golden:   [['goldenTurbine',2],['goldenCrane',1],['goldenBomb',1],['goldenMechStat',1]],
};
const PREMIUM_PRICE = 250000;
const WEEKLY = ['industrial','afbase','mechi','zeppeldock'];

const CODES = {
  LOGI:{kind:'b',type:'logistics',msg:'Logistics Warehouse'},
  WOWPREMIUM:{kind:'b',type:'research',msg:'Research Lab'},
  SORRY:{kind:'b',type:'oil',msg:'Oil Drill'},
  FREEDOM:{kind:'b',type:'cookie',msg:'Cookie Stand'},
  DUELS:{kind:'c',type:'premium',msg:'Premium Crate'},
  ZEPPELIN:{kind:'c',type:'premium',msg:'Premium Crate'},
  BLACKHAWK:{kind:'c',type:'premium',msg:'Premium Crate'},
  MAMMOTH:{kind:'c',type:'premium',msg:'Premium Crate'},
  '2500HOURS':{kind:'c',type:'premium',msg:'Premium Crate'},
  CARRIERHASARRIVED:{kind:'c',type:'elite',msg:'Elite Crate'},
  ARCTICFORTRESS:{kind:'c',type:'elite',msg:'Elite Crate'},
  MECHA:{kind:'c',type:'elite',msg:'Elite Crate'},
  SANDSTORM:{kind:'c',type:'standard',msg:'Standard Crate'},
  NAVY:{kind:'c',type:'standard',msg:'Standard Crate'},
  '200K':{cash:200000,msg:'$200,000 cash'},
};

const REWARDS = [
  {id:'tut',  ico:'📖', name:'Complete the tutorial', sub:'Learn the ropes',           reward:'$100',      give:{cash:100},       check:()=>S.stats.tut},
  {id:'play', ico:'⏱', name:'Play 60 seconds',       sub:'Stay for a minute',          reward:'$1,000',    give:{cash:1000},     check:()=>S.time>=60},
  {id:'k10',  ico:'💥', name:'Defeat 10 enemies',     sub:'Kill 10 hostile units',      reward:'$2,500',    give:{cash:2500},     check:()=>S.stats.kills>=10},
  {id:'cap1', ico:'🚩', name:'Capture a point',       sub:'Take any capture point',     reward:'$5,000',    give:{cash:5000},     check:()=>S.stats.captures>=1},
  {id:'boss', ico:'🐍', name:'Defeat the MECHA WORM', sub:'Slay the giant',             reward:'Premium Crate',give:{crate:'premium'}, check:()=>S.stats.bosses>=1},
  {id:'p10',  ico:'🕐', name:'Play 10 minutes',       sub:'You dedicated one',          reward:'Standard Crate',give:{crate:'standard'},check:()=>S.time>=600},
];

// ================= state =================
let S = null;
let uid = 1;
const nid = ()=> uid++;

function defaultState(){
  return {
    v:3, cash:500, rebirth:0, time:0, wave:0,
    nextWave:90, nextBoss:180,
    buildings:[], units:[],
    points: POINTS_DEFS.map(p=>({...p, owner:'neutral', faction:-1, respawnT:8, cool:0})),
    inventory:[], stats:{kills:0, bosses:0, captures:0, tut:false, cratesOpened:0},
    rewards:{}, codes:{}, premiumPity:0,
    settings:{music:true, sfx:true, dmg:true, gfx:'High'},
    attackCity:false, placing:null,
    bots:[
      {preset:'standard',   down:false, downT:0, raidT:50},
      {preset:'fortified',  down:false, downT:0, raidT:65},
      {preset:'village',    down:false, downT:0, raidT:80},
      {preset:'standard',   down:false, downT:0, raidT:55},
      {preset:'scrap',      down:false, downT:0, raidT:90},
      {preset:'fortified',  down:false, downT:0, raidT:60},
      {preset:'industrial', down:false, downT:0, raidT:45},
    ],
    shopTab:'production',
  };
}
const POINTS_DEFS = [
  {id:0, name:'NORTH', x:1900, y:1330, r:95,  garrison:3, tank:0},
  {id:1, name:'EAST',  x:2335, y:1900, r:60,  garrison:3, tank:0},
  {id:2, name:'CITY',  x:1900, y:1900, r:160, garrison:4, tank:2, city:true},
  {id:3, name:'WEST',  x:1465, y:1900, r:60,  garrison:3, tank:0},
  {id:4, name:'SOUTH', x:1900, y:2470, r:95,  garrison:3, tank:0},
];

// ================= factions =================
// faction 0 = YOU, 1-7 = bots (BOT_DEFS order). Every faction fights every other.
const FACCOL  = ['#5bc24e','#4a90e2','#f5a53f','#a35ad6','#ec407a','#26c6da','#ffee58','#ef5350'];
const FACNAME = ['YOU','ALPHA','BRAVO','CHARLIE','DELTA','ECHO','FOXTROT','GOLF'];
const facC = i => FACCOL[((i%8)+8)%8];
const hexA = (hex,a)=>{ const n=parseInt(hex.slice(1),16); return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`; };
const facN = i => FACNAME[i]||'?';
function shade(hex,f){
  const n=parseInt(hex.slice(1),16); let r=(n>>16)&255, g=(n>>8)&255, b=n&255;
  r=clamp(Math.round(r*f),0,255); g=clamp(Math.round(g*f),0,255); b=clamp(Math.round(b*f),0,255);
  return `rgb(${r},${g},${b})`;
}
const FACPAL = FACCOL.map(c=>({body:c, dark:shade(c,.5), accent:shade(c,1.35), metal:shade(c,.8), skin:'#d8a878'}));
function unitPal(u){
  if(u && typeof u.faction==='number' && u.faction>=0) return FACPAL[u.faction];
  return (u && u.side==='p') ? FACPAL[0] : FACPAL[1];
}

// ================= island map (8 islands + city, water between) =================
const CITY_ISL = {x:1900, y:1900, r:220};
const plotCenter = p => ({x:p.x+6*SLOT, y:p.y+3.5*SLOT});
const MAP_PLOTS = [{x:PLOT.x,y:PLOT.y}, ...BOT_DEFS.map(b=>({x:b.plot.x,y:b.plot.y}))]; // [0]=player
function distSeg(px,py,ax,ay,bx,by){
  const dx=bx-ax, dy=by-ay, l2=dx*dx+dy*dy;
  let t=l2? ((px-ax)*dx+(py-ay)*dy)/l2 : 0; t=clamp01(t);
  return Math.hypot(px-(ax+t*dx), py-(ay+t*dy));
}
// ---------- organic island shapes: square plot fused with a blobby natural coast ----------
const ISLE_PHASES=[];
{ let seed=987654321;
  const sr=()=> (seed=(seed*48271)%2147483647)/2147483647;
  for(let i=0;i<14;i++) ISLE_PHASES.push([sr()*6.283,sr()*6.283,sr()*6.283]);
}
const wob  = (th,ph)=> 10*Math.sin(2*th+ph[0]) + 7*Math.sin(3*th+ph[1]) + 5*Math.sin(5*th+ph[2]); // ±22
const wobS = (th,ph)=> 5*Math.sin(2*th+ph[0]) + 3*Math.sin(3*th+ph[1]) + 2*Math.sin(5*th+ph[2]);  // ±10
const PLOT_HW=SLOT*6, PLOT_HH=SLOT*3.5;
const sqExit=(th,hw,hh)=> Math.min(Math.abs(Math.cos(th))>1e-6?hw/Math.abs(Math.cos(th)):1e9,
                                   Math.abs(Math.sin(th))>1e-6?hh/Math.abs(Math.sin(th)):1e9);
function plotRadius(i,th){ return sqExit(th,PLOT_HW,PLOT_HH) + 26 + wob(th,ISLE_PHASES[i]); }  // 4..48 margin
function cityRadius(th){ return CITY_ISL.r + 24 + wob(th,ISLE_PHASES[8]); }                    // organic disc
function isletRadius(idx,th){ return POINTS_DEFS[idx].r + 43 + wobS(th,ISLE_PHASES[9+idx]); }  // point islet

function walkableAt(x,y){
  // plot islands (organic square + coastline)
  for(let i=0;i<MAP_PLOTS.length;i++){
    const p=MAP_PLOTS[i], cx=p.x+PLOT_HW, cy=p.y+PLOT_HH;
    const dx=x-cx, dy=y-cy, th=Math.atan2(dy,dx);
    if(Math.hypot(dx,dy) <= plotRadius(i,th)) return true;
  }
  // central city island
  { const dx=x-CITY_ISL.x, dy=y-CITY_ISL.y, th=Math.atan2(dy,dx);
    if(Math.hypot(dx,dy) <= cityRadius(th)) return true; }
  // capture-point islets
  for(let i=0;i<POINTS_DEFS.length;i++){
    const pt=POINTS_DEFS[i]; if(pt.city) continue;
    const dx=x-pt.x, dy=y-pt.y, th=Math.atan2(dy,dx);
    if(Math.hypot(dx,dy) <= isletRadius(i,th)) return true;
  }
  // road bridges: city -> every plot
  for(const p of MAP_PLOTS){
    const c=plotCenter(p);
    if(distSeg(x,y,CITY_ISL.x,CITY_ISL.y,c.x,c.y)<=45) return true;
  }
  return false;
}
const CELL=40, GW=Math.ceil(WORLD.w/CELL), GH=Math.ceil(WORLD.h/CELL);
const WALK=new Uint8Array(GW*GH);
for(let gy=0;gy<GH;gy++) for(let gx=0;gx<GW;gx++)
  WALK[gy*GW+gx]=walkableAt(gx*CELL+CELL/2, gy*CELL+CELL/2)?1:0;
const cellOf = (x,y)=> [clamp(Math.floor(x/CELL),0,GW-1), clamp(Math.floor(y/CELL),0,GH-1)];

// ---------- A* over the walk grid (8-dir, no corner cutting) ----------
function astar(sx,sy,tx,ty){
  const s=cellOf(sx,sy), t=cellOf(tx,ty);
  const sI=s[1]*GW+s[0], tI0=t[1]*GW+t[0];
  if(sI===tI0) return [{x:tx,y:ty}];
  let tI=tI0;
  if(!WALK[tI]){ // target in water → snap to nearest walkable cell (small ring search)
    let found=-1;
    outer:
    for(let r=1;r<10;r++) for(let dy=-r;dy<=r;dy++) for(let dx=-r;dx<=r;dx++){
      const nx=t[0]+dx, ny=t[1]+dy;
      if(nx<0||ny<0||nx>=GW||ny>=GH) continue;
      const ni=ny*GW+nx;
      if(WALK[ni]){ found=ni; break outer; }
    }
    if(found<0) return null;
    tI=found; t[0]=found%GW; t[1]=(found/GW)|0;
  }
  const heap=[];
  const hPush=(f,i)=>{ heap.push([f,i]); let c=heap.length-1; while(c>0){ const p=(c-1)>>1; if(heap[p][0]<=heap[c][0]) break; const tmp=heap[p]; heap[p]=heap[c]; heap[c]=tmp; c=p; } };
  const hPop=()=>{ const top=heap[0], last=heap.pop(); if(heap.length){ heap[0]=last; let c=0; for(;;){ const l=c*2+1, r=l+1; let m=c; if(l<heap.length&&heap[l][0]<heap[m][0]) m=l; if(r<heap.length&&heap[r][0]<heap[m][0]) m=r; if(m===c) break; const tmp=heap[m]; heap[m]=heap[c]; heap[c]=tmp; c=m; } } return top; };
  const came=new Int32Array(GW*GH).fill(-1);
  const g=new Float32Array(GW*GH).fill(Infinity);
  const closed=new Uint8Array(GW*GH);
  g[sI]=0; hPush(0,sI);
  const DIRS=[[1,0,1],[-1,0,1],[0,1,1],[0,-1,1],[1,1,1.414],[1,-1,1.414],[-1,1,1.414],[-1,-1,1.414]];
  let iter=0, reached=false;
  while(heap.length){
    const cur=hPop()[1];
    if(closed[cur]) continue; closed[cur]=1;
    if(cur===tI){ reached=true; break; }
    if(++iter>4500) break;
    const cx=cur%GW, cy=(cur/GW)|0;
    for(const [dx,dy,cost] of DIRS){
      const nx=cx+dx, ny=cy+dy;
      if(nx<0||ny<0||nx>=GW||ny>=GH) continue;
      const ni=ny*GW+nx;
      if(!WALK[ni]||closed[ni]) continue;
      if(dx&&dy && (!WALK[cy*GW+nx]||!WALK[ny*GW+cx])) continue;
      const ng=g[cur]+cost;
      if(ng<g[ni]){
        g[ni]=ng; came[ni]=cur;
        hPush(ng+Math.abs(nx-t[0])+Math.abs(ny-t[1]), ni);
      }
    }
  }
  if(!reached) return null;
  const path=[];
  let cur=tI;
  while(cur!==-1){
    path.push({x:(cur%GW)*CELL+CELL/2, y:((cur/GW)|0)*CELL+CELL/2});
    if(cur===sI) break;
    cur=came[cur];
  }
  path.reverse();
  path[path.length-1]={x:tx,y:ty};
  return path;
}

// ---------- city flow field: cheap "default → middle" highway for land units ----------
const CITY_FLOW=new Int32Array(GW*GH).fill(-1);
{
  const c0=cellOf(CITY_ISL.x,CITY_ISL.y);
  const start=c0[1]*GW+c0[0];
  if(WALK[start]){
    CITY_FLOW[start]=0;
    const q=[start];
    for(let qi=0;qi<q.length;qi++){
      const cur=q[qi], cx=cur%GW, cy=(cur/GW)|0;
      for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
        const nx=cx+dx, ny=cy+dy;
        if(nx<0||ny<0||nx>=GW||ny>=GH) continue;
        const ni=ny*GW+nx;
        if(!WALK[ni]||CITY_FLOW[ni]!==-1) continue;
        CITY_FLOW[ni]=CITY_FLOW[cur]+1; q.push(ni);
      }
    }
  }
}
function flowStep(x,y){
  const [cx,cy]=cellOf(x,y);
  let bd=CITY_FLOW[cy*GW+cx];
  if(bd<1) return null;
  let best=-1;
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
    const nx=cx+dx, ny=cy+dy;
    if(nx<0||ny<0||nx>=GW||ny>=GH) continue;
    const ni=ny*GW+nx;
    if(!WALK[ni]) continue;
    const d=CITY_FLOW[ni];
    if(d!==-1&&d<bd){ bd=d; best=ni; }
  }
  if(best<0) return null;
  return {x:(best%GW)*CELL+CELL/2, y:((best/GW)|0)*CELL+CELL/2};
}

function save(){
  try{
    const o = {...S, units: S.units.filter(u=>u.side==='p').map(u=>({type:u.type,x:Math.round(u.x),y:Math.round(u.y),hp:u.hp,order:u.order}))};
    localStorage.setItem('bmb25', JSON.stringify(o));
  }catch(e){}
}
function load(){
  try{
    const raw = localStorage.getItem('bmb25');
    if(!raw) return null;
    const o = JSON.parse(raw);
    if(o.v===1||o.v===2){
      // old save -> v3 island map: keep progression, rebuild map/factions fresh
      const d=defaultState();
      d.cash=Math.max(500,o.cash||500); d.rebirth=o.rebirth||0;
      d.inventory=o.inventory||[]; d.time=o.time||0;
      d.stats=Object.assign(d.stats,o.stats||{});
      d.settings=Object.assign(d.settings,o.settings||{});
      d.codes=o.codes||{}; d.rewards=o.rewards||{}; d.admin=o.admin;
      return d;
    }
    if(o.v!==3) return null;
    return o;
  }catch(e){ return null; }
}

// ================= audio =================
let AC=null, noiseBuf=null;
function initAudio(){
  if(AC) return;
  try{
    AC = new (window.AudioContext||window.webkitAudioContext)();
    noiseBuf = AC.createBuffer(1, AC.sampleRate*1, AC.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1;
    setInterval(musicTick, 90);
  }catch(e){}
}
function tone(f,dur,type='sine',vol=.06,slideTo=null,delay=0){
  if(!AC) return;
  const t0 = AC.currentTime+delay;
  const o = AC.createOscillator(), g = AC.createGain();
  o.type=type; o.frequency.setValueAtTime(f,t0);
  if(slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20,slideTo), t0+dur);
  g.gain.setValueAtTime(vol,t0); g.gain.exponentialRampToValueAtTime(.0001,t0+dur);
  o.connect(g).connect(AC.destination); o.start(t0); o.stop(t0+dur+.02);
}
function noise(dur,vol=.08,freq=800,type='lowpass',delay=0){
  if(!AC) return;
  const t0=AC.currentTime+delay;
  const s=AC.createBufferSource(); s.buffer=noiseBuf;
  const f=AC.createBiquadFilter(); f.type=type; f.frequency.value=freq;
  const g=AC.createGain(); g.gain.setValueAtTime(vol,t0); g.gain.exponentialRampToValueAtTime(.0001,t0+dur);
  s.connect(f).connect(g).connect(AC.destination); s.start(t0); s.stop(t0+dur+.02);
}
const sfxLast={};
function sfx(name){
  if(!AC) return;
  if(!S.settings.sfx) return;
  const now=performance.now();
  if(sfxLast[name] && now-sfxLast[name]<70) return;
  sfxLast[name]=now;
  switch(name){
    case 'click':  tone(700,.05,'square',.04); break;
    case 'buy':    tone(520,.07,'square',.05); tone(784,.1,'square',.05,null,.07); break;
    case 'place':  tone(150,.14,'triangle',.12,80); noise(.08,.05,400); break;
    case 'spawn':  tone(880,.06,'sine',.045); tone(1175,.08,'sine',.04,null,.06); break;
    case 'shot':   noise(.05,.035,2500,'highpass'); break;
    case 'boom':   noise(.4,.16,300); tone(110,.35,'sine',.14,35); break;
    case 'coin':   tone(988,.07,'sine',.05); tone(1319,.1,'sine',.05,null,.07); break;
    case 'open':   tone(300,.35,'sawtooth',.045,1200); break;
    case 'horn':   tone(98,.45,'sawtooth',.08); tone(73.4,.5,'sawtooth',.08,null,.3); break;
    case 'capture':tone(523,.09,'square',.05); tone(659,.09,'square',.05,null,.09); tone(784,.16,'square',.05,null,.18); break;
    case 'error':  tone(170,.16,'square',.06); break;
    case 'rebirth':tone(200,.5,'sawtooth',.08,900); tone(600,.3,'sine',.06,null,.3); break;
  }
}
// music: tiny military-march chiptune loop
let mStep=0, mNext=0;
const CHORDS = [
  {b:65.4,  t:[523,659,784]},
  {b:49.0,  t:[494,587,784]},
  {b:55.0,  t:[440,523,659]},
  {b:43.65, t:[349,440,523]},
];
function musicTick(){
  if(!AC || !S || !S.settings.music) return;
  if(AC.state!=='running') return;
  const spb=.25;
  while(mNext < AC.currentTime+.35){
    const ch = CHORDS[Math.floor(mStep/8)%4];
    const bar = mStep%8;
    if(bar%2===0) tone(ch.b,.22,'triangle',.05);
    tone(ch.t[[0,1,2,1,0,1,2,2][bar]],.12,'square',.018);
    if(bar===0||bar===4) noise(.03,.02,6000,'highpass');
    if(bar===0) tone(120,.12,'sine',.05,45);
    mStep=(mStep+1)%32; mNext+=spb;
  }
}

// ================= sprites (flat 2D pictures) =================
// each draw fn: ctx is translated so (0,0)=ground anchor, y up = negative
const SPR = {};
function reg(type,w,h,draw){ SPR[type]={w,h,draw}; }
function O(g,w=2){ g.lineWidth=w; g.strokeStyle='rgba(18,24,32,.5)'; }
const pi2 = Math.PI*2;

// ----- buildings -----
reg('solar',44,38,(g,t)=>{
  g.fillStyle='#5a6b52'; g.fillRect(-15,-22,3,22); g.fillRect(12,-22,3,22);
  g.save(); g.translate(0,-28); g.rotate(-.2);
  g.fillStyle='#2f6fb8'; g.fillRect(-19,-9,38,18); O(g); g.strokeRect(-19,-9,38,18);
  g.strokeStyle='rgba(255,255,255,.45)'; g.lineWidth=1;
  g.beginPath(); g.moveTo(-6,-9); g.lineTo(-6,9); g.moveTo(7,-9); g.lineTo(7,9); g.moveTo(-19,0); g.lineTo(19,0); g.stroke();
  g.restore();
});
reg('oil',44,46,(g,t)=>{
  g.fillStyle='#6b5a44'; g.fillRect(-18,-8,36,8); O(g); g.strokeRect(-18,-8,36,8);
  g.fillStyle='#8a6f4d'; g.fillRect(-14,-14,28,6); g.fillRect(-10,-20,20,6); g.fillRect(-6,-26,12,6);
  g.fillStyle='#a3865c'; g.fillRect(-5,-40,10,14); O(g); g.strokeRect(-5,-40,10,14);
  g.save(); g.translate(0,-26); g.rotate(Math.sin(t*2.2)*.5);
  g.fillStyle='#b8452e'; g.fillRect(-2,-3,20,6); g.fillRect(-12,-3,6,6);
  g.fillStyle='#8a3322'; g.beginPath(); g.arc(-9,0,4,0,pi2); g.fill();
  g.restore();
});
reg('data',48,48,(g,t)=>{
  g.fillStyle='#77839a'; g.fillRect(-22,-40,44,40); O(g); g.strokeRect(-22,-40,44,40);
  g.fillStyle='#5c6880'; g.fillRect(-22,-45,44,6);
  g.fillStyle='#5c6880'; g.fillRect(-17,-33,8,3); g.fillRect(-17,-28,8,3); g.fillRect(9,-33,8,3); g.fillRect(9,-28,8,3);
  g.fillStyle= (Math.floor(t*2)%2)?'#57e389':'#2c4a3a'; g.fillRect(-20,-22,5,4);
  g.fillStyle= (Math.floor(t*2+1)%2)?'#57e389':'#2c4a3a'; g.fillRect(15,-22,5,4);
  g.fillStyle='#414b60'; g.fillRect(-6,-16,12,16);
});
reg('cookie',48,42,(g,t)=>{
  g.fillStyle='#caa06a'; g.fillRect(-18,-22,36,22); O(g); g.strokeRect(-18,-22,36,22);
  g.fillStyle='#8a6f4d'; g.fillRect(-18,-9,36,3);
  for(let i=0;i<6;i++){ g.fillStyle=i%2?'#d6493f':'#f0e8d8'; g.fillRect(-20+i*7,-34,7,10); }
  O(g,1.5); g.strokeRect(-20,-34,42,10);
  g.fillStyle='#c98a4b'; g.beginPath(); g.arc(10,-14,5.5,0,pi2); g.fill();
  g.fillStyle='#6b4423'; g.beginPath(); g.arc(8,-15,1.2,0,pi2); g.arc(12,-12,1.2,0,pi2); g.arc(11,-16,1,0,pi2); g.fill();
});
reg('research',54,52,(g,t)=>{
  g.fillStyle='#9aa4b2'; g.fillRect(-24,-14,48,14);
  g.fillStyle='#cfd6e0'; g.beginPath(); g.arc(0,-14,23,Math.PI,0); g.closePath(); g.fill(); O(g); g.stroke();
  g.fillStyle='#5aa0d8'; g.fillRect(-6,-11,12,11);
  g.fillStyle='#8792a6'; g.fillRect(15,-42,2.5,28);
  g.fillStyle=(Math.floor(t*1.5)%2)?'#ff5a4e':'#7a352e'; g.beginPath(); g.arc(16,-43,3,0,pi2); g.fill();
});
reg('industrial',60,62,(g,t)=>{
  g.fillStyle='#7b8593'; g.fillRect(-27,-12,54,12); O(g); g.strokeRect(-27,-12,54,12);
  g.fillStyle='#e0a32e'; g.fillRect(-13,-48,26,36); O(g); g.strokeRect(-13,-48,26,36);
  g.strokeStyle='#8a5f1a'; g.lineWidth=2;
  g.beginPath(); g.moveTo(-13,-44); g.lineTo(13,-18); g.moveTo(13,-44); g.lineTo(-13,-18); g.stroke();
  g.fillStyle='#c98a1f'; g.fillRect(-9,-55,18,8);
  g.save(); g.translate(0,-12);
  g.fillStyle='#aab4c0'; g.beginPath(); g.moveTo(-6,0); g.lineTo(6,0); g.lineTo(0, 5+Math.sin(t*10)*2.5); g.closePath(); g.fill();
  g.restore();
  g.fillStyle='#f5b53f'; g.fillRect(-27,-14,54,3);
});
reg('logistics',68,36,(g,t)=>{
  g.fillStyle='#8792a6'; g.fillRect(-32,-28,64,28); O(g); g.strokeRect(-32,-28,64,28);
  g.fillStyle='#6a7488'; g.fillRect(-32,-33,64,6);
  g.fillStyle='#5c6678'; g.fillRect(-14,-14,22,14);
  g.fillStyle='#4a90e2'; g.fillRect(-32,-5,64,3);
  g.fillStyle='#fff';
  g.beginPath(); g.moveTo(16,-24); g.lineTo(24,-18); g.lineTo(16,-12); g.lineTo(16,-17); g.lineTo(11,-18); g.lineTo(16,-19); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(24,-24); g.lineTo(32,-18); g.lineTo(24,-12); g.lineTo(24,-17); g.lineTo(19,-18); g.lineTo(24,-19); g.closePath(); g.fill();
});
reg('depot',44,32,(g,t)=>{
  g.fillStyle='#7a8a5a';
  g.fillRect(-17,-12,15,12); g.fillRect(2,-12,15,12); g.fillRect(-7,-24,14,12);
  O(g,1.5); g.strokeRect(-17,-12,15,12); g.strokeRect(2,-12,15,12); g.strokeRect(-7,-24,14,12);
  g.strokeStyle='#55613f'; g.beginPath(); g.moveTo(-17,-12); g.lineTo(-2,0); g.moveTo(2,-12); g.lineTo(17,0); g.stroke();
  g.fillStyle='#7d8794'; g.fillRect(14,-34,2.5,34);
  g.fillStyle='#d6493f'; g.fillRect(16,-34,12,7);
});
reg('barracks',56,40,(g,t)=>{
  g.fillStyle='#5d7a4a'; g.fillRect(-26,-30,52,30); O(g); g.strokeRect(-26,-30,52,30);
  g.fillStyle='#48603a'; g.fillRect(-26,-35,52,6);
  g.fillStyle='#3c4f31'; g.fillRect(-6,-16,12,16);
  g.fillStyle='#cfe3a8'; g.fillRect(-21,-25,9,6); g.fillRect(12,-25,9,6);
  g.fillStyle='#7d8794'; g.fillRect(20,-46,2.5,16);
  g.fillStyle='#4a90e2'; g.fillRect(22,-46,13,8);
});
reg('tankfac',60,42,(g,t)=>{
  g.fillStyle='#66725f'; g.fillRect(-28,-32,56,32); O(g); g.strokeRect(-28,-32,56,32);
  g.fillStyle='#525c4c'; g.fillRect(-28,-37,56,6);
  g.fillStyle='#3a4149'; g.fillRect(-17,-18,34,18);
  g.fillStyle='#5b6d7c'; g.fillRect(-10,-12,17,6); g.fillRect(-6,-17,9,6);
  g.fillStyle='#7d8794'; g.fillRect(7,-14,11,3);
  g.fillStyle='#f5b53f'; g.beginPath(); g.arc(21,-27,5,0,pi2); g.fill();
});
reg('heliport',66,56,(g,t)=>{
  g.fillStyle='#5f6a74'; g.beginPath(); g.ellipse(-6,-3,27,10,0,0,pi2); g.fill(); O(g); g.stroke();
  g.fillStyle='#fff'; g.font='bold 11px sans-serif'; g.fillText('H',-10,-6);
  g.fillStyle='#8792a6'; g.fillRect(16,-46,10,44); O(g); g.strokeRect(16,-46,10,44);
  g.fillStyle='#9fb4cc'; g.fillRect(12,-54,18,10); O(g); g.strokeRect(12,-54,18,10);
  g.fillStyle='#2f4a66'; g.fillRect(15,-51,12,5);
});
reg('afbase',76,42,(g,t)=>{
  g.fillStyle='#5a6472'; g.fillRect(-36,-30,72,30); O(g); g.strokeRect(-36,-30,72,30);
  g.fillStyle='#4a5361'; g.fillRect(-36,-35,72,6);
  g.fillStyle='#3c434e'; g.beginPath(); g.moveTo(-15,0); g.lineTo(-15,-15); g.arc(0,-15,15,Math.PI,0); g.lineTo(15,0); g.closePath(); g.fill();
  g.fillStyle='#f5b53f';
  g.beginPath();
  for(let i=0;i<5;i++){
    const a=-Math.PI/2+i*pi2/5, a2=a+pi2/10;
    g.lineTo(24+Math.cos(a)*7,-22+Math.sin(a)*7); g.lineTo(24+Math.cos(a2)*3,-22+Math.sin(a2)*3);
  }
  g.closePath(); g.fill();
  g.fillStyle='#4a90e2'; g.fillRect(-36,-8,72,3);
});
reg('mechi',84,52,(g,t)=>{
  g.fillStyle='#4a4f5a'; g.fillRect(-40,-42,80,42); O(g); g.strokeRect(-40,-42,80,42);
  g.fillStyle='#d6493f'; g.fillRect(-40,-47,80,5);
  g.fillStyle='#33383f'; g.fillRect(-23,-26,46,26);
  g.fillStyle='#22262c'; g.fillRect(-11,-20,22,13);
  g.fillStyle=`rgba(255,90,78,${.6+Math.sin(t*3)*.3})`; g.fillRect(-8,-17,16,3.5);
  for(let i=0;i<8;i++){ g.fillStyle=i%2?'#e0a32e':'#2b3138'; g.fillRect(-40+i*10,-6,10,6); }
});
reg('stealthlab',64,60,(g,t)=>{
  // dark hangar + rotating sensor dome
  g.fillStyle='#2b3138'; g.fillRect(-28,-44,56,44); O(g); g.strokeRect(-28,-44,56,44);
  g.fillStyle='#1d2229'; g.fillRect(-28,-49,56,5);
  g.fillStyle='#33383f'; g.fillRect(-18,-36,36,28);
  const gl=.45+Math.sin(t*4)*.35;
  g.fillStyle=`rgba(91,194,78,${gl})`; g.fillRect(-13,-30,26,3);
  g.beginPath(); g.arc(0,-52,11,0,pi2); g.fillStyle='#33383f'; g.fill();
  g.strokeStyle='#5b6470'; g.lineWidth=2; g.stroke();
  const a=t*2.4;
  g.strokeStyle=`rgba(91,194,78,${.5+gl*.4})`; g.lineWidth=2.5;
  g.beginPath(); g.moveTo(0,-52); g.lineTo(Math.cos(a)*9,-52+Math.sin(a)*9); g.stroke();
  g.fillStyle=`rgba(91,194,78,${gl})`; g.beginPath(); g.arc(Math.cos(a)*13,-52+Math.sin(a)*13,2.5,0,pi2); g.fill();
});
reg('zeppeldock',70,64,(g,t)=>{
  g.fillStyle='#7d8794'; g.fillRect(-3,-58,6,58); O(g); g.strokeRect(-3,-58,6,58);
  g.fillRect(-15,-54,30,4); g.fillRect(-15,-42,30,4);
  g.strokeStyle='#5b6470'; g.lineWidth=1.5;
  g.beginPath(); g.moveTo(0,-52); g.quadraticCurveTo(30,-32,46,-10); g.stroke();
  g.fillStyle='#6b7484'; g.fillRect(-12,-8,24,8);
});
reg('goldenTurbine',50,56,(g,t)=>{
  g.fillStyle='rgba(245,181,63,.12)'; g.beginPath(); g.arc(0,-46,26,0,pi2); g.fill();
  g.fillStyle='#d9a92f'; g.fillRect(-2.5,-46,5,46);
  g.save(); g.translate(0,-46); g.rotate(t*1.6);
  g.fillStyle='#f5b53f';
  for(let i=0;i<3;i++){ g.rotate(pi2/3); g.beginPath(); g.moveTo(0,-2.5); g.lineTo(21,-1.2); g.lineTo(21,1.2); g.lineTo(0,2.5); g.closePath(); g.fill(); }
  g.restore();
  g.fillStyle='#ffd54f'; g.beginPath(); g.arc(0,-46,4.5,0,pi2); g.fill();
});
reg('tree',38,48,(g,t)=>{
  g.fillStyle='#6b4a2e'; g.fillRect(-3,-10,6,10);
  g.fillStyle='#3e7a3e'; g.beginPath(); g.moveTo(0,-46); g.lineTo(15,-14); g.lineTo(-15,-14); g.closePath(); g.fill();
  g.fillStyle='#356b35'; g.beginPath(); g.moveTo(0,-32); g.lineTo(19,-2); g.lineTo(-19,-2); g.closePath(); g.fill();
});
reg('rock',34,22,(g,t)=>{
  g.fillStyle='#8d9489'; g.beginPath(); g.ellipse(-4,-6,11,8,0,0,pi2); g.fill(); O(g,1.5); g.stroke();
  g.fillStyle='#a3a99e'; g.beginPath(); g.ellipse(7,-4,8,5.5,0,0,pi2); g.fill();
});
reg('flag',30,50,(g,t)=>{
  g.fillStyle='#7d8794'; g.fillRect(-1.5,-46,3,46); O(g,1.5); g.strokeRect(-1.5,-46,3,46);
  g.fillStyle='#d6493f';
  g.beginPath(); g.moveTo(1.5,-46);
  g.quadraticCurveTo(13,-44+Math.sin(t*4)*2.5, 21,-42);
  g.lineTo(21,-33); g.quadraticCurveTo(12,-34.5, 1.5,-35);
  g.closePath(); g.fill();
});
reg('wall',48,16,(g,t)=>{
  g.fillStyle='#7b8593'; g.fillRect(-22,-13,44,13); O(g); g.strokeRect(-22,-13,44,13);
  g.strokeStyle='rgba(0,0,0,.25)'; g.lineWidth=1;
  g.beginPath();
  for(let i=0;i<3;i++){ g.moveTo(-22,-13+i*4.5); g.lineTo(22,-13+i*4.5); }
  for(let i=0;i<5;i++){ g.moveTo(-18+i*9,-13); g.lineTo(-18+i*9,-8.5); g.moveTo(-14+i*9,-4.5); g.lineTo(-14+i*9,0); }
  g.stroke();
});
reg('goldenCrane',56,56,(g,t)=>{
  g.fillStyle='#d9a92f'; g.fillRect(-13,-7,26,7);
  g.fillRect(-3.5,-42,7,35); O(g,1.5); g.strokeRect(-3.5,-42,7,35);
  g.fillStyle='#e0a32e'; g.fillRect(-5,-46,38,5); g.fillRect(-20,-44,13,7);
  g.strokeStyle='#8a6a1f'; g.lineWidth=1.5; g.beginPath(); g.moveTo(27,-41); g.lineTo(27,-22); g.stroke();
  g.fillStyle='#f5b53f'; g.fillRect(23,-22,8,6);
});
reg('goldenBomb',40,42,(g,t)=>{
  g.fillStyle='#8a6f4d'; g.fillRect(-9,-7,18,7);
  g.fillStyle='rgba(245,181,63,.14)'; g.beginPath(); g.arc(0,-16,15,0,pi2); g.fill();
  g.fillStyle='#f5b53f'; g.beginPath(); g.arc(0,-16,10,0,pi2); g.fill(); O(g,1.5); g.stroke();
  g.fillStyle='#d9a92f'; g.fillRect(-2,-29,4,7);
  g.fillStyle='#fff2c9'; g.beginPath(); g.arc(-3.5,-19,2.5,0,pi2); g.fill();
});
reg('goldenMechStat',48,58,(g,t)=>{
  g.fillStyle='#8d9489'; g.fillRect(-17,-9,34,9);
  g.fillStyle='#f5b53f';
  g.fillRect(-7,-44,14,9); g.fillRect(-10,-35,20,16); g.fillRect(-17,-35,7,14); g.fillRect(10,-35,7,14);
  g.fillRect(-9,-19,8,10); g.fillRect(1,-19,8,10);
  g.fillStyle='#3a2c10'; g.fillRect(-5,-41,10,3.5);
  O(g,1.5); g.strokeRect(-10,-35,20,16);
});

// ----- units (side 'p' blue, 'e' red) -----
// (palettes moved to FACPAL — units are tinted by FACTION, not just p/e)

reg('rifle',20,22,(g,t,u)=>{
  const P=unitPal(u);
  g.fillStyle=P.dark; g.fillRect(-4.5,-6,3.5,6); g.fillRect(1,-6,3.5,6);
  g.fillStyle=P.body; g.fillRect(-5.5,-15,11,9.5); O(g,1.5); g.strokeRect(-5.5,-15,11,9.5);
  g.fillStyle=P.dark; g.fillRect(-8,-14,3,6);
  g.fillStyle=P.skin; g.beginPath(); g.arc(1,-18,3.6,0,pi2); g.fill();
  g.fillStyle=P.accent; g.beginPath(); g.arc(1,-19,3.8,Math.PI,0); g.closePath(); g.fill(); g.fillRect(-3.5,-19,9,2);
  g.fillStyle='#2b3138'; g.fillRect(2,-12,10,2.2);
});
reg('tank',40,22,(g,t,u)=>{
  const P=unitPal(u);
  g.fillStyle='#2b3138'; g.fillRect(-17,-8,34,8);
  g.fillStyle=P.metal;
  for(let i=0;i<4;i++){ g.beginPath(); g.arc(-12+i*8,-4,2.6,0,pi2); g.fill(); }
  g.fillStyle=P.body; g.fillRect(-15,-14,30,7); O(g,1.5); g.strokeRect(-15,-14,30,7);
  g.fillStyle=P.body; g.fillRect(-8,-20,15,7); O(g,1.5); g.strokeRect(-8,-20,15,7);
  g.fillStyle=P.dark; g.fillRect(7,-18,13,3);
  g.fillStyle=P.accent; g.fillRect(-13,-12,3,3);
});
reg('heli',38,22,(g,t,u)=>{
  const P=unitPal(u);
  g.strokeStyle=P.dark; g.lineWidth=2;
  g.beginPath(); g.moveTo(-13,0); g.lineTo(9,0); g.moveTo(-9,-3); g.lineTo(-9,0); g.moveTo(5,-3); g.lineTo(5,0); g.stroke();
  g.fillStyle=P.body; g.beginPath(); g.ellipse(-3,-9,11,6,0,0,pi2); g.fill(); O(g,1.5); g.stroke();
  g.fillRect(8,-11,13,3.5); g.fillRect(18,-15,3.5,6);
  g.fillStyle='#9fd0ff'; g.fillRect(-12,-11,5,4);
  g.fillStyle=P.dark; g.fillRect(-4,-17,2.5,3);
  g.save(); g.translate(-3,-17); g.rotate(t*14);
  g.fillStyle='rgba(35,42,52,.8)'; g.fillRect(-13,-1.2,26,2.4); g.restore();
});
reg('jet',36,18,(g,t,u)=>{
  const P=unitPal(u);
  g.fillStyle='#f5b53f';
  g.beginPath(); g.moveTo(-12,-7); g.lineTo(-19-Math.random()*4,-5.5); g.lineTo(-12,-4); g.closePath(); g.fill();
  g.fillStyle=P.body;
  g.beginPath(); g.moveTo(15,-6); g.lineTo(2,-10.5); g.lineTo(-12,-8); g.lineTo(-12,-3.5); g.lineTo(2,-2); g.closePath(); g.fill(); O(g,1.5); g.stroke();
  g.fillStyle=P.dark;
  g.beginPath(); g.moveTo(0,-8); g.lineTo(-7,-1.5); g.lineTo(-2,-8); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(-12,-8); g.lineTo(-17,-13.5); g.lineTo(-9,-8); g.closePath(); g.fill();
  g.fillStyle='#9fd0ff'; g.fillRect(6,-8.5,5,2.2);
});
reg('mech',28,42,(g,t,u)=>{
  const P=unitPal(u);
  g.fillStyle=P.dark; g.fillRect(-8,-15,6,15); g.fillRect(2,-15,6,15); g.fillRect(-10,-3,9,3); g.fillRect(1,-3,9,3);
  g.fillStyle=P.body; g.fillRect(-9,-29,18,15); O(g,1.5); g.strokeRect(-9,-29,18,15);
  g.fillStyle=P.accent; g.fillRect(-3,-25,6,6);
  g.fillStyle=P.dark; g.fillRect(-15,-29,6,9); g.fillRect(9,-29,6,9);
  g.fillStyle=P.metal; g.fillRect(9,-23,13,4);
  g.fillStyle=P.body; g.fillRect(-5,-36,10,8); O(g,1.5); g.strokeRect(-5,-36,10,8);
  g.fillStyle='#ff5a4e'; g.fillRect(-4,-33,8,3);
});
reg('zeppelin',54,28,(g,t,u)=>{
  const P=unitPal(u);
  g.fillStyle=P.body; g.beginPath(); g.ellipse(0,-15,25,9.5,0,0,pi2); g.fill(); O(g,1.5); g.stroke();
  g.fillStyle=P.accent; g.fillRect(-23,-17,46,2.6);
  g.fillStyle=P.dark;
  g.beginPath(); g.moveTo(22,-15); g.lineTo(29,-21); g.lineTo(27,-14); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(22,-13); g.lineTo(29,-8); g.lineTo(27,-13); g.closePath(); g.fill();
  g.fillStyle=P.metal; g.fillRect(-8,-8,16,5); O(g,1); g.strokeRect(-8,-8,16,5);
  g.save(); g.translate(-25,-15); g.rotate(t*20);
  g.fillStyle='rgba(120,128,140,.85)'; g.fillRect(-1.5,-7,3,14); g.restore();
});
reg('spectre',20,26,(g,t,u)=>{
  const P=unitPal(u);
  // hooded cloak
  g.fillStyle=P.dark;
  g.beginPath(); g.moveTo(-7,0); g.lineTo(-6,-14); g.quadraticCurveTo(0,-25,6,-14); g.lineTo(7,0); g.closePath(); g.fill(); O(g,1.5); g.stroke();
  // hood opening (face in shadow)
  g.fillStyle='#10151d'; g.beginPath(); g.ellipse(0,-15,3.6,4.4,0,0,pi2); g.fill();
  // glowing eyes
  g.fillStyle=P.accent; g.fillRect(-2.4,-16,1.7,1.7); g.fillRect(0.7,-16,1.7,1.7);
  // cloak rim
  g.strokeStyle=P.accent; g.lineWidth=1.4;
  g.beginPath(); g.moveTo(-7,0); g.quadraticCurveTo(0,-4,7,0); g.stroke();
  // dagger
  g.fillStyle=P.metal;
  g.save(); g.translate(7,-8); g.rotate(-.5); g.fillRect(-1.2,-7,2.4,9); g.restore();
});

function drawCrateIcon(g,type,opened,t=0){
  // wooden crate, rarity stripe, label
  g.clearRect(0,0,150,110);
  g.save(); g.translate(75,92); g.scale(1.6,1.6);
  g.fillStyle='#8a6f4d'; g.fillRect(-24,-34,48,34);
  g.fillStyle='#a3865c'; g.fillRect(-24,-34,48,6);
  g.strokeStyle='#6b5436'; g.lineWidth=2;
  g.strokeRect(-24,-34,48,34);
  g.beginPath(); g.moveTo(-24,-34); g.lineTo(24,0); g.moveTo(24,-34); g.lineTo(-24,0); g.stroke();
  const col = {standard:'#8f9aa8',elite:'#4a90e2',premium:'#f5a53f',golden:'#ffd54f'}[type]||'#fff';
  g.fillStyle=col; g.fillRect(-24,-20,48,5);
  g.restore();
}

// ================= canvas / camera =================
const cv=$('#cv'), ctx=cv.getContext('2d');
let W=0,H=0,DPR=1;
function resize(){
  DPR=Math.min(2,window.devicePixelRatio||1);
  W=window.innerWidth; H=window.innerHeight;
  cv.width=W*DPR; cv.height=H*DPR;
  cv.style.width=W+'px'; cv.style.height=H+'px';
}
window.addEventListener('resize',resize); resize();

const cam={x:PLOT.x+PLOT.w*SLOT/2, y:PLOT.y+PLOT.h*SLOT/2+80, z:.9, tx:PLOT.x+PLOT.w*SLOT/2, ty:PLOT.y+PLOT.h*SLOT/2+80, tz:.9};
function viewBounds(){
  const hw=W/2/cam.z, hh=H/2/(cam.z*.72);
  return {x0:cam.x-hw-80, x1:cam.x+hw+80, y0:cam.y-hh-80, y1:cam.y+hh+80};
}
function s2w(mx,my){ return { x:(mx-W/2)/cam.z+cam.x, y:(my-H/2)/(cam.z*.72)+cam.y }; }
// pseudo-depth scale: things lower on screen (nearer) are bigger
function depth(y){
  const topY=cam.y-(H/2)/(cam.z*.72), spanY=H/(cam.z*.72);
  return .82+.36*clamp01((y-topY)/spanY);
}

const mouse={x:0,y:0,wx:0,wy:0,down:false,dragX:0,dragY:0,dragging:false};
let selUnits=[];
let dragBand=null;

// ground texture (pre-rendered patches)
const PATCHES=[], TREES=[];
{ let seed=7;
  const sr=()=> (seed=(seed*16807)%2147483647)/2147483647;
  const col=()=> sr()<.5?'rgba(0,60,0,.07)':'rgba(255,255,220,.05)';
  const putTree=(x,y)=> TREES.push({x,y,s:.75+sr()*.6});
  for(let i=0;i<MAP_PLOTS.length;i++){
    const p=MAP_PLOTS[i], cx=p.x+PLOT_HW, cy=p.y+PLOT_HH;
    for(let a=0;a<9;a++){ const th=sr()*pi2, rr=25+sr()*70; PATCHES.push({x:cx+Math.cos(th)*rr, y:cy+Math.sin(th)*rr, r:rr, c:col()}); }
    for(let a=0;a<16;a++){ const th=sr()*pi2, e=sqExit(th,PLOT_HW,PLOT_HH), R=plotRadius(i,th);
      if(R-e>52){ const rad=e+36+sr()*(R-e-50); putTree(cx+Math.cos(th)*rad, cy+Math.sin(th)*rad); } }
  }
  for(let a=0;a<10;a++){ const th=sr()*pi2, rr=70+sr()*(cityRadius(th)-100); PATCHES.push({x:CITY_ISL.x+Math.cos(th)*rr, y:CITY_ISL.y+Math.sin(th)*rr, r:30+sr()*55, c:col()}); }
  for(let a=0;a<8;a++){ const th=sr()*pi2, R=cityRadius(th); if(R>190) putTree(CITY_ISL.x+Math.cos(th)*(R-24-sr()*16), CITY_ISL.y+Math.sin(th)*(R-24-sr()*16)); }
  for(let i=0;i<POINTS_DEFS.length;i++){
    const pt=POINTS_DEFS[i]; if(pt.city) continue;
    for(let a=0;a<2;a++){ const th=sr()*pi2, rr=sr()*Math.max(10,isletRadius(i,th)-18); PATCHES.push({x:pt.x+Math.cos(th)*rr, y:pt.y+Math.sin(th)*rr, r:10+sr()*18, c:col()}); }
    const n=pt.r>80?3:2;
    for(let a=0;a<n;a++){ const th=sr()*pi2, R=isletRadius(i,th), lo=pt.r+16, hi=R-14;
      if(hi>lo) putTree(pt.x+Math.cos(th)*(lo+sr()*(hi-lo)), pt.y+Math.sin(th)*(lo+sr()*(hi-lo))); }
  }
}

// ================= fx =================
let fx={tracers:[],floats:[],parts:[],booms:[]};
function addFloat(x,y,txt,col){ if(S.settings.gfx!=='High'&&!col) return; fx.floats.push({x,y,txt,col:col||'#fff',life:1.1}); }
function addBoom(x,y,r=1){ if(S.settings.gfx==='Low') return; fx.booms.push({x,y,r:6,max:r*26,life:.45}); }
function addParts(x,y,n,col){ if(S.settings.gfx==='Low') return; for(let i=0;i<n;i++) fx.parts.push({x,y,vx:rnd(-90,90),vy:rnd(-130,10),life:rnd(.3,.7),col,sz:rnd(2,4.5)}); }
function tracer(x1,y1,x2,y2,col){ fx.tracers.push({x1,y1,x2,y2,life:.07,col}); }

// ================= game systems =================
function totalPower(){
  let p=0;
  for(const b of S.buildings){ if((b.owner??"p")!=="p") continue; p+=BUILD[b.type].power; }
  for(const u of S.units) if(u.side==='p') p+= (u.boss?BOSS.power:UNITS[u.type].power);
  return p;
}
S && (S._power=0);
function incomeRate(){
  let base=0, logi=0;
  for(const b of S.buildings){
    if((b.owner??"p")!=="p") continue;
    const d=BUILD[b.type];
    if(d.special==='logistics'||(d.name==='Logistics Warehouse')) logi++;
    const dmg = b.hp < b.maxHp*.5 ? .5 : 1;
    base += (d.income||0)*dmg;
  }
  let owned=0, city=false;
  for(const p of S.points) if(p.owner==='player'){ owned++; if(p.city) city=true; }
  return base*(1+.1*S.rebirth)*(1+(city?.2:0)+.1*owned)*(1+Math.min(5,logi)*.1);
}
function unitCap(){
  let depots=0;
  for(const b of S.buildings) if((b.owner??"p")==="p"&&BUILD[b.type].name==='Supply Depot') depots++;
  return Math.min(100, 10+depots*10);
}
function playerUnits(){ return S.units.filter(u=>u.side==='p'); }

// placement
function canPlaceAt(type,gx,gy){
  const d=BUILD[type];
  if(gx<0||gy<0||gx+d.w>PLOT.w||gy+d.h>PLOT.h) return false;
  for(const b of S.buildings){
    const bd=BUILD[b.type];
    if(gx < b.gx+bd.w && gx+d.w > b.gx && gy < b.gy+bd.h && gy+d.h > b.gy) return false;
  }
  return true;
}
function ghostSlot(){
  const d=BUILD[S.placing];
  let gx=Math.floor((mouse.wx-PLOT.x)/SLOT)-(d.w-1)/2;
  let gy=Math.floor((mouse.wy-PLOT.y)/SLOT)-(d.h-1)/2;
  gx=Math.round(gx); gy=Math.round(gy);
  return {gx:clamp(gx,0,PLOT.w-d.w), gy:clamp(gy,0,PLOT.h-d.h), ok:canPlaceAt(S.placing,gx,gy)};
}
function placeBuilding(type,gx,gy,owner='p'){
  placeBuildingRaw(type,gx,gy,owner);
  const c=bPos(S.buildings[S.buildings.length-1]);
  addParts(c.x,c.y,8,'#b0a58c');
  sfx('place');
}
function placeBuildingRaw(type,gx,gy,owner){
  const d=BUILD[type];
  S.buildings.push({id:nid(),type,gx,gy,owner,hp:d.hp,maxHp:d.hp,t:d.spawnEvery||0,flash:0});
}
function botBuildings(i){ return S.buildings.filter(b=>b.owner===i); }
function botUnits(i){ return S.units.filter(u=>u.side==='e'&&u.bot===i); }
function botTier(i){ return (PRESET_MAP[S.bots[i].preset]||PRESETS[0]).tier; }
function botCap(i){ return 8+botTier(i)*2; }
function setBotPreset(i,presetId,silent){
  const bot=S.bots[i];
  S.buildings=S.buildings.filter(b=>b.owner!==i);
  S.units=S.units.filter(u=>u.bot!==i);
  bot.preset=presetId; bot.down=false; bot.downT=0;
  bot.raidT=110-botTier(i)*6+rnd(0,50);
  for(const [t,gx,gy] of (PRESET_MAP[presetId]||PRESETS[0]).b) placeBuildingRaw(t,gx,gy,i);
  if(!silent) toast(`${BOT_DEFS[i].name} → ${(PRESET_MAP[presetId]||PRESETS[0]).label}`,'#4a90e2');
}
function removeBuildingRefund(b){
  const d=BUILD[b.type];
  S.buildings=S.buildings.filter(x=>x.id!==b.id);
  if(d.cost){ S.cash+=d.cost*.5; toast(`Sold ${d.name} for ${fmt(d.cost*.5)}$`,'#8f9aa8'); }
  sfx('click');
}

// inventory / crates
function weightedPick(entries){
  let tot=0; for(const e of entries) tot+=e[1];
  let r=Math.random()*tot;
  for(const e of entries){ r-=e[1]; if(r<=0) return e[0]; }
  return entries[0][0];
}
function featuredPremium(){ return WEEKLY[Math.floor((Date.now()/86400000))%WEEK.length]; }
function rollCrate(ct){
  if(ct==='premium'){
    S.premiumPity=(S.premiumPity||0)+1;
    if(S.premiumPity>=80){ S.premiumPity=0; return featuredPremium(); }
    if(Math.random()<.15) return featuredPremium();
    return weightedPick(CRATE_TABLES.premium);
  }
  return weightedPick(CRATE_TABLES[ct]);
}
function giveItem(kind,type){
  if(kind==='b') S.inventory.push({kind:'b',type});
  else S.inventory.push({kind:'c',type});
}
function openCrateModal(ct){
  const item=rollCrate(ct);
  S.stats.cratesOpened++;
  let prev=$('#p-crate').classList.contains('show') ? S._prevPanel : (document.querySelector('.panel.show')?.id||'p-backpack').slice(2);
  S._prevPanel = prev.startsWith('p-')?prev.slice(2):prev;
  openPanel('crate');
  const icon=$('#crateIcon'), g=icon.getContext('2d');
  drawCrateIcon(g,ct);
  $('#crateName').textContent='? ? ?';
  $('#crateRar').textContent='';
  $('#crateStage').classList.add('opening');
  sfx('open');
  let i=0;
  const iv=setInterval(()=>{
    i++;
    const fake=pick([...CRATE_TABLES[ct==='premium'?'premium':ct],...CRATE_TABLES.premium]);
    $('#crateName').textContent=BUILD[fake].name;
    if(i>14){
      clearInterval(iv);
      const d=BUILD[item];
      $('#crateName').textContent=d.name;
      $('#crateRar').textContent=d.rar.toUpperCase();
      $('#crateRar').style.color=RAR[d.rar].c;
      $('#crateStage').classList.remove('opening');
      // draw item icon
      g.clearRect(0,0,150,110);
      g.save(); g.translate(75,96);
      const sp=SPR[item];
      const sc=Math.min(84/sp.h,110/sp.w)*.9;
      g.scale(sc,sc); sp.draw(g,performance.now()/1000,{side:'p'});
      g.restore();
      sfx('coin');
    }
  },70);
  giveItem('b',item);
}
$('#btnCrateDone').onclick=()=>{
  closePanel('crate');
  if(S._prevPanel && S._prevPanel!=='crate') openPanel(S._prevPanel);
  sfx('click');
};

// points & garrison
function garrisonCount(i){
  return S.units.filter(u=>u.home===i).length;
}
function pointFaction(p){ return p.owner==='player'?0:(p.owner==='enemy'?(p.faction??1):-1); }
function spawnGarrison(i,n=1){
  const p=S.points[i];
  const f=pointFaction(p);
  if(f<0) return 0; // neutral points have no garrison
  const cap=p.garrison+p.tank;
  let made=0;
  for(let k=0;k<n;k++){
    if(garrisonCount(i)>=cap) break;
    const isTank = p.city && Math.random()<.4;
    const a=rnd(0,pi2), rr=rnd(p.r*.4,p.r*.8);
    S.units.push(mkUnit(isTank?'tank':'rifle', f===0?'p':'e', p.x+Math.cos(a)*rr,p.y+Math.sin(a)*rr,{home:i,faction:f}));
    made++;
  }
  return made;
}
function mkUnit(type,side,x,y,ex={}){
  const d=UNITS[type];
  const faction = ex.faction!=null?ex.faction:(side==='p'?0:1);
  return {id:nid(),type,side,faction,x,y,hp:d.hp,maxHp:d.hp,cool:rnd(.2,1),t:0,
    order:null,home:ex.home??null,bot:ex.bot??null,raid:!!ex.raid,boss:!!ex.boss,
    stealth:!!d.stealth,revealed:false,fightT:0,cityGoal:!!ex.cityGoal,
    path:null,wp:0,repath:0,_tcx:-1,_tcy:-1,
    tx:ex.tx??x,ty:ex.ty??y,hist:ex.hist||[]};
}

// waves & boss
function spawnWave(){
  S.wave++;
  const n=3+S.wave, tanks=Math.floor(S.wave/2);
  const hpM=1+S.wave*.12;
  const fromBots=S.bots.map((b,i)=>b.down||botBuildings(i).length===0?-1:i).filter(i=>i>=0);
  if(!fromBots.length) return;
  const bi=pick(fromBots);
  const c=botCenter(bi);
  for(let i=0;i<n+tanks;i++){
    const x=clamp(c.x+rnd(-420,420),150,WORLD.w-150);
    const y=clamp(c.y+rnd(-260,260),150,WORLD.h-150);
    const type = i<tanks?'tank':'rifle';
    const u=mkUnit(type,'e',x,y,{raid:true,faction:bi+1});
    u.hp=u.maxHp=UNITS[type].hp*hpM;
    u.order={point:2}; u.cityGoal=true; // surge the CITY
    S.units.push(u);
  }
  toast(`⚠️ WAVE ${S.wave}: ${facN(bi+1)} reinforcements surge the CITY!`,facC(bi+1));
  sfx('horn');
}
function spawnBoss(){
  const pc=plotCenter(pick(MAP_PLOTS));
  const x=pc.x+rnd(-120,120), y=pc.y+rnd(-70,70);
  const hpM=1+S.wave*.1;
  const bf=1+Math.floor(Math.random()*7);
  const u=mkUnit('rifle','e',x,y,{boss:true,faction:bf});
  u.type='boss';
  u.hp=u.maxHp=BOSS.hp*hpM;
  u.hist=[];
  S.units.push(u);
  toast(`🐍 MECHA WORM emerges from ${BOT_DEFS[bf-1].dir}! KILL IT FOR A PREMIUM CRATE!`,'#ef5350');
  sfx('horn');
}

// capture check — the faction with the most troops at a point holds it
let capTimer=0;
function checkCaptures(dt){
  capTimer-=dt;
  if(capTimer>0) return;
  capTimer=.25;
  for(const p of S.points){
    if((p.cool||0)>0) continue;
    const counts={};
    for(const u of S.units){
      if(Math.hypot(u.x-p.x,u.y-p.y)>p.r) continue;
      counts[u.faction]=(counts[u.faction]||0)+1;
    }
    let bestF=-1,bestN=0;
    for(const f in counts) if(counts[f]>bestN){ bestN=counts[f]; bestF=+f; }
    if(bestN<1) continue;
    const curF=pointFaction(p);
    if(bestF===curF) continue;
    const curN=curF>=0?(counts[curF]||0):0;
    if(bestN>curN){
      p.owner=bestF===0?'player':'enemy';
      p.faction=bestF;
      p.cool=6; p.respawnT=p.city?15:22;
      S.units=S.units.filter(u=>!(u.home===p.id&&u.faction!==bestF));
      if(bestF===0&&curF!==-1) S.stats.captures++;
      const col=facC(bestF);
      toast(`${bestF===0?'🚩 YOU captured':'🚩 '+facN(bestF)+' captured'} ${p.name}!${p.city?' (+20% income)':''}`,col);
      addParts(p.x,p.y,20,col);
      sfx('capture');
      spawnGarrison(p.id,p.garrison+p.tank);
      if(bestF===0&&p.city) S.attackCity=false;
    }
  }
}

// unit update
const bFaction = b => (b.owner??"p")==="p"?0:b.owner+1;
function targetFor(u){
  if(u.boss){
    // boss: nearest enemy base building (any other faction)
    let best=null,bd=1e9;
    for(const b of S.buildings){
      if(bFaction(b)===u.faction) continue;
      const c=bPos(b);
      const dd=Math.hypot(c.x-u.x,c.y-u.y);
      if(dd<bd){bd=dd;best={x:c.x,y:c.y,b};}
    }
    if(!best) best={x:CITY_ISL.x,y:CITY_ISL.y};
    return best;
  }
  if(u.side==='e'){
    if(u.bot!=null){
      // BOT unit: DEFAULT = march on the CITY (the middle). Enemies en route are handled by findEnemyOf.
      if(u.order){
        if(u.order.point!==undefined){
          const p=S.points[u.order.point];
          return {x:p.x,y:p.y,point:p,defend:true};
        }
        if(u.order.bid){
          const b=S.buildings.find(x=>x.id===u.order.bid);
          if(b){ const c=bPos(b); return {x:c.x,y:c.y,b}; }
          u.order.bid=null;
        }
        return {x:u.order.x,y:u.order.y,hold:true};
      }
      // no order = defender: hold base, chase visible threats near home
      const bc=botCenter(u.bot);
      let threat=null,td=1e9;
      for(const p of S.units){
        if(p.faction===u.faction) continue;
        const dd=Math.hypot(p.x-bc.x,p.y-bc.y);
        if(dd<td){td=dd;threat=p;}
      }
      if(threat&&td<700&&canSee(u,threat)) return {x:threat.x,y:threat.y};
      return {x:bc.x+(((u.id%7)-3)*70), y:bc.y+(((u.id%5)-2)*55), hold:true};
    }
    if(u.home!==null){
      const p=S.points[u.home];
      return {x:p.x,y:p.y,point:p,defend:true};
    }
    // wave raider
    if(u.raid){
      if(u.order&&u.order.point!==undefined){
        const p=S.points[u.order.point];
        return {x:p.x,y:p.y,point:p};
      }
      let best=null,bd=1e9;
      for(const b of S.buildings){
        if(bFaction(b)===u.faction) continue;
        const c=bPos(b);
        const dd=Math.hypot(c.x-u.x,c.y-u.y);
        if(dd<bd){bd=dd;best={x:c.x,y:c.y,b};}
      }
      if(best) return best;
      u.raid=false;
    }
    return {x:u.x,y:u.y};
  }
  // player (faction 0)
  if(u.order){
    if(u.order.bid){
      const b=S.buildings.find(x=>x.id===u.order.bid);
      if(b){ const c=bPos(b); return {x:c.x,y:c.y,b}; }
      u.order.bid=null;
    }
    return {x:u.order.x,y:u.order.y,hold:true};
  }
  if(u.home!==null){
    const p=S.points[u.home];
    return {x:p.x,y:p.y,point:p,defend:true};
  }
  if(S.attackCity){
    const city=S.points[2];
    if(pointFaction(city)!==0) return {x:city.x,y:city.y,point:city};
    S.attackCity=false;
  }
  let best=null,bd=1e9;
  for(const p of S.points){
    if(pointFaction(p)===0||pointFaction(p)<0) continue;
    const dd=Math.hypot(p.x-u.x,p.y-u.y);
    if(dd<bd){bd=dd;best=p;}
  }
  if(best) return {x:best.x,y:best.y,point:best};
  // no enemy points → nearest enemy building
  let bb=null,bbd=1e9;
  for(const b of S.buildings){
    if(bFaction(b)===0) continue;
    const c=bPos(b);
    const dd=Math.hypot(c.x-u.x,c.y-u.y);
    if(dd<bbd){bbd=dd;bb={x:c.x,y:c.y,b};}
  }
  if(bb) return bb;
  return {x:PLOT.x+PLOT.w*50,y:PLOT.y+PLOT.h*50,hold:true};
}
// stealth visibility: can a see b?
function canSee(a,b){
  if(!isStealth(b)) return true;
  if(b.fightT>0) return true;              // in combat → revealed
  const dd=Math.hypot(b.x-a.x,b.y-a.y);
  if(dd<70) return true;                    // point blank
  const det=unitDetect(a);
  return det>0 && dd<=det;                  // detected by sensor range
}
function findEnemyOf(u,range){
  let best=null,bd=range;
  for(const e of S.units){
    if(e.faction===u.faction) continue;
    if(!canSee(u,e)) continue;
    const dd=Math.hypot(e.x-u.x,e.y-u.y);
    if(dd<bd){bd=dd;best=e;}
  }
  return best;
}
function updateUnit(u,dt){
  u.cool-=dt; u.t+=dt;
  u.fightT=Math.max(0,u.fightT-dt);
  const d = u.boss?BOSS:UNITS[u.type];
  const tg=targetFor(u);
  // acquire enemy (different faction + visible)
  const foe=findEnemyOf(u,d.range+(tg.defend?220:60));
  const trc=facC(u.faction);
  if(foe){
    u.fightT=Math.max(u.fightT,2);
    const dd=dist(u,foe);
    if(dd<=d.range){
      if(u.cool<=0){
        u.cool=d.rate;
        damageUnit(foe,u,d.dmg);
        tracer(u.x,u.y-10,foe.x,foe.y-d2(foe),trc);
        sfx('shot');
      }
    } else {
      stepUnit(u,foe.x,foe.y,d.speed,dt);
    }
  } else if(tg.b){
    const real=dist(u,{x:tg.x,y:tg.y});
    if(real<=d.range+40){
      if(u.cool<=0){
        u.cool=d.rate;
        u.fightT=Math.max(u.fightT,2);
        damageBuilding(tg.b,u,d.dmg);
        tracer(u.x,u.y-8,tg.x,tg.y-20,trc);
        sfx('shot');
      }
    } else stepUnit(u,tg.x,tg.y,d.speed,dt);
  } else {
    const dd=dist(u,{x:tg.x,y:tg.y});
    if(dd>10) stepUnit(u,tg.x,tg.y,d.speed,dt);
  }
  // boss history
  if(u.boss){
    u.hist.unshift({x:u.x,y:u.y});
    if(u.hist.length>40) u.hist.pop();
  }
}
// movement: air flies straight over water; land pathfinds (A*) or follows the city flow field
function stepUnit(u,tx,ty,sp,dt){
  const dd=dist(u,{x:tx,y:ty});
  if(isAir(u)||dd<240){ u.path=null; moveToward(u,tx,ty,sp,dt); return; }
  if(u.cityGoal){
    const f=flowStep(u.x,u.y);
    if(f){ u.path=null; moveToward(u,f.x,f.y,sp,dt); return; }
    u.cityGoal=false;
  }
  u.repath-=dt;
  const [tcx,tcy]=cellOf(tx,ty);
  if(!u.path||u.repath<=0||u._tcx!==tcx||u._tcy!==tcy){
    const p=astar(u.x,u.y,tx,ty);
    if(p&&p.length){ u.path=p; u.wp=0; u.repath=.7; u._tcx=tcx; u._tcy=tcy; }
    else if(!u.path){ moveToward(u,tx,ty,sp*.4,dt); return; }
  }
  while(u.path&&u.wp<u.path.length){
    const w=u.path[u.wp];
    if(dist(u,w)<CELL*.7){ u.wp++; continue; }
    moveToward(u,w.x,w.y,sp,dt);
    return;
  }
  moveToward(u,tx,ty,sp,dt);
}
// tiny helpers to keep tracer coords sane
const math = n=>n;
const d2 = u=> (u.boss?18:UNITS[u.type].name.length*1.2+6);

function moveToward(u,tx,ty,sp,dt){
  const dd=dist(u,{x:tx,y:ty});
  if(dd<1) return;
  u.x+=(tx-u.x)/dd*sp*dt;
  u.y+=(ty-u.y)/dd*sp*dt;
}
function damageUnit(t,from,dmg){
  if(S.admin&&S.admin.god&&t.side==='p') return; // admin god mode
  dmg=Math.max(1,dmg-unitArmor(t));               // armored type: flat mitigation
  t.hp-=dmg;
  if(isStealth(t)){ t.revealed=true; t.fightT=3; } // taking fire breaks stealth
  if(S.settings.dmg && from.side==='p') addFloat(t.x+rnd(-6,6),t.y-24,String(Math.round(dmg)),'#ffd54f');
  if(t.hp<=0) killUnit(t,from);
}
function killUnit(u,from){
  S.units=S.units.filter(x=>x.id!==u.id);
  addBoom(u.x,u.y,u.boss?3:1);
  addParts(u.x,u.y,u.boss?26:8,'#c98a4b');
  sfx('boom');
  if(from&&from.side==='p'&&u.faction!==0){
    if(u.boss){
      S.stats.bosses++;
      S.cash+=BOSS.reward;
      S.inventory.push({kind:'c',type:'premium'});
      toast(`🐳 MECHA WORM DESTROYED! +${fmt(BOSS.reward)}$ + Premium Crate`,'#ffd54f');
      addFloat(u.x,u.y-40,'+PREMIUM CRATE!','#ffd54f');
    } else {
      const d=UNITS[u.type];
      S.cash+=d.reward;
      S.stats.kills++;
      addFloat(u.x,u.y-16,'+'+d.reward+'$','#8fe08f');
    }
  }
  if(u.side==='p' && selUnits.includes(u)) selUnits=selUnits.filter(x=>x.id!==u.id);
}
function damageBuilding(b,from,dmg){
  if(S.admin&&S.admin.god) return; // admin god mode protects the base too
  b.hp-=dmg; b.flash=.15;
  if(S.settings.dmg && from.side==='p') addFloat(b.x+rnd(-10,10),b.y-40,String(Math.round(dmg)),'#ffb0a8');
  if(b.hp<=0){
    S.buildings=S.buildings.filter(x=>x.id!==b.id);
    addBoom(b.x,b.y,2);
    sfx('boom');
    if(typeof(b.owner??"p")==="number"){
      const d=BUILD[b.type];
      if(from.side==='p'){
        const reward=Math.max(100,Math.round((d.cost||20000)*.25));
        S.cash+=reward;
        toast(`💥 ${facN(b.owner+1)}'s ${d.name} destroyed! +$${fmt(reward)}`,'#ffd54f');
      } else {
        toast(`💥 ${facN(b.owner+1)}'s ${d.name} destroyed`,'#8f9aa8');
      }
    } else {
      toast(`💥 ${BUILD[b.type].name} destroyed!`,'#ef5350');
    }
  }
}

// ================= render =================
const mini=$('#mini'), mctx=mini.getContext('2d');
function render(){
  ctx.setTransform(DPR,0,0,DPR,0,0);
  ctx.fillStyle='#2a7fd0'; ctx.fillRect(0,0,W,H);
  ctx.setTransform(DPR*cam.z,0,0,DPR*cam.z*.72,DPR*(W/2-cam.x*cam.z),DPR*(H/2-cam.y*cam.z*.72));

  const vb=viewBounds();
  drawGround(vb);

  // drawables
  const items=[];
  for(const b of S.buildings){
    const c=bPos(b);
    if(c.x<vb.x0||c.x>vb.x1||c.y<vb.y0||c.y>vb.y1) continue;
    items.push({y:c.y,kind:'b',b,x:c.x});
  }
  for(const u of S.units){
    if(u.x<vb.x0||u.x>vb.x1||u.y<vb.y0||u.y>vb.y1) continue;
    items.push({y:u.y,kind:'u',u});
  }
  for(const p of S.points){
    if(p.x<vb.x0||p.x>vb.x1||p.y<vb.y0||p.y>vb.y1) continue;
    items.push({y:p.y,kind:'flag',p});
  }
  items.sort((a,b)=>a.y-b.y);

  for(const it of items){
    if(it.kind==='b'){
      const d=BUILD[it.b.type], sp=SPR[it.b.type];
      const s=depth(it.y);
      const isBot=typeof(it.b.owner??"p")==="number";
      ctx.save(); ctx.translate(it.x,it.y); ctx.scale(s,s);
      ctx.fillStyle='rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(0,2,sp.w*.55,sp.w*.2,0,0,pi2); ctx.fill();
      if(it.b.flash>0){ ctx.globalAlpha=.5+Math.sin(performance.now()/30)*.3; }
      sp.draw(ctx,performance.now()/1000,{side:isBot?'e':'p'});
      ctx.restore();
      // hp bar if damaged
      if(it.b.hp<it.b.maxHp){
        const w=sp.w*.9;
        ctx.fillStyle='rgba(0,0,0,.5)'; ctx.fillRect(-w/2,-sp.h*s-8*s,w,4*s);
        ctx.fillStyle='#5bc24e'; ctx.fillRect(-w/2,-sp.h*s-8*s,w*clamp01(it.b.hp/it.b.maxHp),4*s);
      }
      // bot base overlays
      if(isBot){
        const bb=S.bots[it.b.owner];
        if(bb&&bb.down){
          ctx.globalAlpha=1;
          ctx.fillStyle='rgba(13,18,25,.8)';
          ctx.fillRect(it.x-70,it.y-sp.h*s-30,140,16);
          ctx.fillStyle='#ef5350'; ctx.font='900 12px "Segoe UI"'; ctx.textAlign='center';
          ctx.fillText(`REBUILDING ${Math.max(0,Math.ceil(bb.downT))}s`,it.x,it.y-sp.h*s-18);
        } else if(bb&&bb.raidT<10){
          ctx.fillStyle='#ff8a5c'; ctx.font='900 14px "Segoe UI"'; ctx.textAlign='center';
          ctx.fillText('⚠',it.x,it.y-sp.h*s-24*s);
        }
      }
    } else if(it.kind==='u'){
      drawUnit(it.u,depth(it.u.y),false);
    } else if(it.kind==='flag'){
      drawPointFlag(it.p,depth(it.p.y));
    }
  }

  // boss (drawn on top of ground, under fx) — actually draw within items? boss is a unit; handled in drawUnit via kind u (boss flag)
  // tracers
  for(const t of fx.tracers){
    ctx.strokeStyle=t.col; ctx.lineWidth=2.5; ctx.globalAlpha=t.life/.07;
    ctx.beginPath(); ctx.moveTo(t.x1,t.y1); ctx.lineTo(t.x2,t.y2); ctx.stroke(); ctx.globalAlpha=1;
  }
  // booms
  for(const b of fx.booms){
    const p=1-b.life/.45, r=lerp(4,b.max,p);
    ctx.globalAlpha=(1-p)*.8;
    ctx.fillStyle='#ffb066'; ctx.beginPath(); ctx.arc(b.x,b.y,r,0,pi2); ctx.fill();
    ctx.fillStyle='#fff2c9'; ctx.beginPath(); ctx.arc(b.x,b.y,r*.5,0,pi2); ctx.fill();
    ctx.globalAlpha=1;
  }
  // particles
  for(const p of fx.parts){
    ctx.globalAlpha=clamp01(p.life*2);
    ctx.fillStyle=p.col; ctx.fillRect(p.x-p.sz/2,p.y-p.sz/2,p.sz,p.sz);
  }
  ctx.globalAlpha=1;
  // floats
  ctx.font='bold 13px sans-serif'; ctx.textAlign='center';
  for(const f of fx.floats){
    ctx.globalAlpha=clamp01(f.life);
    ctx.fillStyle=f.col; ctx.fillText(f.txt,f.x,f.y);
  }
  ctx.globalAlpha=1; ctx.textAlign='left';

  // selection
  for(const id of selUnits){
    const u=S.units.find(x=>x.id===id);
    if(!u) continue;
    ctx.strokeStyle='rgba(255,255,255,.85)'; ctx.lineWidth=1.5;
    ctx.setLineDash([5,4]);
    ctx.beginPath(); ctx.arc(u.x,u.y, (u.boss?24:13),0,pi2); ctx.stroke();
    ctx.setLineDash([]);
  }
  // drag band
  if(dragBand){
    ctx.strokeStyle='rgba(255,255,255,.8)'; ctx.lineWidth=1.2;
    ctx.fillStyle='rgba(74,144,226,.15)';
    const x=Math.min(dragBand.x1,dragBand.x2), y=Math.min(dragBand.y1,dragBand.y2);
    const w=Math.abs(dragBand.x2-dragBand.x1), h=Math.abs(dragBand.y2-dragBand.y1);
    ctx.fillRect(x,y,w,h); ctx.strokeRect(x,y,w,h);
  }
  // placement ghost
  if(S.placing){
    const g=ghostSlot();
    const q=plotAt(g.gx,g.gy), d=BUILD[S.placing];
    ctx.fillStyle=g.ok?'rgba(91,194,78,.25)':'rgba(214,73,63,.3)';
    ctx.strokeStyle=g.ok?'#5bc24e':'#d6493f';
    ctx.lineWidth=2;
    ctx.fillRect(q.x,q.y,d.w*SLOT,d.h*SLOT);
    ctx.strokeRect(q.x,q.y,d.w*SLOT,d.h*SLOT);
    const sp=SPR[S.placing];
    const gs=depth(q.y+d.h*100);
    ctx.save(); ctx.translate(q.x+d.w*50,q.y+d.h*100); ctx.scale(gs,gs); ctx.globalAlpha=.75;
    sp.draw(ctx,performance.now()/1000,{side:'p'});
    ctx.restore(); ctx.globalAlpha=1;
  }
  // minimap
  drawMini();
}

function drawUnit(u,s){
  let sp;
  if(u.boss){ drawBoss(u); return; }
  sp=SPR[u.type];
  const air=isAir(u);
  const flyY = air ? -(56+Math.sin(u.t*2.5)*6) : 0;
  // stealth: hidden units are nearly invisible
  const hidden = isStealth(u)&&!u.revealed;
  ctx.globalAlpha = hidden?.16:1;
  // shadow on the ground
  ctx.fillStyle = air?'rgba(0,0,0,.12)':'rgba(0,0,0,.25)';
  ctx.beginPath();
  ctx.ellipse(u.x,u.y+2, sp.w*.45*s, (air?4:sp.w*.17)*s,0,0,pi2);
  ctx.fill();
  ctx.save(); ctx.translate(u.x,u.y+flyY); ctx.scale(s,s);
  sp.draw(ctx,performance.now()/1000,{side:u.side,faction:u.faction});
  ctx.restore();
  ctx.globalAlpha=1;
  // detected-stealth shimmer
  if(isStealth(u)&&u.revealed&&u.fightT<=0){
    ctx.strokeStyle=hexA(facC(u.faction),.5+Math.sin(performance.now()/120)*.3);
    ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.arc(u.x,u.y-10,14*s,0,pi2); ctx.stroke();
  }
  // hp bar (faction color)
  if(u.hp<u.maxHp){
    const w=sp.w*.9;
    ctx.fillStyle='rgba(0,0,0,.5)'; ctx.fillRect(u.x-w/2,u.y-UNITS[u.type].name.length*1.2-14, w,3.5);
    ctx.fillStyle=facC(u.faction);
    ctx.fillRect(u.x-w/2,u.y-UNITS[u.type].name.length*1.2-14, w*clamp01(u.hp/u.maxHp),3.5);
  }
}
function drawBoss(u){
  // segments
  for(let i=Math.min(30,u.hist.length-1);i>=0;i-=2){
    const h=u.hist[i]; if(!h) break;
    const r=15-i*.42;
    if(r<6) break;
    const s=depth(h.y);
    ctx.save(); ctx.translate(h.x,h.y); ctx.scale(s,s);
    ctx.fillStyle='rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(0,3,r*.9,r*.35,0,0,pi2); ctx.fill();
    ctx.fillStyle='#5a616c'; ctx.beginPath(); ctx.arc(0,0,r,0,pi2); ctx.fill();
    ctx.strokeStyle='#33383f'; ctx.lineWidth=2; ctx.stroke();
    ctx.fillStyle='#6d7581'; ctx.beginPath(); ctx.arc(0,-r*.3,r*.55,0,pi2); ctx.fill();
    ctx.fillStyle='#33383f';
    ctx.beginPath(); ctx.moveTo(-r*.4,-r*.85); ctx.lineTo(0,-r-6); ctx.lineTo(r*.4,-r*.85); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  const s=depth(u.y);
  ctx.save(); ctx.translate(u.x,u.y); ctx.scale(s,s);
  const r=20;
  ctx.fillStyle='rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(0,4,r,r*.4,0,0,pi2); ctx.fill();
  ctx.fillStyle='#4a4f58'; ctx.beginPath(); ctx.arc(0,0,r,0,pi2); ctx.fill();
  ctx.strokeStyle='#22262c'; ctx.lineWidth=2.5; ctx.stroke();
  ctx.fillStyle='#6d7581'; ctx.beginPath(); ctx.arc(0,-r*.3,r*.6,0,pi2); ctx.fill();
  // jaw
  ctx.fillStyle='#33383f'; ctx.beginPath(); ctx.arc(0,r*.25,r*.7,0,Math.PI); ctx.closePath(); ctx.fill();
  // eyes
  const gl=.6+Math.sin(performance.now()/150)*.4;
  ctx.fillStyle=`rgba(255,70,50,${gl})`;
  ctx.beginPath(); ctx.arc(-7,-4,3.4,0,pi2); ctx.arc(7,-4,3.4,0,pi2); ctx.fill();
  // horns
  ctx.fillStyle='#e0a32e';
  ctx.beginPath(); ctx.moveTo(-12,-r+4); ctx.lineTo(-16,-r-9); ctx.lineTo(-7,-r+1); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(12,-r+4); ctx.lineTo(16,-r-9); ctx.lineTo(7,-r+1); ctx.closePath(); ctx.fill();
  ctx.restore();
  // boss hp handled in HUD bar
}
function drawPointFlag(p,s){
  const f=pointFaction(p);
  const col=f<0?'#8f9aa8':facC(f);
  ctx.save(); ctx.translate(p.x,p.y); ctx.scale(s,s);
  ctx.fillStyle='#7d8794'; ctx.fillRect(-2,-52,4,52);
  ctx.fillStyle=col;
  ctx.beginPath(); ctx.moveTo(2,-52);
  ctx.quadraticCurveTo(18,-49+Math.sin(performance.now()/250)*3,30,-46);
  ctx.lineTo(30,-33); ctx.quadraticCurveTo(16,-36,2,-36);
  ctx.closePath(); ctx.fill();
  ctx.restore();
  // label
  ctx.save(); ctx.translate(p.x,p.y); ctx.scale(s,s);
  ctx.font='bold 11px sans-serif'; ctx.textAlign='center';
  ctx.fillStyle='rgba(20,26,34,.75)';
  const t=p.name+' · '+(f<0?'NEUTRAL':(f===0?'YOU':facN(f)));
  const tw=ctx.measureText(t).width;
  ctx.fillRect(-tw/2-5,-70,tw+10,14);
  ctx.fillStyle=col; ctx.fillText(t,0,-59);
  ctx.textAlign='left';
  ctx.restore();
}
function islandPoly(rf,cx,cy,extra=0){
  ctx.beginPath();
  const N=72;
  for(let a=0;a<=N;a++){
    const th=a/N*pi2, r=rf(th)+extra;
    const px=cx+Math.cos(th)*r, py=cy+Math.sin(th)*r;
    a?ctx.lineTo(px,py):ctx.moveTo(px,py);
  }
  ctx.closePath();
}
function drawTree(t){
  ctx.save(); ctx.translate(t.x,t.y); ctx.scale(t.s,t.s);
  ctx.fillStyle='rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(2,3,10,4,0,0,pi2); ctx.fill();
  ctx.fillStyle='#6b4a2f'; ctx.fillRect(-2,-6,4,8);
  ctx.fillStyle='#3e7a34'; ctx.beginPath(); ctx.arc(0,-14,10,0,pi2); ctx.fill();
  ctx.fillStyle='#4a8c3d'; ctx.beginPath(); ctx.arc(-4,-19,7,0,pi2); ctx.fill();
  ctx.beginPath(); ctx.arc(5,-18,6,0,pi2); ctx.fill();
  ctx.restore();
}
function drawGround(vb){
  // ocean
  ctx.fillStyle='#2a7fd0';
  ctx.fillRect(vb.x0,vb.y0,vb.x1-vb.x0,vb.y1-vb.y0);
  // bridges: city -> every plot island (under the land)
  ctx.strokeStyle='#5d5346'; ctx.lineWidth=44; ctx.lineCap='round';
  ctx.beginPath();
  for(const p of MAP_PLOTS){ const c=plotCenter(p); ctx.moveTo(CITY_ISL.x,CITY_ISL.y); ctx.lineTo(c.x,c.y); }
  ctx.stroke();
  ctx.strokeStyle='rgba(255,255,255,.10)'; ctx.lineWidth=3;
  ctx.beginPath();
  for(const p of MAP_PLOTS){ const c=plotCenter(p); ctx.moveTo(CITY_ISL.x,CITY_ISL.y); ctx.lineTo(c.x,c.y); }
  ctx.stroke();
  ctx.lineCap='butt';
  // point islets (organic)
  for(let i=0;i<POINTS_DEFS.length;i++){
    const pt=POINTS_DEFS[i]; if(pt.city) continue;
    ctx.fillStyle='#d9c68a'; islandPoly(th=>isletRadius(i,th),pt.x,pt.y,12); ctx.fill();
    ctx.fillStyle='#69a54e'; islandPoly(th=>isletRadius(i,th),pt.x,pt.y); ctx.fill();
  }
  // plot islands (0 = player, 1-7 = bots): square grid fused with organic coast
  for(let i=0;i<MAP_PLOTS.length;i++){
    const p=MAP_PLOTS[i], cx=p.x+PLOT_HW, cy=p.y+PLOT_HH;
    ctx.fillStyle='#d9c68a'; islandPoly(th=>plotRadius(i,th),cx,cy,13); ctx.fill();
    ctx.fillStyle='#69a54e'; islandPoly(th=>plotRadius(i,th),cx,cy); ctx.fill();
  }
  // central city island (organic disc)
  ctx.fillStyle='#d9c68a'; islandPoly(cityRadius,CITY_ISL.x,CITY_ISL.y,13); ctx.fill();
  ctx.fillStyle='#69a54e'; islandPoly(cityRadius,CITY_ISL.x,CITY_ISL.y); ctx.fill();
  // terrain patches
  for(const p of PATCHES){
    if(p.x<vb.x0-p.r||p.x>vb.x1+p.r||p.y<vb.y0-p.r||p.y>vb.y1+p.r) continue;
    ctx.fillStyle=p.c; ctx.beginPath(); ctx.ellipse(p.x,p.y,p.r,p.r*.6,0,0,pi2); ctx.fill();
  }
  // city arena ring
  ctx.fillStyle='#9aa0a6'; ctx.beginPath(); ctx.arc(CITY_ISL.x,CITY_ISL.y,148,0,pi2); ctx.fill();
  ctx.fillStyle='#828a92'; ctx.beginPath(); ctx.arc(CITY_ISL.x,CITY_ISL.y,118,0,pi2); ctx.fill();
  ctx.fillStyle='#69a54e'; ctx.beginPath(); ctx.arc(CITY_ISL.x,CITY_ISL.y,104,0,pi2); ctx.fill();
  // trees
  for(const t of TREES){
    if(t.x<vb.x0-40||t.x>vb.x1+40||t.y<vb.y0-40||t.y>vb.y1+40) continue;
    drawTree(t);
  }
  // player plot grid + label
  { const p=MAP_PLOTS[0], w=PLOT.w*SLOT, h=PLOT.h*SLOT;
    ctx.strokeStyle='rgba(255,255,255,.14)'; ctx.lineWidth=1;
    ctx.beginPath();
    for(let gx=1;gx<PLOT.w;gx++){ ctx.moveTo(p.x+gx*SLOT,p.y); ctx.lineTo(p.x+gx*SLOT,p.y+h); }
    for(let gy=1;gy<PLOT.h;gy++){ ctx.moveTo(p.x,p.y+gy*SLOT); ctx.lineTo(p.x+w,p.y+gy*SLOT); }
    ctx.stroke();
    ctx.fillStyle='#ffe08a'; ctx.font='900 15px "Segoe UI"'; ctx.textAlign='center';
    ctx.fillText('⬆ YOUR BASE',p.x+w/2,p.y-26);
  }
  // bot plot outlines + labels
  for(let i=0;i<MAP_PLOTS.length;i++){
    if(i===0) continue;
    const p=MAP_PLOTS[i], w=12*SLOT, h=7*SLOT, bd=BOT_DEFS[i-1], bb=S.bots[i-1];
    ctx.strokeStyle=bb.down?'rgba(239,83,80,.9)':hexA(facC(i),.55); ctx.lineWidth=2.5; ctx.setLineDash([10,7]);
    ctx.strokeRect(p.x,p.y,w,h);
    ctx.setLineDash([]);
    ctx.fillStyle=hexA(facC(i),.95); ctx.font='900 14px "Segoe UI"'; ctx.textAlign='center';
    ctx.fillText(`BOT ${i} · ${facN(i)} (${bd.dir})`,p.x+w/2,p.y-26);
    ctx.fillStyle='rgba(255,255,255,.55)'; ctx.font='700 10px "Segoe UI"';
    ctx.fillText((PRESET_MAP[S.bots[i-1].preset]||PRESETS[0]).label,p.x+w/2,p.y+h+22);
    if(bb.down){
      ctx.fillStyle='rgba(13,18,25,.75)'; ctx.fillRect(p.x+w/2-80,p.y+h/2-11,160,20);
      ctx.fillStyle='#ef5350'; ctx.font='900 12px "Segoe UI"';
      ctx.fillText(`REBUILDING ${Math.max(0,Math.ceil(bb.downT))}s`,p.x+w/2,p.y+h/2+3);
    }
  }
  // capture pads (owner color)
  for(const p of S.points){
    const f=pointFaction(p);
    const c=f<0?'#a0aab4':facC(f);
    ctx.fillStyle='#9aa0a6'; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,pi2); ctx.fill();
    ctx.fillStyle=hexA(c,.14); ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,pi2); ctx.fill();
    ctx.strokeStyle=hexA(c,.9); ctx.lineWidth=5; ctx.beginPath(); ctx.arc(p.x,p.y,p.r-4,0,pi2); ctx.stroke();
  }
}
function drawMini(){
  const mw=150,mh=112, sx=mw/WORLD.w, sy=mh/WORLD.h;
  mctx.fillStyle='#2a7fd0'; mctx.fillRect(0,0,mw,mh);
  // bridges
  mctx.strokeStyle='rgba(93,83,70,.9)'; mctx.lineWidth=1.4;
  mctx.beginPath();
  for(const p of MAP_PLOTS){ const c=plotCenter(p); mctx.moveTo(CITY_ISL.x*sx,CITY_ISL.y*sy); mctx.lineTo(c.x*sx,c.y*sy); }
  mctx.stroke();
  // plot islands
  for(let i=0;i<MAP_PLOTS.length;i++){
    const p=MAP_PLOTS[i];
    mctx.fillStyle=i===0?'rgba(90,140,70,.95)':'rgba(105,165,78,.85)';
    mctx.fillRect(p.x*sx,p.y*sy,12*SLOT*sx,7*SLOT*sy);
    if(i>0&&S.bots[i-1].down){ mctx.fillStyle='rgba(239,83,80,.75)'; mctx.fillRect(p.x*sx,p.y*sy,12*SLOT*sx,7*SLOT*sy); }
  }
  // city island + point islets
  mctx.fillStyle='#69a54e';
  mctx.beginPath(); mctx.arc(CITY_ISL.x*sx,CITY_ISL.y*sy,CITY_ISL.r*sx,0,pi2); mctx.fill();
  for(const p of S.points){
    if(p.city) continue;
    mctx.beginPath(); mctx.arc(p.x*sx,p.y*sy,(p.r+43)*sx,0,pi2); mctx.fill();
  }
  // points (owner faction color)
  for(const p of S.points){
    const f=pointFaction(p);
    mctx.fillStyle=f<0?'#a0aab4':facC(f);
    mctx.beginPath(); mctx.arc(p.x*sx,p.y*sy,3,0,pi2); mctx.fill();
  }
  // units (faction color)
  for(const u of S.units){
    if(u.boss){ mctx.fillStyle='#ef5350'; mctx.beginPath(); mctx.arc(u.x*sx,u.y*sy,3.5,0,pi2); mctx.fill(); }
    else { mctx.fillStyle=facC(u.faction); mctx.fillRect(u.x*sx-1,u.y*sy-1,2,2); }
  }
  // camera rect
  const vb=viewBounds();
  mctx.strokeStyle='rgba(255,255,255,.8)'; mctx.lineWidth=1;
  mctx.strokeRect((cam.x-W/2/cam.z)*sx,(cam.y-H/2/(cam.z*.72))*sy,(W/cam.z)*sx,(H/(cam.z*.72))*sy);
}

// ================= UI =================
function toast(msg,col='#f5b53f'){
  const t=document.createElement('div');
  t.className='toast'; t.style.borderLeftColor=col; t.textContent=msg;
  $('#toasts').appendChild(t);
  setTimeout(()=>{ t.classList.add('out'); setTimeout(()=>t.remove(),450); },3800);
}
const PANEL_IDS=['shop','backpack','rewards','robux','settings','rebirth','crate'];
function openPanel(name){
  if(name!=='crate') for(const id of PANEL_IDS) $('#p-'+id).classList.toggle('show',id===name);
  else $('#p-crate').classList.add('show');
  if(name==='shop') renderShop();
  if(name==='backpack') renderBackpack();
  if(name==='rewards') renderRewards();
  if(name==='robux') renderRobux();
  if(name==='settings') renderSettings();
  if(name==='rebirth') renderRebirth();
}
function closePanel(name){ $('#p-'+name).classList.remove('show'); if(name!=='crate') for(const id of PANEL_IDS) if(id!==name) $('#p-'+id).classList.remove('show'); }

// shop
function renderShop(){
  document.querySelectorAll('#shopTabs button').forEach(b=>b.classList.toggle('on',b.dataset.tab===S.shopTab));
  const grid=$('#shopGrid'); grid.innerHTML='';
  const ids=Object.keys(BUILD).filter(k=>BUILD[k].tab===S.shopTab && BUILD[k].cost!==null);
  for(const id of ids){
    const d=BUILD[id];
    const card=document.createElement('div');
    card.className=`card r-${d.rar}`;
    const locked=S._power<(d.req||0);
    if(locked) card.classList.add('locked');
    const cvc=document.createElement('canvas'); cvc.width=130; cvc.height=64;
    drawItemIcon(cvc.getContext('2d'),id);
    card.appendChild(cvc);
    const nm=document.createElement('div'); nm.className='c-name';
    nm.innerHTML=`<span class="c-rar ${d.rar}">${d.rar.toUpperCase()}</span>`;
    card.appendChild(nm);
    const nm2=document.createElement('div'); nm2.className='c-name'; nm2.textContent=d.name;
    card.appendChild(nm2);
    const cost=document.createElement('div'); cost.className='c-cost';
    cost.textContent=locked?`PWR ${fmt(d.req)}`:`${fmt(d.cost)}$`;
    card.appendChild(cost);
    const info=document.createElement('div'); info.className='c-info'; info.textContent=d.info;
    card.appendChild(info);
    card.onclick=()=>{
      if(locked){ toast(`Requires ${fmt(d.req)} military power`,'#ef5350'); sfx('error'); return; }
      if(S.cash<d.cost){ toast('Not enough cash!','#ef5350'); sfx('error'); return; }
      S.cash-=d.cost;
      giveItem('b',id);
      toast(`Bought ${d.name} — check your BACKPACK`,'#5bc24e');
      sfx('buy');
      renderShop();
    };
    grid.appendChild(card);
  }
}
function drawItemIcon(g,type){
  g.clearRect(0,0,130,64);
  const sp=SPR[type];
  const sc=Math.min(52/sp.h,110/sp.w);
  g.save(); g.translate(65,58); g.scale(sc,sc);
  sp.draw(g,0.6,{side:'p'});
  g.restore();
}
function renderBackpack(){
  const grid=$('#bpGrid'); grid.innerHTML='';
  if(S.inventory.length===0){
    grid.innerHTML='<div style="color:var(--dim);font-size:12px;grid-column:1/-1;padding:20px;text-align:center">Empty. Hit the SHOP →</div>';
    return;
  }
  S.inventory.forEach((it,idx)=>{
    const card=document.createElement('div');
    const d=BUILD[it.type]||{name:'?'};
    card.className=`card r-${it.kind==='c'?'legend':(d.rar||'common')}`;
    if(it.kind==='c') card.style.borderColor='#f5b53f';
    const cvc=document.createElement('canvas'); cvc.width=130; cvc.height=64;
    if(it.kind==='c') drawCrateIconMini(cvc.getContext('2d'),it.type);
    else drawItemIcon(cvc.getContext('2d'),it.type);
    card.appendChild(cvc);
    const nm=document.createElement('div'); nm.className='c-name'; nm.textContent= it.kind==='c' ? it.type.toUpperCase()+' CRATE' : d.name;
    card.appendChild(nm);
    const sub=document.createElement('div'); sub.className='c-info';
    sub.textContent= it.kind==='c' ? 'Click to open' : 'Click to place on your plot';
    card.appendChild(sub);
    card.onclick=()=>{
      if(it.kind==='c'){ openCrateModal(it.type); S.inventory.splice(idx,1); }
      else {
        S.inventory.splice(idx,1);
        S.placing=it.type;
        closePanel('backpack');
        toast(`Placing ${d.name} — click a free plot slot. RMB to cancel.`,'#4a90e2');
      }
      renderBackpack();
    };
    grid.appendChild(card);
  });
}
function drawCrateIconMini(g,type){
  g.clearRect(0,0,130,64);
  g.save(); g.translate(65,56); g.scale(1.1,1.1);
  g.fillStyle='#8a6f4d'; g.fillRect(-20,-26,40,28);
  g.fillStyle='#a3865c'; g.fillRect(-20,-26,40,5);
  g.strokeStyle='#6b5436'; g.lineWidth=2; g.strokeRect(-20,-26,40,28);
  const col={standard:'#8f9aa8',elite:'#4a90e2',premium:'#f5a53f',golden:'#ffd54f'}[type]||'#fff';
  g.fillStyle=col; g.fillRect(-20,-15,40,4);
  g.restore();
}
function renderRewards(){
  const list=$('#rwList'); list.innerHTML='';
  for(const r of REWARDS){
    const el=document.createElement('div'); el.className='rw-item';
    const done=S.rewards[r.id];
    const can=r.check()&&!done;
    el.innerHTML=`
      <div class="rw-ico">${r.ico}</div>
      <div class="rw-mid">
        <div class="rw-name">${r.name}</div>
        <div class="rw-sub">${r.sub}</div>
        <div class="rw-reward">REWARD: ${r.reward}</div>
      </div>
      <button class="rw-claim" ${can?'':'disabled'}>${done?'DONE':'CLAIM'}</button>`;
    el.querySelector('.rw-claim').onclick=()=>{
      if(!can) return;
      S.rewards[r.id]=true;
      if(r.give.cash) S.cash+=r.give.cash;
      if(r.give.crate) giveItem('c',r.give.crate);
      toast(`Reward claimed: ${r.reward}`,'#5bc24e');
      sfx('coin');
      renderRewards();
    };
    list.appendChild(el);
  }
}
function renderRobux(){
  const grid=$('#rxGrid'); grid.innerHTML='';
  const offers=[
    {crate:'premium', label:'PREMIUM CRATE', price:PREMIUM_PRICE, desc:'Legendary / Mythic buildings. Weekly featured + pity (80).'},
    {crate:'premium', label:'PREMIUM 10-PACK', price:2200000, desc:'10 premium crates. Best value. (999 R$ in the real game lol)'},
    {crate:'golden', label:'GOLDEN CRATE', price:100000000, desc:'Golden buildings. Only the elite can afford this.'},
  ];
  offers.forEach((o,i)=>{
    const card=document.createElement('div');
    card.className='card r-legend';
    const cvc=document.createElement('canvas'); cvc.width=130; cvc.height=64;
    drawCrateIconMini(cvc.getContext('2d'),o.crate);
    card.appendChild(cvc);
    const nm=document.createElement('div'); nm.className='c-name'; nm.textContent=o.label;
    card.appendChild(nm);
    const cost=document.createElement('div'); cost.className='c-cost'; cost.textContent=fmt(o.price)+'$';
    card.appendChild(cost);
    const info=document.createElement('div'); info.className='c-info'; info.textContent=o.desc;
    card.appendChild(info);
    card.onclick=()=>{
      if(S.cash<o.price){ toast('Not enough cash!','#ef5350'); sfx('error'); return; }
      S.cash-=o.price;
      const n = o.label.includes('10')?10:1;
      for(let k=0;k<n;k++) giveItem('c',o.crate);
      toast(`Purchased! Check your BACKPACK.`,'#5bc24e');
      sfx('buy');
    };
    grid.appendChild(card);
  });
}
function renderSettings(){
  const set=S.settings;
  const map=[['#setMusic',set.music],['#setSfx',set.sfx],['#setDmg',set.dmg]];
  for(const [id,v] of map){
    const b=$(id); b.classList.toggle('on',v); b.textContent=v?'On':'Off';
  }
  const gfx=$('#setGfx'); gfx.classList.toggle('on',set.gfx==='High'); gfx.textContent=set.gfx;
}
function renderRebirth(){
  const T=5000*Math.pow(2.2,S.rebirth);
  const cur=S._power;
  $('#rbInfo').innerHTML=`
    Current rebirths: <b>${S.rebirth}</b> (+${S.rebirth*10}% income)<br>
    Next rebirth: <b>+${(S.rebirth+1)*10}% income</b> forever<br>
    Requires power: <b>${fmt(T)}</b> (you have ${fmt(cur)})<br>
    <span class="dim" style="font-size:11px">Resets your base, units, points &amp; cash. Golden buildings survive.</span>
    <div class="rb-prog"><i style="width:${clamp01(cur/T)*100}%"></i></div>`;
  const btn=$('#btnRebirthYes');
  btn.style.filter = cur>=T?'none':'grayscale(.7) opacity(.7)';
}
function doRebirth(force){
  const T=5000*Math.pow(2.2,S.rebirth);
  if(!force && S._power<T){ toast(`Need ${fmt(T)} power to rebirth`,'#ef5350'); sfx('error'); return; }
  const golden=S.buildings.filter(b=>BUILD[b.type].rar==='gold');
  S.cash=500; S.rebirth++;
  S.buildings=golden;
  for(let i=0;i<S.bots.length;i++) setBotPreset(i,S.bots[i].preset,true);
  S.units=[];
  for(const p of S.points){ p.owner='neutral'; p.faction=-1; p.cool=0; p.respawnT=8; }
  S.wave=0; S.nextWave=90; S.nextBoss=180; S.attackCity=false; selUnits=[];
  toast(`🔥 REBIRTHED! Income +${S.rebirth*10}% — the war for the CITY restarts`,'#ffd54f');
  sfx('rebirth');
  save();
  closePanel('rebirth');
  cam.tx=PLOT.x+PLOT.w*50; cam.ty=PLOT.y+PLOT.h*50;
}
$('#btnRebirthYes').onclick=()=>doRebirth(false);

// settings bindings
function bindToggle(id,key,label){
  $(id).onclick=()=>{
    if(key==='gfx'){ S.settings.gfx = S.settings.gfx==='High'?'Low':'High'; }
    else S.settings[key]=!S.settings[key];
    sfx('click'); renderSettings();
  };
}
bindToggle('#setMusic','music'); bindToggle('#setSfx','sfx'); bindToggle('#setDmg','dmg'); bindToggle('#setGfx','gfx');
$('#codeBox').addEventListener('keydown',e=>{
  if(e.key!=='Enter') return;
  const code=e.target.value.trim().toUpperCase();
  if(!code) return;
  const c=CODES[code];
  if(!c){ toast(`Code "${code}" not found or expired`,'#ef5350'); sfx('error'); return; }
  if(S.codes[code]){ toast('Code already redeemed!','#ef5350'); sfx('error'); return; }
  S.codes[code]=true;
  if(c.cash) S.cash+=c.cash;
  if(c.kind==='b') giveItem('b',c.type);
  if(c.kind==='c') giveItem('c',c.type);
  toast(`✅ CODE ${code}: ${c.msg}`,'#5bc24e');
  sfx('coin');
  e.target.value='';
});
$('#btnWipe').onclick=()=>{
  if(confirm('HARD RESET — delete ALL progress?')){
    localStorage.removeItem('bmb25');
    location.reload();
  }
};

// buttons
$('#btnShop').onclick=()=>{ sfx('click'); openPanel('shop'); };
$('#btnHome').onclick=()=>{
  sfx('click');
  cancelPlacement();
  for(const id of PANEL_IDS) $('#p-'+id).classList.remove('show');
  cam.tx=PLOT.x+PLOT.w*50; cam.ty=PLOT.y+PLOT.h*50;
};
document.querySelectorAll('.rail-btn').forEach(b=>{
  b.onclick=()=>{ sfx('click'); openPanel(b.dataset.panel); };
});
document.querySelectorAll('[data-close]').forEach(b=>{
  b.onclick=()=>{ sfx('click'); const p=b.closest('.panel'); if(p) closePanel(p.id.slice(2)); };
});
document.querySelectorAll('#shopTabs button').forEach(b=>{
  b.onclick=()=>{ sfx('click'); S.shopTab=b.dataset.tab; renderShop(); };
});
$('#btnAttack').onclick=()=>{
  sfx('click');
  const punits=playerUnits();
  if(punits.length===0){ toast('No units to attack with! Build a Barracks first.','#ef5350'); return; }
  S.attackCity=true;
  for(const u of punits) u.order=null;
  toast('⚔️ ATTACK! All units heading to the CITY!','#d6493f');
};

// minimap click
mini.addEventListener('mousedown',e=>{
  const r=mini.getBoundingClientRect();
  const wx=(e.clientX-r.left)/150*WORLD.w;
  const wy=(e.clientY-r.top)/112*WORLD.h;
  cam.tx=wx; cam.ty=wy;
});

// input
window.addEventListener('keydown',e=>{
  if(e.target.tagName==='INPUT') return;
  switch(e.key.toLowerCase()){
    case 'w': case 'arrowup': cam.ty-=90; break;
    case 's': case 'arrowdown': cam.ty+=90; break;
    case 'a': case 'arrowleft': cam.tx-=90; break;
    case 'd': case 'arrowright': cam.tx+=90; break;
    case 'escape':
      if(S.placing) cancelPlacement();
      else { selUnits=[]; for(const id of PANEL_IDS) $('#p-'+id).classList.remove('show'); }
      break;
  }
});
window.addEventListener('keyup',e=>{});
// continuous camera with held keys
const keys={};
window.addEventListener('keydown',e=>{ keys[e.key.toLowerCase()]=true; });
window.addEventListener('keyup',e=>{ delete keys[e.key.toLowerCase()]; });

cv.addEventListener('contextmenu',e=>e.preventDefault());
cv.addEventListener('mousedown',e=>{
  initAudio();
  if(e.button===2){
    if(S.placing){ cancelPlacement(); }
    else {
      // right-click a BOT building with units selected = assault order
      const bb=selUnits.length?buildingAt(mouse.wx,mouse.wy,'bot'):null;
      if(bb){
        const c=bPos(bb);
        for(const u of selUnits) u.order={x:c.x,y:c.y,bid:bb.id};
        toast('⚔️ Units ordered to ASSAULT that building!','#d6493f');
        sfx('click');
      } else {
        const b=buildingAt(mouse.wx,mouse.wy,'p');
        if(b) removeBuildingRefund(b);
        else selUnits=[];
      }
    }
    return;
  }
  if(e.button!==0) return;
  mouse.down=true; mouse.dragX=e.clientX; mouse.dragY=e.clientY; mouse.dragging=false;
  if(S.placing){
    const g=ghostSlot();
    if(g.ok){
      placeBuilding(S.placing,g.gx,g.gy);
      S.placing=null;
    } else { toast('Can\'t place there','#ef5350'); sfx('error'); }
    return;
  }
});
cv.addEventListener('mousemove',e=>{
  mouse.x=e.clientX; mouse.y=e.clientY;
  const w=s2w(e.clientX,e.clientY);
  mouse.wx=w.x; mouse.wy=w.y;
  if(mouse.down && !mouse.dragging && Math.hypot(e.clientX-mouse.dragX,e.clientY-mouse.dragY)>7) mouse.dragging=true;
  if(mouse.dragging && !S.placing){
    dragBand={x1:mouse.dragX,y1:mouse.dragY,x2:e.clientX,y2:e.clientY};
  }
});
window.addEventListener('mouseup',e=>{
  if(e.button!==0) return;
  if(!mouse.down) return;
  mouse.down=false;
  if(mouse.dragging){
    if(!S.placing && dragBand){
      const a=s2w(Math.min(dragBand.x1,dragBand.x2),Math.min(dragBand.y1,dragBand.y2));
      const b=s2w(Math.max(dragBand.x1,dragBand.x2),Math.max(dragBand.y1,dragBand.y2));
      if(e.ctrlKey){
        for(const u of playerUnits()){
          if(u.x>=a.x&&u.x<=b.x&&u.y>=a.y&&u.y<=b.y){ u.order={x:(a.x+b.x)/2,y:(a.y+b.y)/2}; if(!selUnits.includes(u)) selUnits.push(u); }
        }
      } else {
        const found=playerUnits().filter(u=>u.x>=a.x&&u.x<=b.x&&u.y>=a.y&&u.y<=b.y);
        selUnits = e.shiftKey ? [...new Set([...selUnits,...found])] : found;
      }
    }
    dragBand=null;
  } else {
    // click
    if(e.ctrlKey){
      for(const u of playerUnits()){
        if(Math.hypot(u.x-mouse.wx,u.y-mouse.wy)<18) u.order={x:mouse.wx,y:mouse.wy};
      }
    } else {
      const u=playerUnits().find(u=>Math.hypot(u.x-mouse.wx,u.y-mouse.wy)<18);
      if(u){
        if(e.shiftKey) selUnits.push(u);
        else selUnits=[u];
      } else selUnits=[];
    }
  }
  mouse.dragging=false;
});

function buildingAt(wx,wy,who){
  for(const b of S.buildings){
    const o=plotOrigin(b.owner??"p"), d=BUILD[b.type];
    const x=o.x+b.gx*SLOT, y=o.y+b.gy*SLOT;
    if(wx>=x&&wx<=x+d.w*SLOT&&wy>=y&&wy<=y+d.h*SLOT){
      if(who==="p"&&(b.owner??"p")!=="p") continue;
      if(who==="bot"&&(b.owner??"p")==="p") continue;
      return b;
    }
  }
  return null;
}
function cancelPlacement(){
  if(!S.placing) return;
  S.inventory.push({kind:'b',type:S.placing}); // give it back
  S.placing=null;
  toast('Placement cancelled — item returned to backpack','#8f9aa8');
}

// ================= tutorial =================
const TUT=[
  `Welcome, Commander. You've been given a plot on the island.\n\nPan with <b>WASD</b> (or arrows), zoom with the <b>wheel</b>. Your plot is the gold-bordered grid.`,
  `Open the <b>SHOP</b> (top) → <b>PRODUCTION</b> tab. Buy a <b>Solar Array</b>, then click your <b>BACKPACK</b> (left) and place it on the plot.\n\nBuildings generate cash every second.`,
  `Buy a <b>BARRACKS</b> in the <b>UNITS</b> tab. It trains soldiers for free.\n\n<b>Drag</b> to select units, <b>Ctrl+click</b> to give move orders — or just smash <b>ATTACK</b> bottom-left.`,
  `The 8 plots are <b>separate islands</b> — bridges connect them. Seven enemy factions each have their own color and march on the <b>CITY (the middle)</b> by default. Capture points for production boosts (city = +20%) and the factions will fight over them.\n\nWatch the top-right timer: <b>raid waves</b> and the <b>MECHA WORM</b> boss are coming. Rebirth for permanent +10% income.\n\nGood luck, Commander. 🫡`,
];
let tutI=0;
function showTut(){
  $('#tut').classList.add('show');
  tutI=0;
  $('#tutText').innerText=TUT[0];
  $('#tutStep').textContent=`1 / ${TUT.length}`;
}
$('#tutNext').onclick=()=>{
  sfx('click');
  tutI++;
  if(tutI>=TUT.length){
    $('#tut').classList.remove('show');
    S.stats.tut=true; save();
    return;
  }
  $('#tutText').innerText=TUT[tutI];
  $('#tutStep').textContent=`${tutI+1} / ${TUT.length}`;
};

// ================= main loop =================
let last=performance.now(), hudT=0, powT=0, saveT=0, fpsFrames=0, fpsLast=performance.now();
function frame(now){
  requestAnimationFrame(frame);
  let dt=(now-last)/1000; last=now;
  if(dt>0.05) dt=0.05;
  fpsFrames++;
  if(now-fpsLast>=1000){ if(S) S._fps=fpsFrames; fpsFrames=0; fpsLast=now; }
  update(dt,now/1000);
  render();
}
function update(dt,t){
  const gdt=dt*(S.admin?(S.admin.speed==null?1:S.admin.speed):1); // admin time scale (0 = paused)
  // camera (real time — you can look around even while paused)
  const sp=520*dt;
  if(keys['w']||keys['arrowup']) cam.ty-=sp;
  if(keys['s']||keys['arrowdown']) cam.ty+=sp;
  if(keys['a']||keys['arrowleft']) cam.tx-=sp;
  if(keys['d']||keys['arrowright']) cam.tx+=sp;
  cam.tx=clamp(cam.tx,ISLAND.x+60,ISLAND.x+ISLAND.w-60); cam.ty=clamp(cam.ty,ISLAND.y+60,ISLAND.y+ISLAND.h-60);
  cam.x=lerp(cam.x,cam.tx,1-Math.pow(.001,dt));
  cam.y=lerp(cam.y,cam.ty,1-Math.pow(.001,dt));
  const cap=unitCap();
  if(gdt>0){
  S.time+=gdt;
  // income
  S.cash+=incomeRate()*gdt;
  // unit production (player + bots)
  for(const b of S.buildings){
    const d=BUILD[b.type];
    if(!d.unit) continue;
    b.t-=gdt;
    if(b.t<=0){
      const owner=b.owner??"p";
      const c=bPos(b);
      if(owner==="p"&&playerUnits().length<cap){
        S.units.push(mkUnit(d.unit,'p',c.x+rnd(-20,20),c.y+rnd(-10,10)));
        b.t=d.spawnEvery; sfx('spawn');
      } else if(typeof owner==="number"&&!S.bots[owner].down&&botUnits(owner).length<botCap(owner)){
        S.units.push(mkUnit(d.unit,'e',c.x+rnd(-20,20),c.y+rnd(-10,10),{bot:owner,faction:owner+1}));
        b.t=d.spawnEvery;
      } else b.t=.5;
    }
  }
  // bot offense dispatch: default = march on the CITY (the middle)
  for(let i=0;i<S.bots.length;i++){
    const bot=S.bots[i];
    if(bot.down||botTier(i)<2) continue;
    bot.raidT-=gdt;
    if(bot.raidT<=0){
      const idle=botUnits(i).filter(u=>!u.order);
      if(idle.length>=4){
        const n=Math.min(2+Math.floor(botTier(i)/2),Math.floor(idle.length/2));
        for(let k=0;k<n;k++){ idle[k].order={point:2}; idle[k].cityGoal=true; }
        if(n>0) toast(`⚔️ ${facN(i+1)} is marching on the CITY!`,facC(i+1));
      }
      bot.raidT=Math.max(30,90-botTier(i)*8)+rnd(0,25);
    }
  }
  // stealth reveal pass: stealth units are visible when in combat, point-blank, or inside a detector's range
  for(const u of S.units){
    if(!isStealth(u)) continue;
    if(u.fightT>0){ u.revealed=true; continue; }
    let rev=false;
    for(const e of S.units){
      if(e.faction===u.faction) continue;
      const dd=Math.hypot(e.x-u.x,e.y-u.y);
      if(dd<70){ rev=true; break; }
      const det=unitDetect(e);
      if(det>0&&dd<=det){ rev=true; break; }
    }
    u.revealed=rev;
  }
  // destroyed bot bases rebuild
  for(let i=0;i<S.bots.length;i++){
    const bot=S.bots[i];
    if(!bot.down&&bot.preset!=="empty"&&botBuildings(i).length===0){
      bot.down=true; bot.downT=25;
      S.units=S.units.filter(u=>u.bot!==i);
      toast(`💥 ${BOT_DEFS[i].name}'s base is DESTROYED — rebuilding in 25s`,'#ef5350');
      sfx('boom');
    }
    if(bot.down){
      bot.downT-=gdt;
      if(bot.downT<=0){
        setBotPreset(i,bot.preset,true);
        toast(`🔧 ${BOT_DEFS[i].name} rebuilt its base!`,'#4a90e2');
      }
    }
  }
  // units
  for(const u of [...S.units]) updateUnit(u,gdt);
  // point respawns: maintain the OWNER's garrison
  for(const p of S.points){
    p.cool=Math.max(0,(p.cool||0)-gdt);
    if(p.owner==='neutral') continue;
    if(S.admin&&S.admin.noRespawn) continue;
    p.respawnT-=gdt;
    if(p.respawnT<=0){
      if(garrisonCount(p.id)<p.garrison+p.tank) spawnGarrison(p.id,1);
      p.respawnT=p.city?15:22;
    }
  }
  // waves & boss
  if(!(S.admin&&S.admin.freeze)){
    if(!S.units.some(u=>u.boss)){
      S.nextBoss-=gdt;
      if(S.nextBoss<=0){ spawnBoss(); S.nextBoss=300; }
    } else {
      S.nextBoss=Math.max(S.nextBoss,15);
    }
    S.nextWave-=gdt;
    if(S.nextWave<=0){ spawnWave(); S.nextWave=120; }
  }
  checkCaptures(gdt);
  // fx
  fx.tracers=fx.tracers.filter(f=>(f.life-=gdt)>0);
  fx.floats=fx.floats.filter(f=>{ f.y-=26*gdt; return (f.life-=gdt)>0; });
  fx.booms=fx.booms.filter(f=>(f.life-=gdt)>0);
  fx.parts=fx.parts.filter(f=>{ f.x+=f.vx*gdt; f.y+=f.vy*gdt; f.vy+=200*gdt; return (f.life-=gdt)>0; });
  for(const b of S.buildings) if(b.flash>0) b.flash-=gdt;
  } // end if(gdt>0)
  // power (throttled)
  powT-=dt;
  if(powT<=0){ S._power=totalPower(); powT=.5; }
  // HUD (throttled)
  hudT-=dt;
  if(hudT<=0){
    hudT=.2;
    $('#stPower').textContent=fmt(S._power||0);
    $('#stUnits').textContent=`${playerUnits().length}/${cap}`;
    $('#stCash').textContent='$'+fmt(S.cash);
    let owned=0,city=false;
    for(const p of S.points) if(p.owner==='player'){ owned++; if(p.city) city=true; }
    const bonus=(city?20:0)+owned*10+S.rebirth*10+Math.min(5,S.buildings.filter(b=>BUILD[b.type].name==='Logistics Warehouse').length)*10;
    $('#stIncome').textContent=`$${fmt(incomeRate())}/s +${bonus}%`;
    $('#tWave').textContent=`⏱ WAVE ${fmtTime(S.nextWave)}`;
    const boss=S.units.find(u=>u.boss);
    const tb=$('#tBoss');
    if(boss){ tb.textContent='🐳 WORM ACTIVE!'; tb.classList.add('danger'); }
    else { tb.textContent=`🐍 BOSS ${fmtTime(S.nextBoss)}`; tb.classList.remove('danger'); }
    $('#bossbar').hidden=!boss;
    if(boss) $('#bbFill').style.width=clamp01(boss.hp/boss.maxHp)*100+'%';
    const T=5000*Math.pow(2.2,S.rebirth);
    $('#rbBadge').hidden=!(S._power>=T);
    if(document.querySelector('#p-rebirth.show')) renderRebirth();
    if(document.querySelector('#p-rewards.show')) renderRewards();
    if(window.Admin && $('#p-admin').classList.contains('open')) Admin.tickStats();
  }
  saveT-=dt;
  if(saveT<=0){ save(); saveT=12; }
}
// wheel zoom (bound once)
cv.addEventListener('wheel',e=>{
  e.preventDefault();
  const before=s2w(e.clientX,e.clientY);
  cam.z=clamp(cam.z*(e.deltaY>0?.9:1.1),.5,1.6);
  const after=s2w(e.clientX,e.clientY);
  cam.tx+=before.x-after.x; cam.ty+=before.y-after.y;
  cam.x=cam.tx; cam.y=cam.ty;
},{passive:false});

// unlock/resume audio on first interaction anywhere
document.addEventListener('pointerdown',()=>{
  initAudio();
  if(AC&&AC.state==='suspended') AC.resume();
},{passive:true});

// debug/test hook (harmless in browser)
if (typeof window!=='undefined'){
  window.__BMB={
    get S(){ return S; },
    get totalPower(){ return totalPower; },
    placeBuilding, giveItem, spawnBoss, spawnWave, mkUnit, killUnit, damageUnit,
    setBotPreset, damageBuilding, botBuildings, botUnits, bPos,
    astar, flowStep, cellOf, canSee, pointFaction,
    WALK, GW, GH, CELL,
    facC, facN, isAir, isStealth,
  };
}

// ================= ADMIN PANEL =================
const Admin={
  _ready:false,
  toggle(force){
    if(!S) return;
    const el=$('#p-admin');
    const open = force!==undefined ? force : !el.classList.contains('open');
    el.classList.toggle('open',open);
    if(open && !Admin._ready){ Admin._ready=true; Admin.renderLists(); }
    if(open) Admin.renderToggles();
    sfx('click');
  },
  renderLists(){
    const b=$('#aBuilds'); b.innerHTML='';
    for(const id of Object.keys(BUILD)){
      const d=BUILD[id];
      const row=document.createElement('div'); row.className='bld-row';
      row.innerHTML=`<span class="bn" style="color:${RAR[d.rar].c}">${d.name}${d.cost===null?' ★':''}</span>
        <button class="abtn" onclick="Admin.giveBuild('${id}',false)">BP</button>
        <button class="abtn" onclick="Admin.giveBuild('${id}',true)">PL</button>`;
      b.appendChild(row);
    }
    const u=$('#aUnits'); u.innerHTML='';
    for(const id of Object.keys(UNITS)){
      const row=document.createElement('div'); row.className='unit-row';
      row.innerHTML=`<span class="un">${UNITS[id].name}</span>
        <button class="abtn" onclick="Admin.spawnUnit('${id}',1)">x1</button>
        <button class="abtn" onclick="Admin.spawnUnit('${id}',5)">x5</button>
        <button class="abtn" onclick="Admin.spawnUnit('${id}',10)">x10</button>`;
      u.appendChild(row);
    }
    document.querySelectorAll('#aSpeed .abtn').forEach(btn=>{
      btn.onclick=()=>{ S.admin.speed=Number(btn.dataset.sp); Admin.renderToggles();
        toast(`Time scale ${S.admin.speed===0?'PAUSED':S.admin.speed+'x'}`,'#4a90e2'); sfx('click'); };
    });
    $('#aGod').onclick=()=>{ S.admin.god=!S.admin.god; Admin.renderToggles();
      toast('God mode '+(S.admin.god?'ON — you cannot be hurt':'off'),S.admin.god?'#5bc24e':'#8f9aa8'); sfx('click'); };
    $('#aFreeze').onclick=()=>{ S.admin.freeze=!S.admin.freeze; Admin.renderToggles();
      toast('Waves & boss '+(S.admin.freeze?'FROZEN':'resumed'),'#4a90e2'); sfx('click'); };
    $('#aNoResp').onclick=()=>{ S.admin.noRespawn=!S.admin.noRespawn; Admin.renderToggles();
      toast('Garrison respawn '+(S.admin.noRespawn?'DISABLED':'enabled'),'#4a90e2'); sfx('click'); };
    $('#aClose').onclick=()=>Admin.toggle(false);
    $('#btnAdmin').onclick=()=>Admin.toggle();
    Admin.renderBots();
  },
  renderBots(){
    const box=$('#aBots'); if(!box) return;
    box.innerHTML='';
    const opts=PRESETS.map(p=>`<option value="${p.id}">${p.label}</option>`).join('');
    for(let i=0;i<S.bots.length;i++){
      const row=document.createElement('div'); row.className='bot-row';
      row.innerHTML=`<span class="bn" style="color:${facC(i+1)}">BOT ${i+1} · ${facN(i+1)} (${BOT_DEFS[i].dir})</span>
        <select class="aselect" data-bot="${i}">${opts}</select>`;
      box.appendChild(row);
    }
    const all=document.createElement('div'); all.className='bot-row';
    all.innerHTML=`<span class="bn">SET ALL</span>
      <select class="aselect" id="aBotsAll">${opts}</select>
      <button class="abtn" id="aBotsApply">APPLY</button>`;
    box.appendChild(all);
    box.querySelectorAll('select[data-bot]').forEach(s=>{
      s.value=S.bots[+s.dataset.bot].preset;
      s.onchange=()=>Admin.setBot(+s.dataset.bot,s.value);
    });
    const a=$('#aBotsAll');
    if(a){ a.value=S.bots[0].preset; a.onchange=()=>Admin.setBotAll(a.value); }
    const ap=$('#aBotsApply');
    if(ap) ap.onclick=()=>{ if(a) Admin.setBotAll(a.value); };
  },
  setBot(i,presetId){ setBotPreset(i,presetId); this.renderBots(); save(); },
  setBotAll(presetId){
    for(let i=0;i<S.bots.length;i++) setBotPreset(i,presetId,true);
    toast(`All bot bases → ${PRESET_MAP[presetId].label}`,'#4a90e2');
    this.renderBots(); save();
  },
  renderToggles(){
    if(!S||!S.admin) return;
    $('#aGod').classList.toggle('on',!!S.admin.god);
    $('#aFreeze').classList.toggle('on',!!S.admin.freeze);
    $('#aNoResp').classList.toggle('on',!!S.admin.noRespawn);
    document.querySelectorAll('#aSpeed .abtn').forEach(b=>b.classList.toggle('on',Number(b.dataset.sp)===(S.admin.speed||1)));
  },
  cash(n){ S.cash+=n; toast(`+$${fmt(n)}`,'#5bc24e'); sfx('coin'); },
  cashCustom(){
    const el=$('#aCash'); const v=el.value.trim().toUpperCase();
    if(!v){ toast('Enter an amount first','#ef5350'); return; }
    let n=parseFloat(v);
    if(isNaN(n)){ toast('Invalid amount','#ef5350'); sfx('error'); return; }
    if(v.endsWith('B')) n*=1e9; else if(v.endsWith('M')) n*=1e6; else if(v.endsWith('K')) n*=1e3;
    S.cash+=n; el.value='';
    toast(`+$${fmt(n)}`,'#5bc24e'); sfx('coin');
  },
  giveBuild(id,place){
    const d=BUILD[id];
    if(place){
      for(let y=0;y<=PLOT.h-d.h;y++) for(let x=0;x<=PLOT.w-d.w;x++){
        if(canPlaceAt(id,x,y)){ placeBuilding(id,x,y); toast(`${d.name} placed`,'#5bc24e'); return; }
      }
      toast('No free plot space!','#ef5350'); sfx('error'); return;
    }
    giveItem('b',id);
    toast(`${d.name} → backpack`,'#5bc24e'); sfx('coin');
  },
  giveAllBuildings(){
    const n=Object.keys(BUILD).length;
    for(const id of Object.keys(BUILD)) giveItem('b',id);
    toast(`All ${n} buildings → backpack`,'#5bc24e'); sfx('coin');
  },
  spawnUnit(id,n){
    const cx=PLOT.x+PLOT.w*50, cy=PLOT.y+PLOT.h*50;
    for(let i=0;i<n;i++) S.units.push(mkUnit(id,'p',cx+rnd(-50,50),cy+rnd(-30,30)));
    toast(`${n}x ${UNITS[id].name} summoned`,'#4a90e2'); sfx('spawn');
  },
  crate(t){ giveItem('c',t); toast(`${t.toUpperCase()} crate → backpack`,'#f5b53f'); sfx('coin'); },
  boss(mode){
    const b=S.units.find(u=>u.boss);
    if(mode==='summon'){ if(b){ toast('Boss is already active','#ef5350'); return; } spawnBoss(); }
    else if(mode==='kill'){
      if(!b){ toast('No boss active — summon one first','#ef5350'); sfx('error'); return; }
      killUnit(b,{side:'p'});
    }
    else if(mode==='hp1'){ if(!b){ toast('No boss active','#ef5350'); return; } b.hp=1; toast('Boss HP set to 1','#ef5350'); }
    else if(mode==='more'){ if(!b){ toast('No boss active','#ef5350'); return; } b.hp+=10000; b.maxHp+=10000; toast('Boss +10,000 HP','#ef5350'); }
    sfx('click');
  },
  wave(mode){
    if(mode==='now') spawnWave();
    else if(mode==='horde'){ spawnWave(); spawnWave(); spawnWave(); toast('🌊 HORDE! x3 waves incoming','#ff8a5c'); }
    else if(mode==='reset'){ S.nextWave=90; S.nextBoss=180; toast('Timers reset (wave 1:30 / boss 3:00)','#4a90e2'); }
    sfx('click');
  },
  points(mode){
    if(mode==='take'){
      for(const p of S.points){
        p.owner='player'; p.faction=0; p.cool=0; p.respawnT=8;
        S.units=S.units.filter(u=>!(u.home===p.id&&u.faction!==0));
      }
      toast('All points captured! You hold the map','#5bc24e'); sfx('capture');
    } else {
      for(const p of S.points){ p.owner='neutral'; p.faction=-1; p.cool=0; p.respawnT=8; }
      S.units=S.units.filter(u=>u.home===null);
      toast('All points released to NEUTRAL — factions will fight for them','#8f9aa8'); sfx('click');
    }
  },
  rebirth(n){
    if(n==='force'){ doRebirth(true); return; }
    S.rebirth+=n;
    toast(`Rebirths now ${S.rebirth} (+${S.rebirth*10}% income)`,'#ffd54f'); sfx('rebirth');
  },
  claimRewards(){
    let got=0;
    for(const r of REWARDS){
      if(!S.rewards[r.id]&&r.check()){
        S.rewards[r.id]=true;
        if(r.give.cash) S.cash+=r.give.cash;
        if(r.give.crate) giveItem('c',r.give.crate);
        got++;
      }
    }
    toast(got?`Claimed ${got} reward(s)`:'Nothing available right now',got?'#5bc24e':'#8f9aa8'); sfx('coin');
  },
  go(where){
    const t={base:[PLOT.x+PLOT.w*50,PLOT.y+PLOT.h*50],city:[1900,1900],north:[1900,1330],west:[1465,1900],east:[2335,1900],south:[1900,2470],nw:[750,847],ne:[3050,847]};
    if(where==='boss'){
      const b=S.units.find(u=>u.boss);
      if(!b){ toast('No boss to follow','#ef5350'); return; }
      cam.tx=b.x; cam.ty=b.y;
    } else if(t[where]){ cam.tx=t[where][0]; cam.ty=t[where][1]; }
    sfx('click');
  },
  exportSave(){ $('#aSave').value=JSON.stringify(S,null,1); toast('Save exported to the box below','#4a90e2'); sfx('click'); },
  importSave(){
    const raw=($('#aSave').value||'').trim();
    if(!raw){ toast('Paste save JSON into the box first','#ef5350'); return; }
    try{
      const o=JSON.parse(raw);
      if(o.v!==1&&o.v!==2) throw 0;
      localStorage.setItem('bmb25',JSON.stringify(o));
      toast('Importing — reloading...','#5bc24e');
      setTimeout(()=>location.reload(),400);
    }catch(e){ toast('Invalid save data','#ef5350'); sfx('error'); }
  },
  wipe(){
    if(confirm('WIPE ALL progress? This cannot be undone.')){
      localStorage.removeItem('bmb25');
      location.reload();
    }
  },
  tickStats(){
    const el=$('#aStats');
    if(!el) return;
    const p=S.units.filter(u=>u.side==='p').length;
    const e=S.units.filter(u=>u.side==='e').length;
    let owned=0,city=false;
    for(const pt of S.points) if(pt.owner==='player'){ owned++; if(pt.city) city=true; }
    const cf=pointFaction(S.points[2]);
    el.textContent=
`FPS ${S._fps||0}   speed ${S.admin.speed||1}x${S.admin.speed===0?'  (PAUSED)':''}
Cash $${fmt(S.cash)}   income $${fmt(incomeRate())}/s
Power ${fmt(S._power||0)}   rebirth ${S.rebirth} (+${S.rebirth*10}%)
Units P:${p}  E:${e}   buildings ${S.buildings.length}
Points ${owned}/5   CITY: ${cf<0?'NEUTRAL':(cf===0?'YOU \u2713':facN(cf))}   wave ${S.wave}
Bots ${S.bots.map((b,i)=>b.down?'\u2193':'T'+botTier(i)).join(' ')}
Boss ${S.units.some(u=>u.boss)?'ACTIVE':'dormant'}   time ${fmtTime(S.time)}`;
  },
};
window.Admin=Admin;
window.addEventListener('keydown',e=>{
  if(e.target && (e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA')) return;
  if(e.key==='F1' || e.key==='`'){ e.preventDefault(); Admin.toggle(); }
});

// ================= init =================
function init(){
  const loaded=load();
  S=loaded||defaultState();
  S.admin=Object.assign({speed:1,god:false,freeze:false,noRespawn:false}, loaded?loaded.admin:undefined);
  // patch old saves (points keep only dynamic fields — coords come from POINTS_DEFS)
  S.points=S.points.map((p,i)=>({...POINTS_DEFS[i], owner:p.owner??'neutral', faction:p.faction??-1, cool:p.cool??0, respawnT:p.respawnT??8}));
  S._power=totalPower();
  if(!S.stats) S.stats={kills:0,bosses:0,captures:0,tut:false,cratesOpened:0};
  // restore missing garrisons for owned points (if saved mid-fight)
  for(const p of S.points){
    if(p.owner==='neutral') continue;
    const need=p.garrison+p.tank-garrisonCount(p.id);
    if(need>0) spawnGarrison(p.id,need);
  }
  // (re)place bot bases from their presets (idempotent)
  for(let i=0;i<S.bots.length;i++) setBotPreset(i,S.bots[i].preset,true);
  // restore saved player units
  if(loaded){
    S.units=S.units.filter(u=>u.side==='e');
    for(const su of loaded.units||[]){
      const u=mkUnit(su.type,'p',su.x,su.y);
      u.hp=Math.min(u.hp,su.hp||u.hp);
      u.order=su.order||null;
      S.units.push(u);
    }
    // map moved: anyone standing in water gets relocated
    for(const u of S.units){
      if(walkableAt(u.x,u.y)) continue;
      if(u.side==='p'){ u.x=PLOT.x+PLOT_HW; u.y=PLOT.y+PLOT_HH; u.order=null; }
      else if(u.bot!=null){ const c=plotCenter(MAP_PLOTS[u.bot+1]); u.x=c.x; u.y=c.y; u.order=null; u.cityGoal=false; }
      else S.units=S.units.filter(v=>v!==u);
    }
  }
  window.addEventListener('beforeunload',save);
  if(!S.stats.tut) showTut();
  requestAnimationFrame(frame);
}
init();
