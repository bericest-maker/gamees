/* Military Base 2.5D — 14-ui.js · UI panels: shop, backpack, rewards, robux, settings, rebirth, buttons */
'use strict';
// ================= UI =================
function toast(msg,col='#f5b53f'){
  const t=document.createElement('div');
  t.className='toast'; t.style.borderLeftColor=col; t.textContent=msg;
  $('#toasts').appendChild(t);
  setTimeout(()=>{ t.classList.add('out'); setTimeout(()=>t.remove(),450); },3800);
}
const PANEL_IDS=['shop','backpack','rewards','achieve','leader','robux','settings','rebirth','crate'];
function openPanel(name){
  if(name!=='crate') for(const id of PANEL_IDS) $('#p-'+id).classList.toggle('show',id===name);
  else $('#p-crate').classList.add('show');
  if(name==='shop') renderShop();
  if(name==='backpack') renderBackpack();
  if(name==='rewards') renderRewards();
  if(name==='robux') renderRobux();
  if(name==='settings') renderSettings();
  if(name==='rebirth') renderRebirth();
  if(name==='achieve') renderAchievements();
  if(name==='leader') renderLeaderboard();
  hideTip();
}
function closePanel(name){ $('#p-'+name).classList.remove('show'); if(name!=='crate') for(const id of PANEL_IDS) if(id!==name) $('#p-'+id).classList.remove('show'); }

// shop
const rarCol = r => (RAR[r]||RAR.common).c;
const rarBadge = r => `<span class="c-rar" style="background:${rarCol(r)}33;color:${rarCol(r)}">${(RAR[r]||RAR.common).label}</span>`;
function renderShop(){
  document.querySelectorAll('#shopTabs button').forEach(b=>b.classList.toggle('on',b.dataset.tab===S.shopTab));
  // UNITS tab: sub-tabs per class (LIGHT / ARMORED / AIR / STEALTH)
  const subs=$('#shopSubs');
  subs.hidden = S.shopTab!=='units';
  if(!subs.hidden){
    subs.innerHTML='';
    for(const c of SHOP_SUBS){
      const bt=document.createElement('button');
      bt.textContent=`${CLASS_INFO[c].ico} ${CLASS_INFO[c].label}`;
      bt.classList.toggle('on',S.shopSub===c);
      bt.onclick=()=>{ sfx('click'); S.shopSub=c; renderShop(); };
      subs.appendChild(bt);
    }
  }
  const grid=$('#shopGrid'); grid.innerHTML='';
  const ids=Object.keys(BUILD).filter(k=>BUILD[k].tab===S.shopTab && BUILD[k].cost!==null && (S.shopTab!=='units'||BUILD[k].sub===S.shopSub));
  for(const id of ids){
    const d=BUILD[id];
    const card=document.createElement('div');
    card.className=`card r-${d.rar}`;
    card.style.borderColor=rarCol(d.rar)+'aa';
    const block=buyBlock(id);
    const locked=!!block;
    if(locked) card.classList.add('locked');
    const cvc=document.createElement('canvas'); cvc.width=130; cvc.height=64;
    drawItemIcon(cvc.getContext('2d'),id);
    card.appendChild(cvc);
    const nm=document.createElement('div'); nm.className='c-name';
    nm.innerHTML=rarBadge(d.rar);
    card.appendChild(nm);
    const nm2=document.createElement('div'); nm2.className='c-name'; nm2.textContent=d.name;
    card.appendChild(nm2);
    if(d.unit){ const u=UNITS[d.unit], cl=document.createElement('div'); cl.className='c-cls';
      cl.textContent=`${u.name} · ${u.cls.map(c=>CLASS_INFO[c].label).join('/')}`; card.appendChild(cl); }
    const cost=document.createElement('div'); cost.className='c-cost';
    cost.textContent=locked?(d.req&&S._power<d.req?`PWR ${fmt(d.req)}`:'LOCKED'):`${fmt(d.cost)}$`;
    card.appendChild(cost);
    const info=document.createElement('div'); info.className='c-info'; info.textContent=d.info;
    card.appendChild(info);
    card.onmouseenter=e=>showTip(e,id); card.onmousemove=moveTip; card.onmouseleave=hideTip;
    card.onclick=()=>{
      const blk=buyBlock(id);
      if(blk){ toast(blk,'#ef5350'); sfx('error'); return; }
      if(S.cash<d.cost){ toast('Not enough cash!','#ef5350'); sfx('error'); return; }
      S.cash-=d.cost;
      giveItem('b',id);
      toast(`Bought ${d.name} — check your BACKPACK`,'#5bc24e');
      sfx('buy');
      renderShop();
    };
    grid.appendChild(card);
  }
}
// ---- hover stat tooltip ----
const modTxt = m => { const e=Object.entries(m||{}); if(!e.length) return '<i class="dim">no modifiers</i>';
  return e.map(([c,v])=>`${CLASS_INFO[c].label} <b class="${v===0?'no':v>=1?'up':'dn'}">${v===0?'✖':'×'+v}</b>`).join(' · '); };
function tipHTML(id){
  const d=BUILD[id]; let h=`<div class="t-h" style="color:${rarCol(d.rar)}">${d.name}</div><div class="dim">${d.info}</div><div class="t-g">`;
  const row=(k,v)=>{ h+=`<span>${k}</span><span>${v}</span>`; };
  if(d.cost) row('Cost','$'+fmt(d.cost));
  row('Size',`${d.w}×${d.h}`); row('Power',fmt(d.power)); row('HP',fmt(d.hp));
  if(d.income) row('Income',`$${fmt(d.income)}/s`);
  if(d.req) row('Needs',`${fmt(d.req)} PWR`);
  if(d.reqRebirth) row('Needs',`${d.reqRebirth} rebirth`);
  if(d.turret){ const T=d.turret; row('Turret',`${T.dmg} dmg / ${T.rate}s · ${T.range}px${T.splash?' · splash':''}`); }
  if(d.detect) row('Detect',d.detect+'px');
  if(d.heal) row('Heal',`${d.heal} hp/s · ${d.healR}px`);
  if(d.unit){
    const u=UNITS[d.unit];
    row('Trains',`${u.name} / ${d.spawnEvery}s`);
    row('Class',u.cls.map(c=>CLASS_INFO[c].ico+' '+CLASS_INFO[c].label).join(' '));
    row('HP',u.hp); if(u.dmg) row('Damage',`${u.dmg} / ${u.rate}s (${(u.dmg/u.rate).toFixed(1)} dps)`);
    if(u.heal) row('Heals',`${u.heal} hp/s`);
    row('Range',u.range); row('Speed',u.speed); row('Troop slots',u.size);
    if(u.armor) row('Armor',u.armor); if(u.detect) row('Detect',u.detect+'px');
    if(u.splash) row('Splash',u.splash+'px'); if(u.bld) row('vs buildings','×'+u.bld);
    h+=`</div><div class="t-m">${modTxt(u.mods)}</div>`;
    if(u.fly) h+=`<div class="t-m dim">Flies, but counts as LIGHT (anti-air can't hit it)</div>`;
    return h;
  }
  if(d.turret) return h+`</div><div class="t-m">${modTxt(d.turret.mods)}</div>`;
  return h+'</div>';
}
function showTip(e,id){ const t=$('#tip'); t.innerHTML=tipHTML(id); t.hidden=false; moveTip(e); }
function moveTip(e){ const t=$('#tip'); if(t.hidden) return;
  const w=t.offsetWidth||220, hh=t.offsetHeight||180;
  let x=e.clientX+16, y=e.clientY+12;
  if(x+w>innerWidth-8) x=e.clientX-w-16;
  if(y+hh>innerHeight-8) y=innerHeight-hh-8;
  t.style.left=x+'px'; t.style.top=y+'px'; }
function hideTip(){ const t=document.getElementById('tip'); if(t) t.hidden=true; }
// ---- achievements ----
function renderAchievements(){
  const list=$('#achList'); list.innerHTML='';
  let done=0;
  for(const a of ACHIEVEMENTS){
    let c=0,g=1; try{ [c,g]=a.prog(); }catch(e){}
    const got=S.achievements&&S.achievements[a.id]!=null; if(got) done++;
    const el=document.createElement('div'); el.className='rw-item'+(got?' done':'');
    const rw=a.give.cash?'$'+fmt(a.give.cash):a.give.crate.toUpperCase()+' CRATE';
    el.innerHTML=`<div class="rw-ico">${a.ico}</div><div class="rw-mid"><div class="rw-name">${a.name}</div>
      <div class="rw-sub">${a.desc} — ${fmt(Math.min(c,g))}/${fmt(g)}</div><div class="rw-reward">REWARD: ${rw}</div>
      <div class="ach-prog"><i style="width:${got?100:clamp01(c/g)*100}%"></i></div></div>
      <button class="rw-claim" disabled>${got?'✔ DONE':'LOCKED'}</button>`;
    list.appendChild(el);
  }
  $('#achSummary').textContent=`${done} / ${ACHIEVEMENTS.length} unlocked — rewards are paid automatically.`;
}
// ---- leaderboard ----
function renderLeaderboard(){
  const rows=[{f:0,name:'YOU',power:S._power||totalPower()}];
  for(let i=0;i<S.bots.length;i++) rows.push({f:i+1,name:`${facN(i+1)} · ${BOT_DEFS[i].name}`,power:S.bots[i].down?0:botPower(i),down:S.bots[i].down});
  for(const r of rows) r.pts=S.points.filter(p=>pointFaction(p)===r.f).map(p=>p.city?'🏙️':'🚩').join('');
  rows.sort((a,b)=>b.power-a.power);
  const list=$('#lbList'); list.innerHTML='';
  rows.forEach((r,i)=>{
    const el=document.createElement('div'); el.className='lb-row'+(r.f===0?' me':'');
    el.innerHTML=`<span class="lb-rank">${['🥇','🥈','🥉'][i]||'#'+(i+1)}</span><span class="lb-dot" style="background:${facC(r.f)}"></span>
      <span>${r.name}${r.down?' <span class="dim">(rebuilding)</span>':''}</span><span class="lb-pts">${r.pts||'—'}</span><span class="lb-pwr">⭐ ${fmt(r.power)}</span>`;
    list.appendChild(el);
  });
}
function drawItemIcon(g,type){
  g.clearRect(0,0,130,64);
  const sp=SPR[type];
  const sc=Math.min(52/sp.h,110/sp.w);
  g.save(); g.translate(65,58); g.scale(sc,sc);
  sp.draw(g,0.6,{side:'p'});
  g.restore();
}
function renderBackpack(){
  const grid=$('#bpGrid'); grid.innerHTML='';
  if(S.inventory.length===0){
    grid.innerHTML='<div style="color:var(--dim);font-size:12px;grid-column:1/-1;padding:20px;text-align:center">Empty. Hit the SHOP →</div>';
    return;
  }
  S.inventory.forEach((it,idx)=>{
    const card=document.createElement('div');
    const d=BUILD[it.type]||{name:'?'};
    card.className=`card r-${it.kind==='c'?'legend':(d.rar||'common')}`;
    card.style.borderColor=rarCol(it.kind==='c'?'legend':(d.rar||'common'))+'aa';
    if(it.kind==='c') card.style.borderColor='#f5b53f';
    const cvc=document.createElement('canvas'); cvc.width=130; cvc.height=64;
    if(it.kind==='c') drawCrateIconMini(cvc.getContext('2d'),it.type);
    else drawItemIcon(cvc.getContext('2d'),it.type);
    card.appendChild(cvc);
    const nm=document.createElement('div'); nm.className='c-name'; nm.textContent= it.kind==='c' ? it.type.toUpperCase()+' CRATE' : d.name;
    card.appendChild(nm);
    const sub=document.createElement('div'); sub.className='c-info';
    sub.textContent= it.kind==='c' ? 'Click to open' : 'Click to place on your plot';
    card.appendChild(sub);
    card.onclick=()=>{
      if(it.kind==='c'){ openCrateModal(it.type); S.inventory.splice(idx,1); }
      else {
        S.inventory.splice(idx,1);
        S.placing=it.type;
        closePanel('backpack');
        toast(`Placing ${d.name} — click a free plot slot. RMB to cancel.`,'#4a90e2');
      }
      renderBackpack();
    };
    grid.appendChild(card);
  });
}
function drawCrateIconMini(g,type){
  g.clearRect(0,0,130,64);
  g.save(); g.translate(65,56); g.scale(1.1,1.1);
  g.fillStyle='#8a6f4d'; g.fillRect(-20,-26,40,28);
  g.fillStyle='#a3865c'; g.fillRect(-20,-26,40,5);
  g.strokeStyle='#6b5436'; g.lineWidth=2; g.strokeRect(-20,-26,40,28);
  const col={standard:'#8f9aa8',elite:'#4a90e2',premium:'#f5a53f',golden:'#ffd54f'}[type]||'#fff';
  g.fillStyle=col; g.fillRect(-20,-15,40,4);
  g.restore();
}
function renderRewards(){
  const list=$('#rwList'); list.innerHTML='';
  for(const r of REWARDS){
    const el=document.createElement('div'); el.className='rw-item';
    const done=S.rewards[r.id];
    const can=r.check()&&!done;
    el.innerHTML=`
      <div class="rw-ico">${r.ico}</div>
      <div class="rw-mid">
        <div class="rw-name">${r.name}</div>
        <div class="rw-sub">${r.sub}</div>
        <div class="rw-reward">REWARD: ${r.reward}</div>
      </div>
      <button class="rw-claim" ${can?'':'disabled'}>${done?'DONE':'CLAIM'}</button>`;
    el.querySelector('.rw-claim').onclick=()=>{
      if(!can) return;
      S.rewards[r.id]=true;
      if(r.give.cash) S.cash+=r.give.cash;
      if(r.give.crate) giveItem('c',r.give.crate);
      toast(`Reward claimed: ${r.reward}`,'#5bc24e');
      sfx('coin');
      renderRewards();
    };
    list.appendChild(el);
  }
}
function renderRobux(){
  const grid=$('#rxGrid'); grid.innerHTML='';
  const offers=[
    {crate:'premium', label:'PREMIUM CRATE', price:PREMIUM_PRICE, desc:'Legendary / Mythic buildings. Weekly featured + pity (80).'},
    {crate:'premium', label:'PREMIUM 10-PACK', price:2200000, desc:'10 premium crates. Best value. (999 R$ in the real game lol)'},
    {crate:'golden', label:'GOLDEN CRATE', price:100000000, desc:'Golden buildings. Only the elite can afford this.'},
  ];
  offers.forEach((o,i)=>{
    const card=document.createElement('div');
    card.className='card r-legend';
    const cvc=document.createElement('canvas'); cvc.width=130; cvc.height=64;
    drawCrateIconMini(cvc.getContext('2d'),o.crate);
    card.appendChild(cvc);
    const nm=document.createElement('div'); nm.className='c-name'; nm.textContent=o.label;
    card.appendChild(nm);
    const cost=document.createElement('div'); cost.className='c-cost'; cost.textContent=fmt(o.price)+'$';
    card.appendChild(cost);
    const info=document.createElement('div'); info.className='c-info'; info.textContent=o.desc;
    card.appendChild(info);
    card.onclick=()=>{
      if(S.cash<o.price){ toast('Not enough cash!','#ef5350'); sfx('error'); return; }
      S.cash-=o.price;
      const n = o.label.includes('10')?10:1;
      for(let k=0;k<n;k++) giveItem('c',o.crate);
      toast(`Purchased! Check your BACKPACK.`,'#5bc24e');
      sfx('buy');
    };
    grid.appendChild(card);
  });
}
function renderSettings(){
  const set=S.settings;
  const map=[['#setMusic',set.music],['#setSfx',set.sfx],['#setDmg',set.dmg]];
  for(const [id,v] of map){
    const b=$(id); b.classList.toggle('on',v); b.textContent=v?'On':'Off';
  }
  const gfx=$('#setGfx'); gfx.classList.toggle('on',set.gfx==='High'); gfx.textContent=set.gfx;
}
function renderRebirth(){
  const T=5000*Math.pow(2.2,S.rebirth);
  const cur=S._power;
  $('#rbInfo').innerHTML=`
    Current rebirths: <b>${S.rebirth}</b> (+${S.rebirth*10}% income)<br>
    Next rebirth: <b>+${(S.rebirth+1)*10}% income</b> forever<br>
    Requires power: <b>${fmt(T)}</b> (you have ${fmt(cur)})<br>
    <span class="dim" style="font-size:11px">Resets your base, units, points &amp; cash. Golden buildings and Monuments survive. 1st rebirth unlocks the Monument.</span>
    <div class="rb-prog"><i style="width:${clamp01(cur/T)*100}%"></i></div>`;
  const btn=$('#btnRebirthYes');
  btn.style.filter = cur>=T?'none':'grayscale(.7) opacity(.7)';
}
function doRebirth(force){
  const T=5000*Math.pow(2.2,S.rebirth);
  if(!force && S._power<T){ toast(`Need ${fmt(T)} power to rebirth`,'#ef5350'); sfx('error'); return; }
  const golden=S.buildings.filter(b=>isMine(b)&&(BUILD[b.type].rar==='gold'||BUILD[b.type].keep)); // golden + Monument survive
  S.cash=500; S.rebirth++;
  S.buildings=golden;
  for(let i=0;i<S.bots.length;i++) setBotPreset(i,S.bots[i].preset,true);
  S.units=[];
  for(const p of S.points){ p.owner='neutral'; p.faction=-1; p.cool=0; p.respawnT=8; }
  S.wave=0; S.nextWave=90; S.nextBoss=180; S.attackCity=false; selUnits=[];
  toast(`🔥 REBIRTHED! Income +${S.rebirth*10}% — the war for the CITY restarts`,'#ffd54f');
  sfx('rebirth');
  save();
  closePanel('rebirth');
  { const pc=plotCentre(); cam.tx=pc.x; cam.ty=pc.y; }
}
$('#btnRebirthYes').onclick=()=>doRebirth(false);

// settings bindings
function bindToggle(id,key,label){
  $(id).onclick=()=>{
    if(key==='gfx'){ S.settings.gfx = S.settings.gfx==='High'?'Low':'High'; }
    else S.settings[key]=!S.settings[key];
    sfx('click'); renderSettings();
  };
}
bindToggle('#setMusic','music'); bindToggle('#setSfx','sfx'); bindToggle('#setDmg','dmg'); bindToggle('#setGfx','gfx');
$('#codeBox').addEventListener('keydown',e=>{
  if(e.key!=='Enter') return;
  const code=e.target.value.trim().toUpperCase();
  if(!code) return;
  const c=CODES[code];
  if(!c){ toast(`Code "${code}" not found or expired`,'#ef5350'); sfx('error'); return; }
  if(S.codes[code]){ toast('Code already redeemed!','#ef5350'); sfx('error'); return; }
  S.codes[code]=true;
  if(c.cash) S.cash+=c.cash;
  if(c.kind==='b') giveItem('b',c.type);
  if(c.kind==='c') giveItem('c',c.type);
  toast(`✅ CODE ${code}: ${c.msg}`,'#5bc24e');
  sfx('coin');
  e.target.value='';
});
$('#btnWipe').onclick=()=>{
  if(confirm('HARD RESET — delete ALL progress?')){
    localStorage.removeItem('bmb25');
    location.reload();
  }
};

// buttons
$('#btnShop').onclick=()=>{ sfx('click'); openPanel('shop'); };
$('#btnHome').onclick=()=>{
  sfx('click');
  cancelPlacement();
  for(const id of PANEL_IDS) $('#p-'+id).classList.remove('show');
  { const pc=plotCentre(); cam.tx=pc.x; cam.ty=pc.y; }
};
document.querySelectorAll('.rail-btn').forEach(b=>{
  b.onclick=()=>{ sfx('click'); openPanel(b.dataset.panel); };
});
document.querySelectorAll('[data-close]').forEach(b=>{
  b.onclick=()=>{ sfx('click'); const p=b.closest('.panel'); if(p) closePanel(p.id.slice(2)); };
});
document.querySelectorAll('#shopTabs button').forEach(b=>{
  b.onclick=()=>{ sfx('click'); S.shopTab=b.dataset.tab; renderShop(); };
});
$('#btnAttack').onclick=()=>{
  sfx('click');
  const punits=playerUnits().filter(u=>u.home==null);   // garrisons keep guarding their point
  if(punits.length===0){ toast('No units to attack with! Build a Barracks first.','#ef5350'); return; }
  S.attackCity=true;
  for(const u of punits) u.order=null;
  toast('⚔️ ATTACK! All units heading to the CITY!','#d6493f');
};
