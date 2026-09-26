/* Military Base 2.5D — 02b-data-units.js · unit classes, damage modifiers, all 35 units + boss */
'use strict';
// ================= data: units =================
// CLASSES (from the original game): a unit can hold several.
//   light   — infantry / light vehicles
//   armored — tanks, APCs, mechs (also get flat `armor`)
//   air     — flies straight over water (no pathfinding)
//   stealth — invisible + untargetable unless DETECTED (detect range, radar, in combat, or <70px)
// DAMAGE MODIFIERS  mods:{class:multiplier}  vs the TARGET's classes.
//   missing = ×1 · 0 = CANNOT damage that class (unit won't even target it)
//   multi-class target: if any class is 0 → 0, otherwise the best (highest) multiplier applies.
// Other fields: rate = seconds per shot · size = troop-cap slots used · detect = stealth sensor px
//   heal = hp/s to nearby allies (medic) · splash = area radius px (50% dmg) · bld = ×dmg vs buildings
//   fly = moves like air but keeps its class (Drone is Light — anti-air can't touch it)
const CLASSES = ['light','armored','air','stealth'];
const CLASS_INFO = {
  light:  {ico:'🪖', label:'LIGHT',   col:'#8fd47a'},
  armored:{ico:'🛡️', label:'ARMORED', col:'#c9a86b'},
  air:    {ico:'✈️', label:'AIR',     col:'#7fc4ff'},
  stealth:{ico:'👻', label:'STEALTH', col:'#c79bff'},
};
const UNITS = {
  // ----- LIGHT (10) -----
  rifle:    {name:'Rifleman',       cls:['light'],  rar:'common',   hp:40,  dmg:4,  rate:1.0, range:170, speed:95,  size:1, power:15,   reward:25,   mods:{stealth:0}},
  scout:    {name:'Scout',          cls:['light'],  rar:'common',   hp:32,  dmg:5,  rate:0.9, range:160, speed:125, size:1, power:20,   reward:30,   mods:{stealth:0}, detect:200},
  atv:      {name:'ATV',            cls:['light'],  rar:'uncommon', hp:95,  dmg:3,  rate:0.7, range:130, speed:165, size:1, power:45,   reward:45,   mods:{air:0,stealth:0}},
  sniper:   {name:'Sniper',         cls:['light'],  rar:'uncommon', hp:20,  dmg:34, rate:3.2, range:320, speed:70,  size:1, power:90,   reward:70,   mods:{stealth:0,light:1.5}},
  commando: {name:'Commando',       cls:['light'],  rar:'rare',     hp:85,  dmg:6,  rate:1.0, range:190, speed:100, size:1, power:140,  reward:90,   mods:{}, detect:150},
  humvee:   {name:'Humvee',         cls:['light'],  rar:'rare',     hp:200, dmg:5,  rate:1.0, range:150, speed:125, size:2, power:160,  reward:110,  mods:{stealth:0}, armor:2},
  rocket:   {name:'Rocket Trooper', cls:['light'],  rar:'rare',     hp:38,  dmg:40, rate:4.0, range:220, speed:80,  size:2, power:190,  reward:120,  mods:{armored:1.5}},
  medic:    {name:'Medic',          cls:['light'],  rar:'epic',     hp:50,  dmg:0,  rate:1.0, range:160, speed:95,  size:2, power:220,  reward:100,  mods:{}, heal:7},
  ranger:   {name:'Ranger',         cls:['light'],  rar:'epic',     hp:150, dmg:5,  rate:0.55,range:200, speed:95,  size:2, power:420,  reward:180,  mods:{stealth:0}},
  drone:    {name:'Drone',          cls:['light'],  rar:'legend',   hp:60,  dmg:6,  rate:0.8, range:210, speed:165, size:1, power:900,  reward:260,  mods:{stealth:0,light:1.2}, fly:true},
  // ----- ARMORED (10) -----
  hinf:     {name:'Heavy Infantry', cls:['armored'],rar:'uncommon', hp:130, dmg:3,  rate:0.55,range:150, speed:80,  size:2, power:90,   reward:60,   mods:{stealth:0}, armor:3},
  tank:     {name:'Tank',           cls:['armored'],rar:'rare',     hp:240, dmg:18, rate:1.6, range:270, speed:55,  size:3, power:120,  reward:120,  mods:{air:.8,stealth:0,light:.8}, armor:6},
  apc:      {name:'APC',            cls:['armored'],rar:'epic',     hp:320, dmg:3,  rate:0.6, range:130, speed:110, size:2, power:300,  reward:150,  mods:{air:0,stealth:0}, armor:4},
  flak:     {name:'Mobile Flak',    cls:['armored'],rar:'epic',     hp:160, dmg:8,  rate:0.8, range:330, speed:70,  size:3, power:380,  reward:170,  mods:{air:1.5,armored:0,light:0}, armor:2, bld:.2},
  aav:      {name:'Anti-Air Vehicle',cls:['armored'],rar:'legend',  hp:210, dmg:20, rate:1.4, range:370, speed:70,  size:3, power:950,  reward:300,  mods:{air:1.5,stealth:0,armored:0,light:0}, armor:3, bld:.2, detect:300},
  arty:     {name:'Artillery Truck',cls:['armored'],rar:'legend',   hp:220, dmg:75, rate:5.0, range:430, speed:70,  size:3, power:1200, reward:350,  mods:{air:0,stealth:0,light:.8}, armor:2, splash:70},
  heavy:    {name:'Heavy Tank',     cls:['armored'],rar:'legend',   hp:950, dmg:46, rate:3.3, range:300, speed:45,  size:4, power:3600, reward:800,  mods:{air:.5,stealth:0,armored:1.2,light:.7}, armor:10},
  mech:     {name:'Mini Mecha',     cls:['armored'],rar:'myth',     hp:900, dmg:60, rate:2.0, range:330, speed:42,  size:4, power:8000, reward:1500, mods:{light:.6}, armor:14, detect:220},
  mammoth:  {name:'Mammoth',        cls:['armored'],rar:'myth',     hp:1500,dmg:85, rate:3.3, range:310, speed:55,  size:5, power:16000,reward:2500, mods:{air:0,stealth:0}, armor:14, splash:50},
  railgun:  {name:'Railgun Tank',   cls:['armored'],rar:'limited',  hp:620, dmg:230,rate:5.0, range:380, speed:45,  size:4, power:22000,reward:3000, mods:{stealth:0,armored:1.5,light:.5}, armor:8},
  // ----- AIR (10) -----
  heli:     {name:'Helicopter',     cls:['air'],    rar:'rare',     hp:170, dmg:22, rate:1.4, range:320, speed:140, size:2, power:500,  reward:250,  mods:{air:.7,light:1.1}, detect:260},
  huey:     {name:'Huey',           cls:['air'],    rar:'epic',     hp:200, dmg:5,  rate:0.55,range:250, speed:125, size:3, power:650,  reward:260,  mods:{air:.8,stealth:0}},
  cobra:    {name:'Cobra',          cls:['air'],    rar:'myth',     hp:120, dmg:14, rate:0.8, range:270, speed:150, size:2, power:1500, reward:450,  mods:{armored:1.3,stealth:0}},
  jet:      {name:'Jet',            cls:['air'],    rar:'legend',   hp:130, dmg:40, rate:1.8, range:400, speed:230, size:2, power:2000, reward:600,  mods:{air:1.2,light:.8}, armor:4, detect:340},
  blackhawk:{name:'Blackhawk',      cls:['air'],    rar:'myth',     hp:230, dmg:20, rate:1.6, range:260, speed:140, size:3, power:2600, reward:700,  mods:{air:.7,stealth:0,armored:.5,light:2}},
  a10:      {name:'A-10 Warthog',   cls:['air'],    rar:'myth',     hp:240, dmg:4,  rate:0.33,range:270, speed:165, size:3, power:3200, reward:800,  mods:{air:.8,stealth:0,armored:1.2,light:1.2}, armor:3},
  f22:      {name:'F-22 Raptor',    cls:['air'],    rar:'limited',  hp:110, dmg:16, rate:0.8, range:260, speed:240, size:2, power:4200, reward:900,  mods:{armored:1.2}, detect:320},
  ac130:    {name:'AC-130',         cls:['air'],    rar:'limited',  hp:420, dmg:17, rate:1.0, range:390, speed:80,  size:4, power:8500, reward:1600, mods:{armored:1.2,stealth:0}, armor:4},
  b52:      {name:'B-52',           cls:['air'],    rar:'limited',  hp:450, dmg:95, rate:3.3, range:390, speed:115, size:5, power:9500, reward:1800, mods:{air:0,stealth:0,armored:2}, armor:4, splash:80},
  zeppelin: {name:'Zeppelin',       cls:['air'],    rar:'limited',  hp:1400,dmg:80, rate:2.6, range:520, speed:36,  size:5, power:15000,reward:3000, mods:{air:0}, armor:20},
  // ----- STEALTH (5) -----
  spectre:  {name:'Spectre',        cls:['light','stealth'],  rar:'epic',    hp:95,  dmg:15, rate:1.1, range:150, speed:125, size:1, power:700,  reward:320,  mods:{}},
  saboteur: {name:'Saboteur',       cls:['light','stealth'],  rar:'limited', hp:70,  dmg:45, rate:1.6, range:180, speed:115, size:2, power:2600, reward:500,  mods:{air:0,stealth:0}, bld:3},
  phantom:  {name:'Phantom',        cls:['armored','stealth'],rar:'myth',    hp:330, dmg:32, rate:2.5, range:260, speed:100, size:3, power:4600, reward:900,  mods:{air:.5,stealth:0}, armor:6},
  stealthheli:{name:'Stealth Helicopter',cls:['air','stealth'],rar:'limited',hp:210, dmg:21, rate:1.25,range:260, speed:170, size:3, power:5200, reward:1000, mods:{air:.7,light:1.1}},
  b2:       {name:'B-2 Spirit',     cls:['air','stealth'],    rar:'limited', hp:270, dmg:125,rate:5.0, range:400, speed:190, size:4, power:12500,reward:2200, mods:{air:0,stealth:0}, splash:70},
};
const BOSS = {hp:2600, dmg:30, speed:26, range:90, rate:1.5, power:50000, reward:25000, name:'MECHA WORM', cls:['armored'], armor:2, mods:{}};

// ---- class helpers ----
const unitDef   = u => u.boss ? BOSS : UNITS[u.type];
const unitCls   = u => unitDef(u).cls;
const isAir     = u => !u.boss && (UNITS[u.type].cls.includes('air') || !!UNITS[u.type].fly);
const isStealth = u => !u.boss && UNITS[u.type].cls.includes('stealth');
const unitArmor = u => unitDef(u).armor||0;
const unitDetect= u => u.boss ? 0 : UNITS[u.type].detect||0;
const unitSize  = u => u.boss ? 0 : UNITS[u.type].size||1;
// damage multiplier of attacker definition `ad` vs a target with classes `tcls`
function modVs(ad,tcls){
  const m=(ad&&ad.mods)||{};
  let best=0, any=false;
  for(const c of tcls){
    const v = m[c]===undefined ? 1 : m[c];
    if(v===0) return 0;
    best=Math.max(best,v); any=true;
  }
  return any?best:1;
}
// unit-vs-unit modifier (attacker object may be a plain {side} stub → ×1)
function modFor(a,t){
  if(!a||(!a.boss&&!UNITS[a.type])) return 1;
  return modVs(unitDef(a),unitCls(t));
}
const canHurt = (a,t) => (unitDef(a).dmg||0)>0 && modFor(a,t)>0;
// visual height of a unit sprite above its feet (HP bar / tracer aim)
const unitTop = u => u.boss ? 34 : (isAir(u) ? 40 : 14+unitSize(u)*5);
