// 游戏流程控制

// 冒险地图列表
const EXAM_PAPERS = [
  { file: 'questions/shenzhen-grade2-final.js', name: '深圳龙岗', desc: '48 个挑战' },
  { file: 'questions/shenzhen-futian-grade2-final.js', name: '深圳福田', desc: '28 个挑战' },
  { file: 'questions/qingdao-laixi-grade2-final.js', name: '青岛莱西', desc: '42 个挑战' },
];

function startGame() {
  initAudio();
  hideScreen('start-screen'); hideScreen('practice-screen'); hideScreen('exam-screen'); hideScreen('end-screen');
  closeMathPopup(); // 确保弹窗关闭
  G.score = 0; G.stars = 0; G.lives = 5; G.level = 1;
  G.correct = 0; G.total = 0; G.cameraX = 0;
  G.isPlaying = true; G.isPaused = false; G.isMathMode = false; G.currentAnswer = '';
  if (player) { scene.remove(player.mesh); player = null; }
  clock.start();
  createPlayer(); generateLevel(); updateHUD();
}

function startLevel() {
  hideScreen('end-screen');
  closeMathPopup(); // 确保弹窗关闭
  G.lives = 5; G.cameraX = 0;
  G.isPlaying = true; G.isPaused = false; G.isMathMode = false; G.currentAnswer = '';
  if (player) scene.remove(player.mesh);
  clock.start();

  // 冒险模式：加载下一张地图
  if (G.mode === 'exam') {
    G.level++;
    const nextExam = EXAM_PAPERS[G.level - 1];
    if (nextExam) {
      G.examIndex = G.level - 1;
      loadQuestionSet(nextExam.file).then(() => {
        createPlayer(); generateLevel(); updateHUD();
      });
      return;
    }
  }

  createPlayer(); generateLevel(); updateHUD();
}

function levelComplete() {
  G.isPlaying = false; playSound('powerup');
  const acc = G.total > 0 ? Math.round((G.correct / G.total) * 100) : 0;
  const isExam = G.mode === 'exam';
  if (isExam) {
    const currentExam = EXAM_PAPERS[G.level - 1];
    const nextExam = EXAM_PAPERS[G.level];
    document.getElementById('end-title').textContent = `🎉 ${currentExam.name} 冒险完成！`;
    document.getElementById('next-btn').textContent = nextExam ? `➡ ${nextExam.name} 冒险` : '🏆 全部冒险完成！';
    if (!nextExam) {
      document.getElementById('next-btn').onclick = () => { showScreen('start-screen'); };
    } else {
      document.getElementById('next-btn').onclick = () => { startLevel(); };
    }
  } else {
    document.getElementById('end-title').textContent = '🎉 第 ' + G.level + ' 关通过！';
    document.getElementById('next-btn').textContent = '➡ 第 ' + (G.level + 1) + ' 关';
    document.getElementById('next-btn').onclick = () => { startLevel(); };
  }
  document.getElementById('end-score').textContent = G.score;
  document.getElementById('end-stars').textContent = G.stars;
  document.getElementById('end-acc').textContent = acc + '%';
  showScreen('end-screen');
}

function gameOver() {
  G.isPlaying = false;
  const acc = G.total > 0 ? Math.round((G.correct / G.total) * 100) : 0;
  document.getElementById('end-title').textContent = '😵 体力用完啦';
  document.getElementById('end-score').textContent = G.score;
  document.getElementById('end-stars').textContent = G.stars;
  document.getElementById('end-acc').textContent = acc + '%';
  document.getElementById('next-btn').textContent = '🔄 再来一次';
  document.getElementById('next-btn').onclick = () => { startLevel(); };
  showScreen('end-screen');
}

function showScreen(id) { document.getElementById(id).classList.remove('hidden'); }
function hideScreen(id) { document.getElementById(id).classList.add('hidden'); }
