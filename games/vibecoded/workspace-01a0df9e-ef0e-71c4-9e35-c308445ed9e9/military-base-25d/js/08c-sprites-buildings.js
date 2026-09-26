/* Military Base 2.5D — 08c-sprites-buildings.js · sprites for new production/special/decor buildings + generated unit buildings */
'use strict';
// Unit buildings are drawn from STYLE templates (tent, tower, garage, barracks, bunker, lab, factory, pad, hangar, pentagon)
// and each carries a small SIGNBOARD with a mini picture of the unit it trains — so 35 buildings stay recognisable.
// Third draw arg `o` = {side, faction} of the owner (used for the flag + signboard unit colours).

const bPal = o => unitPal(o||{side:'p'});
function flagOn(g,x,y,o){ const P=bPal(o); g.fillStyle='#7d8794'; g.fillRect(x,y-16,2.5,16); g.fillStyle=P.body; g.fillRect(x+2.5,y-16,11,7); }
function signboard(g,x,y,unit,t,o){
  g.fillStyle='#4a3a28'; g.fillRect(x-1,y-2,2,8);
  g.fillStyle='#e8dfc8'; g.fillRect(x-11,y-18,22,16); O(g,1.2); g.strokeRect(x-11,y-18,22,16);
  const sp=SPR[unit]; if(!sp) return;
  const sc=Math.min(18/sp.w,13/sp.h);
  g.save(); g.translate(x,y-4); g.scale(sc,sc);
  const air=UNITS[unit]&&(UNITS[unit].cls.includes('air')||UNITS[unit].fly);
  if(air) g.translate(0,4);
  sp.draw(g,t,{side:(o&&o.side)||'p',faction:o&&o.faction});
  g.restore();
}
const BSTYLE = {
  tent(g,W,t,o){ const h=W*.42;
    g.fillStyle='#7c8a5a'; g.beginPath(); g.moveTo(-W/2,0); g.lineTo(-W*.3,-h); g.lineTo(W*.3,-h); g.lineTo(W/2,0); g.closePath(); g.fill(); O(g); g.stroke();
    g.fillStyle='#65714a'; g.beginPath(); g.moveTo(-W*.3,-h); g.lineTo(0,-h-6); g.lineTo(W*.3,-h); g.closePath(); g.fill();
    g.fillStyle='#3a4029'; g.beginPath(); g.moveTo(-6,0); g.lineTo(0,-h*.7); g.lineTo(6,0); g.closePath(); g.fill();
    return {sx:W*.36, fy:-h-6}; },
  tower(g,W,t,o){
    g.fillStyle='#6b5a44'; g.fillRect(-11,-34,3,34); g.fillRect(8,-34,3,34);
    g.strokeStyle='#5a4a36'; g.lineWidth=1.5; g.beginPath(); g.moveTo(-9,-30); g.lineTo(9,-6); g.moveTo(9,-30); g.lineTo(-9,-6); g.stroke();
    g.fillStyle='#8a6f4d'; g.fillRect(-14,-44,28,11); O(g); g.strokeRect(-14,-44,28,11);
    g.fillStyle='#5d4a33'; g.beginPath(); g.moveTo(-16,-44); g.lineTo(0,-52); g.lineTo(16,-44); g.closePath(); g.fill();
    g.fillStyle='#1d2330'; g.fillRect(-9,-41,18,4);
    return {sx:W*.38, fy:-52, noflag:true}; },
  garage(g,W,t,o){ const h=W*.44;
    g.fillStyle='#6f7a84'; g.fillRect(-W/2,-h,W,h); O(g); g.strokeRect(-W/2,-h,W,h);
    g.fillStyle='#5a646d'; g.fillRect(-W/2,-h-5,W,5);
    const dw=W*.3; g.fillStyle='#3a4149';
    g.fillRect(-W*.42,-h*.7,dw,h*.7); g.fillRect(W*.42-dw,-h*.7,dw,h*.7);
    g.strokeStyle='rgba(255,255,255,.12)'; g.lineWidth=1; for(let i=1;i<5;i++){ const y=-h*.7+i*h*.14; g.beginPath(); g.moveTo(-W*.42,y); g.lineTo(-W*.42+dw,y); g.moveTo(W*.42-dw,y); g.lineTo(W*.42,y); g.stroke(); }
    return {sx:0, sy:-h-5, fy:-h-5}; },
  barracks(g,W,t,o){ const h=W*.5;
    g.fillStyle='#5d7a4a'; g.fillRect(-W/2,-h,W,h); O(g); g.strokeRect(-W/2,-h,W,h);
    g.fillStyle='#48603a'; g.fillRect(-W/2,-h-6,W,6);
    g.fillStyle='#3c4f31'; g.fillRect(-6,-16,12,16);
    g.fillStyle='#cfe3a8'; for(let x=-W/2+6;x<W/2-10;x+=14){ if(Math.abs(x+4)<10) continue; g.fillRect(x,-h+6,8,6); }
    return {sx:W*.36, fy:-h-6}; },
  bunker(g,W,t,o){ const h=W*.3;
    g.fillStyle='#7a7466'; g.beginPath(); g.moveTo(-W/2,0); g.lineTo(-W*.4,-h); g.lineTo(W*.4,-h); g.lineTo(W/2,0); g.closePath(); g.fill(); O(g); g.stroke();
    g.fillStyle='#1d2330'; g.fillRect(-W*.28,-h*.62,W*.56,4);
    g.fillStyle='#b3a988'; for(let x=-W/2;x<W/2;x+=9){ g.beginPath(); g.ellipse(x+4,-1,5,3,0,0,pi2); g.fill(); }
    return {sx:W*.3, sy:-h, fy:-h}; },
  lab(g,W,t,o){ const h=W*.5;
    g.fillStyle='#d5dbe4'; g.fillRect(-W/2,-h,W,h); O(g); g.strokeRect(-W/2,-h,W,h);
    g.fillStyle='#aeb7c4'; g.fillRect(-W/2,-h-5,W,5);
    g.fillStyle='#4aa3df'; g.fillRect(-W/2+5,-h+6,W-10,6);
    g.fillStyle='#8a94a4'; g.beginPath(); g.arc(-W*.22,-h-5,W*.16,Math.PI,0); g.fill(); O(g,1.5); g.stroke();
    g.fillStyle=`rgba(120,220,255,${.5+.4*Math.sin(t*3)})`; g.fillRect(-4,-h*.5,8,h*.5);
    return {sx:W*.3, fy:-h-5}; },
  factory(g,W,t,o){ const h=W*.42;
    g.fillStyle='#66725f'; g.fillRect(-W/2,-h,W,h); O(g); g.strokeRect(-W/2,-h,W,h);
    g.fillStyle='#525c4c'; for(let i=0;i<3;i++){ const x=-W/2+i*W/3; g.beginPath(); g.moveTo(x,-h); g.lineTo(x+W/6,-h-9); g.lineTo(x+W/3,-h); g.closePath(); g.fill(); }
    g.fillStyle='#8a8f96'; g.fillRect(W*.3,-h-22,6,22);
    g.fillStyle=`rgba(200,200,210,${.35+.2*Math.sin(t*2)})`; g.beginPath(); g.arc(W*.3+3+Math.sin(t)*2,-h-28,5,0,pi2); g.fill();
    g.fillStyle='#3a4149'; g.fillRect(-W*.3,-h*.65,W*.4,h*.65);
    return {sx:-W*.05, sy:-h-9, fy:-h-9, fx:-W*.42}; },
  pad(g,W,t,o){
    g.fillStyle='#5f6a74'; g.beginPath(); g.ellipse(-W*.1,-3,W*.4,W*.15,0,0,pi2); g.fill(); O(g); g.stroke();
    g.strokeStyle='#f5b53f'; g.lineWidth=1.5; g.beginPath(); g.ellipse(-W*.1,-3,W*.3,W*.1,0,0,pi2); g.stroke();
    g.fillStyle='#fff'; g.font='bold 10px sans-serif'; g.textAlign='center'; g.fillText('H',-W*.1,0); g.textAlign='left';
    g.fillStyle='#8792a6'; g.fillRect(W*.3,-34,10,34); O(g,1.5); g.strokeRect(W*.3,-34,10,34);
    return {sx:W*.36, sy:-34, fy:-34, fx:W*.3}; },
  hangar(g,W,t,o){ const h=W*.38;
    g.fillStyle='#7d8794'; g.beginPath(); g.moveTo(-W/2,0); g.lineTo(-W/2,-h*.6); g.quadraticCurveTo(0,-h*1.5,W/2,-h*.6); g.lineTo(W/2,0); g.closePath(); g.fill(); O(g); g.stroke();
    g.strokeStyle='rgba(255,255,255,.18)'; g.lineWidth=1; for(let i=-2;i<=2;i++){ g.beginPath(); g.moveTo(i*W/6,0); g.lineTo(i*W/6,-h*(1.05-Math.abs(i)*.12)); g.stroke(); }
    g.fillStyle='#2a3038'; g.beginPath(); g.moveTo(-W*.3,0); g.lineTo(-W*.3,-h*.55); g.quadraticCurveTo(0,-h*1.05,W*.3,-h*.55); g.lineTo(W*.3,0); g.closePath(); g.fill();
    g.fillStyle='#f5b53f'; g.fillRect(-W/2,-2,W,2);
    return {sx:W*.4, sy:-h*.55, fy:-h*1.1, fx:-W*.08}; },
  pentagon(g,W,t,o){ const r=W*.42;
    g.fillStyle='#b9b3a2'; g.beginPath(); for(let i=0;i<5;i++){ const a=-Math.PI/2+i*pi2/5; g.lineTo(Math.cos(a)*r,-r*.45+Math.sin(a)*r*.45); } g.closePath(); g.fill(); O(g); g.stroke();
    g.fillStyle='#9a9484'; g.beginPath(); for(let i=0;i<5;i++){ const a=-Math.PI/2+i*pi2/5; g.lineTo(Math.cos(a)*r*.5,-r*.45+Math.sin(a)*r*.22); } g.closePath(); g.fill();
    g.fillStyle='#5f8a4a'; g.beginPath(); for(let i=0;i<5;i++){ const a=-Math.PI/2+i*pi2/5; g.lineTo(Math.cos(a)*r*.25,-r*.45+Math.sin(a)*r*.11); } g.closePath(); g.fill();
    return {sx:r*.9, sy:0, fy:-r*.9, fx:-r*.2}; },
};
const STYLE_W = {tent:[46,58],tower:[40,40],garage:[58,64],barracks:[58,66],bunker:[52,58],lab:[56,66],factory:[62,80],pad:[60,66],hangar:[66,84],pentagon:[80,90]};
for(const [id,unit,,,,,w,,,,style] of UNIT_BUILDINGS){
  if(!style) continue;
  const W=STYLE_W[style][w>=3?1:0], H=Math.round(W*.9);
  reg(id,W,H,(g,t,o)=>{
    const r=BSTYLE[style](g,W,t,o);
    if(!r.noflag) flagOn(g,r.fx??(-W/2+2),r.fy,o);
    signboard(g,r.sx,r.sy??0,unit,t,o);
  });
}
// the 5 original unit buildings get a signboard too (drawn after their hand-made art)
for(const id of ['barracks','tankfac','heliport','afbase','mechi','zeppeldock','stealthlab']){
  const base=SPR[id], unit=BUILD[id].unit;
  reg(id,base.w,base.h,(g,t,o)=>{ base.draw(g,t,o); signboard(g,-base.w*.42,0,unit,t,o); });
}

// ----- PRODUCTION -----
reg('wind',40,64,(g,t)=>{
  g.fillStyle='#e6e9ee'; g.beginPath(); g.moveTo(-3,0); g.lineTo(-1.5,-50); g.lineTo(1.5,-50); g.lineTo(3,0); g.closePath(); g.fill(); O(g,1.2); g.stroke();
  g.save(); g.translate(0,-50); g.rotate(t*2.4);
  g.fillStyle='#f4f6f8'; for(let i=0;i<3;i++){ g.rotate(pi2/3); g.beginPath(); g.moveTo(0,-1.5); g.lineTo(18,-2.5); g.lineTo(18,0); g.lineTo(0,1.5); g.closePath(); g.fill(); O(g,1); g.stroke(); }
  g.restore(); g.fillStyle='#9aa4b1'; g.beginPath(); g.arc(0,-50,2.6,0,pi2); g.fill();
});
reg('ironmine',46,36,(g,t)=>{
  g.fillStyle='#6b5a44'; g.beginPath(); g.moveTo(-22,0); g.lineTo(-12,-18); g.lineTo(12,-18); g.lineTo(22,0); g.closePath(); g.fill(); O(g); g.stroke();
  g.fillStyle='#1d1a16'; g.beginPath(); g.moveTo(-8,0); g.lineTo(-8,-10); g.quadraticCurveTo(0,-17,8,-10); g.lineTo(8,0); g.closePath(); g.fill();
  g.fillStyle='#8a6f4d'; g.fillRect(-10,-12,3,12); g.fillRect(7,-12,3,12); g.fillRect(-10,-14,20,3);
  const x=Math.sin(t*1.3)*6; g.fillStyle='#5a646d'; g.fillRect(x-5,-5,10,4); g.fillStyle='#9a6b4b'; g.fillRect(x-4,-8,8,3);
  g.fillStyle='#22282f'; g.beginPath(); g.arc(x-3,-1,1.5,0,pi2); g.arc(x+3,-1,1.5,0,pi2); g.fill();
});
reg('steel',64,48,(g,t)=>{
  g.fillStyle='#6f6a66'; g.fillRect(-30,-26,60,26); O(g); g.strokeRect(-30,-26,60,26);
  g.fillStyle='#57524e'; g.fillRect(-30,-30,60,4);
  g.fillStyle='#8a8f96'; g.fillRect(14,-44,7,18); g.fillRect(-20,-40,6,14);
  g.fillStyle=`rgba(255,140,40,${.6+.3*Math.sin(t*5)})`; g.fillRect(-12,-16,24,10);
  g.fillStyle=`rgba(190,190,200,${.3+.15*Math.sin(t*2)})`; g.beginPath(); g.arc(17+Math.sin(t)*2,-50,5,0,pi2); g.fill();
});
reg('refinery',66,54,(g,t)=>{
  g.fillStyle='#c7ccd4'; g.beginPath(); g.ellipse(-16,-14,12,14,0,0,pi2); g.fill(); O(g); g.stroke();
  g.fillStyle='#b2b8c2'; g.beginPath(); g.ellipse(8,-12,10,12,0,0,pi2); g.fill(); O(g); g.stroke();
  g.fillStyle='#8a8f96'; g.fillRect(22,-46,5,46); O(g,1.2); g.strokeRect(22,-46,5,46);
  g.fillStyle=`rgba(255,160,50,${.6+.4*Math.sin(t*9)})`; g.beginPath(); g.moveTo(22,-46); g.lineTo(24.5,-54-Math.random()*4); g.lineTo(27,-46); g.closePath(); g.fill();
  g.strokeStyle='#6a717c'; g.lineWidth=2; g.beginPath(); g.moveTo(-4,-10); g.lineTo(0,-10); g.moveTo(18,-8); g.lineTo(22,-8); g.stroke();
});
reg('powerplant',66,60,(g,t)=>{
  g.fillStyle='#a9adb4'; g.beginPath(); g.moveTo(-28,0); g.quadraticCurveTo(-20,-24,-26,-48); g.lineTo(-6,-48); g.quadraticCurveTo(-12,-24,-4,0); g.closePath(); g.fill(); O(g); g.stroke();
  g.fillStyle=`rgba(230,230,235,${.5+.2*Math.sin(t*1.5)})`; g.beginPath(); g.arc(-16+Math.sin(t)*2,-54,8,0,pi2); g.arc(-10,-60,6,0,pi2); g.fill();
  g.fillStyle='#6f7a84'; g.fillRect(0,-26,28,26); O(g); g.strokeRect(0,-26,28,26);
  g.fillStyle='#f5d547'; g.beginPath(); g.moveTo(14,-22); g.lineTo(9,-12); g.lineTo(14,-12); g.lineTo(11,-4); g.lineTo(19,-15); g.lineTo(14,-15); g.closePath(); g.fill();
});
reg('skyscraper',50,96,(g,t)=>{
  g.fillStyle='#4f6a8a'; g.fillRect(-16,-86,32,86); O(g); g.strokeRect(-16,-86,32,86);
  g.fillStyle='#3d5470'; g.fillRect(4,-86,12,86);
  for(let y=-80;y<-4;y+=8) for(let x=-12;x<14;x+=7){ g.fillStyle=((x*7+y*3)&8)?'#9fd0ff':'#6f9cc7'; g.fillRect(x,y,4,5); }
  g.fillStyle='#8792a6'; g.fillRect(-1,-98,2,12);
  g.fillStyle=(Math.sin(t*4)>0)?'#ef5350':'#6b2a28'; g.beginPath(); g.arc(0,-98,2,0,pi2); g.fill();
});
reg('fusion',68,62,(g,t)=>{
  g.fillStyle='#5a646d'; g.fillRect(-30,-16,60,16); O(g); g.strokeRect(-30,-16,60,16);
  g.fillStyle='#c7ccd4'; g.beginPath(); g.arc(0,-16,24,Math.PI,0); g.fill(); O(g); g.stroke();
  const p=.5+.5*Math.sin(t*3);
  g.fillStyle=`rgba(255,${180+p*60},80,${.6+p*.4})`; g.beginPath(); g.arc(0,-26,8+p*2,0,pi2); g.fill();
  g.strokeStyle=`rgba(120,220,255,.8)`; g.lineWidth=1.5; g.beginPath(); g.ellipse(0,-26,16,5,t,0,pi2); g.stroke();
  g.beginPath(); g.ellipse(0,-26,16,5,-t,0,pi2); g.stroke();
});
// ----- SPECIAL -----
reg('pillbox',44,30,(g,t,o)=>{
  g.fillStyle='#8a8474'; g.beginPath(); g.ellipse(0,-8,19,10,0,Math.PI,0); g.lineTo(19,0); g.lineTo(-19,0); g.closePath(); g.fill(); O(g); g.stroke();
  g.fillStyle='#1d2330'; g.fillRect(-10,-12,20,3.5);
  g.fillStyle='#2b3138'; g.fillRect(8,-12,12,2.5);
  g.fillStyle=bPal(o).body; g.fillRect(-3,-19,6,3);
});
reg('radar',44,58,(g,t,o)=>{
  g.fillStyle='#6f7a84'; g.fillRect(-14,-14,28,14); O(g); g.strokeRect(-14,-14,28,14);
  g.fillStyle='#8792a6'; g.fillRect(-2,-34,4,20);
  g.save(); g.translate(0,-38); g.scale(Math.cos(t*1.6),1);
  g.fillStyle='#d5dbe4'; g.beginPath(); g.ellipse(0,0,16,10,0,0,pi2); g.fill(); O(g,1.5); g.stroke();
  g.strokeStyle='#8792a6'; g.beginPath(); g.moveTo(0,0); g.lineTo(0,-8); g.stroke(); g.restore();
  g.fillStyle=bPal(o).body; g.fillRect(-10,-10,20,3);
});
reg('aaturret',44,42,(g,t,o)=>{
  g.fillStyle='#6f7a84'; g.fillRect(-18,-8,36,8); O(g); g.strokeRect(-18,-8,36,8);
  g.save(); g.translate(0,-10); g.rotate(-.6+Math.sin(t*.8)*.15);
  g.fillStyle=bPal(o).metal; g.fillRect(-10,-12,22,12); O(g,1.5); g.strokeRect(-10,-12,22,12);
  g.fillStyle='#e0592b'; for(let r=0;r<2;r++) for(let c=0;c<3;c++){ g.beginPath(); g.arc(14,-9+r*6+c*0,1.8,0,pi2); g.fill(); }
  g.fillStyle='#d5dbe4'; for(let c=0;c<3;c++) g.fillRect(-8+c*6,-10,4,8);
  g.restore();
});
reg('hospital',64,44,(g,t,o)=>{
  g.fillStyle='#eef1f4'; g.fillRect(-28,-30,56,30); O(g); g.strokeRect(-28,-30,56,30);
  g.fillStyle='#d5dbe4'; g.fillRect(-28,-34,56,4);
  g.fillStyle='#e53935'; g.fillRect(-4,-27,8,20); g.fillRect(-10,-21,20,8);
  g.fillStyle='#9fd0ff'; g.fillRect(-22,-24,8,6); g.fillRect(14,-24,8,6);
  g.fillStyle=`rgba(125,255,154,${.25+.2*Math.sin(t*3)})`; g.beginPath(); g.arc(0,-17,15,0,pi2); g.fill();
});
reg('cannon',68,48,(g,t,o)=>{
  g.fillStyle='#7a7466'; g.fillRect(-30,-14,60,14); O(g); g.strokeRect(-30,-14,60,14);
  g.fillStyle='#8a8474'; g.beginPath(); g.arc(-4,-14,16,Math.PI,0); g.fill(); O(g); g.stroke();
  g.save(); g.translate(-4,-22); g.rotate(-.25); g.fillStyle='#3a4149'; g.fillRect(0,-4,36,8); O(g,1.5); g.strokeRect(0,-4,36,8); g.fillRect(32,-5,5,10); g.restore();
  g.fillStyle=bPal(o).body; g.fillRect(-26,-10,10,4);
});
reg('bank',66,50,(g,t)=>{
  g.fillStyle='#e8dfc8'; g.fillRect(-28,-30,56,30); O(g); g.strokeRect(-28,-30,56,30);
  g.fillStyle='#d6cbb0'; g.beginPath(); g.moveTo(-32,-30); g.lineTo(0,-44); g.lineTo(32,-30); g.closePath(); g.fill(); O(g); g.stroke();
  g.fillStyle='#bfb394'; for(let x=-22;x<=18;x+=10) g.fillRect(x,-28,4,26);
  g.fillStyle='#ffd54f'; g.font='bold 11px sans-serif'; g.textAlign='center'; g.fillText('$',0,-33); g.textAlign='left';
  g.fillStyle='#bfb394'; g.fillRect(-30,-3,60,3);
});
reg('monument',60,80,(g,t)=>{
  g.fillStyle='#8a8474'; g.fillRect(-24,-10,48,10); O(g); g.strokeRect(-24,-10,48,10);
  g.fillStyle='#b9b3a2'; g.fillRect(-16,-16,32,6);
  g.fillStyle='#ff7043'; g.beginPath(); g.moveTo(-7,-16); g.lineTo(-4,-70); g.lineTo(0,-76); g.lineTo(4,-70); g.lineTo(7,-16); g.closePath(); g.fill(); O(g); g.stroke();
  g.fillStyle=`rgba(255,200,120,${.5+.4*Math.sin(t*2.5)})`; g.beginPath(); g.arc(0,-50,4+Math.sin(t*2.5),0,pi2); g.fill();
});
// ----- DECOR -----
reg('flowers',36,18,(g,t)=>{
  g.fillStyle='#6b5a44'; g.fillRect(-16,-6,32,6); O(g,1.2); g.strokeRect(-16,-6,32,6);
  const c=['#ef5350','#ffd54f','#ec407a','#fff','#a35ad6'];
  for(let i=0;i<7;i++){ g.fillStyle='#4f8f3a'; g.fillRect(-13+i*4.3,-10,1.4,5); g.fillStyle=c[i%5]; g.beginPath(); g.arc(-12.3+i*4.3,-11,2.4,0,pi2); g.fill(); }
});
reg('sandbags',44,18,(g,t)=>{
  g.fillStyle='#b3a988'; for(let r=0;r<2;r++) for(let i=0;i<5-r;i++){ g.beginPath(); g.ellipse(-16+i*8+r*4,-3-r*6,5,3.2,0,0,pi2); g.fill(); O(g,1); g.stroke(); }
});
reg('barrels',34,26,(g,t)=>{
  for(const [x,y,c] of [[-8,0,'#c0392b'],[6,0,'#2e7d32'],[-1,-12,'#c0392b']]){
    g.fillStyle=c; g.fillRect(x-5,y-12,10,12); O(g,1.2); g.strokeRect(x-5,y-12,10,12);
    g.fillStyle='rgba(0,0,0,.25)'; g.fillRect(x-5,y-9,10,1.5); g.fillRect(x-5,y-4,10,1.5); }
});
reg('lamp',20,52,(g,t)=>{
  g.fillStyle='#3a4149'; g.fillRect(-1.5,-44,3,44); g.fillRect(-4,-2,8,2);
  g.fillStyle='#3a4149'; g.fillRect(-5,-48,10,5);
  g.fillStyle=`rgba(255,230,140,${.75+.2*Math.sin(t*3)})`; g.beginPath(); g.arc(0,-42,3.5,0,pi2); g.fill();
  g.fillStyle='rgba(255,230,140,.12)'; g.beginPath(); g.arc(0,-40,12,0,pi2); g.fill();
});
reg('fountain',46,30,(g,t)=>{
  g.fillStyle='#b9b3a2'; g.beginPath(); g.ellipse(0,-5,20,7,0,0,pi2); g.fill(); O(g); g.stroke();
  g.fillStyle='#4a90e2'; g.beginPath(); g.ellipse(0,-6,16,5,0,0,pi2); g.fill();
  g.fillStyle='#b9b3a2'; g.fillRect(-2.5,-18,5,12);
  g.fillStyle='rgba(160,210,255,.8)'; for(let i=0;i<5;i++){ const a=t*3+i*1.25, h=(a%1.2)/1.2; g.beginPath(); g.arc(Math.cos(i*1.26)*h*9,-18+h*h*12-h*6,1.4,0,pi2); g.fill(); }
});
reg('statue',36,56,(g,t)=>{
  g.fillStyle='#8a8474'; g.fillRect(-12,-14,24,14); O(g); g.strokeRect(-12,-14,24,14);
  g.fillStyle='#a8a08c'; g.beginPath(); g.moveTo(0,-44); g.lineTo(-16,-36); g.lineTo(-6,-32); g.lineTo(-4,-14); g.lineTo(4,-14); g.lineTo(6,-32); g.lineTo(16,-36); g.closePath(); g.fill(); O(g,1.5); g.stroke();
  g.fillStyle='#c8c0aa'; g.beginPath(); g.arc(0,-44,4,0,pi2); g.fill();
  g.fillStyle='#f5b53f'; g.fillRect(3,-45,4,2);
});
