// 入口 + 主循环

let _debugFrameCount = 0;
function animate() {
  requestAnimationFrame(animate);
  _debugFrameCount++;
  // 每 60 帧输出一次调试信息
  if (_debugFrameCount % 60 === 0) {
    console.log('[animate] frame:', _debugFrameCount, 'playing:', G.isPlaying,
      player ? 'px:' + player.mesh.position.x.toFixed(1) : 'no-player');
  }
  const dt = Math.min(clock.getDelta(), 0.05);
  const time = clock.getElapsedTime();

  if (G.isPlaying && !G.isPaused && !G.isMathMode) {
    updatePlayer(dt);
    updateEnemies(dt);
    updateQuestionBlocks(time);
    updateCamera();
  }

  updateParticles(dt);
  clouds.forEach(c => {
    c.position.x += 0.005;
    if (c.position.x > G.cameraX + 60) c.position.x = G.cameraX - 40;
  });

  renderer.render(scene, camera);
}

// 移动端音频：首次交互时唤醒 AudioContext
['touchstart', 'click'].forEach(evt => {
  document.addEventListener(evt, initAudio, { once: true });
});

document.addEventListener('DOMContentLoaded', () => {
  initScene();
  renderer.setClearColor(0x5c94fc); // 确保清除色正确
  setupInput(); // 所有输入事件（按钮/键盘/触摸）统一在 input.js
  animate();
});

// 构建冒险地图列表（动态生成按钮）
function buildExamList() {
  const list = document.getElementById('exam-list');
  list.innerHTML = '';
  EXAM_PAPERS.forEach((exam, i) => {
    const btn = document.createElement('button');
    btn.className = 'exam-btn';
    btn.innerHTML = `<strong>${exam.name}</strong><small>${exam.desc}</small>`;
    btn.addEventListener('click', () => {
      G.mode = 'exam';
      G.examIndex = i;
      G.questionSetFile = exam.file;
      loadQuestionSet(exam.file).then(() => {
        hideScreen('exam-screen');
        startGame();
      });
    });
    list.appendChild(btn);
  });
}
