/* Military Base 2.5D — test-stubs.js · shared headless loader (DOM/canvas/localStorage stubs + loads every <script src> of index.html in order).
   Used by smoke.js (tests) and dump_data.js (live data for gen_info.py). */
'use strict';
const fs=require('fs');
// ---- canvas 2d stub ----
const ctxStub=new Proxy({},{
  get(t,p){ if(p==='measureText') return ()=>({width:10}); return ()=>undefined; },
  set(){ return true; },
});
function makeEl(id){
  const el={
    id, children:[], dataset:{}, style:{}, _cls:new Set(), _ls:{},
    classList:{
      add:c=>el._cls.add(c), remove:c=>el._cls.delete(c),
      toggle:(c,f)=>{ if(f===undefined) f=!el._cls.has(c); f?el._cls.add(c):el._cls.delete(c); },
      contains:c=>el._cls.has(c),
    },
    textContent:'', value:'', hidden:false, onclick:null, width:0, height:0,
    appendChild(c){ el.children.push(c); return c; },
    remove(){},
    _qcache:{},
    querySelector(sel){ if(!el._qcache[sel]) el._qcache[sel]=makeEl(el.id+'>'+sel); return el._qcache[sel]; },
    querySelectorAll(){ return []; },
    closest(){ return null; },
    addEventListener(t,fn){ el._ls[t]=fn; },
    getContext(){ return ctxStub; },
    getBoundingClientRect(){ return {left:0,top:0}; },
  };
  let _html='';
  Object.defineProperty(el,'innerHTML',{ get:()=>_html, set:v=>{_html=v; if(v==='') el.children.length=0;}});
  return el;
}
const cache=new Map();
const document={
  querySelector(sel){ if(!cache.has(sel)) cache.set(sel,makeEl(sel)); return cache.get(sel); },
  querySelectorAll(){ return []; },
  createElement(t){ return makeEl('el_'+t); },
  _ls:{},
  addEventListener(t,fn){ document._ls[t]=fn; },
};
const window={
  innerWidth:1280, innerHeight:800, devicePixelRatio:1, _ls:{},
  addEventListener(t,fn){ (window._ls[t]=window._ls[t]||[]).push(fn); },
};
const store={};
let rafCb=null, tick=1000;

global.window=window; global.document=document;
global.localStorage={ getItem:k=>store[k]??null, setItem:(k,v)=>store[k]=String(v), removeItem:k=>{delete store[k];} };
global.requestAnimationFrame=cb=>{ rafCb=cb; };
global.confirm=()=>false;
global.location={reload(){}};

// ---- load game ----
// load the game exactly like the browser does: every <script src> of index.html, in order, same global scope
const vm=require('vm'), nodePath=require('path');
const html=fs.readFileSync(nodePath.join(__dirname,'index.html'),'utf8');
const scripts=[...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]);
if(!scripts.length) throw new Error('no <script src> found in index.html');
for(const src of scripts) vm.runInThisContext(fs.readFileSync(nodePath.join(__dirname,src),'utf8'),{filename:src});

const B=window.__BMB;
if(!B) throw new Error('BMB hook missing');
const G=expr=>vm.runInThisContext(expr);          // read game globals (const/let live in the shared script scope)
let frames=0;
function pump(ms){
  const n=Math.max(1,Math.round(ms/16.7));
  for(let i=0;i<n;i++){
    tick+=16.7;
    const cb=rafCb; rafCb=null;
    if(!cb) throw new Error('requestAnimationFrame chain broken');
    cb(tick);
    frames++;
  }
}
module.exports={B,G,pump,store,document,window,scripts,get frames(){ return frames; }};
