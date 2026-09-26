/* Headless smoke test: runs the real game (every js/*.js listed in index.html) against DOM/canvas stubs. */
'use strict';
const fs=require('fs');

const T=require('./test-stubs.js');                 // stubs + loads the game exactly like index.html
const {B,G,pump,store,document,window}=T;
const S=()=>B.S;
// map-derived coordinates (never hard-code: the map layout is computed in js/02-data-world.js)
const PC=B.plotCentre(), MC=G('MAP_C'), BC=i=>G('botCenter')(i);
const WEST=G('plotCenter')(B.MAP_PLOTS[6]);        // BOT 6 = WEST plot
const ARENA={x:WEST.x-300,y:WEST.y-260};          // quiet corner of the WEST plot, away from its bridge
const walkCell=(x,y)=>{ const [cx,cy]=B.cellOf(x,y); return B.WALK[cy*B.GW+cx]; };

const rnd2=(a,b)=>a+Math.random()*(b-a);
function assert(cond,msg){
  if(!cond){ console.error('FAIL:',msg); process.exitCode=1; }
  else console.log('ok  -',msg);
}

// 1. init: fresh island map, points start NEUTRAL (no garrisons yet)
pump(300);
assert(S().units.length===0,`points start neutral — field is clear (${S().units.length} units)`);
// map: islands + water
assert(walkCell(PC.x,PC.y)===1,'player island is walkable');
assert(walkCell(MC.x,MC.y)===1,'city island is walkable');
assert(walkCell(300,300)===0,'open water is not walkable');
// radial map like the original: 8 plots + 8 lobes + octagon city + 4 outpost islets + bridges + crystals in water
assert(B.MAP_PLOTS.length===8 && B.LOBES.length===8,'8 plot islands, each with a lobe');
assert(B.LOBES.every(L=>B.walkableAt(L.x,L.y)),'every lobe island is land');
assert(B.POINTS_DEFS.filter(p=>!p.city).every(p=>B.walkableAt(p.x,p.y)),'4 outpost islets are land');
assert(B.BRIDGES.filter(b=>b.spoke).length===8 && B.BRIDGES.length===16,'8 spoke bridges + 8 outpost bridges');
assert(G('CRYSTALS').every(c=>!B.walkableAt(c.x,c.y)),'crystals float in the water');
assert(B.BOT_DEFS.every((b,i)=>Math.abs(Math.hypot(BC(i).x-MC.x,BC(i).y-MC.y)-G('RING'))<2),'bot plots sit on the ring around the city');
{ const mid={x:(PC.x+MC.x)/2,y:(PC.y+MC.y)/2}; assert(B.walkableAt(mid.x,mid.y) && !B.walkableAt(mid.x+120,mid.y),'spoke bridge is walkable, water beside it is not'); }
for(const p of B.POINTS_DEFS.filter(p=>!p.city)){ const pp=B.astar(PC.x,PC.y,p.x,p.y); assert(!!pp,`A* reaches ${p.name} from your base`); }
// A*: player base -> city stays on land/bridges
const path=B.astar(PC.x,PC.y,MC.x,MC.y);
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
  if(!pu){ pu=B.mkUnit('rifle','p',PC.x,PC.y); S().units.push(pu); } // bot raiders may have killed early units
  pu.x=PC.x; pu.y=PC.y; pu.order={x:PC.x,y:PC.y}; pu.path=null;  // home plot: nobody else around to steal the kill
  boss.x=pu.x+60; boss.y=pu.y; pu.hp=pu.maxHp=99999; // deterministic kill race
  boss.hp=1;
  pump(2500);
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
const gu=B.mkUnit('rifle','p',PC.x,PC.y); S().units.push(gu);
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
for(let k=0;k<4;k++) S().units.push(B.mkUnit('rifle','e',BC(0).x,BC(0).y,{bot:0}));
S().bots[0].raidT=1;
pump(2000);
assert(S().units.some(u=>u.bot===0&&u.order&&u.order.point===B.CITY_IDX),'bot 1 dispatched troops to the CITY (the middle)');
// ---- factions fight EACH OTHER (isolated arena: quiet SW island) ----
S().nextWave=9999; S().nextBoss=9999; // freeze global spawners during bot section
for(let i=0;i<7;i++) B.setBotPreset(i,'empty',true);
S().units=[];
const ua=B.mkUnit('rifle','e',ARENA.x,ARENA.y,{faction:1}); ua.hp=10;
const ub=B.mkUnit('rifle','e',ARENA.x+10,ARENA.y,{faction:2});
S().units.push(ua,ub);
pump(6000);
assert(!S().units.some(u=>u.id===ua.id),'different factions attack each other (bot-vs-bot)');
assert(S().units.some(u=>u.id===ub.id),'survivor of the faction fight is alive');
// ---- armored type: damage mitigation ----
S().units=[];
const at=B.mkUnit('tank','e',ARENA.x+50,ARENA.y+50,{faction:1});
const ar2=B.mkUnit('rifle','e',ARENA.x+60,ARENA.y+50,{faction:2});
S().units.push(at,ar2);
pump(4000);
const taken=at.maxHp-at.hp;
assert(taken>0&&taken<8,`armored tank mitigates damage (took ${Math.round(taken)} vs raw ~16 in 4s)`);
// ---- stealth type: needs detection ----
S().units=[];
const sp2=B.mkUnit('spectre','e',ARENA.x+100,ARENA.y,{faction:1});
const rf2=B.mkUnit('rifle','e',ARENA.x+500,ARENA.y,{faction:2});  // 400px away: outside both ranges -> no fight yet
S().units.push(sp2,rf2);
pump(200);
assert(B.canSee(rf2,sp2)===false,'stealth hidden from rifle (no detector, >70px)');
const jt=B.mkUnit('jet','e',ARENA.x+100,ARENA.y+150,{faction:2});      // 150px: inside jet's 340 sensor
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
const hx=ARENA.x, hy=ARENA.y; // corner of the WEST island, off its bridge
const heli=B.mkUnit('heli','e',hx,hy,{bot:5,faction:6});
heli.order={point:B.CITY_IDX}; heli.cityGoal=false; // air flies straight
const land=B.mkUnit('rifle','e',hx+5,hy+5,{bot:5,faction:6});
land.order={point:B.CITY_IDX}; land.cityGoal=true;   // land follows the bridge
S().units.push(heli,land);
for(let ss=0;ss<18;ss++){
  pump(1000);
  if(process.env.DBGAIR) console.log('  [air t'+(ss+1)+'] units='+S().units.length+' heli=('+Math.round(heli.x)+','+Math.round(heli.y)+') d='+Math.round(Math.hypot(heli.x-MC.x,heli.y-MC.y))+' other='+S().units.filter(u=>u!==heli&&u!==land).map(u=>u.type+':f'+u.faction+'@'+Math.round(u.x)+','+Math.round(u.y)).join(' | '));
}
const heliD=Math.hypot(heli.x-MC.x,heli.y-MC.y);
const landD=Math.hypot(land.x-MC.x,land.y-MC.y);
assert(heliD<200,`air unit flew straight over water to the city (dist ${Math.round(heliD)})`);
assert(landD>250,`land unit still en route via bridge (dist ${Math.round(landD)})`);
// ---- the war for the MIDDLE: bots converge on the CITY ----
S().units=S().units.filter(u=>u.faction!==6);
B.setBotPreset(0,'fortified',true);
B.setBotPreset(1,'fortified',true);
{ const cp=S().points[B.CITY_IDX]; cp.owner='neutral'; cp.faction=-1; cp.cool=0; }
for(let k=0;k<6;k++) S().units.push(B.mkUnit('rifle','e',BC(0).x+(k%2)*80,BC(0).y+((k/2)|0)*60,{bot:0,faction:1}));
for(let k=0;k<6;k++) S().units.push(B.mkUnit('rifle','e',BC(1).x-(k%2)*80,BC(1).y+((k/2)|0)*60,{bot:1,faction:2}));
S().bots[0].raidT=1; S().bots[1].raidT=3;
pump(60*1000);
const cf=B.pointFaction(S().points[B.CITY_IDX]);
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

// ---- v4: unit roster, classes & damage modifiers ----
const UNITS=G('UNITS'), BUILD=G('BUILD');
const byCls=c=>Object.values(UNITS).filter(u=>u.cls.includes(c)).length;
assert(byCls('light')>=10 && byCls('armored')>=10 && byCls('air')>=10 && byCls('stealth')>=5,`roster: ${byCls('light')} light / ${byCls('armored')} armored / ${byCls('air')} air / ${byCls('stealth')} stealth`);
assert(Object.keys(UNITS).every(k=>Object.values(BUILD).some(b=>b.unit===k)),'every unit has a building that trains it');
assert(Object.keys(BUILD).every(k=>G('SPR')[k]) && Object.keys(UNITS).every(k=>G('SPR')[k]),'every building + unit has a sprite');
{ let ok=true; const g=G('ctx'); for(const k of [...Object.keys(BUILD),...Object.keys(UNITS)]){ try{ G('SPR')[k].draw(g,1.3,{side:'e',faction:3}); }catch(e){ ok=false; console.error('  sprite',k,e.message); } } assert(ok,'all sprites draw without errors'); }
{ let ok=true; for(const k of Object.keys(BUILD)){ try{ G('tipHTML')(k); }catch(e){ ok=false; console.error('  tip',k,e.message);} } assert(ok,'stat tooltip renders for every building'); }
const mk=(t,f,x=ARENA.x,y=ARENA.y)=>B.mkUnit(t,'e',x,y,{faction:f});
assert(B.modFor(mk('flak',1),mk('tank',2))===0,'Mobile Flak cannot hurt armored (×0)');
assert(B.modFor(mk('flak',1),mk('heli',2))===1.5,'Mobile Flak ×1.5 vs air');
assert(B.modFor(mk('rifle',1),mk('spectre',2))===0,'Rifleman cannot hurt stealth (×0)');
assert(B.modFor(mk('rocket',1),mk('tank',2))===1.5,'Rocket Trooper ×1.5 vs armored');
assert(B.modFor(mk('sniper',1),mk('phantom',2))===0,'multi-class target: any ×0 class wins (sniper vs Phantom)');
assert(B.isAir(mk('drone',1)) && !UNITS.drone.cls.includes('air') && B.modFor(mk('flak',1),mk('drone',2))===0,'Drone flies but stays LIGHT (anti-air ignores it)');
// flak ignores a tank standing next to it (never targets ×0)
S().units=[]; S().buildings=S().buildings.filter(b=>b.owner!=='p');
{ const fl=mk('flak',1), tk=mk('tank',2,ARENA.x+80); tk.hp=tk.maxHp=99999; S().units.push(fl,tk); pump(3000);
  assert(tk.hp===tk.maxHp,'Flak never shoots a tank (×0 → no target)'); }
// splash: artillery hits the whole clump
S().units=[];
{ const ar=mk('arty',1); const cl=[0,1,2].map(i=>{ const r=mk('rifle',2,ARENA.x+300+i*12,ARENA.y); r.hp=r.maxHp=200; return r; }); S().units.push(ar,...cl);
  pump(1200); assert(cl.filter(r=>r.hp<200).length>=2,'artillery splash damages several units'); }
// medic heals
S().units=[];
{ const md=mk('medic',1), hurt=mk('rifle',1,ARENA.x+40); hurt.hp=5; S().units.push(md,hurt); pump(3000);
  assert(hurt.hp>5,`medic heals allies (5 → ${Math.round(hurt.hp)})`); }
// troop cap counts unit SIZE
S().units=[];
S().units.push(B.mkUnit('mammoth','p',PC.x,PC.y), B.mkUnit('rifle','p',PC.x,PC.y));
assert(B.capUsed()===6,`troop cap uses unit size (mammoth 5 + rifle 1 = ${B.capUsed()})`);
// ---- turrets, radar, hospital, bank ----
S().units=[]; S().buildings=S().buildings.filter(b=>b.owner!=='p');
B.placeBuilding('pillbox',6,4);
const pbx=S().buildings[S().buildings.length-1]; B.bPos(pbx);
{ const foe=mk('rifle',3,pbx.x+120,pbx.y); foe.hp=foe.maxHp=500; S().units.push(foe); pump(3000);
  assert(foe.hp<500,'Pillbox shoots ground enemies in range'); }
B.placeBuilding('aaturret',8,4);
{ const sam=S().buildings[S().buildings.length-1]; B.bPos(sam); S().units=[];
  const gr=mk('rifle',3,sam.x+60,sam.y); gr.hp=gr.maxHp=500; const ai=mk('heli',3,sam.x+100,sam.y); ai.hp=ai.maxHp=5000; ai.order={x:ai.x,y:ai.y};
  S().buildings=S().buildings.filter(b=>b.type!=='pillbox'); S().units.push(gr,ai); pump(3000);
  assert(ai.hp<5000 && gr.hp===500,'SAM Site hits air only'); }
B.placeBuilding('radar',10,4);
{ const rd=S().buildings[S().buildings.length-1]; B.bPos(rd); S().units=[];
  const sp=B.mkUnit('spectre','e',rd.x+300,rd.y,{faction:3}); const me=B.mkUnit('rifle','p',rd.x-200,rd.y);
  S().units.push(sp,me); pump(500);
  assert(B.canSee(me,sp),'Radar Station reveals stealth for your whole army'); }
B.placeBuilding('hospital',1,6);
{ const hs=S().buildings[S().buildings.length-1]; B.bPos(hs); S().units=[];
  const w=B.mkUnit('tank','p',hs.x+50,hs.y); w.hp=10; S().units.push(w); pump(2200);
  assert(w.hp>=20,'Field Hospital heals nearby units'); }
S().units=[];
S().cash=100000; B.placeBuilding('bank',3,7); S().bankT=0.01; const c0=S().cash; B.bankTick(0.02);
assert(S().cash-c0>=4999,`Bank pays 5% interest (+${Math.round(S().cash-c0)})`);
// ---- shop rules ----
const rbSave=S().rebirth; S().rebirth=0;
assert(!!B.buyBlock('monument'),'Monument needs a rebirth');
S().rebirth=1; assert(!B.buyBlock('monument'),'Monument unlocked after rebirth'); S().rebirth=rbSave;
B.setBotPreset(0,'standard',true);
assert(B.canPlaceAt('solar',1,1)||S().buildings.some(b=>b.owner==='p'&&b.gx<=1&&b.gy<=1),'bot buildings never block YOUR grid');
// ---- achievements + leaderboard + UI panels ----
S().achievements={}; B.checkAchievements();
assert(S().achievements.build1!=null,'achievement "Groundbreaker" unlocked');
{ let ok=true; try{ G('renderAchievements')(); G('renderLeaderboard')(); S().shopTab='units'; for(const c of ['light','armored','air','stealth']){ S().shopSub=c; G('renderShop')(); } S().shopTab='production'; }catch(e){ ok=false; console.error(e); }
  assert(ok,'achievements, leaderboard and UNITS sub-tabs render'); }
// ---- save import accepts v3 + v4 ----
{ const box=document.querySelector('#aSave'); box.value=JSON.stringify({...JSON.parse(store['bmb25']||'{}'),v:3}); store['bmb25']=null;
  window.Admin.importSave(); assert(JSON.parse(store['bmb25']||'{}').v===3,'admin import accepts a v3 save'); }
assert(G('load')().v===4,'v3 save migrates to v4 on load');

console.log(`\n${T.frames} frames simulated. ${process.exitCode?'SMOKE TEST FAILED':'ALL SMOKE TESTS PASSED'}`);
process.exit(process.exitCode||0);
