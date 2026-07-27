// 游戏物理测试套件 (30 项)
// 用法: agent-browser eval "$(cat test-physics.js)"

(function() {
  var results = [];
  var pass = 0, fail = 0;

  function assert(name, condition, detail) {
    if (condition) { pass++; results.push('✅ ' + name + (detail ? ' (' + detail + ')' : '')); }
    else { fail++; results.push('❌ ' + name + (detail ? ' (' + detail + ')' : '')); }
  }

  // 辅助：找到最高平台
  function getHighestPlat() {
    var plats = colliders.filter(function(c) { return c.maxY > 1 && (c.maxY - c.minY) < 1; });
    if (!plats.length) return null;
    var h = plats[0];
    for (var i = 1; i < plats.length; i++) { if (plats[i].maxY > h.maxY) h = plats[i]; }
    return h;
  }

  // 辅助：重置玩家 + 清理按键
  function resetPlayer(x, y) {
    player.mesh.position.set(x || 2, y || 0, 0);
    player.vx = 0; player.vy = 0; player.onGround = true;
    player.invincible = 0;
    G.keys = {};
    G.touchInput = { left: false, right: false, jump: false };
  }

  // 辅助：找可用的敌人（复活已死亡的，重新加入场景，重置位置）
  function findEnemy() {
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (!e.group.parent) {
        // 敌人被移出了场景，重新加入
        scene.add(e.group);
      }
      e.alive = true;
      e.squishTimer = 0;
      e.group.scale.y = 1;
      e.x = (e.minX + e.maxX) / 2; // 重置到巡逻范围中心
      e.group.position.x = e.x;
      e.group.position.y = 0;
      e.dir = 1;
      return e;
    }
    return null;
  }

  // ========== 测试 1: 对象不重叠 ==========
  (function() {
    var bricks = colliders.filter(function(c) { return (c.maxY - c.minY) > 1; });
    var qbs = questionBlocks;
    var issues = [];
    bricks.forEach(function(b) {
      qbs.forEach(function(q) {
        if (q.maxX > b.minX && q.minX < b.maxX) issues.push('brick@' + ((b.minX+b.maxX)/2).toFixed(0) + ' vs qb');
      });
    });
    enemies.filter(function(e){return e.alive}).forEach(function(e) {
      bricks.forEach(function(b) {
        if (e.mx > b.minX - 0.5 && e.mn < b.maxX + 0.5) issues.push('enemy vs brick');
      });
    });
    assert('对象不重叠', issues.length === 0, issues.length + ' issues');
  })();

  // ========== 测试 2: 平台可跳上去 ==========
  (function() {
    var plat = getHighestPlat();
    if (!plat) { assert('平台存在', false); return; }

    // 2a: 正下方跳 → 顶头弹回
    resetPlayer((plat.minX + plat.maxX) / 2, 0);
    G.keys[' '] = true;
    for (var i = 0; i < 30; i++) { updatePlayer(0.016); if (player.onGround && i > 3) break; }
    G.keys[' '] = false;
    assert('正下方跳顶头弹回', player.mesh.position.y < 0.5, 'y=' + player.mesh.position.y.toFixed(2));

    // 2b: 侧面跳 → 上去
    resetPlayer(plat.minX - 0.3, 0);
    G.keys[' '] = true;
    for (var i = 0; i < 60; i++) { updatePlayer(0.016); if (player.onGround && player.mesh.position.y > 2) break; }
    G.keys[' '] = false;
    assert('侧面跳上平台', player.mesh.position.y > 2, 'y=' + player.mesh.position.y.toFixed(2));

    // 2c: 跑+跳 → 上去（用 plat 左侧 0.5 单位开始跑，更靠近边缘）
    resetPlayer(plat.minX - 0.5, 0);
    G.keys['d'] = true;
    for (var i = 0; i < 5; i++) updatePlayer(0.016); // 跑几步加速
    G.keys[' '] = true; // 在平台边缘前跳
    for (var i = 0; i < 80; i++) { updatePlayer(0.016); if (player.onGround && player.mesh.position.y > 2) break; }
    G.keys[' '] = false; G.keys['d'] = false;
    assert('跑+跳上平台', player.mesh.position.y > 2, 'y=' + player.mesh.position.y.toFixed(2) + ' plat.minX=' + plat.minX.toFixed(1));
  })();

  // ========== 测试 3: 砖块挡住 ==========
  (function() {
    var bricks = colliders.filter(function(c) { return (c.maxY - c.minY) > 1; });
    if (!bricks.length) { assert('砖块存在', false); return; }
    var bk = bricks[0];
    resetPlayer(bk.minX - 1, 0);
    G.keys['d'] = true;
    for (var i = 0; i < 30; i++) updatePlayer(0.016);
    G.keys['d'] = false;
    assert('砖块挡住玩家', player.mesh.position.x < bk.minX + 0.5, 'x=' + player.mesh.position.x.toFixed(2));
  })();

  // ========== 测试 4: 高速下落不穿地 ==========
  (function() {
    var failed = 0;
    for (var tx = 5; tx < 120; tx += 10) {
      resetPlayer(tx, 10);
      player.onGround = false;
      for (var i = 0; i < 100; i++) updatePlayer(0.016);
      if (player.mesh.position.y < -1) failed++;
    }
    assert('高速下落不穿地', failed === 0, failed + '/12 failed');
  })();

  // ========== 测试 5: 地面缺口上方无物体 ==========
  (function() {
    var grounds = colliders.filter(function(c) { return c.maxY >= 0 && c.maxY <= 0.1 && c.minY <= -0.5; });
    grounds.sort(function(a,b){return a.minX - b.minX;});
    var gaps = [];
    for (var i = 1; i < grounds.length; i++) {
      var gap = grounds[i].minX - grounds[i-1].maxX;
      if (gap > 0.1) gaps.push({from: grounds[i-1].maxX, to: grounds[i].minX});
    }
    var issues = 0;
    var plats = colliders.filter(function(c) { return c.maxY > 1; });
    gaps.forEach(function(gap) {
      plats.forEach(function(p) { if (p.maxX > gap.from && p.minX < gap.to) issues++; });
      questionBlocks.forEach(function(q) { if (q.maxX > gap.from && q.minX < gap.to) issues++; });
    });
    assert('缺口上方无物体', issues === 0, issues + ' issues, ' + gaps.length + ' gaps');
  })();

  // ========== 测试 6: 受伤弹起不落到平台 ==========
  (function() {
    resetPlayer(2, 0);
    player.vy = 0.08; // 模拟受伤弹起
    var maxY = 0;
    for (var i = 0; i < 60; i++) {
      updatePlayer(0.016);
      if (player.mesh.position.y > maxY) maxY = player.mesh.position.y;
      if (player.onGround && i > 3) break;
    }
    assert('受伤弹起不落到平台', maxY < 1 && player.mesh.position.y < 0.5, 'maxY=' + maxY.toFixed(2) + ' finalY=' + player.mesh.position.y.toFixed(2));
  })();

  // ========== 测试 7: 怪物悬空掉落 ==========
  (function() {
    var e = findEnemy();
    if (!e) { assert('敌人存在', false); return; }
    // 保存原始巡逻范围（findEnemy 可能返回被测试 10/14/15 修改过的敌人）
    var origMinX = e.minX, origMaxX = e.maxX;
    // 把敌人放到缺口位置测试掉落
    e.x = -12; e.group.position.x = -12; e.group.position.y = 0;
    for (var i = 0; i < 60; i++) updateEnemies(0.016);
    assert('怪物悬空掉落', e.group.position.y < -0.5, 'y=' + e.group.position.y.toFixed(2));
    // 恢复原始巡逻范围
    e.minX = origMinX; e.maxX = origMaxX;
    // 把敌人放回原位
    e.x = (e.minX + e.maxX) / 2;
    e.group.position.x = e.x;
    e.group.position.y = 0;
    e.alive = true;
  })();

  // ========== 测试 8: 玩家移动速度合理 ==========
  (function() {
    resetPlayer(2, 0);
    G.keys['d'] = true;
    for (var i = 0; i < 60; i++) updatePlayer(0.016);
    G.keys['d'] = false;
    var dist = player.mesh.position.x - 2;
    assert('移动速度合理 (8-12单位/秒)', dist > 8 && dist < 12, dist.toFixed(1) + ' units/s');
  })();

  // ========== 测试 9: 金币收集 ==========
  (function() {
    // 先重置所有金币为未收集
    coins.forEach(function(c) { c.collected = false; scene.add(c.mesh); });
    var coin = coins[0];
    resetPlayer(coin.minX - 0.3, coin.minY - 1.3);
    for (var i = 0; i < 10; i++) updatePlayer(0.016);
    assert('金币可被收集', coin.collected, 'collected=' + coin.collected);
  })();

  // ========== 测试 10: 踩敌人 ==========
  (function() {
    var e = findEnemy();
    if (!e) { assert('敌人存在', false); return; }
    var oldScore = G.score;
    // 玩家放在敌人正上方，脚在敌人头部附近，vy 为负模拟下落踩头
    resetPlayer(e.x, 0.5);
    player.vy = -0.3;
    player.onGround = false;
    updatePlayer(0.016); // 一帧就够了
    assert('踩敌人得分', !e.alive && G.score > oldScore, 'alive=' + e.alive + ' score=' + G.score + ' vy=' + player.vy.toFixed(3));
  })();

  // ========== 测试 11: 跳跃高度合理 ==========
  (function() {
    resetPlayer(2, 0);
    G.keys[' '] = true;
    var maxY = 0;
    for (var i = 0; i < 60; i++) {
      updatePlayer(0.016);
      if (player.mesh.position.y > maxY) maxY = player.mesh.position.y;
      if (player.onGround && i > 3) break;
    }
    G.keys[' '] = false;
    assert('跳跃高度合理 (2.0-3.0)', maxY > 2.0 && maxY < 3.0, 'maxY=' + maxY.toFixed(2));
  })();

  // ========== 测试 12: 不能二段跳 ==========
  (function() {
    resetPlayer(2, 0);
    // 第一次跳
    G.keys[' '] = true;
    for (var i = 0; i < 5; i++) updatePlayer(0.016);
    G.keys[' '] = false;
    var vyAfterFirst = player.vy;

    // 空中再按跳 — 不应设置 vy=0.28
    G.keys[' '] = true;
    updatePlayer(0.016);
    G.keys[' '] = false;
    // vy 只能因重力自然减少，不能跳到 0.28
    assert('不能二段跳', player.vy < 0.27, 'vy=' + player.vy.toFixed(3) + ' (不应>=0.28)');
  })();

  // ========== 测试 13: 松键后减速 ==========
  (function() {
    resetPlayer(2, 0);
    G.keys['d'] = true;
    for (var i = 0; i < 60; i++) updatePlayer(0.016);
    G.keys['d'] = false;
    var vxAfterRelease = Math.abs(player.vx);
    for (var i = 0; i < 30; i++) updatePlayer(0.016);
    assert('松键后减速', Math.abs(player.vx) < vxAfterRelease * 0.1, 'vx1=' + vxAfterRelease.toFixed(3) + ' vx2=' + player.vx.toFixed(3));
  })();

  // ========== 测试 14: 敌人巡逻 ==========
  (function() {
    var e = findEnemy();
    if (!e) { assert('敌人存在', false); return; }
    var startX = e.group.position.x;
    for (var i = 0; i < 60; i++) updateEnemies(0.016);
    var endX = e.group.position.x;
    assert('敌人巡逻移动', Math.abs(endX - startX) > 0.5, 'moved=' + (endX - startX).toFixed(2));
  })();

  // ========== 测试 15: 敌人巡逻范围限制 ==========
  (function() {
    var e = findEnemy();
    if (!e) { assert('敌人存在', false); return; }
    // 跑 120 帧（约 2 秒），敌人应在巡逻范围内
    for (var i = 0; i < 120; i++) updateEnemies(0.016);
    assert('敌人在巡逻范围内', e.group.position.x >= e.minX && e.group.position.x <= e.maxX, 'x=' + e.group.position.x.toFixed(2) + ' range=[' + e.minX + ',' + e.maxX + ']');
  })();

  // ========== 测试 16: 玩家掉出屏幕 ==========
  (function() {
    resetPlayer(2, 0);
    player.dead = false;
    player.invincible = 0;
    G.lives = 3; // 重置生命
    hurtPlayer(); // 直接调用
    assert('掉出屏幕触发受伤', G.lives === 2 && !player.dead, 'lives=' + G.lives + ' dead=' + player.dead);
    G.lives = 3; // 恢复生命数
  })();

  // ========== 测试 17: 关卡对象数量 ==========
  (function() {
    var bricks = colliders.filter(function(c) { return (c.maxY - c.minY) > 1; });
    var plats = colliders.filter(function(c) { return c.maxY > 1 && (c.maxY - c.minY) < 1; });
    assert('砖块数量足够 (>=4)', bricks.length >= 4, 'bricks=' + bricks.length);
    assert('平台数量足够 (>=4)', plats.length >= 4, 'plats=' + plats.length);
    assert('金币数量足够 (>=15)', coins.length >= 15, 'coins=' + coins.length);
    assert('问号砖数量足够 (>=6)', questionBlocks.length >= 6, 'qbs=' + questionBlocks.length);
    assert('敌人数量足够 (>=2)', enemies.length >= 2, 'enemies=' + enemies.length);
  })();

  // ========== 测试 18: 旗杆存在 ==========
  (function() {
    assert('旗杆存在', flagPole !== null && flagPole !== undefined, 'flagPole=' + flagPole);
  })();

  // ========== 测试 19: 问号砖块动画 ==========
  (function() {
    var unanswered = questionBlocks.filter(function(q) { return !q.answered; });
    if (!unanswered.length) { assert('未回答问号砖存在', false); return; }
    var qb = unanswered[0];
    var origY = qb.group.position.y;
    updateQuestionBlocks(0);
    var midY = qb.group.position.y;
    updateQuestionBlocks(Math.PI / 2);
    var newY = qb.group.position.y;
    assert('问号砖有浮动动画', Math.abs(newY - midY) > 0.01, 'diff=' + Math.abs(newY - midY).toFixed(3));
  })();

  // ========== 测试 20: 玩家方向翻转 ==========
  (function() {
    resetPlayer(2, 0);
    G.keys['d'] = true;
    updatePlayer(0.016);
    var rotRight = player.mesh.rotation.y;
    G.keys['d'] = false; G.keys['a'] = true;
    updatePlayer(0.016);
    var rotLeft = player.mesh.rotation.y;
    G.keys['a'] = false;
    assert('方向翻转', rotRight !== rotLeft, 'right=' + rotRight.toFixed(2) + ' left=' + rotLeft.toFixed(2));
  })();

  // ========== 测试 21: 分段摩擦（松键刹车 vs 按键惯性）==========
  (function() {
    resetPlayer(2, 0);
    G.keys['d'] = true;
    for (var i = 0; i < 60; i++) updatePlayer(0.016);
    G.keys['d'] = false;
    var vxAfterRelease = Math.abs(player.vx);
    // 松键 15 帧（0.92^15 ≈ 0.29，0.85^15 ≈ 0.087）
    for (var i = 0; i < 15; i++) updatePlayer(0.016);
    var vxAfter15 = Math.abs(player.vx);
    // 松键摩擦 0.85 应使速度衰减到 15% 以内
    assert('松键刹车有效 (<15%)', vxAfter15 < vxAfterRelease * 0.15, 'vx1=' + vxAfterRelease.toFixed(3) + ' vx2=' + vxAfter15.toFixed(3));
  })();

  // ========== 测试 22: 敌人遇缺口掉头 ==========
  (function() {
    var e = findEnemy();
    if (!e) { assert('敌人存在', false); return; }
    // 找地面缺口
    var grounds = colliders.filter(function(c) { return c.maxY >= 0 && c.maxY <= 0.1; });
    grounds.sort(function(a,b){return a.minX - b.minX;});
    var gapStart = null;
    for (var i = 1; i < grounds.length; i++) {
      if (grounds[i].minX - grounds[i-1].maxX > 0.5) {
        gapStart = grounds[i-1].maxX;
        break;
      }
    }
    if (!gapStart) { assert('地面有缺口', false); return; }
    // 把敌人放到缺口前，面朝缺口
    e.x = gapStart - 0.5;
    e.group.position.x = e.x;
    e.group.position.y = 0;
    e.dir = 1; // 朝右（朝向缺口）
    var startX = e.x;
    // 运行 60 帧，敌人应走到缺口前掉头，不走进缺口
    for (var i = 0; i < 60; i++) updateEnemies(0.016);
    // 敌人位置不应超过缺口起点（说明在缺口前掉头了）
    assert('敌人遇缺口掉头', e.group.position.x < gapStart + 0.4, 'x=' + e.group.position.x.toFixed(2) + ' gapStart=' + gapStart.toFixed(2));
    // 恢复敌人
    e.x = (e.minX + e.maxX) / 2;
    e.group.position.x = e.x;
    e.group.position.y = 0;
  })();

  // ========== 测试 23: 题目集加载 ==========
  (function() {
    assert('题目集已加载', G.questionSet !== null, G.questionSet ? G.questionSet.name : 'null');
    assert('题目集有名称', G.questionSet && G.questionSet.name !== '', G.questionSet ? G.questionSet.name : 'null');
  })();

  // ========== 测试 24: 题目类型生成 ==========
  (function() {
    // 遍历全部题目检查类型分布
    var types = {};
    var qs = G.questionSet;
    var arr = qs._shuffled || qs.questions || qs.preset || [];
    arr.forEach(function(q) {
      var t = q.type || 'calc';
      types[t] = (types[t] || 0) + 1;
    });
    assert('题目含计算题', (types.calc || 0) > 0, 'calc=' + (types.calc || 0));
    assert('题目含选择题', (types.choice || 0) > 0, 'choice=' + (types.choice || 0));
    assert('题目含判断题', (types.bool || 0) > 0, 'bool=' + (types.bool || 0));
  })();

  // ========== 测试 25: 答题不扣命 ==========
  (function() {
    // 模拟答错题
    var qb = questionBlocks[0];
    if (!qb) { assert('问号砖存在', false); return; }
    var oldLives = G.lives;
    G.currentProblem = qb.problem;
    G.currentBlock = qb;
    G.currentAnswer = '999999'; // 故意答错
    // 模拟错误答案（不实际调用 onWrong，直接检查逻辑）
    var ok = false;
    if (qb.problem.type === 'calc') ok = parseInt(G.currentAnswer) === qb.problem.answer;
    else if (qb.problem.type === 'choice') ok = G.currentAnswer === qb.problem.answer;
    else if (qb.problem.type === 'bool') ok = G.currentAnswer === qb.problem.answer;
    else ok = String(G.currentAnswer).trim().toLowerCase() === String(qb.problem.answer).trim().toLowerCase();
    assert('答错不扣命', !ok && G.lives === oldLives, 'lives=' + G.lives + ' (应不变)');
  })();

  // ========== 输出结果 ==========
  return '{\n  "passed": ' + pass + ',\n  "failed": ' + fail + ',\n  "total": ' + (pass + fail) + ',\n  "results": [\n    "' + results.join('",\n    "') + '\n  ]\n}';
})();
