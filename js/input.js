// 输入处理 (键盘 + 触摸 + 按钮点击)
// 所有输入事件统一在此管理

function setupInput() {
  // ===== 测试音效按钮 =====
  document.getElementById('test-sound-btn').addEventListener('click', () => {
    const debug = document.getElementById('audio-debug');
    debug.style.display = 'block';
    try {
      const types = ['jump', 'coin', 'correct', 'wrong', 'bump', 'die'];
      types.forEach((t, i) => { setTimeout(() => playSound(t), i * 300); });
      debug.textContent = `播放: ${types.join(', ')}`;
    } catch (e) {
      debug.textContent = `❌ ${e.message}`;
    }
    const btn = document.getElementById('test-sound-btn');
    btn.textContent = '🔊 听到了吗？';
    setTimeout(() => { btn.textContent = '🔊 测试音效'; debug.style.display = 'none'; }, 2500);
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
