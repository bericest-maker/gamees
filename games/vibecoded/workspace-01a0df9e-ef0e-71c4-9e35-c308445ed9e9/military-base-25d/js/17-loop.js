/* Military Base 2.5D — 17-loop.js · main loop: frame + update + HUD, wheel zoom, test hook */
'use strict';
// ================= main loop =================
let last=performance.now(), hudT=0, powT=0, saveT=0, fpsFrames=0, fpsLast=performance.now();
function frame(now){
  requestAnimationFrame(frame);
  let dt=(now-last)/1000; last=now;
  if(dt>0.05) dt=0.05;
  fpsFrames++;
  if(now-fpsLast>=1000){ if(S) S._fps=fpsFrames; fpsFrames=0; fpsLast=now; }
  update(dt,now/1000);
  render();
}
function update(dt,t){
  const gdt=dt*(S.admin?(S.admin.speed==null?1:S.admin.speed):1); // admin time scale (0 = paused)
  // camera (real time — you can look around even while paused)
  const sp=520*dt;
  if(keys['w']||keys['arrowup']) cam.ty-=sp;
  if(keys['s']||keys['arrowdown']) cam.ty+=sp;
  if(keys['a']||keys['arrowleft']) cam.tx-=sp;
  if(keys['d']||keys['arrowright']) cam.tx+=sp;
  cam.tx=clamp(cam.tx,ISLAND.x+60,ISLAND.x+ISLAND.w-60); cam.ty=clamp(cam.ty,ISLAND.y+60,ISLAND.y+ISLAND.h-60);
  cam.x=lerp(cam.x,cam.tx,1-Math.pow(.001,dt));
  cam.y=lerp(cam.y,cam.ty,1-Math.pow(.001,dt));
  const cap=unitCap();
  if(gdt>0){
  S.time+=gdt;
  // income
  S.cash+=incomeRate()*gdt;
  // unit production (player + bots)
  for(const b of S.buildings){
    const d=BUILD[b.type];
    if(!d.unit) continue;
    b.t-=gdt;
    if(b.t<=0){
      const owner=b.owner??"p";
      const c=bPos(b);
      if(owner==="p"&&capUsed()+(UNITS[d.unit].size||1)<=cap){
        S.units.push(mkUnit(d.unit,'p',c.x+rnd(-20,20),c.y+rnd(-10,10)));
        b.t=d.spawnEvery; sfx('spawn');
      } else if(typeof owner==="number"&&!S.bots[owner].down&&botUnits(owner).length<botCap(owner)){
        S.units.push(mkUnit(d.unit,'e',c.x+rnd(-20,20),c.y+rnd(-10,10),{bot:owner,faction:owner+1}));
        b.t=d.spawnEvery;
      } else b.t=.5;
    }
  }
  // bot offense dispatch: default = march on the CITY (the middle)
  for(let i=0;i<S.bots.length;i++){
    const bot=S.bots[i];
    if(bot.down||botTier(i)<2) continue;
    bot.raidT-=gdt;
    if(bot.raidT<=0){
      const idle=botUnits(i).filter(u=>!u.order);
      if(idle.length>=4){
        const n=Math.min(2+Math.floor(botTier(i)/2),Math.floor(idle.length/2));
        for(let k=0;k<n;k++){ idle[k].order={point:CITY_IDX}; idle[k].cityGoal=true; }
        if(n>0) toast(`⚔️ ${facN(i+1)} is marching on the CITY!`,facC(i+1));
      }
      bot.raidT=Math.max(30,90-botTier(i)*8)+rnd(0,25);
    }
  }
  // stealth detection (shared sensors + radar), turrets, hospitals, banks
  refreshDetectors(gdt);
  updateTurrets(gdt);
  hospitalTick(gdt);
  bankTick(gdt);
  // destroyed bot bases rebuild
  for(let i=0;i<S.bots.length;i++){
    const bot=S.bots[i];
    if(!bot.down&&bot.preset!=="empty"&&botBuildings(i).length===0){
      bot.down=true; bot.downT=25;
      S.units=S.units.filter(u=>u.bot!==i);
      toast(`💥 ${BOT_DEFS[i].name}'s base is DESTROYED — rebuilding in 25s`,'#ef5350');
      sfx('boom');
    }
    if(bot.down){
      bot.downT-=gdt;
      if(bot.downT<=0){
        setBotPreset(i,bot.preset,true);
        toast(`🔧 ${BOT_DEFS[i].name} rebuilt its base!`,'#4a90e2');
      }
    }
  }
  // units
  for(const u of [...S.units]) updateUnit(u,gdt);
  // point respawns: maintain the OWNER's garrison
  for(const p of S.points){
    p.cool=Math.max(0,(p.cool||0)-gdt);
    if(p.owner==='neutral') continue;
    if(S.admin&&S.admin.noRespawn) continue;
    p.respawnT-=gdt;
    if(p.respawnT<=0){
      if(garrisonCount(p.id)<p.garrison+p.tank) spawnGarrison(p.id,1);
      p.respawnT=p.city?15:22;
    }
  }
  // waves & boss
  if(!(S.admin&&S.admin.freeze)){
    if(!S.units.some(u=>u.boss)){
      S.nextBoss-=gdt;
      if(S.nextBoss<=0){ spawnBoss(); S.nextBoss=300; }
    } else {
      S.nextBoss=Math.max(S.nextBoss,15);
    }
    S.nextWave-=gdt;
    if(S.nextWave<=0){ spawnWave(); S.nextWave=120; }
  }
  checkCaptures(gdt);
  // fx
  fx.tracers=fx.tracers.filter(f=>(f.life-=gdt)>0);
  fx.floats=fx.floats.filter(f=>{ f.y-=26*gdt; return (f.life-=gdt)>0; });
  fx.booms=fx.booms.filter(f=>(f.life-=gdt)>0);
  fx.parts=fx.parts.filter(f=>{ f.x+=f.vx*gdt; f.y+=f.vy*gdt; f.vy+=200*gdt; return (f.life-=gdt)>0; });
  for(const b of S.buildings) if(b.flash>0) b.flash-=gdt;
  } // end if(gdt>0)
  // power + achievements (throttled)
  powT-=dt;
  if(powT<=0){ S._power=totalPower(); powT=.5; checkAchievements(); }
  // HUD (throttled)
  hudT-=dt;
  if(hudT<=0){
    hudT=.2;
    $('#stPower').textContent=fmt(S._power||0);
    $('#stUnits').textContent=`${capUsed()}/${cap}`;
    $('#stCash').textContent='$'+fmt(S.cash);
    const IB=incomeBonus(), bonus=IB.rebirth+IB.outposts+IB.city+IB.logistics;   // fixed: city was counted twice (+30% instead of +20%)
    $('#stIncome').title=`Rebirth +${IB.rebirth}% · Outposts +${IB.outposts}% · City +${IB.city}% · Logistics +${IB.logistics}%`;
    $('#stIncome').textContent=`$${fmt(incomeRate())}/s +${bonus}%`;
    $('#tWave').textContent=`⏱ WAVE ${fmtTime(S.nextWave)}`;
    const boss=S.units.find(u=>u.boss);
    const tb=$('#tBoss');
    if(boss){ tb.textContent='🐳 WORM ACTIVE!'; tb.classList.add('danger'); }
    else { tb.textContent=`🐍 BOSS ${fmtTime(S.nextBoss)}`; tb.classList.remove('danger'); }
    $('#bossbar').hidden=!boss;
    if(boss) $('#bbFill').style.width=clamp01(boss.hp/boss.maxHp)*100+'%';
    const T=5000*Math.pow(2.2,S.rebirth);
    $('#rbBadge').hidden=!(S._power>=T);
    if(document.querySelector('#p-rebirth.show')) renderRebirth();
    if(document.querySelector('#p-rewards.show')) renderRewards();
    if(document.querySelector('#p-achieve.show')) renderAchievements();
    if(document.querySelector('#p-leader.show')) renderLeaderboard();
    if(window.Admin && $('#p-admin').classList.contains('open')) Admin.tickStats();
  }
  saveT-=dt;
  if(saveT<=0){ save(); saveT=12; }
}
// wheel zoom (bound once)
cv.addEventListener('wheel',e=>{
  e.preventDefault();
  const before=s2w(e.clientX,e.clientY);
  cam.z=clamp(cam.z*(e.deltaY>0?.9:1.1),.5,1.6);
  const after=s2w(e.clientX,e.clientY);
  cam.tx+=before.x-after.x; cam.ty+=before.y-after.y;
  cam.x=cam.tx; cam.y=cam.ty;
},{passive:false});

// unlock/resume audio on first interaction anywhere
document.addEventListener('pointerdown',()=>{
  initAudio();
  if(AC&&AC.state==='suspended') AC.resume();
},{passive:true});

// debug/test hook (harmless in browser)
if (typeof window!=='undefined'){
  window.__BMB={
    get S(){ return S; },
    get totalPower(){ return totalPower; },
    placeBuilding, giveItem, spawnBoss, spawnWave, mkUnit, killUnit, damageUnit,
    setBotPreset, damageBuilding, botBuildings, botUnits, bPos,
    astar, flowStep, cellOf, canSee, pointFaction,
    WALK, GW, GH, CELL,
    facC, facN, isAir, isStealth, modFor, modVs, capUsed, unitCap, incomeRate, incomeBonus,
    updateTurrets, hospitalTick, bankTick, checkAchievements, buyBlock, canPlaceAt, walkableAt,
    POINTS_DEFS, BOT_DEFS, MAP_PLOTS, LOBES, BRIDGES, PLOT, CITY_IDX, plotCentre, botPower,
  };
}
