/* Military Base 2.5D — 18-admin.js · admin panel (window.Admin) */
'use strict';
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
    const {x:cx,y:cy}=plotCentre();
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
    // derived from the map (fixed: used hard-coded coords of the old map)
    const t={base:plotCentre(), city:MAP_C};
    const dirKey={NORTH:'north',NORTHEAST:'ne',EAST:'east',SOUTHEAST:'se',SOUTHWEST:'sw',WEST:'west',NORTHWEST:'nw'};
    BOT_DEFS.forEach((b,i)=>{ t[dirKey[b.dir]]=botCenter(i); });
    t.south=t.base;
    POINTS_DEFS.forEach(p=>{ if(!p.city) t['pt'+p.id]=p; });
    if(where==='boss'){
      const b=S.units.find(u=>u.boss);
      if(!b){ toast('No boss to follow','#ef5350'); return; }
      cam.tx=b.x; cam.ty=b.y;
    } else if(t[where]){ cam.tx=t[where].x; cam.ty=t[where].y; }
    sfx('click');
  },
  exportSave(){ $('#aSave').value=JSON.stringify(S,null,1); toast('Save exported to the box below','#4a90e2'); sfx('click'); },
  importSave(){
    const raw=($('#aSave').value||'').trim();
    if(!raw){ toast('Paste save JSON into the box first','#ef5350'); return; }
    try{
      const o=JSON.parse(raw);
      if(![1,2,3,SAVE_V].includes(o.v)) throw 0;   // fixed: rejected v3 saves (its own exports!)
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
    const cf=pointFaction(S.points[CITY_IDX]);
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
