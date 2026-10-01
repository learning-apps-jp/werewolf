'use strict';
// Audio is triggered only by the explicitly public announcement handlers.
const PublicAudio=(()=>{
 let ctx=null,enabled=true,volume=.22,generation=0,nodes=new Set();
 try{const saved=JSON.parse(localStorage.getItem('moon-public-audio')||'null');if(saved){enabled=saved.enabled!==false;volume=Math.max(.05,Math.min(.5,Number(saved.volume)||.22));}}catch{}
 function save(){try{localStorage.setItem('moon-public-audio',JSON.stringify({enabled,volume}));}catch{}}
 function stop(){generation++;for(const node of nodes){try{node.stop();}catch{}}nodes.clear();}
 async function prepare(){if(!enabled)return;try{let Type=window.AudioContext||window.webkitAudioContext;if(!Type)return;ctx??=new Type();await ctx.resume();}catch{}}
 function note(frequency,at,length,type='sine',level=1){let oscillator=ctx.createOscillator(),gain=ctx.createGain();oscillator.type=type;oscillator.frequency.setValueAtTime(frequency,at);gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(volume*.22*level,at+.015);gain.gain.exponentialRampToValueAtTime(.0001,at+length);oscillator.connect(gain);gain.connect(ctx.destination);nodes.add(oscillator);oscillator.onended=()=>{nodes.delete(oscillator);oscillator.disconnect();gain.disconnect();};oscillator.start(at);oscillator.stop(at+length+.03);}
 async function play(kind){stop();if(!enabled)return;let token=generation;try{let Type=window.AudioContext||window.webkitAudioContext;if(!Type)return;ctx??=new Type();await ctx.resume();if(token!==generation||document.hidden||!enabled||!canPlayPublicSound())return;let t=ctx.currentTime+.02;
  if(kind==='dawn'){[[392,0,.65],[523.25,.17,.8],[659.25,.34,.8]].forEach(([f,d,l])=>note(f,t+d,l,'sine',.7));}
  if(kind==='ballot'){[[130.81,0,.18],[130.81,.23,.18],[196,.46,.42]].forEach(([f,d,l])=>note(f,t+d,l,'triangle',.9));}
  if(kind==='reveal'){note(523.25,t,.6,'sine',.65);note(783.99,t+.08,.7,'sine',.45);}
  if(kind==='victory'){[523.25,659.25,783.99,1046.5].forEach((f,i)=>note(f,t+i*.17,.62,'triangle',.7));[523.25,659.25,783.99].forEach(f=>note(f,t+.75,.9,'sine',.5));}
  if(kind==='timer'){[0,.3,.6].forEach(d=>{note(659.25,t+d,.23,'sine',.8);note(523.25,t+d,.23,'sine',.35);});}
 }catch{/* Sound support never blocks the game. */}}
 return {play,prepare,stop,get enabled(){return enabled;},get volume(){return volume;},toggle(){enabled=!enabled;stop();save();},setVolume(v){volume=Math.max(.05,Math.min(.5,Number(v)));stop();save();}};
})();
