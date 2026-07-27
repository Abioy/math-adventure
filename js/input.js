// 输入处理 (键盘 + 触摸 + 按钮点击)
// 所有输入事件统一在此管理

function setupInput() {
  // ===== 测试音效按钮 =====
  document.getElementById('test-sound-btn').addEventListener('click', () => {
    const debug = document.getElementById('audio-debug');
    try {
      const ctx = ensureAudio();
      debug.style.display = 'block';

      // 测试 1: Web Audio
      playSound('coin');

      // 测试 2: HTML5 Audio (直接播放)
      let html5Ok = false;
      try {
        const a = new Audio('data:audio/wav;base64,UklGRkQDAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YSADAACAq9Ht/f3v1K6EWDEUAwEOKE13o8rp+/7z2raLYDgYBQAKI0Zwm8Tk+f/2372TaD8dCAAIHT9ok73f9v/55MSbcEYjCgAFGDhgi7ba8/776cqjd00oDgEDFDFYhK7U7/397dGrf1QuEgICECtRe6fO6/z+8deyiFw1FgQBDCVJdJ/H5/r/9dy5j2Q7GwYACSBCbJfA4vf/9+LAl2xCIAkABhs7ZI+53PX/+ufHn3RJJQwBBBY1XIiy1/H+/OvOp3tRKxACAhIuVICr0e39/e/UroRYMRQDAQ4oTXejyun7/vPatotgOBgFAAojRnCbxOT5//bfvZNoPx0IAAgdP2iTvd/2//nkxJtwRiMKAAUYOGCLttrz/vvpyqN3TSgOAQMUMViErtTv/f3t0auAVC4SAgIQK1F7p87r/P7x17KIXDUWBAEMJUl0n8fn+v/13LmPZDsbBgAJIEJsl8Di9//34sCXbEIgCQAGGztkj7nc9f/658efdEklDAEEFjVciLLX8f78686ne1ErEAICEi5UgKvR7f3979SuhFgxFAMBDihNd6PK6fv+89q2i2A4GAUACiNGcJvE5Pn/9t+9k2g/HQgACB0/aJO93/b/+eTEm3BGIwoABRg4YIu22vP+++nKo3dNKA4BAxQxWISu1O/9/e3Rq39ULhICAhArUXunzuv8/vHXsohcNRYEAQwlSXSfx+f6//XcuY9kOxsGAAkgQmyXwOL3//fiwJdsQiAJAAYbO2SPudz1//rnx590SSUMAQQWNVyIstfx/vzrzqd7USsQAgISLlR/q9Ht/f3v1K6EWDEUAwEOKE13o8rp+/7z2raLYDgYBQAKI0Zwm8Tk+f/2372TaD8dCAAIHT9ok73f9v/55MSbcEYjCgAFGDhgi7ba8/776cqjd00oDgEDFDFYhK7U7/397dGrgFQuEgICECtRe6fO6/z+8deyiFw1FgQBDCVJdJ/H5/r/9dy5j2Q7GwYACSBCbJfA4vf/9+LAl2xCIAkABhs7ZI+53PX/+ufHn3RJJQwBBBY1XIiy1/H+/OvOp3tRKxACAhIuVA==');
        a.pause(); a.currentTime = 0; a.play();
        html5Ok = true;
      } catch(e) { html5Ok = false; }

      debug.textContent = `WebAudio:${ctx.state} | HTML5Audio:${html5Ok?'OK':'FAIL'} | ${navigator.userAgent.slice(0,50)}`;

      const btn = document.getElementById('test-sound-btn');
      btn.textContent = '🔊 听到了吗？(WebAudio+HTML5各一次)';
      setTimeout(() => {
        btn.textContent = '🔊 测试音效';
        debug.style.display = 'none';
      }, 5000);
    } catch (e) {
      debug.style.display = 'block';
      debug.textContent = `❌ 错误: ${e.message}`;
    }
  });

  // ===== 难度按钮 =====
  document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      G.difficulty = btn.dataset.diff;
    });
  });

  // ===== 模式选择 =====
  document.getElementById('mode-practice').addEventListener('click', () => {
    hideScreen('start-screen');
    showScreen('practice-screen');
  });
  document.getElementById('mode-exam').addEventListener('click', () => {
    hideScreen('start-screen');
    buildExamList();
    showScreen('exam-screen');
  });

  // ===== 返回按钮 =====
  document.getElementById('back-to-start').addEventListener('click', () => {
    hideScreen('practice-screen');
    showScreen('start-screen');
  });
  document.getElementById('back-to-start-exam').addEventListener('click', () => {
    hideScreen('exam-screen');
    showScreen('start-screen');
  });

  // ===== 练习模式开始 =====
  document.getElementById('start-practice-btn').addEventListener('click', () => {
    G.mode = 'practice';
    hideScreen('practice-screen');
    startGame();
  });

  // 兼容旧 start-btn（直接进练习模式）
  document.getElementById('start-btn')?.addEventListener('click', () => {
    G.mode = 'practice';
    hideScreen('start-screen');
    startGame();
  });

  // ===== 下一关 =====
  document.getElementById('next-btn').addEventListener('click', () => {
    startLevel();
  });

  // ===== 重新开始 =====
  document.getElementById('restart-btn').addEventListener('click', () => {
    hideScreen('end-screen');
    showScreen('start-screen');
  });

  // ===== 暂停/继续 =====
  document.getElementById('pause-btn').addEventListener('click', () => {
    G.isPaused = !G.isPaused;
    if (G.isPaused) showScreen('pause-overlay');
    else hideScreen('pause-overlay');
  });
  document.getElementById('resume-btn').addEventListener('click', () => {
    G.isPaused = false;
    hideScreen('pause-overlay');
  });

  // ===== 数字键盘 =====
  document.querySelectorAll('.np-btn[data-n]').forEach(b => b.addEventListener('click', () => {
    const input = document.getElementById('popup-input');
    if (input && input.value.length < 10) {
      input.value += b.dataset.n;
      input.dispatchEvent(new Event('input'));
    }
  }));
  document.getElementById('np-ok').addEventListener('click', submitMathAnswer);
  document.getElementById('np-und').addEventListener('click', () => {
    const input = document.getElementById('popup-input');
    if (input) {
      input.value = input.value.slice(0, -1);
      input.dispatchEvent(new Event('input'));
    }
  });
  document.getElementById('np-cls').addEventListener('click', () => {
    const input = document.getElementById('popup-input');
    if (input) { input.value = ''; input.dispatchEvent(new Event('input')); }
  });

  // ===== 键盘 =====
  document.addEventListener('keydown', e => {
    G.keys[e.key] = true;
    if (G.isMathMode) {
      const prob = G.currentProblem;
      if (prob && (prob.type === 'calc' || prob.type === 'fill')) {
        if (e.key === 'Enter') {
          e.preventDefault();
          submitMathAnswer();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          G.currentAnswer = '';
          const inp = document.getElementById('popup-input');
          if (inp) inp.value = '';
        } else {
          const inp = document.getElementById('popup-input');
          if (inp) { G.currentAnswer = inp.value; }
        }
      } else if (prob && prob.type === 'choice') {
        // 选择题：A/B/C/D 键选择
        const letter = e.key.toUpperCase();
        const letterIndex = letter.charCodeAt(0) - 65; // A=0, B=1, C=2, D=3
        if (letterIndex >= 0 && letterIndex < prob.options.length) {
          e.preventDefault();
          submitChoiceAnswer(letterIndex);
        }
      } else if (prob && prob.type === 'bool') {
        // 判断题：Y/1=对，N/0=错
        const key = e.key.toLowerCase();
        if (key === 'y' || key === '1') { e.preventDefault(); submitBoolAnswer(true); }
        else if (key === 'n' || key === '0') { e.preventDefault(); submitBoolAnswer(false); }
      }
    }
    if (e.key === 'p' || e.key === 'P') {
      G.isPaused = !G.isPaused;
      document.getElementById('pause-overlay').classList.toggle('hidden', !G.isPaused);
    }
  });
  document.addEventListener('keyup', e => { G.keys[e.key] = false; });

  // ===== 触摸控制 =====
  const addTouch = (id, key) => {
    const el = document.getElementById(id);
    if (!el) return;
    const s = () => { G.touchInput[key] = true; };
    const en = () => { G.touchInput[key] = false; };
    el.addEventListener('touchstart', e => { e.preventDefault(); s(); }, { passive: false });
    el.addEventListener('touchend', e => { e.preventDefault(); en(); }, { passive: false });
    el.addEventListener('touchcancel', en);
    el.addEventListener('mousedown', s); el.addEventListener('mouseup', en); el.addEventListener('mouseleave', en);
  };
  addTouch('btn-left', 'left'); addTouch('btn-right', 'right');
  addTouch('btn-up', 'jump'); addTouch('jump-btn', 'jump');
}
