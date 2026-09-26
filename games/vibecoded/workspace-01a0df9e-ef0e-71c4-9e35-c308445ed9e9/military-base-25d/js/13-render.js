/* Military Base 2.5D — 13-render.js · render: world, units, ground, minimap */
'use strict';
// ================= render =================
const mini=$('#mini'), mctx=mini.getContext('2d');
function render(){
  ctx.setTransform(DPR,0,0,DPR,0,0);
  ctx.fillStyle='#2a7fd0'; ctx.fillRect(0,0,W,H);
  ctx.setTransform(DPR*cam.z,0,0,DPR*cam.z*.72,DPR*(W/2-cam.x*cam.z),DPR*(H/2-cam.y*cam.z*.72));

  const vb=viewBounds();
  drawGround(vb);

  // drawables
  const items=[];
  for(const b of S.buildings){
    const c=bPos(b);
    if(c.x<vb.x0||c.x>vb.x1||c.y<vb.y0||c.y>vb.y1) continue;
    items.push({y:c.y,kind:'b',b,x:c.x});
  }
  for(const u of S.units){
    if(u.x<vb.x0||u.x>vb.x1||u.y<vb.y0||u.y>vb.y1) continue;
    items.push({y:u.y,kind:'u',u});
  }
  for(const p of S.points){
    if(p.x<vb.x0||p.x>vb.x1||p.y<vb.y0||p.y>vb.y1) continue;
    items.push({y:p.y,kind:'flag',p});
  }
  items.sort((a,b)=>a.y-b.y);

  for(const it of items){
    if(it.kind==='b'){
      const d=BUILD[it.b.type], sp=SPR[it.b.type];
      const s=depth(it.y);
      const isBot=typeof(it.b.owner??"p")==="number";
      ctx.save(); ctx.translate(it.x,it.y); ctx.scale(s,s);
      ctx.fillStyle='rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(0,2,sp.w*.55,sp.w*.2,0,0,pi2); ctx.fill();
      if(it.b.flash>0){ ctx.globalAlpha=.5+Math.sin(performance.now()/30)*.3; }
      sp.draw(ctx,performance.now()/1000,{side:isBot?'e':'p',faction:bFaction(it.b)});
      ctx.restore();
      // hp bar if damaged
      if(it.b.hp<it.b.maxHp){
        const w=sp.w*.9;
        // fixed: bar used to be drawn at the world origin (missing it.x / it.y)
        ctx.fillStyle='rgba(0,0,0,.5)'; ctx.fillRect(it.x-w*s/2,it.y-sp.h*s-8*s,w*s,4*s);
        ctx.fillStyle='#5bc24e'; ctx.fillRect(it.x-w*s/2,it.y-sp.h*s-8*s,w*s*clamp01(it.b.hp/it.b.maxHp),4*s);
      }
      // bot base overlays
      if(isBot){
        const bb=S.bots[it.b.owner];
        if(bb&&bb.down){
          ctx.globalAlpha=1;
          ctx.fillStyle='rgba(13,18,25,.8)';
          ctx.fillRect(it.x-70,it.y-sp.h*s-30,140,16);
          ctx.fillStyle='#ef5350'; ctx.font='900 12px "Segoe UI"'; ctx.textAlign='center';
          ctx.fillText(`REBUILDING ${Math.max(0,Math.ceil(bb.downT))}s`,it.x,it.y-sp.h*s-18);
        } else if(bb&&bb.raidT<10){
          ctx.fillStyle='#ff8a5c'; ctx.font='900 14px "Segoe UI"'; ctx.textAlign='center';
          ctx.fillText('⚠',it.x,it.y-sp.h*s-24*s);
        }
      }
    } else if(it.kind==='u'){
      drawUnit(it.u,depth(it.u.y),false);
    } else if(it.kind==='flag'){
      drawPointFlag(it.p,depth(it.p.y));
    }
  }

  // boss (drawn on top of ground, under fx) — actually draw within items? boss is a unit; handled in drawUnit via kind u (boss flag)
  // tracers
  for(const t of fx.tracers){
    ctx.strokeStyle=t.col; ctx.lineWidth=2.5; ctx.globalAlpha=t.life/.07;
    ctx.beginPath(); ctx.moveTo(t.x1,t.y1); ctx.lineTo(t.x2,t.y2); ctx.stroke(); ctx.globalAlpha=1;
  }
  // booms
  for(const b of fx.booms){
    const p=1-b.life/.45, r=lerp(4,b.max,p);
    ctx.globalAlpha=(1-p)*.8;
    ctx.fillStyle='#ffb066'; ctx.beginPath(); ctx.arc(b.x,b.y,r,0,pi2); ctx.fill();
    ctx.fillStyle='#fff2c9'; ctx.beginPath(); ctx.arc(b.x,b.y,r*.5,0,pi2); ctx.fill();
    ctx.globalAlpha=1;
  }
  // particles
  for(const p of fx.parts){
    ctx.globalAlpha=clamp01(p.life*2);
    ctx.fillStyle=p.col; ctx.fillRect(p.x-p.sz/2,p.y-p.sz/2,p.sz,p.sz);
  }
  ctx.globalAlpha=1;
  // floats
  ctx.font='bold 13px sans-serif'; ctx.textAlign='center';
  for(const f of fx.floats){
    ctx.globalAlpha=clamp01(f.life);
    ctx.fillStyle=f.col; ctx.fillText(f.txt,f.x,f.y);
  }
  ctx.globalAlpha=1; ctx.textAlign='left';

  // selection
  for(const id of selUnits){
    const u=S.units.find(x=>x.id===id);
    if(!u) continue;
    ctx.strokeStyle='rgba(255,255,255,.85)'; ctx.lineWidth=1.5;
    ctx.setLineDash([5,4]);
    ctx.beginPath(); ctx.arc(u.x,u.y, (u.boss?24:13),0,pi2); ctx.stroke();
    ctx.setLineDash([]);
  }
  // drag band
  if(dragBand){
    ctx.strokeStyle='rgba(255,255,255,.8)'; ctx.lineWidth=1.2;
    ctx.fillStyle='rgba(74,144,226,.15)';
    const x=Math.min(dragBand.x1,dragBand.x2), y=Math.min(dragBand.y1,dragBand.y2);
    const w=Math.abs(dragBand.x2-dragBand.x1), h=Math.abs(dragBand.y2-dragBand.y1);
    ctx.fillRect(x,y,w,h); ctx.strokeRect(x,y,w,h);
  }
  // placement ghost
  if(S.placing){
    const g=ghostSlot();
    const q=plotAt(g.gx,g.gy), d=BUILD[S.placing];
    ctx.fillStyle=g.ok?'rgba(91,194,78,.25)':'rgba(214,73,63,.3)';
    ctx.strokeStyle=g.ok?'#5bc24e':'#d6493f';
    ctx.lineWidth=2;
    ctx.fillRect(q.x,q.y,d.w*SLOT,d.h*SLOT);
    ctx.strokeRect(q.x,q.y,d.w*SLOT,d.h*SLOT);
    const sp=SPR[S.placing];
    const gs=depth(q.y+d.h*100);
    ctx.save(); ctx.translate(q.x+d.w*50,q.y+d.h*100); ctx.scale(gs,gs); ctx.globalAlpha=.75;
    sp.draw(ctx,performance.now()/1000,{side:'p'});
    ctx.restore(); ctx.globalAlpha=1;
  }
  // minimap
  drawMini();
}

function drawUnit(u,s){
  let sp;
  if(u.boss){ drawBoss(u); return; }
  sp=SPR[u.type];
  const air=isAir(u);
  const flyY = air ? -(56+Math.sin(u.t*2.5)*6) : 0;
  // stealth: hidden units are nearly invisible
  const hidden = isStealth(u)&&!u.revealed;
  ctx.globalAlpha = hidden?.16:1;
  // shadow on the ground
  ctx.fillStyle = air?'rgba(0,0,0,.12)':'rgba(0,0,0,.25)';
  ctx.beginPath();
  ctx.ellipse(u.x,u.y+2, sp.w*.45*s, (air?4:sp.w*.17)*s,0,0,pi2);
  ctx.fill();
  ctx.save(); ctx.translate(u.x,u.y+flyY); ctx.scale(s,s);
  sp.draw(ctx,performance.now()/1000,{side:u.side,faction:u.faction});
  ctx.restore();
  ctx.globalAlpha=1;
  // detected-stealth shimmer
  if(isStealth(u)&&u.revealed&&u.fightT<=0){
    ctx.strokeStyle=hexA(facC(u.faction),.5+Math.sin(performance.now()/120)*.3);
    ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.arc(u.x,u.y-10,14*s,0,pi2); ctx.stroke();
  }
  // hp bar (faction color)
  if(u.hp<u.maxHp){
    const w=sp.w*.9;
    ctx.fillStyle='rgba(0,0,0,.5)'; ctx.fillRect(u.x-w/2,u.y-unitTop(u)*s-10, w,3.5);
    ctx.fillStyle=facC(u.faction);
    ctx.fillRect(u.x-w/2,u.y-unitTop(u)*s-10, w*clamp01(u.hp/u.maxHp),3.5);
  }
}
function drawBoss(u){
  // segments
  for(let i=Math.min(30,u.hist.length-1);i>=0;i-=2){
    const h=u.hist[i]; if(!h) break;
    const r=15-i*.42;
    if(r<6) break;
    const s=depth(h.y);
    ctx.save(); ctx.translate(h.x,h.y); ctx.scale(s,s);
    ctx.fillStyle='rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(0,3,r*.9,r*.35,0,0,pi2); ctx.fill();
    ctx.fillStyle='#5a616c'; ctx.beginPath(); ctx.arc(0,0,r,0,pi2); ctx.fill();
    ctx.strokeStyle='#33383f'; ctx.lineWidth=2; ctx.stroke();
    ctx.fillStyle='#6d7581'; ctx.beginPath(); ctx.arc(0,-r*.3,r*.55,0,pi2); ctx.fill();
    ctx.fillStyle='#33383f';
    ctx.beginPath(); ctx.moveTo(-r*.4,-r*.85); ctx.lineTo(0,-r-6); ctx.lineTo(r*.4,-r*.85); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  const s=depth(u.y);
  ctx.save(); ctx.translate(u.x,u.y); ctx.scale(s,s);
  const r=20;
  ctx.fillStyle='rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(0,4,r,r*.4,0,0,pi2); ctx.fill();
  ctx.fillStyle='#4a4f58'; ctx.beginPath(); ctx.arc(0,0,r,0,pi2); ctx.fill();
  ctx.strokeStyle='#22262c'; ctx.lineWidth=2.5; ctx.stroke();
  ctx.fillStyle='#6d7581'; ctx.beginPath(); ctx.arc(0,-r*.3,r*.6,0,pi2); ctx.fill();
  // jaw
  ctx.fillStyle='#33383f'; ctx.beginPath(); ctx.arc(0,r*.25,r*.7,0,Math.PI); ctx.closePath(); ctx.fill();
  // eyes
  const gl=.6+Math.sin(performance.now()/150)*.4;
  ctx.fillStyle=`rgba(255,70,50,${gl})`;
  ctx.beginPath(); ctx.arc(-7,-4,3.4,0,pi2); ctx.arc(7,-4,3.4,0,pi2); ctx.fill();
  // horns
  ctx.fillStyle='#e0a32e';
  ctx.beginPath(); ctx.moveTo(-12,-r+4); ctx.lineTo(-16,-r-9); ctx.lineTo(-7,-r+1); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(12,-r+4); ctx.lineTo(16,-r-9); ctx.lineTo(7,-r+1); ctx.closePath(); ctx.fill();
  ctx.restore();
  // boss hp handled in HUD bar
}
function drawPointFlag(p,s){
  const f=pointFaction(p);
  const col=f<0?'#8f9aa8':facC(f);
  ctx.save(); ctx.translate(p.x,p.y); ctx.scale(s,s);
  ctx.fillStyle='#7d8794'; ctx.fillRect(-2,-52,4,52);
  ctx.fillStyle=col;
  ctx.beginPath(); ctx.moveTo(2,-52);
  ctx.quadraticCurveTo(18,-49+Math.sin(performance.now()/250)*3,30,-46);
  ctx.lineTo(30,-33); ctx.quadraticCurveTo(16,-36,2,-36);
  ctx.closePath(); ctx.fill();
  ctx.restore();
  // label
  ctx.save(); ctx.translate(p.x,p.y); ctx.scale(s,s);
  ctx.font='bold 11px sans-serif'; ctx.textAlign='center';
  ctx.fillStyle='rgba(20,26,34,.75)';
  const t=p.name+' · '+(f<0?'NEUTRAL':(f===0?'YOU':facN(f)));
  const tw=ctx.measureText(t).width;
  ctx.fillRect(-tw/2-5,-70,tw+10,14);
  ctx.fillStyle=col; ctx.fillText(t,0,-59);
  ctx.textAlign='left';
  ctx.restore();
}
function islandPoly(rf,cx,cy,extra=0){
  ctx.beginPath();
  const N=72;
  for(let a=0;a<=N;a++){
    const th=a/N*pi2, r=rf(th)+extra;
    const px=cx+Math.cos(th)*r, py=cy+Math.sin(th)*r;
    a?ctx.lineTo(px,py):ctx.moveTo(px,py);
  }
  ctx.closePath();
}
function drawTree(t){
  ctx.save(); ctx.translate(t.x,t.y); ctx.scale(t.s,t.s);
  ctx.fillStyle='rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(2,3,10,4,0,0,pi2); ctx.fill();
  ctx.fillStyle='#6b4a2f'; ctx.fillRect(-2,-6,4,8);
  if(t.k){ // pine
    ctx.fillStyle='#2f6a34'; ctx.beginPath(); ctx.moveTo(-10,-4); ctx.lineTo(0,-30); ctx.lineTo(10,-4); ctx.closePath(); ctx.fill();
    ctx.fillStyle='#3b7d3a'; ctx.beginPath(); ctx.moveTo(-7,-14); ctx.lineTo(0,-32); ctx.lineTo(7,-14); ctx.closePath(); ctx.fill();
  } else {
    ctx.fillStyle='#3e7a34'; ctx.beginPath(); ctx.arc(0,-14,10,0,pi2); ctx.fill();
    ctx.fillStyle='#4a8c3d'; ctx.beginPath(); ctx.arc(-4,-19,7,0,pi2); ctx.fill();
    ctx.beginPath(); ctx.arc(5,-18,6,0,pi2); ctx.fill();
  }
  ctx.restore();
}
// land = sand rim + grass (drawn with a radius function)
function landShape(rf,cx,cy){
  ctx.fillStyle='#d9c68a'; islandPoly(rf,cx,cy,13); ctx.fill();
  ctx.fillStyle='#69a54e'; islandPoly(rf,cx,cy); ctx.fill();
}
function drawBridges(list,w){
  ctx.lineCap='butt';
  ctx.strokeStyle='rgba(0,0,0,.18)'; ctx.lineWidth=w+10;           // shadow in the water
  ctx.beginPath(); for(const b of list){ ctx.moveTo(b.ax,b.ay+8); ctx.lineTo(b.bx,b.by+8); } ctx.stroke();
  ctx.strokeStyle='#6b5a44'; ctx.lineWidth=w+6;                    // side beams
  ctx.beginPath(); for(const b of list){ ctx.moveTo(b.ax,b.ay); ctx.lineTo(b.bx,b.by); } ctx.stroke();
  ctx.strokeStyle='#9c8462'; ctx.lineWidth=w;                      // deck
  ctx.beginPath(); for(const b of list){ ctx.moveTo(b.ax,b.ay); ctx.lineTo(b.bx,b.by); } ctx.stroke();
  ctx.strokeStyle='rgba(60,45,30,.35)'; ctx.lineWidth=2; ctx.setLineDash([3,11]);   // planks
  ctx.beginPath(); for(const b of list){ ctx.moveTo(b.ax,b.ay); ctx.lineTo(b.bx,b.by); } ctx.stroke();
  ctx.setLineDash([]);
}
function drawCrystal(c,t){
  const bob=Math.sin(t*1.4+c.ang)*6;
  ctx.fillStyle='rgba(120,220,255,.18)'; ctx.beginPath(); ctx.ellipse(c.x,c.y+26,34,11,0,0,pi2); ctx.fill();
  ctx.save(); ctx.translate(c.x,c.y-30+bob);
  ctx.fillStyle='#7fe3ff'; ctx.beginPath(); ctx.moveTo(0,-38); ctx.lineTo(18,0); ctx.lineTo(0,38); ctx.lineTo(-18,0); ctx.closePath(); ctx.fill();
  ctx.fillStyle='#bff3ff'; ctx.beginPath(); ctx.moveTo(0,-38); ctx.lineTo(6,0); ctx.lineTo(0,38); ctx.lineTo(-18,0); ctx.closePath(); ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,.7)'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(0,-38); ctx.lineTo(18,0); ctx.lineTo(0,38); ctx.lineTo(-18,0); ctx.closePath(); ctx.stroke();
  ctx.fillStyle=`rgba(255,255,255,${.4+.4*Math.sin(t*3+c.ang)})`; ctx.beginPath(); ctx.arc(-5,-12,3,0,pi2); ctx.fill();
  ctx.restore();
}
const inView=(x,y,r,vb)=> !(x<vb.x0-r||x>vb.x1+r||y<vb.y0-r||y>vb.y1+r);
function drawGround(vb){
  const t=performance.now()/1000;
  // ocean + soft wave glints
  ctx.fillStyle='#2a7fd0';
  ctx.fillRect(vb.x0,vb.y0,vb.x1-vb.x0,vb.y1-vb.y0);
  ctx.strokeStyle='rgba(255,255,255,.08)'; ctx.lineWidth=2;
  ctx.beginPath();
  for(let y=Math.floor(vb.y0/160)*160;y<vb.y1;y+=160) for(let x=Math.floor(vb.x0/220)*220;x<vb.x1;x+=220){
    const ox=((x*7+y*3)%90)+Math.sin(t+x*.01)*8; ctx.moveTo(x+ox,y+((x/220)%2)*80); ctx.lineTo(x+ox+26,y+((x/220)%2)*80); }
  ctx.stroke();
  // bridges under the land (spokes + outpost links)
  drawBridges(BRIDGES,BRIDGE_W*2-6);
  // outpost islets
  for(let i=0;i<POINTS_DEFS.length;i++){
    const pt=POINTS_DEFS[i]; if(pt.city||!inView(pt.x,pt.y,220,vb)) continue;
    landShape(th=>isletRadius(i,th),pt.x,pt.y);
  }
  // plot islands (0 = player, 1-7 = bots) + their lobes
  for(let i=0;i<MAP_PLOTS.length;i++){
    const p=MAP_PLOTS[i], cx=p.x+PLOT_HW, cy=p.y+PLOT_HH, L=LOBES[i];
    if(!inView(cx,cy,1100,vb)) continue;
    ctx.fillStyle='#d9c68a'; islandPoly(th=>plotRadius(i,th),cx,cy,13); ctx.fill(); islandPoly(th=>lobeRadius(i,th),L.x,L.y,13); ctx.fill();
    ctx.fillStyle='#69a54e'; islandPoly(th=>plotRadius(i,th),cx,cy); ctx.fill(); islandPoly(th=>lobeRadius(i,th),L.x,L.y); ctx.fill();
    // build grid pad (slightly lighter so the plot square reads like the original)
    ctx.fillStyle='rgba(255,255,255,.05)'; ctx.fillRect(p.x,p.y,PLOT_W*SLOT,PLOT_H*SLOT);
  }
  // central city island (octagon)
  if(inView(CITY_ISL.x,CITY_ISL.y,420,vb)){
    landShape(cityRadius,CITY_ISL.x,CITY_ISL.y);
    // 8 roads from the plaza to the bridges
    ctx.strokeStyle='#8a8f96'; ctx.lineWidth=46; ctx.beginPath();
    for(const b of BRIDGES) if(b.spoke){ const dx=b.bx-b.ax, dy=b.by-b.ay, l=Math.hypot(dx,dy); ctx.moveTo(b.ax,b.ay); ctx.lineTo(b.ax+dx/l*CITY_ISL.r*1.02,b.ay+dy/l*CITY_ISL.r*1.02); }
    ctx.stroke();
    ctx.fillStyle='#9aa0a6'; ctx.beginPath(); ctx.arc(CITY_ISL.x,CITY_ISL.y,200,0,pi2); ctx.fill();
  }
  // floating crystals
  for(const c of CRYSTALS) if(inView(c.x,c.y,80,vb)) drawCrystal(c,t);
  // terrain patches
  for(const p of PATCHES){
    if(!inView(p.x,p.y,p.r,vb)) continue;
    ctx.fillStyle=p.c; ctx.beginPath(); ctx.ellipse(p.x,p.y,p.r,p.r*.6,0,0,pi2); ctx.fill();
  }
  // rocks
  ctx.fillStyle='#8a8f96';
  for(const r of ROCKS){ if(!inView(r.x,r.y,30,vb)) continue; ctx.beginPath(); ctx.ellipse(r.x,r.y,14*r.s,8*r.s,0,0,pi2); ctx.fill(); }
  // trees
  for(const tr of TREES){
    if(!inView(tr.x,tr.y,40,vb)) continue;
    drawTree(tr);
  }
  // player plot grid + label
  { const p=MAP_PLOTS[0], w=PLOT.w*SLOT, h=PLOT.h*SLOT;
    ctx.strokeStyle='rgba(255,255,255,.14)'; ctx.lineWidth=1;
    ctx.beginPath();
    for(let gx=1;gx<PLOT.w;gx++){ ctx.moveTo(p.x+gx*SLOT,p.y); ctx.lineTo(p.x+gx*SLOT,p.y+h); }
    for(let gy=1;gy<PLOT.h;gy++){ ctx.moveTo(p.x,p.y+gy*SLOT); ctx.lineTo(p.x+w,p.y+gy*SLOT); }
    ctx.stroke();
    ctx.fillStyle='#ffe08a'; ctx.font='900 15px "Segoe UI"'; ctx.textAlign='center';
    ctx.fillText('⬆ YOUR BASE',p.x+w/2,p.y-26);
  }
  // bot plot outlines + labels
  for(let i=0;i<MAP_PLOTS.length;i++){
    if(i===0) continue;
    const p=MAP_PLOTS[i], w=PLOT_W*SLOT, h=PLOT_H*SLOT, bd=BOT_DEFS[i-1], bb=S.bots[i-1];   // fixed: was 12×7 (old plot size)
    ctx.strokeStyle=bb.down?'rgba(239,83,80,.9)':hexA(facC(i),.55); ctx.lineWidth=2.5; ctx.setLineDash([10,7]);
    ctx.strokeRect(p.x,p.y,w,h);
    ctx.setLineDash([]);
    ctx.fillStyle=hexA(facC(i),.95); ctx.font='900 14px "Segoe UI"'; ctx.textAlign='center';
    ctx.fillText(`BOT ${i} · ${facN(i)} (${bd.dir})`,p.x+w/2,p.y-26);
    ctx.fillStyle='rgba(255,255,255,.55)'; ctx.font='700 10px "Segoe UI"';
    ctx.fillText((PRESET_MAP[S.bots[i-1].preset]||PRESETS[0]).label,p.x+w/2,p.y+h+22);
    if(bb.down){
      ctx.fillStyle='rgba(13,18,25,.75)'; ctx.fillRect(p.x+w/2-80,p.y+h/2-11,160,20);
      ctx.fillStyle='#ef5350'; ctx.font='900 12px "Segoe UI"';
      ctx.fillText(`REBUILDING ${Math.max(0,Math.ceil(bb.downT))}s`,p.x+w/2,p.y+h/2+3);
    }
  }
  // capture pads (owner color)
  for(const p of S.points){
    const f=pointFaction(p);
    const c=f<0?'#a0aab4':facC(f);
    ctx.fillStyle='#9aa0a6'; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,pi2); ctx.fill();
    ctx.fillStyle=hexA(c,.14); ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,pi2); ctx.fill();
    ctx.strokeStyle=hexA(c,.9); ctx.lineWidth=5; ctx.beginPath(); ctx.arc(p.x,p.y,p.r-4,0,pi2); ctx.stroke();
  }
}
// minimap: square canvas, islands drawn with the same radius functions as the world
function miniPoly(rf,cx,cy,sx,sy){
  mctx.beginPath();
  for(let a=0;a<=28;a++){ const th=a/28*pi2, r=rf(th); const px=(cx+Math.cos(th)*r)*sx, py=(cy+Math.sin(th)*r)*sy; a?mctx.lineTo(px,py):mctx.moveTo(px,py); }
  mctx.closePath(); mctx.fill();
}
function drawMini(){
  const mw=mini.width,mh=mini.height, sx=mw/WORLD.w, sy=mh/WORLD.h;
  mctx.fillStyle='#2a7fd0'; mctx.fillRect(0,0,mw,mh);
  // bridges
  mctx.strokeStyle='rgba(156,132,98,.95)'; mctx.lineWidth=1.6;
  mctx.beginPath();
  for(const b of BRIDGES){ mctx.moveTo(b.ax*sx,b.ay*sy); mctx.lineTo(b.bx*sx,b.by*sy); }
  mctx.stroke();
  // islands
  mctx.fillStyle='#69a54e';
  for(let i=0;i<MAP_PLOTS.length;i++){
    const c=plotCenter(MAP_PLOTS[i]), L=LOBES[i];
    miniPoly(th=>plotRadius(i,th),c.x,c.y,sx,sy); miniPoly(th=>lobeRadius(i,th),L.x,L.y,sx,sy);
  }
  miniPoly(cityRadius,CITY_ISL.x,CITY_ISL.y,sx,sy);
  POINTS_DEFS.forEach((p,i)=>{ if(!p.city) miniPoly(th=>isletRadius(i,th),p.x,p.y,sx,sy); });
  // plot squares: yours highlighted, bots in faction colour (red if rebuilding)
  for(let i=0;i<MAP_PLOTS.length;i++){
    const p=MAP_PLOTS[i];
    mctx.fillStyle = i===0 ? 'rgba(255,224,138,.55)' : (S.bots[i-1].down ? 'rgba(239,83,80,.75)' : hexA(facC(i),.35));
    mctx.fillRect(p.x*sx,p.y*sy,PLOT_W*SLOT*sx,PLOT_H*SLOT*sy);
  }
  // crystals
  mctx.fillStyle='#bff3ff'; for(const c of CRYSTALS){ mctx.fillRect(c.x*sx-1.5,c.y*sy-1.5,3,3); }
  // points (owner faction color)
  for(const p of S.points){
    const f=pointFaction(p);
    mctx.fillStyle=f<0?'#a0aab4':facC(f);
    mctx.beginPath(); mctx.arc(p.x*sx,p.y*sy,3,0,pi2); mctx.fill();
  }
  // units (faction color)
  for(const u of S.units){
    if(u.boss){ mctx.fillStyle='#ef5350'; mctx.beginPath(); mctx.arc(u.x*sx,u.y*sy,3.5,0,pi2); mctx.fill(); }
    else { mctx.fillStyle=facC(u.faction); mctx.fillRect(u.x*sx-1,u.y*sy-1,2,2); }
  }
  // camera rect
  const vb=viewBounds();
  mctx.strokeStyle='rgba(255,255,255,.8)'; mctx.lineWidth=1;
  mctx.strokeRect((cam.x-W/2/cam.z)*sx,(cam.y-H/2/(cam.z*.72))*sy,(W/cam.z)*sx,(H/(cam.z*.72))*sy);
}
