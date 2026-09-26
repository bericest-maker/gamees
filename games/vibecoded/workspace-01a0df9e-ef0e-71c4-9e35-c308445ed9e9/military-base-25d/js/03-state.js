/* Military Base 2.5D — 03-state.js · state: S + defaultState + POINTS_DEFS */
'use strict';
// ================= state =================
let S = null;
let uid = 1;
const nid = ()=> uid++;
const SAVE_V = 4;   // v4 = radial map + 35 units (v1-v3 saves migrate on load)

function defaultState(){
  return {
    v:SAVE_V, cash:500, rebirth:0, time:0, wave:0,
    nextWave:90, nextBoss:180,
    buildings:[], units:[],
    points: POINTS_DEFS.map(p=>({...p, owner:'neutral', faction:-1, respawnT:8, cool:0})),
    inventory:[], stats:defaultStats(),
    rewards:{}, codes:{}, achievements:{}, premiumPity:0,
    settings:{music:true, sfx:true, dmg:true, gfx:'High'},
    attackCity:false, placing:null,
    bankT:60,
    bots:[
      {preset:'standard',   down:false, downT:0, raidT:50},
      {preset:'fortified',  down:false, downT:0, raidT:65},
      {preset:'village',    down:false, downT:0, raidT:80},
      {preset:'standard',   down:false, downT:0, raidT:55},
      {preset:'scrap',      down:false, downT:0, raidT:90},
      {preset:'fortified',  down:false, downT:0, raidT:60},
      {preset:'industrial', down:false, downT:0, raidT:45},
    ],
    shopTab:'production', shopSub:'light',
  };
}
function defaultStats(){ return {kills:0, bosses:0, captures:0, tut:false, cratesOpened:0, placed:0}; }

// 5 capture points: 4 outpost islets between the spokes + the CITY (index 2 = CITY_IDX, kept for old saves)
const POINTS_DEFS = [
  {id:0, name:'OUTPOST N', ...ringPos(OUTPOST_ANGS[0],OUTPOST_R), r:80,  garrison:3, tank:0, ang:OUTPOST_ANGS[0]},
  {id:1, name:'OUTPOST E', ...ringPos(OUTPOST_ANGS[1],OUTPOST_R), r:80,  garrison:3, tank:0, ang:OUTPOST_ANGS[1]},
  {id:2, name:'CITY',      x:MAP_C.x, y:MAP_C.y,                  r:160, garrison:4, tank:2, city:true},
  {id:3, name:'OUTPOST W', ...ringPos(OUTPOST_ANGS[2],OUTPOST_R), r:80,  garrison:3, tank:0, ang:OUTPOST_ANGS[2]},
  {id:4, name:'OUTPOST S', ...ringPos(OUTPOST_ANGS[3],OUTPOST_R), r:80,  garrison:3, tank:0, ang:OUTPOST_ANGS[3]},
];
const CITY_IDX = 2;
