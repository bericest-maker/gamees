/* Military Base 2.5D — 06-save.js · save / load (localStorage) */
'use strict';
function save(){
  try{
    const o = {...S, units: S.units.filter(u=>u.side==='p').map(u=>({type:u.type,x:Math.round(u.x),y:Math.round(u.y),hp:u.hp,order:u.order,home:u.home}))};
    localStorage.setItem('bmb25', JSON.stringify(o));
  }catch(e){}
}
function load(){
  try{
    const raw = localStorage.getItem('bmb25');
    if(!raw) return null;
    const o = JSON.parse(raw);
    if(o.v===1||o.v===2){
      // very old save -> fresh map: keep progression, rebuild map/factions fresh
      const d=defaultState();
      d.cash=Math.max(500,o.cash||500); d.rebirth=o.rebirth||0;
      d.inventory=o.inventory||[]; d.time=o.time||0;
      d.stats=Object.assign(d.stats,o.stats||{});
      d.settings=Object.assign(d.settings,o.settings||{});
      d.codes=o.codes||{}; d.rewards=o.rewards||{}; d.admin=o.admin;
      return d;
    }
    if(o.v===3){ o.v=SAVE_V; return o; }   // v3 → v4: same shape; map positions are re-derived in init()
    if(o.v!==SAVE_V) return null;
    return o;
  }catch(e){ return null; }
}
