/* Military Base 2.5D — 09-camera.js · canvas, camera, mouse, ground texture */
'use strict';
// ================= canvas / camera =================
const cv=$('#cv'), ctx=cv.getContext('2d');
let W=0,H=0,DPR=1;
function resize(){
  DPR=Math.min(2,window.devicePixelRatio||1);
  W=window.innerWidth; H=window.innerHeight;
  cv.width=W*DPR; cv.height=H*DPR;
  cv.style.width=W+'px'; cv.style.height=H+'px';
}
window.addEventListener('resize',resize); resize();

const cam={x:PLOT.x+PLOT.w*SLOT/2, y:PLOT.y+PLOT.h*SLOT/2+40, z:.8, tx:PLOT.x+PLOT.w*SLOT/2, ty:PLOT.y+PLOT.h*SLOT/2+40, tz:.8};
function viewBounds(){
  const hw=W/2/cam.z, hh=H/2/(cam.z*.72);
  return {x0:cam.x-hw-80, x1:cam.x+hw+80, y0:cam.y-hh-80, y1:cam.y+hh+80};
}
function s2w(mx,my){ return { x:(mx-W/2)/cam.z+cam.x, y:(my-H/2)/(cam.z*.72)+cam.y }; }
// pseudo-depth scale: things lower on screen (nearer) are bigger
function depth(y){
  const topY=cam.y-(H/2)/(cam.z*.72), spanY=H/(cam.z*.72);
  return .82+.36*clamp01((y-topY)/spanY);
}

const mouse={x:0,y:0,wx:0,wy:0,down:false,dragX:0,dragY:0,dragging:false};
let selUnits=[];
let dragBand=null;

// ground texture: grass patches + DENSE trees (like the original map) — generated once, seeded
const PATCHES=[], TREES=[], ROCKS=[];
{ let seed=7;
  const sr=()=> (seed=(seed*16807)%2147483647)/2147483647;
  const col=()=> sr()<.5?'rgba(0,60,0,.07)':'rgba(255,255,220,.05)';
  const nearBridge=(x,y,m)=> BRIDGES.some(b=>distSeg(x,y,b.ax,b.ay,b.bx,b.by)<BRIDGE_W+m);
  const putTree=(x,y)=>{ if(!nearBridge(x,y,22)) TREES.push({x,y,s:.75+sr()*.6,k:sr()<.3?1:0}); };
  for(let i=0;i<MAP_PLOTS.length;i++){
    const p=MAP_PLOTS[i], cx=p.x+PLOT_HW, cy=p.y+PLOT_HH;
    for(let a=0;a<9;a++){ const th=sr()*pi2, rr=25+sr()*120; PATCHES.push({x:cx+Math.cos(th)*rr, y:cy+Math.sin(th)*rr, r:rr*.7, c:col()}); }
    // tree belt between the build grid and the coast
    for(let a=0;a<260;a++){ const th=sr()*pi2, e=sqExit(th,PLOT_HW,PLOT_HH), R=plotRadius(i,th);
      if(R-e>40){ const rad=e+22+sr()*(R-e-36); putTree(cx+Math.cos(th)*rad, cy+Math.sin(th)*rad); } }
    // lobe island: forest with a clearing
    const L=LOBES[i];
    for(let a=0;a<45;a++){ const th=sr()*pi2, R=lobeRadius(i,th), rr=40+sr()*(R-60);
      const x=L.x+Math.cos(th)*rr, y=L.y+Math.sin(th)*rr;
      const ex=x-cx, ey=y-cy; if(Math.hypot(ex,ey)<sqExit(Math.atan2(ey,ex),PLOT_HW,PLOT_HH)+14) continue; // keep the grid clear
      putTree(x,y); }
    for(let a=0;a<3;a++){ const th=sr()*pi2, rr=sr()*120; ROCKS.push({x:L.x+Math.cos(th)*rr,y:L.y+Math.sin(th)*rr,s:.6+sr()*.7}); }
  }
  for(let a=0;a<12;a++){ const th=sr()*pi2, rr=180+sr()*(cityRadius(th)-210); PATCHES.push({x:CITY_ISL.x+Math.cos(th)*rr, y:CITY_ISL.y+Math.sin(th)*rr, r:20+sr()*40, c:col()}); }
  for(let a=0;a<40;a++){ const th=sr()*pi2, R=cityRadius(th), rr=R-18-sr()*60; if(rr>230) putTree(CITY_ISL.x+Math.cos(th)*rr, CITY_ISL.y+Math.sin(th)*rr); }
  for(let i=0;i<POINTS_DEFS.length;i++){
    const pt=POINTS_DEFS[i]; if(pt.city) continue;
    for(let a=0;a<3;a++){ const th=sr()*pi2, rr=sr()*Math.max(10,isletRadius(i,th)-18); PATCHES.push({x:pt.x+Math.cos(th)*rr, y:pt.y+Math.sin(th)*rr, r:10+sr()*18, c:col()}); }
    for(let a=0;a<14;a++){ const th=sr()*pi2, R=isletRadius(i,th), lo=pt.r+14, hi=R-12;
      if(hi>lo) putTree(pt.x+Math.cos(th)*(lo+sr()*(hi-lo)), pt.y+Math.sin(th)*(lo+sr()*(hi-lo))); }
  }
  TREES.sort((a,b)=>a.y-b.y);
}
