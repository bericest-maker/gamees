/* Military Base 2.5D — 19-init.js · init: load save → migrate → start */
'use strict';
// ================= init =================
function init(){
  const loaded=load();
  S=loaded||defaultState();
  S.admin=Object.assign({speed:1,god:false,freeze:false,noRespawn:false}, loaded?loaded.admin:undefined);
  // fill fields added in later versions
  S.stats=Object.assign(defaultStats(), S.stats||{});
  S.achievements=S.achievements||{};
  S.rewards=S.rewards||{}; S.codes=S.codes||{}; S.inventory=S.inventory||[];
  S.shopSub=S.shopSub||'light'; S.bankT=S.bankT??60;
  // drop anything the current data no longer knows about
  S.buildings=(S.buildings||[]).filter(b=>BUILD[b.type]);
  S.inventory=S.inventory.filter(it=>it.kind==='c'||BUILD[it.type]);
  // player buildings outside the (bigger) plot are returned to the backpack
  S.buildings=S.buildings.filter(b=>{
    if((b.owner??'p')!=='p') return true;
    const d=BUILD[b.type];
    if(b.gx+d.w<=PLOT.w && b.gy+d.h<=PLOT.h) return true;
    S.inventory.push({kind:'b',type:b.type}); return false;
  });
  // points keep only dynamic fields — coords come from POINTS_DEFS
  S.points=POINTS_DEFS.map((d,i)=>{ const p=(S.points||[])[i]||{}; return {...d, owner:p.owner??'neutral', faction:p.faction??-1, cool:p.cool??0, respawnT:p.respawnT??8}; });
  S._power=totalPower();
  // (re)place bot bases from their presets (idempotent)
  for(let i=0;i<S.bots.length;i++) setBotPreset(i,S.bots[i].preset,true);
  // restore saved player units (before garrisons, so restored troops keep their home point)
  if(loaded){
    S.units=S.units.filter(u=>u.side==='e'&&!u.boss&&UNITS[u.type]);
    for(const su of loaded.units||[]){
      if(!UNITS[su.type]) continue;
      const u=mkUnit(su.type,'p',su.x,su.y,{home:su.home??null});
      u.hp=Math.min(u.hp,su.hp||u.hp);
      u.order=su.order||null;
      S.units.push(u);
    }
    // map moved: anyone standing in water gets relocated
    const pc=plotCentre();
    for(const u of [...S.units]){
      if(isAir(u)||walkableAt(u.x,u.y)) continue;
      if(u.side==='p'){ u.x=pc.x; u.y=pc.y; u.order=null; u.home=null; }
      else if(u.bot!=null){ const c=plotCenter(MAP_PLOTS[u.bot+1]); u.x=c.x; u.y=c.y; u.order=null; u.cityGoal=false; }
      else S.units=S.units.filter(v=>v!==u);
    }
  }
  // restore missing garrisons for owned points
  for(const p of S.points){
    if(p.owner==='neutral') continue;
    const need=p.garrison+p.tank-garrisonCount(p.id);
    if(need>0) spawnGarrison(p.id,need);
  }
  window.addEventListener('beforeunload',save);
  if(!S.stats.tut) showTut();
  requestAnimationFrame(frame);
}
init();
