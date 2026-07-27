// 音效系统
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx;

function initAudio() {
  if (!audioCtx) audioCtx = new AudioCtx();
  // 移动端浏览器需要用户交互后才能播放音频
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playSound(type) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain); gain.connect(audioCtx.destination);
  gain.gain.value = 0.12;
  const now = audioCtx.currentTime;
  if (type === 'jump') { osc.type='square'; osc.frequency.value=300; osc.frequency.exponentialRampToValueAtTime(600,now+0.15); gain.gain.exponentialRampToValueAtTime(0.001,now+0.2); osc.start(); osc.stop(now+0.2); }
  else if (type === 'coin') { osc.type='square'; osc.frequency.value=988; osc.frequency.setValueAtTime(1319,now+0.07); gain.gain.exponentialRampToValueAtTime(0.001,now+0.3); osc.start(); osc.stop(now+0.3); }
  else if (type === 'correct') { osc.type='sine'; osc.frequency.setValueAtTime(523,now); osc.frequency.setValueAtTime(659,now+0.1); osc.frequency.setValueAtTime(784,now+0.2); gain.gain.exponentialRampToValueAtTime(0.001,now+0.4); osc.start(); osc.stop(now+0.4); }
  else if (type === 'wrong') { osc.type='sawtooth'; osc.frequency.value=200; gain.gain.value=0.08; gain.gain.exponentialRampToValueAtTime(0.001,now+0.3); osc.start(); osc.stop(now+0.3); }
  else if (type === 'bump') { osc.type='triangle'; osc.frequency.value=150; gain.gain.exponentialRampToValueAtTime(0.001,now+0.1); osc.start(); osc.stop(now+0.1); }
  else if (type === 'powerup') { osc.type='sine'; [523,587,659,698,784,880,988,1047].forEach((f,i)=>osc.frequency.setValueAtTime(f,now+i*0.06)); gain.gain.exponentialRampToValueAtTime(0.001,now+0.6); osc.start(); osc.stop(now+0.6); }
  else if (type === 'die') { osc.type='triangle'; osc.frequency.value=400; osc.frequency.exponentialRampToValueAtTime(100,now+0.5); gain.gain.exponentialRampToValueAtTime(0.001,now+0.6); osc.start(); osc.stop(now+0.6); }
}
