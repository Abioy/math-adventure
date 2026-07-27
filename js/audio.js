// 音效系统 — Web Audio API + HTML5 Audio 保底
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx;
let audioFallback = null;

function ensureAudio() {
  if (!audioCtx) audioCtx = new AudioCtx();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function initAudio() { ensureAudio(); }

// 播放音效 — 先 WebAudio，如果 context 未就绪则用 HTML5 Audio
function playSound(type) {
  try {
    const ctx = ensureAudio();
    // 如果 context 还在 suspended，用 fallback 保底
    if (ctx.state === 'suspended') { playFallback(type); return; }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.value = 0.15;
    const now = ctx.currentTime;
    if (type === 'jump') { osc.type='square'; osc.frequency.value=300; osc.frequency.exponentialRampToValueAtTime(600,now+0.15); gain.gain.exponentialRampToValueAtTime(0.001,now+0.2); osc.start(now); osc.stop(now+0.2); }
    else if (type === 'coin') { osc.type='square'; osc.frequency.value=988; osc.frequency.setValueAtTime(1319,now+0.07); gain.gain.exponentialRampToValueAtTime(0.001,now+0.3); osc.start(now); osc.stop(now+0.3); }
    else if (type === 'correct') { osc.type='sine'; osc.frequency.setValueAtTime(523,now); osc.frequency.setValueAtTime(659,now+0.1); osc.frequency.setValueAtTime(784,now+0.2); gain.gain.exponentialRampToValueAtTime(0.001,now+0.4); osc.start(now); osc.stop(now+0.4); }
    else if (type === 'wrong') { osc.type='sawtooth'; osc.frequency.value=200; gain.gain.value=0.1; gain.gain.exponentialRampToValueAtTime(0.001,now+0.3); osc.start(now); osc.stop(now+0.3); }
    else if (type === 'bump') { osc.type='triangle'; osc.frequency.value=150; gain.gain.exponentialRampToValueAtTime(0.001,now+0.1); osc.start(now); osc.stop(now+0.1); }
    else if (type === 'powerup') { osc.type='sine'; [523,587,659,698,784,880,988,1047].forEach((f,i)=>osc.frequency.setValueAtTime(f,now+i*0.06)); gain.gain.exponentialRampToValueAtTime(0.001,now+0.6); osc.start(now); osc.stop(now+0.6); }
    else if (type === 'die') { osc.type='triangle'; osc.frequency.value=400; osc.frequency.exponentialRampToValueAtTime(100,now+0.5); gain.gain.exponentialRampToValueAtTime(0.001,now+0.6); osc.start(now); osc.stop(now+0.6); }
  } catch(e) {
    playFallback(type);
  }
}

// HTML5 Audio fallback
const FALLBACK_WAV = 'data:audio/wav;base64,UklGRkQDAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YSADAACAq9Ht/f3v1K6EWDEUAwEOKE13o8rp+/7z2raLYDgYBQAKI0Zwm8Tk+f/2372TaD8dCAAIHT9ok73f9v/55MSbcEYjCgAFGDhgi7ba8/776cqjd00oDgEDFDFYhK7U7/397dGrf1QuEgICECtRe6fO6/z+8deyiFw1FgQBDCVJdJ/H5/r/9dy5j2Q7GwYACSBCbJfA4vf/9+LAl2xCIAkABhs7ZI+53PX/+ufHn3RJJQwBBBY1XIiy1/H+/OvOp3tRKxACAhIuVICr0e39/e/UroRYMRQDAQ4oTXejyun7/vPatotgOBgFAAojRnCbxOT5//bfvZNoPx0IAAgdP2iTvd/2//nkxJtwRiMKAAUYOGCLttrz/vvpyqN3TSgOAQMUMViErtTv/f3t0auAVC4SAgIQK1F7p87r/P7x17KIXDUWBAEMJUl0n8fn+v/13LmPZDsbBgAJIEJsl8Di9//34sCXbEIgCQAGGztkj7nc9f/658efdEklDAEEFjVciLLX8f78686ne1ErEAICEi5UgKvR7f3979SuhFgxFAMBDihNd6PK6fv+89q2i2A4GAUACiNGcJvE5Pn/9t+9k2g/HQgACB0/aJO93/b/+eTEm3BGIwoABRg4YIu22vP+++nKo3dNKA4BAxQxWISu1O/9/e3Rq39ULhICAhArUXunzuv8/vHXsohcNRYEAQwlSXSfx+f6//XcuY9kOxsGAAkgQmyXwOL3//fiwJdsQiAJAAYbO2SPudz1//rnx590SSUMAQQWNVyIstfx/vzrzqd7USsQAgISLlR/q9Ht/f3v1K6EWDEUAwEOKE13o8rp+/7z2raLYDgYBQAKI0Zwm8Tk+f/2372TaD8dCAAIHT9ok73f9v/55MSbcEYjCgAFGDhgi7ba8/776cqjd00oDgEDFDFYhK7U7/397dGrgFQuEgICECtRe6fO6/z+8deyiFw1FgQBDCVJdJ/H5/r/9dy5j2Q7GwYACSBCbJfA4vf/9+LAl2xCIAkABhs7ZI+53PX/+ufHn3RJJQwBBBY1XIiy1/H+/OvOp3tRKxACAhIuVA==';

function playFallback(type) {
  if (!audioFallback) audioFallback = new Audio(FALLBACK_WAV);
  try { audioFallback.pause(); audioFallback.currentTime = 0; audioFallback.play(); } catch(e) {}
}
