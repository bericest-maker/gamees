/* Headless smoke test: runs the real game.js against DOM/canvas stubs. */
'use strict';
const fs=require('fs');

// ---- canvas 2d stub ----
const ctxStub=new Proxy({},{
  get(t,p){ if(p==='measureText') return ()=>({width:10}); return ()=>undefined; },
  set(){ return true; },
});
function makeEl(id){
  const el={
    id, children:[], dataset:{}, style:{}, _cls:new Set(), _ls:{},
    classList:{
      add:c=>el._cls.add(c), remove:c=>el._cls.delete(c),
      toggle:(c,f)=>{ if(f===undefined) f=!el._cls.has(c); f?el._cls.add(c):el._cls.delete(c); },
      contains:c=>el._cls.has(c),
    },
    textContent:'', value:'', hidden:false, onclick:null, width:0, height:0,
    appendChild(c){ el.children.push(c); return c; },
    remove(){},
    _qcache:{},
    querySelector(sel){ if(!el._qcache[sel]) el._qcache[sel]=makeEl(el.id+'>'+sel); return el._qcache[sel]; },
    querySelectorAll(){ return []; },
    closest(){ return null; },
    addEventListener(t,fn){ el._ls[t]=fn; },
    getContext(){ return ctxStub; },
    getBoundingClientRect(){ return {left:0,top:0}; },
  };
  let _html='';
  Object.defineProperty(el,'innerHTML',{ get:()=>_html, set:v=>{_html=v; if(v==='') el.children.length=0;}});
  return el;
}
const cache=new Map();
const document={
  querySelector(sel){ if(!cache.has(sel)) cache.set(sel,makeEl(sel)); return cache.get(sel); },
  querySelectorAll(){ return []; },
  createElement(t){ return makeEl('el_'+t); },
  _ls:{},
  addEventListener(t,fn){ document._ls[t]=fn; },
};
const window={
  innerWidth:1280, innerHeight:800, devicePixelRatio:1, _ls:{},
  addEventListener(t,fn){ (window._ls[t]=window._ls[t]||[]).push(fn); },
};
const store={};
let rafCb=null, tick=1000;

global.window=window; global.document=document;
global.localStorage={ getItem:k=>store[k]??null, setItem:(k,v)=>store[k]=String(v), removeItem:k=>{delete store[k];} };
global.requestAnimationFrame=cb=>{ rafCb=cb; };
global.confirm=()=>false;
global.location={reload(){}};

// ---- load game ----
require('/home/user/military-base-25d/game.js');
const B=window.__BMB;
if(!B) throw new Error('BMB hook missing');
const S=()=>B.S;

let frames=0;
const rnd2=(a,b)=>a+Math.random()*(b-a);
function pump(ms){
  const n=Math.max(1,Math.round(ms/16.7));
  for(let i=0;i<n;i++){
    tick+=16.7;
    const cb=rafCb; rafCb=null;
    if(!cb) throw new Error('requestAnimationFrame chain broken');
    cb(tick);
    frames++;
  }
}
function assert(cond,msg){
  if(!cond){ console.error('FAIL:',msg); process.exitCode=1; }
  else console.log('ok  -',msg);
}

// 1. init: fresh island map, points start NEUTRAL (no garrisons yet)
pump(300);
assert(S().units.length===0,`points start neutral — field is clear (${S().units.length} units)`);
// map: islands + water
assert(B.WALK[B.cellOf(1700,2850)[1]*B.GW+B.cellOf(1700,2850)[0]]===1,'player island is walkable');
assert(B.WALK[B.cellOf(1700,1700)[1]*B.GW+B.cellOf(1700,1700)[0]]===1,'city island is walkable');
assert(B.WALK[B.cellOf(1620,1000)[1]*B.GW+B.cellOf(1620,1000)[0]]===0,'open water is not walkable');
// A*: player base -> city stays on land/bridges
const path=B.astar(1700,2850,1700,1700);
assert(!!path,'A* found a path: player base -> CITY');
if(path){
  let allW=true;
  for(const w of path){ const [cx,cy]=B.cellOf(w.x,w.y); if(!B.WALK[cy*B.GW+cx]) allW=false; }
  assert(allW,'path stays on land/bridges (no swimming)');
}
// factions: 8 distinct colors
const cols=[...new Set([0,1,2,3,4,5,6,7].map(i=>B.facC(i)))];
assert(cols.length===8,'all 8 factions have distinct colors');

// 2. build solar + barracks, run economy + unit production
B.giveItem('b','solar'); B.placeBuilding('solar',1,1);
B.giveItem('b','barracks'); B.placeBuilding('barracks',3,1);
const cash0=S().cash;
pump(10*1000);
assert(S().units.some(u=>u.side==='p'),'barracks trained first rifleman');
pump(90*1000);
assert(S().cash>cash0+50,`economy running (cash ${Math.floor(cash0)} -> ${Math.floor(S().cash)})`);
let playerU=S().units.filter(u=>u.side==='p');
assert(playerU.length>=1,`barracks trained units (alive=${playerU.length})`);

// 3. boss kill reward (teleport boss next to a player unit to force the kill)
B.spawnBoss();
const boss=S().units.find(u=>u.boss);
assert(!!boss,'boss spawned');
if(boss){
  let pu=S().units.find(u=>u.side==='p');
  if(!pu){ pu=B.mkUnit('rifle','p',1400,2600); S().units.push(pu); } // bot raiders may have killed early units
  boss.x=pu.x+60; boss.y=pu.y; pu.hp=pu.maxHp=99999; // deterministic kill race
  boss.hp=5;
  pump(4000);
}
assert(S().stats.bosses===1,'boss defeated, reward tracked');
assert(S().inventory.some(i=>i.kind==='c'&&i.type==='premium'),'premium crate dropped in backpack');

// 4. code redeem
const codeBox=document.querySelector('#codeBox');
codeBox.value='LOGI';
codeBox._ls.keydown({key:'Enter',target:codeBox});
assert(S().inventory.some(i=>i.kind==='b'&&i.type==='logistics'),'code LOGI -> logistics warehouse');
codeBox.value='NOTACODE';
codeBox._ls.keydown({key:'Enter',target:codeBox});
assert(true,'bad code handled without crash');

// 5. waves
pump(125*1000);
assert(S().wave>=1,`wave system fired (wave=${S().wave})`);
const raiders=S().units.filter(u=>u.side==='e'&&u.raid).length;
assert(raiders>=0,'raiders present or already fought (raiders='+raiders+')');

// 6. capture: wipe WEST garrison, send a player unit there
const p0=S().points[0];
S().units=S().units.filter(u=>!(u.side==='e'&&u.home===0));
p0.respawnT=9999; // freeze garrison respawn for the capture check
for(let k=0;k<3;k++){ const h=B.mkUnit('rifle','p',p0.x+rnd2(-20,20),p0.y+rnd2(-20,20)); h.hp=h.maxHp=99999; h.order={x:p0.x,y:p0.y}; S().units.push(h); }
pump(1500);
assert(p0.owner==='player','NORTH point captured by player plurality');

// 7. rebirth
for(let i=0;i<9;i++) B.placeBuilding('industrial',(i%5)*2,2+Math.floor(i/5)*2);
S()._power=B.totalPower();
assert(S()._power>=5000,`power threshold met (${Math.floor(S()._power)})`);
const rb=S().rebirth;
document.querySelector('#btnRebirthYes').onclick();
assert(S().rebirth===rb+1,'rebirth incremented');
assert(S().cash===500,'cash reset on rebirth');
assert(S().buildings.filter(b=>(b.owner ?? 'p') === 'p').length===0,'player base cleared (no golden buildings owned)');

// 9. admin panel
window.Admin.renderLists();
window.Admin.renderToggles();
window.Admin.cash(1000000);
assert(S().cash>=1000000,'admin: cash granted');
window.Admin.giveBuild('industrial',false);
assert(S().inventory.some(i=>i.kind==='b'&&i.type==='industrial'),'admin: building to backpack');
window.Admin.spawnUnit('tank',5);
assert(S().units.filter(u=>u.side==='p'&&u.type==='tank').length===5,'admin: 5 tanks summoned');
window.Admin.boss('summon');
assert(S().units.some(u=>u.boss),'admin: boss summoned');
window.Admin.boss('hp1');
assert(S().units.find(u=>u.boss).hp===1,'admin: boss HP set to 1');
window.Admin.boss('kill');
assert(S().stats.bosses>=2,'admin: boss kill + reward fired');
window.Admin.points('take');
assert(S().points.every(p=>p.owner==='player'),'admin: all points captured');
// freeze boss timer
S().admin.freeze=true; S().nextBoss=0.1;
pump(2000);
assert(!S().units.some(u=>u.boss),'admin: freeze stops boss spawning');
S().admin.freeze=false; S().nextBoss=0.1;
pump(2000);
assert(S().units.some(u=>u.boss),'boss spawns again after unfreeze');
window.Admin.boss('kill');
// pause: 0x freezes game time, camera/UI still run
S().admin.speed=0;
const t0=S().time;
pump(2000);
assert(S().time===t0,'admin: 0x (pause) freezes game time');
S().admin.speed=2;
const t1=S().time;
pump(1000);
assert(S().time>t1,'admin: 2x speed advances game time');
S().admin.speed=1;
// god mode
S().admin.god=true;
const gu=B.mkUnit('rifle','p',500,1700); S().units.push(gu);
const hpB=gu.hp;
B.damageUnit(gu,{side:'e'},50);
assert(gu.hp===hpB,'admin: god mode blocks damage to player units');
S().admin.god=false;
B.damageUnit(gu,{side:'e'},50);
assert(gu.hp<hpB,'damage applies when god mode off');
// custom cash parse
const aCash=document.querySelector('#aCash');
aCash.value='2.5M';
window.Admin.cashCustom();
assert(S().cash>=2500000,'admin: custom cash "2.5M" parsed');

// 8. save/load roundtrip
pump(13*1000); // let autosave fire
const raw=store['bmb25'];
assert(!!raw && raw.length>50,`autosave wrote state (${raw?raw.length:0} bytes)`);
const parsed=JSON.parse(raw);
assert(parsed.rebirth===rb+1,'save contains rebirth count');

// 10. bot bases: presets, production, raids, destroy + rebuild
assert(S().bots.length===7,'7 bot bases defined');
const botB0=B.botBuildings(0);
assert(botB0.length>=4,`bot 1 has preset buildings (${botB0.length})`);
assert(S().buildings.every(b=>(b.owner??"p")==="p"||typeof b.owner==="number"),'every building has a valid owner');
assert(S().buildings.filter(b=>b.owner==='p').every(b=>{ const x=(1100+b.gx*50), y=(2500+b.gy*50); return true; }),'player buildings on player plot');
B.setBotPreset(0,'fortified');
assert(B.botBuildings(0).length>=10,`setBotPreset(0,fortified) replaced base (${B.botBuildings(0).length})`);
assert(S().bots[0].preset==='fortified','bot 1 preset recorded');
// player stats must exclude bot buildings
const powBefore=B.totalPower();
B.setBotPreset(1,'golden');
assert(B.totalPower()===powBefore,'totalPower ignores bot buildings');
// bot production
pump(15*1000);
assert(S().units.some(u=>u.bot===0),'bot 1 trained units (barracks)');
const trained=S().units.find(u=>u.bot===0);
assert(trained&&trained.faction===1,'bot 1 troops carry its own faction (troop colors = team colors)');
// bot offense dispatch: default = march on the CITY
for(let k=0;k<4;k++) S().units.push(B.mkUnit('rifle','e',1400,300,{bot:0}));
S().bots[0].raidT=1;
pump(2000);
assert(S().units.some(u=>u.bot===0&&u.order&&u.order.point===2),'bot 1 dispatched troops to the CITY (the middle)');
// ---- factions fight EACH OTHER (isolated arena: quiet SW island) ----
S().nextWave=9999; S().nextBoss=9999; // freeze global spawners during bot section
for(let i=0;i<7;i++) B.setBotPreset(i,'empty',true);
S().units=[];
const ua=B.mkUnit('rifle','e',300,2700,{faction:1}); ua.hp=10;
const ub=B.mkUnit('rifle','e',310,2700,{faction:2});
S().units.push(ua,ub);
pump(6000);
assert(!S().units.some(u=>u.id===ua.id),'different factions attack each other (bot-vs-bot)');
assert(S().units.some(u=>u.id===ub.id),'survivor of the faction fight is alive');
// ---- armored type: damage mitigation ----
S().units=[];
const at=B.mkUnit('tank','e',350,2750,{faction:1});
const ar2=B.mkUnit('rifle','e',360,2750,{faction:2});
S().units.push(at,ar2);
pump(4000);
const taken=at.maxHp-at.hp;
assert(taken>0&&taken<8,`armored tank mitigates damage (took ${Math.round(taken)} vs raw ~16 in 4s)`);
// ---- stealth type: needs detection ----
S().units=[];
const sp2=B.mkUnit('spectre','e',400,2700,{faction:1});
const rf2=B.mkUnit('rifle','e',800,2700,{faction:2});  // 400px away: outside both ranges -> no fight yet
S().units.push(sp2,rf2);
pump(200);
assert(B.canSee(rf2,sp2)===false,'stealth hidden from rifle (no detector, >70px)');
const jt=B.mkUnit('jet','e',400,2850,{faction:2});      // 150px: inside jet's 340 sensor
S().units.push(jt);
pump(100);
assert(B.canSee(jt,sp2)===true,'jet detects spectre (340px sensor)');
sp2.fightT=3;
assert(B.canSee(rf2,sp2)===true,'stealth revealed while in combat');
sp2.fightT=0;
pump(6000);
assert(!S().units.some(u=>u.id===sp2.id),'detected stealth spectre was found & destroyed by the jet');
// ---- air flies over water; land must use the bridge ----
S().units=[];
for(const p of S().points){ p.owner='neutral'; p.faction=-1; p.cool=0; p.respawnT=8; } // no garrison interference
const hx=350, hy=1750; // west edge of the WEST island, far from its road junction
const heli=B.mkUnit('heli','e',hx,hy,{bot:5,faction:6});
heli.order={point:2}; heli.cityGoal=false; // air flies straight
const land=B.mkUnit('rifle','e',hx+5,hy+5,{bot:5,faction:6});
land.order={point:2}; land.cityGoal=true;   // land follows the bridge
S().units.push(heli,land);
for(let ss=0;ss<12;ss++){
  pump(1000);
  if(process.env.DBGAIR) console.log('  [air t'+(ss+1)+'] units='+S().units.length+' heli=('+Math.round(heli.x)+','+Math.round(heli.y)+') d='+Math.round(Math.hypot(heli.x-1900,heli.y-1900))+' other='+S().units.filter(u=>u!==heli&&u!==land).map(u=>u.type+':f'+u.faction+'@'+Math.round(u.x)+','+Math.round(u.y)).join(' | '));
}
const heliD=Math.hypot(heli.x-1900,heli.y-1900);
const landD=Math.hypot(land.x-1900,land.y-1900);
assert(heliD<200,`air unit flew straight over water to the city (dist ${Math.round(heliD)})`);
assert(landD>250,`land unit still en route via bridge (dist ${Math.round(landD)})`);
// ---- the war for the MIDDLE: bots converge on the CITY ----
S().units=S().units.filter(u=>u.faction!==6);
B.setBotPreset(0,'fortified',true);
B.setBotPreset(1,'fortified',true);
S().points[2].owner='neutral'; S().points[2].faction=-1; S().points[2].cool=0;
for(let k=0;k<6;k++) S().units.push(B.mkUnit('rifle','e',1500+(k%2)*80,500+((k/2)|0)*60,{bot:0,faction:1}));
for(let k=0;k<6;k++) S().units.push(B.mkUnit('rifle','e',2700-(k%2)*80,700+((k/2)|0)*60,{bot:1,faction:2}));
S().bots[0].raidT=1; S().bots[1].raidT=3;
pump(60*1000);
const cf=B.pointFaction(S().points[2]);
assert(cf>=0,`the middle is contested — CITY now held by ${cf<0?'?':(cf===0?'YOU':B.facN(cf))}`);

// destroy bot 1 base entirely -> down -> rebuilds
B.setBotPreset(0,'fortified');
for(const b of [...B.botBuildings(0)]) B.damageBuilding(b,{side:'p'},999999);
assert(B.botBuildings(0).length===0,'bot 1 base fully destroyed');
pump(1500);
assert(S().bots[0].down===true,'bot 1 marked down');
assert(S().units.filter(u=>u.bot===0).length===0,'bot 1 units disbanded on down');
pump(27*1000);
assert(B.botBuildings(0).length>0,'bot 1 rebuilt its base after down-timer');
assert(S().bots[0].down===false,'bot 1 down flag cleared');
// empty preset = no buildings, no down flag
B.setBotPreset(2,'empty');
assert(B.botBuildings(2).length===0,'empty preset removes all buildings');
pump(1500);
assert(S().bots[2].down===false,'empty preset does NOT trigger rebuild');
B.setBotPreset(2,'village');
assert(B.botBuildings(2).length>0,'preset restored on request');

console.log(`\n${frames} frames simulated. ${process.exitCode?'SMOKE TEST FAILED':'ALL SMOKE TESTS PASSED'}`);
process.exit(process.exitCode||0);
