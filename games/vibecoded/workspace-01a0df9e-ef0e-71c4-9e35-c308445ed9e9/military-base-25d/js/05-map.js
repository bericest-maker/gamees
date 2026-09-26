/* Military Base 2.5D — 05-map.js · island map: shapes, walkable test, A*, city flow field */
'use strict';
// ================= island map (radial, like ref-map-original.png) =================
// 8 plot islands on a ring · a lobe island on each plot facing the middle · octagon CITY ·
// 4 outpost islets between the spokes · straight bridges (spokes + outpost links) · water everywhere else
const CITY_ISL = {x:MAP_C.x, y:MAP_C.y, r:400};
const PLOT_HW=SLOT*PLOT_W/2, PLOT_HH=SLOT*PLOT_H/2;
const plotCenter = p => ({x:p.x+PLOT_HW, y:p.y+PLOT_HH});
const MAP_PLOTS = [{x:PLOT.x,y:PLOT.y,ang:PLOT.ang}, ...BOT_DEFS.map(b=>({x:b.plot.x,y:b.plot.y,ang:b.ang}))]; // [0]=player
function distSeg(px,py,ax,ay,bx,by){
  const dx=bx-ax, dy=by-ay, l2=dx*dx+dy*dy;
  let t=l2? ((px-ax)*dx+(py-ay)*dy)/l2 : 0; t=clamp01(t);
  return Math.hypot(px-(ax+t*dx), py-(ay+t*dy));
}
// ---------- organic shapes: seeded coastline wobble ----------
const ISLE_PHASES=[];
{ let seed=987654321;
  const sr=()=> (seed=(seed*48271)%2147483647)/2147483647;
  for(let i=0;i<32;i++) ISLE_PHASES.push([sr()*6.283,sr()*6.283,sr()*6.283]);
}
const wob  = (th,ph)=> 10*Math.sin(2*th+ph[0]) + 7*Math.sin(3*th+ph[1]) + 5*Math.sin(5*th+ph[2]); // ±22
const wobS = (th,ph)=> 5*Math.sin(2*th+ph[0]) + 3*Math.sin(3*th+ph[1]) + 2*Math.sin(5*th+ph[2]);  // ±10
const sqExit=(th,hw,hh)=> Math.min(Math.abs(Math.cos(th))>1e-6?hw/Math.abs(Math.cos(th)):1e9,
                                   Math.abs(Math.sin(th))>1e-6?hh/Math.abs(Math.sin(th)):1e9);
function plotRadius(i,th){ return sqExit(th,PLOT_HW+PLOT_MX,PLOT_HH+PLOT_MY) + 10 + wob(th,ISLE_PHASES[i]); }   // grid + forest margin + organic coast
// lobe islands: fused to each plot on the side facing the city, nudged sideways (like the original)
const LOBES = MAP_PLOTS.map((p,i)=>{
  const c=plotCenter(p), th=(p.ang+180)*DEG, e=sqExit(th,PLOT_HW+PLOT_MX,PLOT_HH+PLOT_MY);
  const side=(i%2?1:-1)*110;
  return {x:c.x+Math.cos(th)*(e+110)-Math.sin(th)*side, y:c.y+Math.sin(th)*(e+110)+Math.cos(th)*side, r:230};
});
function lobeRadius(i,th){ return LOBES[i].r + wob(th,ISLE_PHASES[8+i]); }
// octagon city (flat sides like the original) with a tiny wobble
function cityRadius(th){
  const k=Math.PI/4, a=((th+Math.PI/8)%k+k)%k-Math.PI/8;
  return CITY_ISL.r*Math.cos(Math.PI/8)/Math.cos(a) + wobS(th,ISLE_PHASES[16]);
}
// outpost islets: rounded squares
function isletRadius(idx,th){ return sqExit(th,112,112)*.86 + 40 + wobS(th,ISLE_PHASES[17+idx]); }
// bridges: every plot → city (spokes) + every outpost → its two neighbouring spokes
const BRIDGE_W = 45;
const BRIDGES = [];
for(const p of MAP_PLOTS){ const c=plotCenter(p); BRIDGES.push({ax:CITY_ISL.x,ay:CITY_ISL.y,bx:c.x,by:c.y,spoke:true}); }
for(const pt of POINTS_DEFS){
  if(pt.city) continue;
  for(const da of [-22.5,22.5]){
    const f=ringPos(pt.ang+da, OUTPOST_R*Math.cos(22.5*DEG));
    BRIDGES.push({ax:pt.x,ay:pt.y,bx:f.x,by:f.y,spoke:false});
  }
}

function walkableAt(x,y){
  // plot islands (square core + organic coast) and their lobes
  for(let i=0;i<MAP_PLOTS.length;i++){
    const c=plotCenter(MAP_PLOTS[i]);
    let dx=x-c.x, dy=y-c.y;
    if(Math.hypot(dx,dy) <= plotRadius(i,Math.atan2(dy,dx))) return true;
    const L=LOBES[i]; dx=x-L.x; dy=y-L.y;
    if(Math.hypot(dx,dy) <= lobeRadius(i,Math.atan2(dy,dx))) return true;
  }
  // central city island (octagon)
  { const dx=x-CITY_ISL.x, dy=y-CITY_ISL.y;
    if(Math.hypot(dx,dy) <= cityRadius(Math.atan2(dy,dx))) return true; }
  // outpost islets
  for(let i=0;i<POINTS_DEFS.length;i++){
    const pt=POINTS_DEFS[i]; if(pt.city) continue;
    const dx=x-pt.x, dy=y-pt.y;
    if(Math.hypot(dx,dy) <= isletRadius(i,Math.atan2(dy,dx))) return true;
  }
  // bridges
  for(const b of BRIDGES) if(distSeg(x,y,b.ax,b.ay,b.bx,b.by)<=BRIDGE_W) return true;
  return false;
}
const CELL=40, GW=Math.ceil(WORLD.w/CELL), GH=Math.ceil(WORLD.h/CELL);
const WALK=new Uint8Array(GW*GH);
for(let gy=0;gy<GH;gy++) for(let gx=0;gx<GW;gx++)
  WALK[gy*GW+gx]=walkableAt(gx*CELL+CELL/2, gy*CELL+CELL/2)?1:0;
const cellOf = (x,y)=> [clamp(Math.floor(x/CELL),0,GW-1), clamp(Math.floor(y/CELL),0,GH-1)];

// ---------- A* over the walk grid (8-dir, no corner cutting) ----------
function astar(sx,sy,tx,ty){
  const s=cellOf(sx,sy), t=cellOf(tx,ty);
  const sI=s[1]*GW+s[0], tI0=t[1]*GW+t[0];
  if(sI===tI0) return [{x:tx,y:ty}];
  let tI=tI0;
  if(!WALK[tI]){ // target in water → snap to nearest walkable cell (small ring search)
    let found=-1;
    outer:
    for(let r=1;r<10;r++) for(let dy=-r;dy<=r;dy++) for(let dx=-r;dx<=r;dx++){
      const nx=t[0]+dx, ny=t[1]+dy;
      if(nx<0||ny<0||nx>=GW||ny>=GH) continue;
      const ni=ny*GW+nx;
      if(WALK[ni]){ found=ni; break outer; }
    }
    if(found<0) return null;
    tI=found; t[0]=found%GW; t[1]=(found/GW)|0;
  }
  const heap=[];
  const hPush=(f,i)=>{ heap.push([f,i]); let c=heap.length-1; while(c>0){ const p=(c-1)>>1; if(heap[p][0]<=heap[c][0]) break; const tmp=heap[p]; heap[p]=heap[c]; heap[c]=tmp; c=p; } };
  const hPop=()=>{ const top=heap[0], last=heap.pop(); if(heap.length){ heap[0]=last; let c=0; for(;;){ const l=c*2+1, r=l+1; let m=c; if(l<heap.length&&heap[l][0]<heap[m][0]) m=l; if(r<heap.length&&heap[r][0]<heap[m][0]) m=r; if(m===c) break; const tmp=heap[m]; heap[m]=heap[c]; heap[c]=tmp; c=m; } } return top; };
  const came=new Int32Array(GW*GH).fill(-1);
  const g=new Float32Array(GW*GH).fill(Infinity);
  const closed=new Uint8Array(GW*GH);
  g[sI]=0; hPush(0,sI);
  const DIRS=[[1,0,1],[-1,0,1],[0,1,1],[0,-1,1],[1,1,1.414],[1,-1,1.414],[-1,1,1.414],[-1,-1,1.414]];
  let iter=0, reached=false;
  while(heap.length){
    const cur=hPop()[1];
    if(closed[cur]) continue; closed[cur]=1;
    if(cur===tI){ reached=true; break; }
    if(++iter>14000) break;
    const cx=cur%GW, cy=(cur/GW)|0;
    for(const [dx,dy,cost] of DIRS){
      const nx=cx+dx, ny=cy+dy;
      if(nx<0||ny<0||nx>=GW||ny>=GH) continue;
      const ni=ny*GW+nx;
      if(!WALK[ni]||closed[ni]) continue;
      if(dx&&dy && (!WALK[cy*GW+nx]||!WALK[ny*GW+cx])) continue;
      const ng=g[cur]+cost;
      if(ng<g[ni]){
        g[ni]=ng; came[ni]=cur;
        hPush(ng+Math.abs(nx-t[0])+Math.abs(ny-t[1]), ni);
      }
    }
  }
  if(!reached) return null;
  const path=[];
  let cur=tI;
  while(cur!==-1){
    path.push({x:(cur%GW)*CELL+CELL/2, y:((cur/GW)|0)*CELL+CELL/2});
    if(cur===sI) break;
    cur=came[cur];
  }
  path.reverse();
  path[path.length-1]={x:tx,y:ty};
  return path;
}

// ---------- city flow field: cheap "default → middle" highway for land units ----------
const CITY_FLOW=new Int32Array(GW*GH).fill(-1);
{
  const c0=cellOf(CITY_ISL.x,CITY_ISL.y);
  const start=c0[1]*GW+c0[0];
  if(WALK[start]){
    CITY_FLOW[start]=0;
    const q=[start];
    for(let qi=0;qi<q.length;qi++){
      const cur=q[qi], cx=cur%GW, cy=(cur/GW)|0;
      for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
        const nx=cx+dx, ny=cy+dy;
        if(nx<0||ny<0||nx>=GW||ny>=GH) continue;
        const ni=ny*GW+nx;
        if(!WALK[ni]||CITY_FLOW[ni]!==-1) continue;
        CITY_FLOW[ni]=CITY_FLOW[cur]+1; q.push(ni);
      }
    }
  }
}
function flowStep(x,y){
  const [cx,cy]=cellOf(x,y);
  let bd=CITY_FLOW[cy*GW+cx];
  if(bd<1) return null;
  let best=-1;
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
    const nx=cx+dx, ny=cy+dy;
    if(nx<0||ny<0||nx>=GW||ny>=GH) continue;
    const ni=ny*GW+nx;
    if(!WALK[ni]) continue;
    const d=CITY_FLOW[ni];
    if(d!==-1&&d<bd){ bd=d; best=ni; }
  }
  if(best<0) return null;
  return {x:(best%GW)*CELL+CELL/2, y:((best/GW)|0)*CELL+CELL/2};
}
