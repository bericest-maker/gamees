/* Military Base 2.5D — 16-tutorial.js · tutorial */
'use strict';
// ================= tutorial =================
const TUT=[
  `Welcome, Commander. You've been given a plot on the island.\n\nPan with <b>WASD</b> (or arrows), zoom with the <b>wheel</b>. Your plot is the gold-bordered grid.`,
  `Open the <b>SHOP</b> (top) → <b>PRODUCTION</b> tab. Buy a <b>Solar Array</b>, then click your <b>BACKPACK</b> (left) and place it on the plot.\n\nBuildings generate cash every second.`,
  `Buy a <b>BARRACKS</b> in the <b>UNITS</b> tab. It trains soldiers for free.\n\n<b>Drag</b> to select units, <b>Ctrl+click</b> to give move orders — or just smash <b>ATTACK</b> bottom-left.`,
  `The 8 plots are <b>separate islands</b> — bridges connect them. Seven enemy factions each have their own color and march on the <b>CITY (the middle)</b> by default. Capture points for production boosts (city = +20%) and the factions will fight over them.\n\nWatch the top-right timer: <b>raid waves</b> and the <b>MECHA WORM</b> boss are coming. Rebirth for permanent +10% income.\n\nGood luck, Commander. 🫡`,
];
let tutI=0;
function showTut(){
  $('#tut').classList.add('show');
  tutI=0;
  $('#tutText').innerText=TUT[0];
  $('#tutStep').textContent=`1 / ${TUT.length}`;
}
$('#tutNext').onclick=()=>{
  sfx('click');
  tutI++;
  if(tutI>=TUT.length){
    $('#tut').classList.remove('show');
    S.stats.tut=true; save();
    return;
  }
  $('#tutText').innerText=TUT[tutI];
  $('#tutStep').textContent=`${tutI+1} / ${TUT.length}`;
};
