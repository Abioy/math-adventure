// 游戏配置 + 题目系统

// 游戏全局状态
const G = {
  score: 0, stars: 0, lives: 5, level: 1,
  correct: 0, total: 0,
  difficulty: 'easy',
  mode: 'practice', // 'practice' 或 'exam'
  examIndex: 0, // 冒险模式下当前地图索引
  isPlaying: false, isPaused: false, isMathMode: false,
  currentAnswer: '', currentProblem: null, currentBlock: null,
  cameraX: 0,
  keys: {},
  touchInput: { left: false, right: false, jump: false },
  // 题目集配置
  questionSet: null,
  questionSetFile: 'questions/math-basic.js',
  presetIndex: 0,
};

// 难度配置
const DIFF = {
  easy:   { add: [1, 20], sub: [1, 20], mul: false, enemies: 3, blocks: 8, levelLen: 120 },
  medium: { add: [10, 50], sub: [10, 50], mul: [2, 5], enemies: 5, blocks: 12, levelLen: 160 },
  hard:   { add: [10, 99], sub: [10, 99], mul: [2, 9], enemies: 8, blocks: 16, levelLen: 200 },
};

// 随机整数
function ri(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }

// ===== 题目集加载 =====

// 加载题目集 (支持 file:// 和 http:// 两种协议)
// file:// 用 <script> 标签加载 .js 文件（不受 CORS 限制）
// http:// 用 fetch() 加载 .json 文件
function loadQuestionSet(file) {
  return new Promise((resolve) => {
    // 自动补全扩展名
    let src = file;
    if (!src.includes('.')) src = file.replace('.json', '.js');

    const script = document.createElement('script');
    script.src = src;
    script.onload = () => {
      G.questionSet = window.__QS__;
      delete window.__QS__;
      // 自动检测 mode
      if (!G.questionSet.mode) {
        if (G.questionSet.questions || G.questionSet.preset) G.questionSet.mode = 'preset';
        else G.questionSet.mode = 'generator';
      }
      G.presetIndex = 0;
      console.log(`[题目集] 已加载: ${G.questionSet.name} (${G.questionSet.mode})`);
      document.head.removeChild(script);
      resolve();
    };
    script.onerror = () => {
      console.warn(`[题目集] 加载失败 ${src}, 使用默认生成器`);
      G.questionSet = { name: '默认', mode: 'generator', generators: getDefaultGenerators() };
      resolve();
    };
    document.head.appendChild(script);
  });
}

// 默认生成器 (兼容旧难度配置)
function getDefaultGenerators() {
  const d = DIFF[G.difficulty];
  const ops = ['add', 'sub'];
  if (d.mul) ops.push('mul');
  return [
    { type: 'calc', weight: 3, config: { ops, min: d.add[0], max: d.add[1], mulMax: d.mul ? d.mul[1] : 9 } },
    { type: 'choice', weight: 1, config: { ops, min: d.add[0], max: d.add[1], mulMax: d.mul ? d.mul[1] : 9, options: 4 } },
    { type: 'bool', weight: 1, config: { ops, min: d.add[0], max: d.add[1], mulMax: d.mul ? d.mul[1] : 9, wrongRate: 0.5 } },
  ];
}

// ===== 题目生成 =====

// 生成一题 (根据题目集配置)
function genProblem() {
  if (!G.questionSet) {
    G.questionSet = { name: '默认', mode: 'generator', generators: getDefaultGenerators() };
  }
  const qs = G.questionSet;

  // 预设模式：从 preset 或 questions 数组取（随机打乱）
  const presetArr = qs.preset || qs.questions;
  if (qs.mode === 'preset' && presetArr && presetArr.length > 0) {
    if (!qs._shuffled) {
      // 首次使用时复制并打乱
      qs._shuffled = presetArr.slice();
      for (let i = qs._shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [qs._shuffled[i], qs._shuffled[j]] = [qs._shuffled[j], qs._shuffled[i]];
      }
    }
    const q = qs._shuffled[G.presetIndex % qs._shuffled.length];
    G.presetIndex++;
    return normalizeQuestion(q);
  }

  // 混合模式：预设答完切生成
  if (qs.mode === 'mixed' && presetArr && presetArr.length > 0) {
    if (G.presetIndex < presetArr.length) {
      const q = presetArr[G.presetIndex];
      G.presetIndex++;
      return normalizeQuestion(q);
    }
    // 预设答完，走生成器
  }

  // 生成器模式
  if (qs.generators && qs.generators.length > 0) {
    return generateFromConfig(weightedRandom(qs.generators));
  }

  // 兜底：旧逻辑
  return legacyGenProblem();
}

// 标准化题目格式
function normalizeQuestion(q) {
  const normalized = {
    type: q.type || 'calc',
    question: q.question || q.text || '',
    answer: q.answer,
    options: q.options || null,
  };

  // 选择题：将 A/B/C/D 答案转为索引
  if (normalized.type === 'choice' && normalized.options) {
    const letter = String(normalized.answer).trim().toUpperCase();
    const letterIndex = letter.charCodeAt(0) - 65; // A=0, B=1, C=2, D=3
    if (letterIndex >= 0 && letterIndex < normalized.options.length) {
      normalized.answer = letterIndex;
    }
  }

  return normalized;
}

// 加权随机选生成器
function weightedRandom(generators) {
  const total = generators.reduce((s, g) => s + (g.weight || 1), 0);
  let r = Math.random() * total;
  for (const g of generators) {
    r -= (g.weight || 1);
    if (r <= 0) return g;
  }
  return generators[generators.length - 1];
}

// 根据生成器配置生成题目
function generateFromConfig(gen) {
  const c = gen.config || {};
  switch (gen.type) {
    case 'calc': return genCalc(c);
    case 'choice': return genChoice(c);
    case 'bool': return genBool(c);
    default: return genCalc(c);
  }
}

// 生成计算题
function genCalc(c) {
  const ops = c.ops || ['add', 'sub'];
  const op = ops[ri(0, ops.length - 1)];
  const min = c.min || 1;
  const max = c.max || 20;
  const mulMax = c.mulMax || 9;
  let a, b, ans, sym;
  if (op === 'add') { a = ri(min, max); b = ri(min, max); ans = a + b; sym = '+'; }
  else if (op === 'sub') { a = ri(min, max); b = ri(min, Math.min(a, max)); ans = a - b; sym = '-'; }
  else { a = ri(2, mulMax); b = ri(2, mulMax); ans = a * b; sym = '×'; }
  return { type: 'calc', question: `${a} ${sym} ${b}`, answer: ans };
}

// 生成选择题 (数学)
function genChoice(c) {
  const calc = genCalc(c);
  const correct = calc.answer;
  const opts = [correct];
  while (opts.length < (c.options || 4)) {
    const fake = correct + ri(-5, 5);
    if (fake >= 0 && !opts.includes(fake)) opts.push(fake);
  }
  // 打乱
  for (let i = opts.length - 1; i > 0; i--) {
    const j = ri(0, i);
    [opts[i], opts[j]] = [opts[j], opts[i]];
  }
  return { type: 'choice', question: calc.question + ' = ?', options: opts, answer: opts.indexOf(correct) };
}

// 生成判断题 (数学)
function genBool(c) {
  const calc = genCalc(c);
  const wrongRate = c.wrongRate || 0.5;
  const isWrong = Math.random() < wrongRate;
  const display = isWrong ? calc.answer + ri(1, 5) : calc.answer;
  return { type: 'bool', question: `${calc.question} = ${display}`, answer: !isWrong };
}

// 旧版生成逻辑 (兼容)
function legacyGenProblem() {
  const d = DIFF[G.difficulty];
  const types = ['add', 'sub'];
  if (d.mul) types.push('mul');
  const t = types[ri(0, types.length - 1)];
  let a, b, ans, sym;
  if (t === 'add') { a = ri(d.add[0], d.add[1]); b = ri(d.add[0], d.add[1]); ans = a + b; sym = '+'; }
  else if (t === 'sub') { a = ri(d.sub[0], d.sub[1]); b = ri(d.sub[0], Math.min(a, d.sub[1])); ans = a - b; sym = '-'; }
  else { a = ri(d.mul[0], d.mul[1]); b = ri(d.mul[0], d.mul[1]); ans = a * b; sym = '×'; }
  return { type: 'calc', question: `${a} ${sym} ${b}`, answer: ans };
}
