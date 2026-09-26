/* Military Base 2.5D — 08b-sprites-units.js · sprites for the new units (built from 4 templates) */
'use strict';
// Templates keep all the new troops in the same flat style as the hand-drawn rifle/tank/heli/jet.
// Every draw fn gets (g, t, u) and uses unitPal(u) → {body,dark,accent,metal,skin} of the unit's FACTION.

// ----- infantry: legs, torso, head + helmet, weapon -----
// o: {gun:len, gunW, helmet:'cap'|'beret'|'hood'|'heavy'|'boonie', pack, cross(medic), scope, tube(rocket), bulk}
function infantry(o={}){
  return (g,t,u)=>{
    const P=unitPal(u), k=o.bulk||1;
    g.save(); g.scale(k,k);
    g.fillStyle=P.dark; g.fillRect(-4.5,-6,3.5,6); g.fillRect(1,-6,3.5,6);
    g.fillStyle=o.heavy?P.metal:P.body; g.fillRect(-5.5,-15,11,9.5); O(g,1.5); g.strokeRect(-5.5,-15,11,9.5);
    if(o.pack){ g.fillStyle=P.dark; g.fillRect(-8.5,-15,3.5,8); }
    if(o.cross){ g.fillStyle='#fff'; g.fillRect(-4,-13,8,6); g.fillStyle='#e53935'; g.fillRect(-1,-12.5,2,5); g.fillRect(-3,-10.5,6,1.8); }
    g.fillStyle=P.skin; g.beginPath(); g.arc(1,-18,3.6,0,pi2); g.fill();
    const h=o.helmet||'cap';
    g.fillStyle=P.accent;
    if(h==='cap'){ g.beginPath(); g.arc(1,-19,3.8,Math.PI,0); g.closePath(); g.fill(); g.fillRect(-3.5,-19,9,2); }
    else if(h==='beret'){ g.beginPath(); g.ellipse(0,-21,4.6,2.2,-.2,0,pi2); g.fill(); }
    else if(h==='boonie'){ g.fillRect(-4.5,-20.5,11,1.8); g.fillRect(-2,-23,6,3); }
    else if(h==='heavy'){ g.fillStyle=P.metal; g.beginPath(); g.arc(1,-18.5,4.6,Math.PI,0); g.closePath(); g.fill(); g.fillStyle=P.accent; g.fillRect(-2,-19,6,2); }
    else if(h==='hood'){ g.fillStyle=P.dark; g.beginPath(); g.arc(1,-18.5,4.6,Math.PI*.9,Math.PI*.1); g.fill(); g.fillStyle=P.accent; g.fillRect(1.5,-19,3,1.4); }
    if(o.tube){ g.fillStyle=P.metal; g.fillRect(-6,-19,17,3.4); O(g,1); g.strokeRect(-6,-19,17,3.4); g.fillStyle='#e0592b'; g.fillRect(11,-18.8,2.5,3); }
    else if(o.gun!==0){ g.fillStyle='#2b3138'; g.fillRect(2,-12,o.gun||10,o.gunW||2.2); if(o.scope){ g.fillRect(5,-14.5,4,2); } }
    g.restore();
  };
}
// ----- ground vehicle: tracks or wheels, hull, turret, gun -----
// o: {len, wheels(bool), hullH, tur:[w,h], gun:[len,thick], twin, rack(rockets), dish, launcher, flak, glow, color}
function vehicle(o={}){
  return (g,t,u)=>{
    const P=unitPal(u), L=o.len||30, hl=L/2, hh=o.hullH||7;
    if(o.wheels){
      g.fillStyle='#22282f'; const n=o.wheelN||3;
      for(let i=0;i<n;i++){ g.beginPath(); g.arc(-hl+4+i*((L-8)/(n-1)),-3,3.2,0,pi2); g.fill(); }
      g.fillStyle=P.metal; for(let i=0;i<n;i++){ g.beginPath(); g.arc(-hl+4+i*((L-8)/(n-1)),-3,1.3,0,pi2); g.fill(); }
    } else {
      g.fillStyle='#2b3138'; g.fillRect(-hl-2,-8,L+4,8);
      g.fillStyle=P.metal; const n=Math.max(3,Math.round(L/8));
      for(let i=0;i<n;i++){ g.beginPath(); g.arc(-hl+2+i*((L-4)/(n-1)),-4,2.4,0,pi2); g.fill(); }
    }
    const top=-6-hh;
    g.fillStyle=P.body; g.fillRect(-hl,top,L,hh); O(g,1.5); g.strokeRect(-hl,top,L,hh);
    g.fillStyle=P.accent; g.fillRect(-hl+2,top+2,3,3);
    if(o.cab){ g.fillStyle=P.body; g.fillRect(hl-o.cab,top-6,o.cab,6); O(g,1.2); g.strokeRect(hl-o.cab,top-6,o.cab,6); g.fillStyle='#9fd0ff'; g.fillRect(hl-o.cab+2,top-5,o.cab-4,3); }
    if(o.tur){
      const [tw,th]=o.tur;
      g.fillStyle=P.body; g.fillRect(-tw/2-2,top-th,tw,th); O(g,1.5); g.strokeRect(-tw/2-2,top-th,tw,th);
      if(o.gun){ const [gl,gt]=o.gun; g.fillStyle=P.dark;
        g.fillRect(tw/2-2,top-th/2-gt/2-(o.twin?1.8:0),gl,gt); if(o.twin) g.fillRect(tw/2-2,top-th/2+.5,gl,gt); }
      if(o.glow){ g.fillStyle=`rgba(120,220,255,${.5+.4*Math.sin(t*6)})`; g.fillRect(tw/2-2,top-th/2-1,o.gun[0],2); }
    }
    if(o.flak){ g.save(); g.translate(0,top); g.rotate(-.7); g.fillStyle=P.dark; g.fillRect(0,-4,14,2.4); g.fillRect(0,0,14,2.4); g.restore();
      g.fillStyle=P.metal; g.beginPath(); g.arc(0,top,4,Math.PI,0); g.fill(); }
    if(o.rack){ g.save(); g.translate(-2,top); g.rotate(-.45); g.fillStyle=P.metal; g.fillRect(-8,-7,18,7); O(g,1); g.strokeRect(-8,-7,18,7);
      g.fillStyle='#e0592b'; for(let i=0;i<3;i++) g.fillRect(10,-6+i*2.2,2,1.6); g.restore(); }
    if(o.arty){ g.save(); g.translate(-hl+6,top); g.rotate(-.55); g.fillStyle=P.dark; g.fillRect(0,-2.5,o.arty,5); O(g,1); g.strokeRect(0,-2.5,o.arty,5); g.restore(); }
    if(o.dish){ g.strokeStyle=P.metal; g.lineWidth=1.4; g.beginPath(); g.moveTo(-hl+6,top); g.lineTo(-hl+6,top-8); g.stroke();
      g.save(); g.translate(-hl+6,top-9); g.rotate(t*2); g.fillStyle=P.metal; g.beginPath(); g.ellipse(0,0,5,2,0,0,pi2); g.fill(); g.restore(); }
    if(o.mg){ g.fillStyle='#2b3138'; g.fillRect(-2,top-5,2,5); g.fillRect(-2,top-5,9,1.8); }
  };
}
// ----- helicopter: body ellipse, tail boom, skids, rotor -----
// o: {len, fat, twin(rotor), guns, stealth(angular), door, color}
function heliT(o={}){
  return (g,t,u)=>{
    const P=unitPal(u), L=o.len||11, F=o.fat||6;
    g.strokeStyle=P.dark; g.lineWidth=2;
    g.beginPath(); g.moveTo(-L-2,0); g.lineTo(L-2,0); g.moveTo(-L+2,-3); g.lineTo(-L+2,0); g.moveTo(L-6,-3); g.lineTo(L-6,0); g.stroke();
    g.fillStyle=P.body;
    if(o.stealth){ g.beginPath(); g.moveTo(-L-3,-8); g.lineTo(-L+3,-F*2-3); g.lineTo(L-2,-F*2-2); g.lineTo(L+2,-7); g.lineTo(L-3,-4); g.lineTo(-L+2,-4); g.closePath(); g.fill(); O(g,1.5); g.stroke(); }
    else { g.beginPath(); g.ellipse(-3,-9,L,F,0,0,pi2); g.fill(); O(g,1.5); g.stroke(); }
    g.fillStyle=P.body; g.fillRect(L-4,-11,14,3.5); g.fillRect(L+7,-15,3.5,6);
    if(o.twin){ g.fillRect(L+7,-17,3.5,10); }
    g.fillStyle='#9fd0ff'; g.fillRect(-L-1,-11,5,4);
    if(o.door){ g.fillStyle=P.dark; g.fillRect(-3,-12,6,6); }
    if(o.guns){ g.fillStyle=P.metal; g.fillRect(-6,-5,10,2.4); g.fillStyle='#e0592b'; g.fillRect(4,-5,2,2.4); }
    g.fillStyle=P.dark; g.fillRect(-4,-9-F-2,2.5,3);
    g.save(); g.translate(-3,-9-F-2); g.rotate(t*14);
    g.fillStyle=o.stealth?'rgba(35,42,52,.55)':'rgba(35,42,52,.8)'; g.fillRect(-L-4,-1.2,(L+4)*2,2.4); g.fillRect(-1.2,-L*.4,2.4,L*.8); g.restore();
  };
}
// ----- plane: fuselage, wings, tail, engine glow -----
// o: {len, wing, props(bool), heavy, flying wing (b2), twinTail, color}
function plane(o={}){
  return (g,t,u)=>{
    const P=unitPal(u), L=o.len||14, W=o.wing||8;
    if(o.flyingWing){
      g.fillStyle=P.body; g.beginPath(); g.moveTo(L,-8); g.lineTo(-L*.4,-8-W); g.lineTo(-L,-10); g.lineTo(-L*.7,-7); g.lineTo(-L,-4); g.lineTo(-L*.4,-2+W*.2); g.closePath(); g.fill(); O(g,1.5); g.stroke();
      g.fillStyle=P.accent; g.fillRect(L*.2,-8.8,5,1.8); return;
    }
    if(!o.props){ g.fillStyle='#f5b53f'; g.beginPath(); g.moveTo(-L,-7); g.lineTo(-L-6-Math.random()*4,-5.5); g.lineTo(-L,-4); g.closePath(); g.fill(); }
    g.fillStyle=P.body;
    const top=o.heavy?-12:-10.5;
    g.beginPath(); g.moveTo(L+2,-6); g.lineTo(L*.2,top); g.lineTo(-L,top+2); g.lineTo(-L,-3.5); g.lineTo(L*.2,-2); g.closePath(); g.fill(); O(g,1.5); g.stroke();
    g.fillStyle=P.dark;
    g.beginPath(); g.moveTo(L*.1,-8); g.lineTo(-L*.4,-8+W); g.lineTo(-L*.2,-8); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(-L,top+2); g.lineTo(-L-4,top-3.5); g.lineTo(-L+3,top+2); g.closePath(); g.fill();
    if(o.twinTail){ g.beginPath(); g.moveTo(-L+4,top+2); g.lineTo(-L+1,top-3); g.lineTo(-L+7,top+2); g.closePath(); g.fill(); }
    if(o.props){ g.fillStyle=P.metal; for(const px of [-L*.25,L*.05]){ g.fillRect(px,-8+W*.5,4,2.5);
      g.save(); g.translate(px+5,-7+W*.5); g.rotate(t*25); g.fillStyle='rgba(35,42,52,.7)'; g.fillRect(-.8,-4,1.6,8); g.restore(); } }
    if(o.guns){ g.fillStyle='#2b3138'; g.fillRect(-2,-3,2,4); g.fillRect(3,-3,2,4); }
    g.fillStyle='#9fd0ff'; g.fillRect(L*.5,top+2,5,2.2);
  };
}

// ----- LIGHT -----
reg('scout',   20,24, infantry({helmet:'boonie', gun:8}));
reg('atv',     30,20, vehicle({len:20, wheels:true, wheelN:2, hullH:5, mg:true}));
reg('sniper',  24,22, infantry({helmet:'hood', gun:16, gunW:1.8, scope:true}));
reg('commando',20,24, infantry({helmet:'beret', gun:11, pack:true}));
reg('humvee',  36,24, vehicle({len:28, wheels:true, wheelN:2, hullH:7, cab:10, mg:true}));
reg('rocket',  24,24, infantry({helmet:'cap', tube:true, pack:true}));
reg('medic',   20,24, infantry({helmet:'cap', gun:0, cross:true, pack:true}));
reg('ranger',  20,24, infantry({helmet:'boonie', gun:12, pack:true}));
reg('drone',   26,20, (g,t,u)=>{ const P=unitPal(u);
  g.fillStyle='rgba(0,0,0,.18)'; g.beginPath(); g.ellipse(0,0,8,2.5,0,0,pi2); g.fill();
  g.fillStyle=P.body; g.fillRect(-5,-15,10,5); O(g,1.2); g.strokeRect(-5,-15,10,5);
  g.strokeStyle=P.dark; g.lineWidth=1.5; g.beginPath(); g.moveTo(-10,-14); g.lineTo(10,-11); g.moveTo(-10,-11); g.lineTo(10,-14); g.stroke();
  g.fillStyle='rgba(35,42,52,.6)'; for(const x of [-10,10]){ g.beginPath(); g.ellipse(x,-14.5+Math.sin(t*40)*.3,4.5,1.2,0,0,pi2); g.fill(); }
  g.fillStyle=P.accent; g.fillRect(-1,-10,2,2); });
// ----- ARMORED -----
reg('hinf',    24,26, infantry({helmet:'heavy', gun:11, gunW:3, heavy:true, bulk:1.15}));
reg('apc',     40,24, vehicle({len:32, wheels:true, wheelN:4, hullH:9, tur:[8,4], gun:[8,1.8]}));
reg('flak',    38,26, vehicle({len:30, hullH:7, flak:true}));
reg('aav',     40,28, vehicle({len:32, hullH:8, rack:true, dish:true}));
reg('arty',    44,26, vehicle({len:34, wheels:true, wheelN:3, hullH:7, cab:9, arty:26}));
reg('heavy',   48,28, vehicle({len:38, hullH:9, tur:[20,9], gun:[18,4]}));
reg('mammoth', 56,32, vehicle({len:46, hullH:11, tur:[24,10], gun:[20,3.4], twin:true, rack:true}));
reg('railgun', 50,28, vehicle({len:38, hullH:8, tur:[16,7], gun:[26,2.6], glow:true}));
// ----- AIR -----
reg('huey',     40,24, heliT({len:12, fat:6, door:true}));
reg('cobra',    40,20, heliT({len:12, fat:4.5, guns:true}));
reg('blackhawk',44,24, heliT({len:14, fat:6.5, door:true, guns:true}));
reg('a10',      40,20, plane({len:16, wing:9, guns:true, twinTail:true}));
reg('f22',      40,18, plane({len:17, wing:7, twinTail:true}));
reg('ac130',    56,24, plane({len:24, wing:12, props:true, heavy:true, guns:true}));
reg('b52',      62,26, plane({len:28, wing:14, heavy:true}));
// ----- STEALTH -----
reg('saboteur',   20,24, infantry({helmet:'hood', gun:6, pack:true}));
reg('phantom',    44,24, vehicle({len:34, hullH:7, tur:[14,5], gun:[16,2.6]}));
reg('stealthheli',44,22, heliT({len:13, fat:5, stealth:true}));
reg('b2',         56,20, plane({len:24, wing:12, flyingWing:true}));
