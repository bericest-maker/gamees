/* Military Base 2.5D — 02c-data-buildings.js · every building: production, units (one per unit), special, decor */
'use strict';
// ================= data: buildings =================
// fields: name, tab (production|units|special|decor), cost (null = crate only), w/h (grid slots),
//   income ($/s), power, rar, hp, info, req (military power needed), unit + spawnEvery (unit buildings),
//   special: 'logistics'|'depot'|'bank'|'radar'|'hospital' · turret:{dmg,rate,range,mods} (defence tower)
//   detect (radar px) · heal (hp/s, radius healR) · max (placement cap) · reqRebirth · keep (survives rebirth)
//   style (sprite template for generated unit buildings)
const BUILD = {
  // ----- PRODUCTION (12 buyable + 2 special) -----
  solar:      {name:'Solar Array',       tab:'production', cost:300,    w:1,h:1, income:1,   power:3,    rar:'common',   hp:150,  info:'$1/s passive income'},
  wind:       {name:'Wind Turbine',      tab:'production', cost:650,    w:1,h:1, income:2,   power:6,    rar:'common',   hp:160,  info:'$2/s — spins in the sea breeze'},
  oil:        {name:'Oil Drill',         tab:'production', cost:1000,   w:1,h:1, income:4,   power:10,   rar:'common',   hp:250,  info:'$4/s passive income'},
  ironmine:   {name:'Iron Mines',        tab:'production', cost:1600,   w:1,h:1, income:5,   power:14,   rar:'uncommon', hp:300,  info:'$5/s — dig dig dig'},
  steel:      {name:'Steel Factory',     tab:'production', cost:3500,   w:2,h:1, income:10,  power:30,   rar:'uncommon', hp:420,  info:'$10/s', req:100},
  data:       {name:'Data Center',       tab:'production', cost:5000,   w:2,h:1, income:15,  power:50,   rar:'rare',     hp:400,  info:'$15/s passive income'},
  cookie:     {name:'Cookie Stand',      tab:'production', cost:8000,   w:1,h:1, income:6,   power:20,   rar:'rare',     hp:200,  info:'$6/s • who needs a cookie stand in a military base?'},
  refinery:   {name:'Refinery',          tab:'production', cost:12000,  w:2,h:1, income:32,  power:120,  rar:'rare',     hp:600,  info:'$32/s', req:1000},
  powerplant: {name:'Power Plant',       tab:'production', cost:22000,  w:2,h:2, income:55,  power:220,  rar:'rare',     hp:900,  info:'$55/s', req:1250},
  research:   {name:'Research Lab',      tab:'production', cost:25000,  w:2,h:2, income:45,  power:250,  rar:'epic',     hp:800,  info:'$45/s • looks smart'},
  industrial: {name:'Industrial Drill',  tab:'production', cost:60000,  w:2,h:2, income:120, power:600,  rar:'legend',   hp:1200, info:'$120/s • legendary money machine', req:3000},
  skyscraper: {name:'Skyscraper',        tab:'production', cost:180000, w:2,h:2, income:320, power:2000, rar:'legend',   hp:1600, info:'$320/s • corporate HQ of war', req:20000},
  fusion:     {name:'Fusion Reactor',    tab:'production', cost:600000, w:2,h:2, income:1000,power:8000, rar:'myth',     hp:2400, info:'$1,000/s • tiny sun, big money', req:100000},
  goldenTurbine:{name:'Golden Wind Turbine',tab:'production', cost:null,w:1,h:1, income:400,power:12000, rar:'gold',     hp:2000, info:'$400/s • survives rebirth • crate only'},

  // ----- SPECIAL (9) -----
  logistics:  {name:'Logistics Warehouse',tab:'special',  cost:2500,   w:2,h:1, income:0,   power:25,   rar:'common',   hp:300,  special:'logistics', max:5, info:'+10% total income (max 5 count)'},
  depot:      {name:'Supply Depot',      tab:'special',  cost:2000,   w:1,h:1, income:0,   power:20,   rar:'common',   hp:300,  special:'depot', info:'+10 troop capacity (max 100)'},
  pillbox:    {name:'Pillbox',           tab:'special',  cost:8000,   w:1,h:1, income:0,   power:400,  rar:'uncommon', hp:900,  turret:{dmg:10,rate:1.0,range:260,mods:{air:0,stealth:0}}, info:'Defence turret • shoots ground units (not air)'},
  radar:      {name:'Radar Station',     tab:'special',  cost:20000,  w:1,h:1, income:0,   power:800,  rar:'rare',     hp:500,  special:'radar', detect:450, info:'Reveals STEALTH enemies within 450px for your army'},
  aaturret:   {name:'SAM Site',          tab:'special',  cost:30000,  w:1,h:1, income:0,   power:1500, rar:'epic',     hp:700,  turret:{dmg:22,rate:1.2,range:380,mods:{air:1.5,armored:0,light:0}}, info:'Anti-air turret • only shoots AIR', req:2000},
  hospital:   {name:'Field Hospital',    tab:'special',  cost:40000,  w:2,h:1, income:0,   power:1000, rar:'epic',     hp:800,  special:'hospital', heal:10, healR:320, info:'Heals your units within 320px (10 hp/s)', req:3000},
  cannon:     {name:'Fortress Cannon',   tab:'special',  cost:120000, w:2,h:1, income:0,   power:6000, rar:'legend',   hp:2200, turret:{dmg:70,rate:3.0,range:380,mods:{air:0,stealth:0,armored:1.3},splash:60}, info:'Heavy defence gun • splash, great vs armor', req:20000},
  bank:       {name:'Bank',              tab:'special',  cost:250000, w:2,h:1, income:0,   power:3000, rar:'legend',   hp:1500, special:'bank', max:3, info:'Every 60s pays 5% of your cash (max $50k each, max 3)', req:15000},
  monument:   {name:'Monument',          tab:'special',  cost:500000, w:2,h:2, income:600, power:2500, rar:'rebirth',  hp:2500, reqRebirth:1, keep:true, info:'$600/s • needs 1 rebirth • survives rebirth'},

  // ----- DECOR (10 buyable + 3 golden) -----
  tree:       {name:'Pine Tree',         tab:'decor',    cost:150,    w:1,h:1, income:0,   power:1,    rar:'common', hp:100,  info:'Cosmetic. Protects moths.'},
  rock:       {name:'Rock',              tab:'decor',    cost:150,    w:1,h:1, income:0,   power:1,    rar:'common', hp:100,  info:'Cosmetic. Very natural.'},
  flowers:    {name:'Flower Bed',        tab:'decor',    cost:180,    w:1,h:1, income:0,   power:1,    rar:'common', hp:80,   info:'Cosmetic. Soldiers need nice things too.'},
  flag:       {name:'Flag',              tab:'decor',    cost:200,    w:1,h:1, income:0,   power:2,    rar:'common', hp:100,  info:'Cosmetic. Wave it with pride.'},
  wall:       {name:'Wall',              tab:'decor',    cost:250,    w:1,h:1, income:0,   power:10,   rar:'common', hp:600,  info:'Soaks up enemy fire.'},
  sandbags:   {name:'Sandbags',          tab:'decor',    cost:300,    w:1,h:1, income:0,   power:8,    rar:'common', hp:500,  info:'Cheap cover. Soaks up enemy fire.'},
  barrels:    {name:'Fuel Barrels',      tab:'decor',    cost:400,    w:1,h:1, income:0,   power:3,    rar:'common', hp:120,  info:'Cosmetic. Definitely not flammable.'},
  lamp:       {name:'Lamp Post',         tab:'decor',    cost:500,    w:1,h:1, income:0,   power:3,    rar:'uncommon',hp:120, info:'Cosmetic. Glows a little.'},
  fountain:   {name:'Fountain',          tab:'decor',    cost:5000,   w:1,h:1, income:0,   power:40,   rar:'rare',   hp:400,  info:'Cosmetic. Very fancy.'},
  statue:     {name:'Eagle Statue',      tab:'decor',    cost:25000,  w:1,h:1, income:0,   power:200,  rar:'epic',   hp:800,  info:'Cosmetic. Majestic.'},
  goldenCrane:  {name:'Golden Crane',       tab:'decor', cost:null, w:2,h:1, income:0, power:12000, rar:'gold', hp:2000, info:'Golden decor • crate only'},
  goldenBomb:   {name:'Golden Nuclear Bomb',tab:'decor', cost:null, w:1,h:1, income:0, power:12000, rar:'gold', hp:2000, info:'Golden decor • crate only'},
  goldenMechStat:{name:'Golden Mech Statue', tab:'decor',cost:null, w:1,h:1, income:0, power:12000, rar:'gold', hp:2000, info:'Golden decor • crate only'},
};

// ----- UNIT BUILDINGS: one per unit, grouped by class (shop UNITS → LIGHT / ARMORED / AIR / STEALTH) -----
// [id, unit, name, cost, spawnEvery(s), power, w, h, req, hp, style]   (style = generated sprite template)
const UNIT_BUILDINGS = [
  // LIGHT
  ['barracks',      'rifle',      'Barracks',               1500,     8,  150,    2,1, 0,      400,  null],
  ['scouttower',    'scout',      'Scout Watchtower',       1200,     8,  120,    1,1, 0,      300,  'tower'],
  ['atvtent',       'atv',        'ATV Tent',               3000,    12,  250,    2,1, 0,      350,  'tent'],
  ['snipernest',    'sniper',     'Sniper Nest',            5000,    14,  450,    1,1, 500,    300,  'tower'],
  ['commandocamp',  'commando',   'Commando Camp',          9000,    14,  700,    2,1, 1000,   500,  'tent'],
  ['motorpool',     'humvee',     'Motor Pool',             12000,   15,  800,    2,2, 1500,   700,  'garage'],
  ['rocketrange',   'rocket',     'Rocket Range',           15000,   16,  950,    2,1, 2000,   600,  'bunker'],
  ['medtent',       'medic',      'Medic Tent',             18000,   20,  1100,   2,1, 2500,   500,  'tent'],
  ['rangerpost',    'ranger',     'Ranger Outpost',         30000,   18,  2000,   2,2, 5000,   900,  'barracks'],
  ['dronehub',      'drone',      'Drone Hub',              80000,   20,  4500,   2,2, 12000,  900,  'lab'],
  // ARMORED
  ['heavybarracks', 'hinf',       'Heavy Barracks',         4000,    12,  450,    2,1, 300,    600,  'barracks'],
  ['tankfac',       'tank',       'Tank Factory',           6000,    15,  600,    2,1, 0,      700,  null],
  ['apcdepot',      'apc',        'APC Depot',              14000,   16,  1200,   2,2, 2000,   900,  'garage'],
  ['flakyard',      'flak',       'Flak Yard',              16000,   18,  1400,   2,1, 2500,   800,  'garage'],
  ['aabattery',     'aav',        'AA Battery Works',       45000,   22,  3500,   2,2, 8000,   1000, 'factory'],
  ['artypark',      'arty',       'Artillery Park',         55000,   24,  4200,   2,2, 10000,  1000, 'garage'],
  ['heavyarmory',   'heavy',      'Heavy Armory',           150000,  30,  15000,  3,2, 25000,  1800, 'factory'],
  ['mechi',         'mech',       'Mech Bay',               600000,  40,  60000,  3,3, 50000,  2000, null],
  ['mammothworks',  'mammoth',    'Mammoth Works',          1200000, 50,  120000, 3,3, 120000, 2600, 'factory'],
  ['railgunlab',    'railgun',    'Secret Weapons Facility',2000000, 55,  160000, 3,2, 180000, 2400, 'lab'],
  // AIR
  ['heliport',      'heli',       'Heliport',               25000,   20,  2500,   2,2, 2000,   1000, null],
  ['hueypad',       'huey',       'Huey Pad',               30000,   22,  3000,   2,2, 3000,   900,  'pad'],
  ['cobrapad',      'cobra',      'Cobra Hangar',           70000,   24,  7000,   2,2, 8000,   1100, 'hangar'],
  ['afbase',        'jet',        'Air Force Base',         120000,  25,  12000,  3,2, 10000,  1500, null],
  ['blackhawkpad',  'blackhawk',  'Blackhawk Helipad',      160000,  28,  16000,  2,2, 20000,  1300, 'pad'],
  ['a10strip',      'a10',        'A-10 Airstrip',          220000,  30,  20000,  3,2, 30000,  1600, 'hangar'],
  ['raptorhangar',  'f22',        'Raptor Hangar',          380000,  30,  32000,  3,2, 45000,  1700, 'hangar'],
  ['pentagon',      'ac130',      'Pentagon',               800000,  45,  70000,  3,3, 80000,  2600, 'pentagon'],
  ['bomberbase',    'b52',        'Bomber Base',            1000000, 50,  90000,  3,2, 100000, 2200, 'hangar'],
  ['zeppeldock',    'zeppelin',   'Zeppelin Dock',          1500000, 60,  150000, 3,2, 150000, 2500, null],
  // STEALTH
  ['stealthlab',    'spectre',    'Stealth Bay',            15000,   22,  3000,   2,2, 3000,   800,  null],
  ['saboteurcamp',  'saboteur',   'Sentinel Training Center',250000, 30,  22000,  2,2, 35000,  1200, 'lab'],
  ['phantomgarage', 'phantom',    'Phantom Garage',         450000,  35,  40000,  2,2, 50000,  1500, 'garage'],
  ['monitoring',    'stealthheli','Monitoring Center',      600000,  35,  50000,  2,2, 70000,  1500, 'pad'],
  ['b2hangar',      'b2',         'B-2 Stealth Hangar',     2500000, 60,  200000, 3,2, 200000, 2600, 'hangar'],
];
for(const [id,unit,name,cost,every,power,w,h,req,hp,style] of UNIT_BUILDINGS){
  const ud=UNITS[unit];
  const sub = ud.cls.includes('stealth') ? 'stealth' : ud.cls[0];
  BUILD[id]={name, tab:'units', sub, cost, w, h, unit, spawnEvery:every, power, rar:ud.rar, hp, style,
    info:`Trains a ${ud.name} every ${every}s`, ...(req?{req}:{})};
}
const SHOP_TABS = [['production','PRODUCTION'],['units','UNITS'],['special','SPECIAL'],['decor','DECOR']];
const SHOP_SUBS = CLASSES; // sub-tabs inside UNITS
