/* Military Base 2.5D — 11-economy.js · economy: power, income, cap, placement, bots, crates */
'use strict';
// ================= game systems =================
const isMine = b => (b.owner??"p")==="p";
function totalPower(){
  let p=0;
  for(const b of S.buildings){ if(!isMine(b)) continue; p+=BUILD[b.type].power; }
  for(const u of S.units) if(u.side==='p') p+= (u.boss?BOSS.power:UNITS[u.type].power);
  return p;
}
// power of a bot faction (leaderboard)
function botPower(i){
  let p=0;
  for(const b of S.buildings) if(b.owner===i) p+=BUILD[b.type].power;
  for(const u of S.units) if(u.bot===i&&!u.boss) p+=UNITS[u.type].power;
  return p;
}
S && (S._power=0);
function countMine(pred){ let n=0; for(const b of S.buildings) if(isMine(b)&&pred(BUILD[b.type],b)) n++; return n; }
// income bonus % pieces (shown in the HUD): rebirth, outposts, city, logistics
function incomeBonus(){
  let outposts=0, city=false;
  for(const p of S.points) if(p.owner==='player'){ if(p.city) city=true; else outposts++; }
  const logi=Math.min(5,countMine(d=>d.special==='logistics'));
  return {rebirth:S.rebirth*10, outposts:outposts*10, city:city?20:0, logistics:logi*10};
}
function incomeRate(){
  let base=0;
  for(const b of S.buildings){
    if(!isMine(b)) continue;
    const d=BUILD[b.type];
    const dmg = b.hp < b.maxHp*.5 ? .5 : 1;
    base += (d.income||0)*dmg;
  }
  const B=incomeBonus();
  return base*(1+B.rebirth/100)*(1+(B.city+B.outposts)/100)*(1+B.logistics/100);
}
function unitCap(){
  return Math.min(100, 10+countMine(d=>d.special==='depot')*10);
}
function playerUnits(){ return S.units.filter(u=>u.side==='p'); }
// troop cap is counted in unit SIZE (a Mammoth uses 5 slots, a Rifleman 1)
function capUsed(){ let n=0; for(const u of S.units) if(u.side==='p'&&!u.boss&&u.home==null) n+=unitSize(u); return n; }
// bank: every 60s each Bank pays 5% of your cash, max $50k per bank
function bankTick(dt){
  const banks=Math.min(3,countMine(d=>d.special==='bank'));
  if(!banks){ S.bankT=60; return; }
  S.bankT-=dt;
  if(S.bankT>0) return;
  S.bankT=60;
  const pay=Math.round(Math.min(S.cash*.05,50000)*banks);
  if(pay>0){ S.cash+=pay; toast(`🏦 Bank interest +$${fmt(pay)}`,'#ffd54f'); sfx('coin'); }
}

// placement (only YOUR buildings block your grid — bot bases live on other islands)
function canPlaceAt(type,gx,gy){
  const d=BUILD[type];
  if(gx<0||gy<0||gx+d.w>PLOT.w||gy+d.h>PLOT.h) return false;
  for(const b of S.buildings){
    if(!isMine(b)) continue;
    const bd=BUILD[b.type];
    if(gx < b.gx+bd.w && gx+d.w > b.gx && gy < b.gy+bd.h && gy+d.h > b.gy) return false;
  }
  return true;
}
// shop/placement rules beyond space: power requirement, rebirth requirement, max placed
function buyBlock(type){
  const d=BUILD[type];
  if(d.req && (S._power||0)<d.req) return `Requires ${fmt(d.req)} military power`;
  if(d.reqRebirth && S.rebirth<d.reqRebirth) return `Requires ${d.reqRebirth} rebirth`;
  if(d.max && d.special==='bank' && countMine(x=>x===d)>=d.max) return `Max ${d.max} ${d.name}s`;
  return null;
}
function ghostSlot(){
  const d=BUILD[S.placing];
  let gx=Math.floor((mouse.wx-PLOT.x)/SLOT)-(d.w-1)/2;
  let gy=Math.floor((mouse.wy-PLOT.y)/SLOT)-(d.h-1)/2;
  gx=Math.round(gx); gy=Math.round(gy);
  return {gx:clamp(gx,0,PLOT.w-d.w), gy:clamp(gy,0,PLOT.h-d.h), ok:canPlaceAt(S.placing,gx,gy)};
}
function placeBuilding(type,gx,gy,owner='p'){
  placeBuildingRaw(type,gx,gy,owner);
  const c=bPos(S.buildings[S.buildings.length-1]);
  addParts(c.x,c.y,8,'#b0a58c');
  sfx('place');
}
function placeBuildingRaw(type,gx,gy,owner){
  const d=BUILD[type];
  S.buildings.push({id:nid(),type,gx,gy,owner,hp:d.hp,maxHp:d.hp,t:d.spawnEvery||0,flash:0,cool:0});
  if(owner==='p'&&S.stats) S.stats.placed=(S.stats.placed||0)+1;
}
function botBuildings(i){ return S.buildings.filter(b=>b.owner===i); }
function botUnits(i){ return S.units.filter(u=>u.side==='e'&&u.bot===i); }
function botTier(i){ return (PRESET_MAP[S.bots[i].preset]||PRESETS[0]).tier; }
function botCap(i){ return 8+botTier(i)*2; }
function setBotPreset(i,presetId,silent){
  const bot=S.bots[i];
  S.buildings=S.buildings.filter(b=>b.owner!==i);
  S.units=S.units.filter(u=>u.bot!==i);
  bot.preset=presetId; bot.down=false; bot.downT=0;
  bot.raidT=110-botTier(i)*6+rnd(0,50);
  for(const [t,gx,gy] of (PRESET_MAP[presetId]||PRESETS[0]).b) placeBuildingRaw(t,gx,gy,i);
  if(!silent) toast(`${BOT_DEFS[i].name} → ${(PRESET_MAP[presetId]||PRESETS[0]).label}`,'#4a90e2');
}
function removeBuildingRefund(b){
  const d=BUILD[b.type];
  S.buildings=S.buildings.filter(x=>x.id!==b.id);
  if(d.cost){ S.cash+=d.cost*.5; toast(`Sold ${d.name} for ${fmt(d.cost*.5)}$`,'#8f9aa8'); }
  sfx('click');
}

// inventory / crates
function weightedPick(entries){
  let tot=0; for(const e of entries) tot+=e[1];
  let r=Math.random()*tot;
  for(const e of entries){ r-=e[1]; if(r<=0) return e[0]; }
  return entries[0][0];
}
function featuredPremium(){ return WEEKLY[Math.floor(Date.now()/86400000)%WEEKLY.length]; }  // fixed: was WEEK.length (ReferenceError)
function rollCrate(ct){
  if(ct==='premium'){
    S.premiumPity=(S.premiumPity||0)+1;
    if(S.premiumPity>=80){ S.premiumPity=0; return featuredPremium(); }
    if(Math.random()<.15) return featuredPremium();
    return weightedPick(CRATE_TABLES.premium);
  }
  return weightedPick(CRATE_TABLES[ct]);
}
function giveItem(kind,type){
  if(kind==='b') S.inventory.push({kind:'b',type});
  else S.inventory.push({kind:'c',type});
}
function openCrateModal(ct){
  const item=rollCrate(ct);
  S.stats.cratesOpened++;
  let prev=$('#p-crate').classList.contains('show') ? S._prevPanel : (document.querySelector('.panel.show')?.id||'p-backpack').slice(2);
  S._prevPanel = prev.startsWith('p-')?prev.slice(2):prev;
  openPanel('crate');
  const icon=$('#crateIcon'), g=icon.getContext('2d');
  drawCrateIcon(g,ct);
  $('#crateName').textContent='? ? ?';
  $('#crateRar').textContent='';
  $('#crateStage').classList.add('opening');
  sfx('open');
  let i=0;
  const iv=setInterval(()=>{
    i++;
    const fake=pick([...CRATE_TABLES[ct==='premium'?'premium':ct],...CRATE_TABLES.premium]);
    $('#crateName').textContent=BUILD[fake].name;
    if(i>14){
      clearInterval(iv);
      const d=BUILD[item];
      $('#crateName').textContent=d.name;
      $('#crateRar').textContent=d.rar.toUpperCase();
      $('#crateRar').style.color=RAR[d.rar].c;
      $('#crateStage').classList.remove('opening');
      // draw item icon
      g.clearRect(0,0,150,110);
      g.save(); g.translate(75,96);
      const sp=SPR[item];
      const sc=Math.min(84/sp.h,110/sp.w)*.9;
      g.scale(sc,sc); sp.draw(g,performance.now()/1000,{side:'p'});
      g.restore();
      sfx('coin');
    }
  },70);
  giveItem('b',item);
}
$('#btnCrateDone').onclick=()=>{
  closePanel('crate');
  if(S._prevPanel && S._prevPanel!=='crate') openPanel(S._prevPanel);
  sfx('click');
};

// achievements: unlock once, pay out, toast
function checkAchievements(){
  if(!S.achievements) S.achievements={};
  for(const a of ACHIEVEMENTS){
    if(S.achievements[a.id]) continue;
    let ok=false; try{ const [c,g]=a.prog(); ok=c>=g; }catch(e){}
    if(!ok) continue;
    S.achievements[a.id]=Math.floor(S.time);
    if(a.give.cash) S.cash+=a.give.cash;
    if(a.give.crate) S.inventory.push({kind:'c',type:a.give.crate});
    toast(`🏆 ACHIEVEMENT: ${a.name} — ${a.give.cash?'$'+fmt(a.give.cash):a.give.crate[0].toUpperCase()+a.give.crate.slice(1)+' Crate'}`,'#ffd54f');
    sfx('capture');
  }
}
