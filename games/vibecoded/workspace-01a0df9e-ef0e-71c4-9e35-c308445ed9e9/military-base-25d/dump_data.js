/* Military Base 2.5D — dump_data.js · prints the game's LIVE data tables as JSON (used by gen_info.py so INFO.md never drifts).
   Usage: node dump_data.js > data.json   (gen_info.py runs it automatically) */
'use strict';
const origLog=console.log; console.log=()=>{};          // keep stdout clean (game toasts etc.)
const {G}=require('./test-stubs.js');
const noFn=o=>JSON.parse(JSON.stringify(o,(k,v)=>typeof v==='function'?undefined:v));
const out={
  WORLD:G('WORLD'), SLOT:G('SLOT'), PLOT:G('PLOT'), PLOT_W:G('PLOT_W'), PLOT_H:G('PLOT_H'), PLOT_MX:G('PLOT_MX'), PLOT_MY:G('PLOT_MY'),
  MAP_C:G('MAP_C'), RING:G('RING'), CITY_ISL:G('CITY_ISL'), OUTPOST_R:G('OUTPOST_R'), OUTPOST_ANGS:G('OUTPOST_ANGS'),
  CRYSTALS:G('CRYSTALS'), LOBES:G('LOBES'), BRIDGES:G('BRIDGES'), BRIDGE_W:G('BRIDGE_W'),
  CELL:G('CELL'), GW:G('GW'), GH:G('GH'), SAVE_V:G('SAVE_V'), CITY_IDX:G('CITY_IDX'),
  UNITS:G('UNITS'), BOSS:G('BOSS'), CLASSES:G('CLASSES'), CLASS_INFO:G('CLASS_INFO'),
  BUILD:G('BUILD'), UNIT_BUILDINGS:G('UNIT_BUILDINGS'), SHOP_TABS:G('SHOP_TABS'),
  PRESETS:G('PRESETS'), BOT_DEFS:G('BOT_DEFS'), POINTS_DEFS:G('POINTS_DEFS'),
  FACCOL:G('FACCOL'), FACNAME:G('FACNAME'),
  RAR:G('RAR'), RAR_ORDER:G('RAR_ORDER'), CRATE_TABLES:G('CRATE_TABLES'), CRATE_PRICES:G('CRATE_PRICES'),
  PREMIUM_PRICE:G('PREMIUM_PRICE'), WEEKLY:G('WEEKLY'), CODES:G('CODES'),
  REWARDS:noFn(G('REWARDS')), ACHIEVEMENTS:noFn(G('ACHIEVEMENTS')), WAVE_POOL:G('WAVE_POOL'),
  SPRITES:Object.fromEntries(Object.entries(G('SPR')).map(([k,v])=>[k,{w:v.w,h:v.h}])),
  TUT:G('TUT'), defaultState:noFn(G('defaultState')()),
};
console.log=origLog;
process.stdout.write(JSON.stringify(out));
process.exit(0);
