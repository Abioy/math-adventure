// 关卡生成

// 检查一个区域是否与已有碰撞体重叠
function overlapsExisting(x1, y1, x2, y2, padding, minH, maxH) {
  padding = padding || 0.8;
  minH = minH !== undefined ? minH : 0;
  maxH = maxH !== undefined ? maxH : 99;
  for (const c of colliders) {
    if (c.maxY <= 0) continue;
    if (c.maxY < minH || c.minY > maxH) continue;
    if (x1 - padding < c.maxX && x2 + padding > c.minX && y1 - padding < c.maxY && y2 + padding > c.minY) {
      return true;
    }
  }
  for (const qb of questionBlocks) {
    if (qb.maxY < minH || qb.minY > maxH) continue;
    if (x1 - padding < qb.maxX && x2 + padding > qb.minX && y1 - padding < qb.maxY && y2 + padding > qb.minY) {
      return true;
    }
  }
  return false;
}

// 检查 X 范围下方是否都有地面（防止放在缺口上方）
function hasGroundBelow(cx, halfW) {
  halfW = halfW || 0.5;
  var left = cx - halfW;
  var right = cx + halfW;
  // 检查整个范围内是否都有地面覆盖
  for (var x = left; x < right; x += 0.5) {
    if (!colliders.some(c => c.maxY >= 0 && c.maxY <= 0.1 && c.maxX > x && c.minX < x)) return false;
  }
  return true;
}

// 在指定范围内找一个不重叠的位置
function findFreeX(rangeMin, rangeMax, width, maxTry) {
  maxTry = maxTry || 30;
  for (let t = 0; t < maxTry; t++) {
    const cx = rangeMin + Math.random() * (rangeMax - rangeMin);
    if (!overlapsExisting(cx - width / 2, -1, cx + width / 2, 2, 0.8)) return cx;
  }
  return null; // 找不到
}

function generateLevel() {
  // 清理旧关卡所有 mesh
  clouds.forEach(c => scene.remove(c)); clouds.length = 0;
  groundTiles.forEach(t => scene.remove(t)); groundTiles.length = 0;
  colliders.forEach(c => { if (c.mesh) scene.remove(c.mesh); });
  colliders.length = 0;
  enemies.forEach(e => { if (e.group) scene.remove(e.group); });
  enemies.length = 0;
  questionBlocks.forEach(q => { if (q.group) scene.remove(q.group); });
  questionBlocks.length = 0;
  coins.forEach(c => { if (c.mesh) scene.remove(c.mesh); });
  coins.length = 0;
  particles.forEach(p => scene.remove(p)); particles.length = 0;
  if (flagPole) scene.remove(flagPole);

  const d = DIFF[G.difficulty];
  const len = d.levelLen + (G.level - 1) * 20;

  // 地面 + 云朵
  createGround(len);
  createClouds();

  // ---- 平台 (高度 2~3.5，跳跃可达) ----
  const plats = [];
  const platCount = 6 + G.level * 2;
  const platStep = (len - 25) / platCount;
  for (let i = 0; i < platCount; i++) {
    const px = 15 + i * platStep + Math.random() * 3;
    const py = 1.8 + Math.random() * 0.5; // 1.8~2.3，表面 2.05~2.55，玩家跳得到（最高脚到 2.6）
    const pw = 3 + Math.random() * 2;
    // 检查不重叠 + 下方有地面
    if (overlapsExisting(px - pw / 2, py - 0.5, px + pw / 2, py + 1, 1.5)) continue;
    if (!hasGroundBelow(px, pw / 2)) continue;
    createPlatform(px, py, pw);
    plats.push({ x: px, y: py + 0.5, w: pw }); // y 是平台表面（maxY）
    if (Math.random() < 0.6) createCoin(px, py + 1.5);
  }

  // ---- 砖块 (地面障碍物，避开平台) ----
  const brickCount = 4 + G.level;
  const brickStep = (len - 30) / brickCount;
  for (let i = 0; i < brickCount; i++) {
    let bx = 20 + i * brickStep;
    // 检查是否与平台重叠，如果是则偏移
    let attempts = 0;
    while (attempts < 10) {
      const overlapsPlat = plats.some(p => bx + 0.6 + 1 > p.minX && bx - 0.6 - 1 < p.maxX);
      if (!overlapsPlat) break;
      bx += 2; // 向右偏移
      attempts++;
    }
    createBrick(bx, 0);
  }

  // ---- 问号砖块 ----
  const qbCount = d.blocks + G.level * 2;
  const qbStep = (len - 20) / qbCount;
  let placed = 0;

  // 阶段1: 平台上放（约 40%，放在平台正上方居中）
  if (plats.length > 0) {
    const onPlatCount = Math.min(Math.ceil(qbCount * 0.4), plats.length);
    // 打乱平台顺序随机选
    const shuffled = plats.slice().sort(() => Math.random() - 0.5);
    for (let i = 0; i < onPlatCount && placed < qbCount; i++) {
      const p = shuffled[i];
      const bx = p.x; // 平台中心
      const by = p.y + 1.5; // 平台表面 +1.5（视觉上更清楚）
      createQuestionBlock(bx, by, genProblem());
      placed++;
    }
  }

  // 阶段2: 悬浮放（地面跳可碰，下方必须有地面，不跟砖块重叠）
  for (let i = 0; i < qbCount && placed < qbCount; i++) {
    const bx = 8 + i * qbStep;
    const by = 2 + Math.random() * 0.5;
    if (overlapsExisting(bx - 0.6, by - 0.3, bx + 0.6, by + 1.5, 0.5, 0, 99)) continue;
    // 额外检测下方砖块（Y 范围延伸到地面）
    if (overlapsExisting(bx - 0.6, -0.5, bx + 0.6, by + 1.5, 0.8, 0, 1.5)) continue;
    if (!hasGroundBelow(bx, 0.6)) continue;
    createQuestionBlock(bx, by, genProblem());
    placed++;
  }

  // ---- 金币 (高度 1~4，跳跃可达) ----
  for (let i = 0; i < 15 + G.level * 3; i++) {
    const cx = 5 + Math.random() * (len - 10);
    const cy = 1.5 + Math.random() * 2.5; // 1.5~4
    createCoin(cx, cy);
  }

  // ---- 敌人 (地面巡逻，放在两个砖块正中间) ----
  const enemyCount = d.enemies + G.level * 2;
  for (let i = 0; i < enemyCount; i++) {
    // 砖块在 20, 20+brickStep, 20+2*brickStep...
    // 敌人放在砖块中间：20+brickStep/2, 20+1.5*brickStep...
    const ex = 20 + (i + 0.5) * brickStep;
    if (ex > len - 15) break; // 不超过旗杆
    createEnemy(ex, 0);
  }

  // ---- 旗杆 ----
  createFlag(len - 5);
}
