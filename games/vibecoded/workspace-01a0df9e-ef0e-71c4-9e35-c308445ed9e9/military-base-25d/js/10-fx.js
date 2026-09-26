/* Military Base 2.5D — 10-fx.js · fx: tracers, floats, booms, particles */
'use strict';
// ================= fx =================
let fx={tracers:[],floats:[],parts:[],booms:[]};
function addFloat(x,y,txt,col){ if(S.settings.gfx!=='High'&&!col) return; fx.floats.push({x,y,txt,col:col||'#fff',life:1.1}); }
function addBoom(x,y,r=1){ if(S.settings.gfx==='Low') return; fx.booms.push({x,y,r:6,max:r*26,life:.45}); }
function addParts(x,y,n,col){ if(S.settings.gfx==='Low') return; for(let i=0;i<n;i++) fx.parts.push({x,y,vx:rnd(-90,90),vy:rnd(-130,10),life:rnd(.3,.7),col,sz:rnd(2,4.5)}); }
function tracer(x1,y1,x2,y2,col){ fx.tracers.push({x1,y1,x2,y2,life:.07,col}); }
