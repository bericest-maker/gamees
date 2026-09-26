/* Military Base 2.5D — 04-factions.js · factions: colors, names, palettes */
'use strict';
// ================= factions =================
// faction 0 = YOU, 1-7 = bots (BOT_DEFS order). Every faction fights every other.
const FACCOL  = ['#5bc24e','#4a90e2','#f5a53f','#a35ad6','#ec407a','#26c6da','#ffee58','#ef5350'];
const FACNAME = ['YOU','ALPHA','BRAVO','CHARLIE','DELTA','ECHO','FOXTROT','GOLF'];
const facC = i => FACCOL[((i%8)+8)%8];
const hexA = (hex,a)=>{ const n=parseInt(hex.slice(1),16); return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`; };
const facN = i => FACNAME[i]||'?';
function shade(hex,f){
  const n=parseInt(hex.slice(1),16); let r=(n>>16)&255, g=(n>>8)&255, b=n&255;
  r=clamp(Math.round(r*f),0,255); g=clamp(Math.round(g*f),0,255); b=clamp(Math.round(b*f),0,255);
  return `rgb(${r},${g},${b})`;
}
const FACPAL = FACCOL.map(c=>({body:c, dark:shade(c,.5), accent:shade(c,1.35), metal:shade(c,.8), skin:'#d8a878'}));
function unitPal(u){
  if(u && typeof u.faction==='number' && u.faction>=0) return FACPAL[u.faction];
  return (u && u.side==='p') ? FACPAL[0] : FACPAL[1];
}
