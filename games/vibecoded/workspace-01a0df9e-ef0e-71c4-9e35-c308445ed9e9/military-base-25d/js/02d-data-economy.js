/* Military Base 2.5D — 02d-data-economy.js · rarities, crates, codes, rewards, achievements */
'use strict';
// ================= data: economy =================
// full rarity ladder of the original (minus Dev) + our crate-only golden tier
const RAR = {
  common:{c:'#8f9aa8',label:'COMMON'}, uncommon:{c:'#5bc24e',label:'UNCOMMON'}, rare:{c:'#4a90e2',label:'RARE'},
  epic:{c:'#a35ad6',label:'EPIC'}, legend:{c:'#f5a53f',label:'LEGENDARY'}, myth:{c:'#ef5350',label:'MYTHIC'},
  limited:{c:'#ec407a',label:'LIMITED'}, unique:{c:'#26c6da',label:'UNIQUE'}, rebirth:{c:'#ff7043',label:'REBIRTH'},
  gold:{c:'#ffd54f',label:'GOLDEN'},
};
const RAR_ORDER = ['common','uncommon','rare','epic','legend','myth','limited','unique','rebirth','gold'];

const CRATE_TABLES = {
  standard: [['solar',3],['wind',2],['oil',2],['ironmine',2],['tree',2],['rock',2],['flowers',1],['flag',1],['cookie',1],['sandbags',1],['scouttower',1]],
  elite:    [['data',3],['steel',2],['refinery',2],['cookie',1],['logistics',2],['depot',2],['tankfac',2],['pillbox',2],['radar',1],['commandocamp',1],['heliport',1],['stealthlab',1]],
  premium:  [['industrial',3],['skyscraper',2],['afbase',2],['heavyarmory',1],['mechi',1],['zeppeldock',1],['pentagon',1],['fusion',1],['goldenTurbine',1]],
  golden:   [['goldenTurbine',2],['goldenCrane',1],['goldenBomb',1],['goldenMechStat',1]],
};
const CRATE_PRICES = {standard:10000, elite:1000000};
const PREMIUM_PRICE = 250000;
const WEEKLY = ['industrial','afbase','mechi','zeppeldock','pentagon','b2hangar'];

const CODES = {
  LOGI:{kind:'b',type:'logistics',msg:'Logistics Warehouse'},
  WOWPREMIUM:{kind:'b',type:'research',msg:'Research Lab'},
  SORRY:{kind:'b',type:'oil',msg:'Oil Drill'},
  FREEDOM:{kind:'b',type:'cookie',msg:'Cookie Stand'},
  STEALTHY:{kind:'b',type:'radar',msg:'Radar Station'},
  B2BUFF:{kind:'b',type:'pillbox',msg:'Pillbox'},
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

// achievements: auto-unlock (checked every second) → toast + reward. Progress shown in the 🏆 panel.
// prog() returns [current, goal]
const ACHIEVEMENTS = [
  {id:'build1',  ico:'🏗️', name:'Groundbreaker',     desc:'Place your first building',      prog:()=>[S.stats.placed,1],       give:{cash:500}},
  {id:'build25', ico:'🏙️', name:'Urban Planner',     desc:'Place 25 buildings',             prog:()=>[S.stats.placed,25],      give:{cash:25000}},
  {id:'cap1',    ico:'🚩', name:'Flag Planter',      desc:'Capture a point',                prog:()=>[S.stats.captures,1],     give:{cash:5000}},
  {id:'allpts',  ico:'🗺️', name:'Map Control',       desc:'Hold all 5 points at once',      prog:()=>[S.points.filter(p=>p.owner==='player').length,5], give:{crate:'elite'}},
  {id:'kill100', ico:'💥', name:'Centurion',         desc:'Defeat 100 enemies',             prog:()=>[S.stats.kills,100],      give:{cash:20000}},
  {id:'kill1k',  ico:'☠️', name:'War Machine',       desc:'Defeat 1,000 enemies',           prog:()=>[S.stats.kills,1000],     give:{crate:'premium'}},
  {id:'boss1',   ico:'🐍', name:'Worm Slayer',       desc:'Defeat the MECHA WORM',          prog:()=>[S.stats.bosses,1],       give:{cash:10000}},
  {id:'boss5',   ico:'🐉', name:'Worm Hunter',       desc:'Defeat the MECHA WORM 5 times',  prog:()=>[S.stats.bosses,5],       give:{crate:'premium'}},
  {id:'classes', ico:'🎖️', name:'Combined Arms',     desc:'Field all 4 unit classes at once',prog:()=>[CLASSES.filter(c=>S.units.some(u=>u.side==='p'&&!u.boss&&UNITS[u.type].cls.includes(c))).length,4], give:{cash:50000}},
  {id:'pow10k',  ico:'⭐', name:'Rising Power',      desc:'Reach 10,000 military power',    prog:()=>[S._power||0,10000],      give:{cash:10000}},
  {id:'pow100k', ico:'🌟', name:'Superpower',        desc:'Reach 100,000 military power',   prog:()=>[S._power||0,100000],     give:{crate:'premium'}},
  {id:'pow1m',   ico:'💫', name:'Hegemon',           desc:'Reach 1,000,000 military power', prog:()=>[S._power||0,1000000],    give:{crate:'golden'}},
  {id:'reb1',    ico:'🔥', name:'Born Again',        desc:'Rebirth once',                   prog:()=>[S.rebirth,1],            give:{cash:100000}},
  {id:'reb3',    ico:'🔥', name:'Phoenix',           desc:'Rebirth 3 times',                prog:()=>[S.rebirth,3],            give:{crate:'premium'}},
  {id:'reb5',    ico:'☄️', name:'Eternal',           desc:'Rebirth 5 times',                prog:()=>[S.rebirth,5],            give:{crate:'golden'}},
];
