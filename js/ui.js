// UI 更新 + 答题弹窗

function updateHUD() {
  document.getElementById('score').textContent = G.score;
  document.getElementById('stars').textContent = G.stars;
  document.getElementById('lives').textContent = G.lives;
  // 冒险模式显示地区名，练习模式显示关卡数
  if (G.mode === 'exam') {
    const exam = EXAM_PAPERS[G.examIndex];
    document.getElementById('level').textContent = exam ? exam.name : G.level;
  } else {
    document.getElementById('level').textContent = G.level;
  }
}

function openMathPopup(qb) {
  if (G.isMathMode) return;
  G.isMathMode = true;
  G.currentProblem = qb.problem;
  G.currentBlock = qb;
  G.currentAnswer = '';
  const prob = qb.problem;

  // 题目文字
  document.getElementById('popup-problem').textContent = prob.question;

  // 根据题型渲染输入区
  const inputArea = document.getElementById('popup-input-area');
  inputArea.innerHTML = '';

  if (prob.type === 'choice' && prob.options) {
    // 选择题：渲染选项按钮
    const btns = document.createElement('div');
    btns.className = 'choice-buttons';
    const letters = ['A', 'B', 'C', 'D'];
    prob.options.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      // 去掉选项自带的字母前缀（如 "A. 30" → "30"）
      const clean = opt.replace(/^[A-Da-d][.、)\.]\s*/, '');
      btn.innerHTML = `<b>${letters[i]}.</b> ${clean}`;
      btn.onclick = () => submitChoiceAnswer(i);
      btns.appendChild(btn);
    });
    inputArea.appendChild(btns);
  } else if (prob.type === 'bool') {
    // 判断题：对/错按钮
    const btns = document.createElement('div');
    btns.className = 'choice-buttons';
    [['✓ 对', 'Y'], ['✗ 错', 'N']].forEach(([label, hotkey], i) => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.innerHTML = label;
      btn.onclick = () => submitBoolAnswer(i === 0);
      btns.appendChild(btn);
    });
    inputArea.appendChild(btns);
  } else {
    // 计算题/填空题：保留原有输入框
    const input = document.createElement('input');
    input.type = prob.type === 'calc' ? 'number' : 'text';
    input.id = 'popup-input';
    input.className = 'popup-input';
    input.autofocus = true;
    inputArea.appendChild(input);
    // 同步输入到 G.currentAnswer
    input.addEventListener('input', () => { G.currentAnswer = input.value; });
  }

  // 清空答题反馈区
  const answerEl = document.getElementById('popup-answer');
  answerEl.innerHTML = '&nbsp;';
  answerEl.style.color = '#ff8f00';
  answerEl.style.display = 'none'; // 统一隐藏，反馈直接用输入框或按钮高亮

  document.getElementById('math-popup').classList.add('show');

  // 聚焦输入框
  setTimeout(() => {
    const inp = document.getElementById('popup-input');
    if (inp) inp.focus();
  }, 100);

  // 数字键盘：仅 calc/fill 显示
  const numpad = document.getElementById('numpad-popup');
  if (numpad) {
    numpad.style.display = (prob.type === 'calc' || prob.type === 'fill') ? 'grid' : 'none';
  }

  // 弹窗自适应缩放：确保不超出视口
  setTimeout(fitPopupToViewport, 30);
}

// 弹窗自适应：如果超出视口则缩小
function fitPopupToViewport() {
  const popup = document.getElementById('math-popup');
  if (!popup) return;
  const popupH = popup.scrollHeight;
  const viewportH = window.innerHeight;
  const margin = 20; // 上下留 20px 边距
  if (popupH > viewportH - margin) {
    const scale = (viewportH - margin) / popupH;
    popup.style.transform = `translate(-50%, -50%) scale(${scale})`;
  } else {
    popup.style.transform = 'translate(-50%, -50%) scale(1)';
  }
}

function closeMathPopup() {
  G.isMathMode = false;
  const popup = document.getElementById('math-popup');
  popup.classList.remove('show');
  popup.style.transform = ''; // 重置缩放
}

// 统一判题
function checkAnswer(userAnswer) {
  const prob = G.currentProblem;
  if (!prob) return false;

  if (prob.type === 'choice') {
    return userAnswer === prob.answer;
  } else if (prob.type === 'bool') {
    return userAnswer === prob.answer;
  } else if (prob.type === 'calc') {
    return parseInt(userAnswer) === prob.answer;
  } else {
    // fill: 字符串比较（忽略空格和大小写）
    return String(userAnswer).trim().toLowerCase() === String(prob.answer).trim().toLowerCase();
  }
}

// 提交计算/填空答案
function submitMathAnswer() {
  if (!G.currentProblem) return;
  const input = document.getElementById('popup-input');
  const val = input ? input.value.trim() : '';
  if (val === '') return;
  G.currentAnswer = val;

  const ok = checkAnswer(val);
  G.total++;

  if (ok) { onCorrect(); }
  else { onWrong(val); }
}

// 提交选择题答案
function submitChoiceAnswer(index) {
  if (!G.currentProblem) return;
  G.currentAnswer = G.currentProblem.options ? G.currentProblem.options[index] : index;
  const ok = checkAnswer(index);
  G.total++;

  if (ok) { onCorrect(); }
  else { onWrongChoice(index); }
}

// 选择题答错反馈：标红错选项
function onWrongChoice(wrongIndex) {
  playSound('wrong');
  const btns = document.querySelectorAll('.choice-btn');
  btns.forEach((b, i) => {
    if (i === wrongIndex) {
      b.style.background = '#ffcdd2';
      b.style.borderColor = '#f44336';
      b.style.opacity = '1';
    } else {
      b.style.opacity = '0.4';
    }
  });
  setTimeout(() => {
    btns.forEach(b => {
      b.style.background = '';
      b.style.borderColor = '';
      b.style.opacity = '1';
    });
  }, 1500);
}

// 提交判断题答案
function submitBoolAnswer(value) {
  if (!G.currentProblem) return;
  G.currentAnswer = value ? '对' : '错';
  const ok = checkAnswer(value);
  G.total++;

  if (ok) { onCorrect(); }
  else { onWrongBool(value); }
}

// 判断题答错反馈：标红错选项
function onWrongBool(wrongValue) {
  playSound('wrong');
  const btns = document.querySelectorAll('.choice-btn');
  btns.forEach((b, i) => {
    const btnValue = i === 0;
    if (btnValue === wrongValue) {
      b.style.background = '#ffcdd2';
      b.style.borderColor = '#f44336';
      b.style.opacity = '1';
    } else {
      b.style.opacity = '0.4';
    }
  });
  setTimeout(() => {
    btns.forEach(b => {
      b.style.background = '';
      b.style.borderColor = '';
      b.style.opacity = '1';
    });
  }, 1500);
}

function onCorrect() {
  G.correct++; G.stars++; G.score += 20 + G.level * 10;
  G.currentBlock.answered = true; playSound('correct');
  const qb = G.currentBlock;
  qb.group.children[0].material.color.setHex(0x888888);
  qb.group.children[0].material.emissive.setHex(0x000000);
  qb.bumpOffset = 0.5;
  spawnParticles(qb.group.position.clone(), 0xffd700, 20);
  spawnStarText(qb.group.position.clone(), '+' + (20 + G.level * 10));
  createCoin(qb.group.position.x, qb.group.position.y + 2);
  updateHUD();
  flashInput('#4caf50', '✓');
  setTimeout(closeMathPopup, 500);
}

function onWrong(display) {
  playSound('wrong');
  flashInput('#f44336', display + ' ✗');
  // 不扣命不关弹窗，1.5 秒后重置输入让用户重试
  setTimeout(() => {
    const input = document.getElementById('popup-input');
    if (input) {
      input.type = G.currentProblem?.type === 'calc' ? 'number' : 'text';
      input.value = '';
      input.disabled = false;
      input.style.borderColor = '';
      input.style.color = '';
      input.style.background = '';
      input.focus();
    }
    G.currentAnswer = '';
    const btns = document.querySelectorAll('.choice-btn');
    btns.forEach(b => b.style.opacity = '1');
  }, 1500);
}

// 输入框反馈：变色 + 显示结果
function flashInput(color, text) {
  const input = document.getElementById('popup-input');
  if (input) {
    input.type = 'text'; // 允许显示非数字反馈
    input.style.borderColor = color;
    input.style.color = color;
    input.style.background = color + '15';
    input.value = text;
    input.disabled = true;
  }
  // choice/bool: 灰掉所有按钮
  const btns = document.querySelectorAll('.choice-btn');
  btns.forEach(b => b.style.opacity = '0.5');
}


