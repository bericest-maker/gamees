/* Military Base 2.5D — 07-audio.js · audio: WebAudio sfx + music */
'use strict';
// ================= audio =================
let AC=null, noiseBuf=null;
function initAudio(){
  if(AC) return;
  try{
    AC = new (window.AudioContext||window.webkitAudioContext)();
    noiseBuf = AC.createBuffer(1, AC.sampleRate*1, AC.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1;
    setInterval(musicTick, 90);
  }catch(e){}
}
function tone(f,dur,type='sine',vol=.06,slideTo=null,delay=0){
  if(!AC) return;
  const t0 = AC.currentTime+delay;
  const o = AC.createOscillator(), g = AC.createGain();
  o.type=type; o.frequency.setValueAtTime(f,t0);
  if(slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20,slideTo), t0+dur);
  g.gain.setValueAtTime(vol,t0); g.gain.exponentialRampToValueAtTime(.0001,t0+dur);
  o.connect(g).connect(AC.destination); o.start(t0); o.stop(t0+dur+.02);
}
function noise(dur,vol=.08,freq=800,type='lowpass',delay=0){
  if(!AC) return;
  const t0=AC.currentTime+delay;
  const s=AC.createBufferSource(); s.buffer=noiseBuf;
  const f=AC.createBiquadFilter(); f.type=type; f.frequency.value=freq;
  const g=AC.createGain(); g.gain.setValueAtTime(vol,t0); g.gain.exponentialRampToValueAtTime(.0001,t0+dur);
  s.connect(f).connect(g).connect(AC.destination); s.start(t0); s.stop(t0+dur+.02);
}
const sfxLast={};
function sfx(name){
  if(!AC) return;
  if(!S.settings.sfx) return;
  const now=performance.now();
  if(sfxLast[name] && now-sfxLast[name]<70) return;
  sfxLast[name]=now;
  switch(name){
    case 'click':  tone(700,.05,'square',.04); break;
    case 'buy':    tone(520,.07,'square',.05); tone(784,.1,'square',.05,null,.07); break;
    case 'place':  tone(150,.14,'triangle',.12,80); noise(.08,.05,400); break;
    case 'spawn':  tone(880,.06,'sine',.045); tone(1175,.08,'sine',.04,null,.06); break;
    case 'shot':   noise(.05,.035,2500,'highpass'); break;
    case 'boom':   noise(.4,.16,300); tone(110,.35,'sine',.14,35); break;
    case 'coin':   tone(988,.07,'sine',.05); tone(1319,.1,'sine',.05,null,.07); break;
    case 'open':   tone(300,.35,'sawtooth',.045,1200); break;
    case 'horn':   tone(98,.45,'sawtooth',.08); tone(73.4,.5,'sawtooth',.08,null,.3); break;
    case 'capture':tone(523,.09,'square',.05); tone(659,.09,'square',.05,null,.09); tone(784,.16,'square',.05,null,.18); break;
    case 'error':  tone(170,.16,'square',.06); break;
    case 'rebirth':tone(200,.5,'sawtooth',.08,900); tone(600,.3,'sine',.06,null,.3); break;
  }
}
// music: tiny military-march chiptune loop
let mStep=0, mNext=0;
const CHORDS = [
  {b:65.4,  t:[523,659,784]},
  {b:49.0,  t:[494,587,784]},
  {b:55.0,  t:[440,523,659]},
  {b:43.65, t:[349,440,523]},
];
function musicTick(){
  if(!AC || !S || !S.settings.music) return;
  if(AC.state!=='running') return;
  const spb=.25;
  while(mNext < AC.currentTime+.35){
    const ch = CHORDS[Math.floor(mStep/8)%4];
    const bar = mStep%8;
    if(bar%2===0) tone(ch.b,.22,'triangle',.05);
    tone(ch.t[[0,1,2,1,0,1,2,2][bar]],.12,'square',.018);
    if(bar===0||bar===4) noise(.03,.02,6000,'highpass');
    if(bar===0) tone(120,.12,'sine',.05,45);
    mStep=(mStep+1)%32; mNext+=spb;
  }
}
