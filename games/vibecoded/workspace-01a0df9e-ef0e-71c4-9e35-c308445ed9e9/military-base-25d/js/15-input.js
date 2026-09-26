/* Military Base 2.5D — 15-input.js · input: minimap, keyboard, mouse */
'use strict';
// minimap click
mini.addEventListener('mousedown',e=>{
  const r=mini.getBoundingClientRect();
  const wx=(e.clientX-r.left)/r.width*WORLD.w;   // fixed: used hard-coded 150×112 (wrong when CSS scales the canvas)
  const wy=(e.clientY-r.top)/r.height*WORLD.h;
  cam.tx=wx; cam.ty=wy;
});

// input
window.addEventListener('keydown',e=>{
  if(e.target.tagName==='INPUT') return;
  switch(e.key.toLowerCase()){
    case 'w': case 'arrowup': cam.ty-=90; break;
    case 's': case 'arrowdown': cam.ty+=90; break;
    case 'a': case 'arrowleft': cam.tx-=90; break;
    case 'd': case 'arrowright': cam.tx+=90; break;
    case 'escape':
      if(S.placing) cancelPlacement();
      else { selUnits=[]; for(const id of PANEL_IDS) $('#p-'+id).classList.remove('show'); }
      break;
  }
});
window.addEventListener('keyup',e=>{});
// continuous camera with held keys
const keys={};
window.addEventListener('keydown',e=>{ keys[e.key.toLowerCase()]=true; });
window.addEventListener('keyup',e=>{ delete keys[e.key.toLowerCase()]; });

cv.addEventListener('contextmenu',e=>e.preventDefault());
cv.addEventListener('mousedown',e=>{
  initAudio();
  if(e.button===2){
    if(S.placing){ cancelPlacement(); }
    else {
      // right-click a BOT building with units selected = assault order
      const bb=selUnits.length?buildingAt(mouse.wx,mouse.wy,'bot'):null;
      if(bb){
        const c=bPos(bb);
        for(const u of selUnits) u.order={x:c.x,y:c.y,bid:bb.id};
        toast('⚔️ Units ordered to ASSAULT that building!','#d6493f');
        sfx('click');
      } else {
        const b=buildingAt(mouse.wx,mouse.wy,'p');
        if(b) removeBuildingRefund(b);
        else selUnits=[];
      }
    }
    return;
  }
  if(e.button!==0) return;
  mouse.down=true; mouse.dragX=e.clientX; mouse.dragY=e.clientY; mouse.dragging=false;
  if(S.placing){
    const g=ghostSlot();
    if(g.ok){
      placeBuilding(S.placing,g.gx,g.gy);
      S.placing=null;
    } else { toast('Can\'t place there','#ef5350'); sfx('error'); }
    return;
  }
});
cv.addEventListener('mousemove',e=>{
  mouse.x=e.clientX; mouse.y=e.clientY;
  const w=s2w(e.clientX,e.clientY);
  mouse.wx=w.x; mouse.wy=w.y;
  if(mouse.down && !mouse.dragging && Math.hypot(e.clientX-mouse.dragX,e.clientY-mouse.dragY)>7) mouse.dragging=true;
  if(mouse.dragging && !S.placing){
    dragBand={x1:mouse.dragX,y1:mouse.dragY,x2:e.clientX,y2:e.clientY};
  }
});
window.addEventListener('mouseup',e=>{
  if(e.button!==0) return;
  if(!mouse.down) return;
  mouse.down=false;
  if(mouse.dragging){
    if(!S.placing && dragBand){
      const a=s2w(Math.min(dragBand.x1,dragBand.x2),Math.min(dragBand.y1,dragBand.y2));
      const b=s2w(Math.max(dragBand.x1,dragBand.x2),Math.max(dragBand.y1,dragBand.y2));
      if(e.ctrlKey){
        for(const u of playerUnits()){
          if(u.x>=a.x&&u.x<=b.x&&u.y>=a.y&&u.y<=b.y){ u.order={x:(a.x+b.x)/2,y:(a.y+b.y)/2}; if(!selUnits.includes(u)) selUnits.push(u); }
        }
      } else {
        const found=playerUnits().filter(u=>u.x>=a.x&&u.x<=b.x&&u.y>=a.y&&u.y<=b.y);
        selUnits = e.shiftKey ? [...new Set([...selUnits,...found])] : found;
      }
    }
    dragBand=null;
  } else {
    // click
    if(e.ctrlKey){
      for(const u of playerUnits()){
        if(Math.hypot(u.x-mouse.wx,u.y-mouse.wy)<18) u.order={x:mouse.wx,y:mouse.wy};
      }
    } else {
      const u=playerUnits().find(u=>Math.hypot(u.x-mouse.wx,u.y-mouse.wy)<18);
      if(u){
        if(e.shiftKey) selUnits.push(u);
        else selUnits=[u];
      } else selUnits=[];
    }
  }
  mouse.dragging=false;
});

function buildingAt(wx,wy,who){
  for(const b of S.buildings){
    const o=plotOrigin(b.owner??"p"), d=BUILD[b.type];
    const x=o.x+b.gx*SLOT, y=o.y+b.gy*SLOT;
    if(wx>=x&&wx<=x+d.w*SLOT&&wy>=y&&wy<=y+d.h*SLOT){
      if(who==="p"&&(b.owner??"p")!=="p") continue;
      if(who==="bot"&&(b.owner??"p")==="p") continue;
      return b;
    }
  }
  return null;
}
function cancelPlacement(){
  if(!S.placing) return;
  S.inventory.push({kind:'b',type:S.placing}); // give it back
  S.placing=null;
  toast('Placement cancelled — item returned to backpack','#8f9aa8');
}
