// 物理系统 + 碰撞检测

function overlap(ax1, ay1, ax2, ay2, bx1, by1, bx2, by2) {
  return ax1 <= bx2 && ax2 >= bx1 && ay1 <= by2 && ay2 >= by1;
}

function updatePlayer(dt) {
  if (!player || player.dead) return;
  const p = player;

  // 输入
  const left = G.keys['ArrowLeft'] || G.keys['a'] || G.touchInput.left;
  const right = G.keys['ArrowRight'] || G.keys['d'] || G.touchInput.right;
  const jump = G.keys['ArrowUp'] || G.keys['w'] || G.keys[' '] || G.touchInput.jump;

  if (left) { p.vx -= 0.06; p.facing = -1; }
  if (right) { p.vx += 0.06; p.facing = 1; }
  if (jump && p.onGround) {
    p.vy = 0.28; p.onGround = false; playSound('jump');
    // 消耗跳跃输入，防止按住不放连续跳
    G.keys['ArrowUp'] = false; G.keys['w'] = false; G.keys[' '] = false;
    G.touchInput.jump = false;
  }

  // 物理 - 松键快速刹车，按键保留惯性
  p.vx *= (!left && !right) ? 0.85 : 0.92;
  p.vy -= 0.015;
  if (p.vx > 0.15) p.vx = 0.15;
  if (p.vx < -0.15) p.vx = -0.15;

  // X 移动 + 碰撞 (玩家宽 0.5, 高 1.3)
  // 只做"侧面碰撞"：玩家脚在碰撞体顶部以下才算侧面碰撞
  // 玩家站在上面走（脚 >= maxY）不算侧面碰撞，由 Y 碰撞处理
  const prevX = p.mesh.position.x;
  p.mesh.position.x += p.vx;
  for (const c of colliders) {
    if (!overlap(p.mesh.position.x - 0.3, p.mesh.position.y, p.mesh.position.x + 0.3, p.mesh.position.y + 1.3, c.minX, c.minY, c.maxX, c.maxY)) continue;
    if (p.mesh.position.y >= c.maxY - 0.3) continue; // 站在上面或快爬到顶部时，跳过 X 碰撞
    if (p.vx > 0 && prevX - 0.3 < c.minX) { p.mesh.position.x = c.minX - 0.3; p.vx = 0; }
    else if (p.vx < 0 && prevX + 0.3 > c.maxX) { p.mesh.position.x = c.maxX + 0.3; p.vx = 0; }
  }

  // Y 移动 + 碰撞
  const prevY = p.mesh.position.y;
  p.mesh.position.y += p.vy;
  p.onGround = false;
  let hitQB = null;

  for (const c of colliders) {
    if (!overlap(p.mesh.position.x - 0.3, p.mesh.position.y, p.mesh.position.x + 0.3, p.mesh.position.y + 1.3, c.minX, c.minY, c.maxX, c.maxY)) continue;
    const isGround = c.maxY <= 0;
    const edge = 0.15;
    const xAbove = isGround || (p.mesh.position.x > c.minX - edge && p.mesh.position.x < c.maxX + edge);
    // 顶头要求 X 在碰撞体"内部"（离边缘 >0.3），排除从侧面接近的情况
    const xCentered = isGround || (p.mesh.position.x > c.minX + 0.3 && p.mesh.position.x < c.maxX - 0.3);

    // 有厚度的非地面碰撞体（平台）：上升时脚在碰撞体高度范围内，允许从侧面滑上去
    const hasThickness = (c.maxY - c.minY) > 0.1 && !isGround;
    if (hasThickness && p.vy > 0 && p.mesh.position.y >= c.minY && p.mesh.position.y <= c.maxY) continue;

    if (p.vy > 0) {
      if (prevY + 1.3 < c.minY && xCentered) {
        p.mesh.position.y = c.minY - 1.3; p.vy = 0; playSound('bump');
      }
    }
    else if (p.vy < 0) {
      if (xAbove) { p.mesh.position.y = c.maxY; p.vy = 0; p.onGround = true; }
      // 侧面滑上：下落时脚在平台高度范围内且 X 接近平台
      else if (hasThickness && p.mesh.position.y >= c.minY && p.mesh.position.y <= c.maxY && p.mesh.position.x > c.minX - 0.5 && p.mesh.position.x < c.maxX + 0.5) {
        p.mesh.position.y = c.maxY; p.vy = 0; p.onGround = true;
      }
    }
  }

  // 检查问号砖块 (头顶碰撞) — 要求上一帧头顶在砖块下方，防止原地跳触发
  questionBlocks.forEach(qb => {
    if (qb.answered) return;
    if (overlap(p.mesh.position.x - 0.3, p.mesh.position.y + 1.2, p.mesh.position.x + 0.3, p.mesh.position.y + 1.4, qb.minX, qb.minY, qb.maxX, qb.maxY)) {
      if (p.vy > 0 && prevY + 1.3 < qb.minY) hitQB = qb;
    }
  });
  if (hitQB) openMathPopup(hitQB);

  // 地面检测：只有在有地面碰撞体覆盖当前 X 时才生效，防止走出地面边缘悬空
  if (p.mesh.position.y <= 0.01 && p.vy < 0.02) {
    const aboveGround = colliders.some(c => c.maxY >= 0 && p.mesh.position.x + 0.3 > c.minX && p.mesh.position.x - 0.3 < c.maxX);
    if (aboveGround) { p.mesh.position.y = 0; p.vy = 0; p.onGround = true; }
  }

  // 调试面板 (按 F3 键开关)
  if (G.keys['F3'] && !G._dbgPrevF3) { G.showDebug = !G.showDebug; }
  G._dbgPrevF3 = G.keys['F3'];
  const dbgEl = document.getElementById('debug-display');
  if (G.showDebug) {
    dbgEl.style.display = 'block';
    dbgEl.textContent = `x:${p.mesh.position.x.toFixed(2)} y:${p.mesh.position.y.toFixed(3)} vy:${p.vy.toFixed(4)} onGround:${p.onGround} jump:${jump}`;
  } else {
    dbgEl.style.display = 'none';
  }
  if (p.mesh.position.y < -10) hurtPlayer();

  // 行走动画
  if (Math.abs(p.vx) > 0.01 && p.onGround) {
    p.walkFrame += dt * 10;
    const s = Math.sin(p.walkFrame) * 0.5;
    p.legL.rotation.x = s; p.legR.rotation.x = -s;
    p.armL.rotation.x = -s; p.armR.rotation.x = s;
  } else {
    p.legL.rotation.x = p.legR.rotation.x = p.armL.rotation.x = p.armR.rotation.x = 0;
  }

  // 无敌闪烁
  if (p.invincible > 0) { p.invincible -= dt; p.mesh.visible = Math.sin(p.invincible * 20) > 0; }
  else p.mesh.visible = true;

  p.mesh.rotation.y = p.facing > 0 ? 0 : Math.PI;

  // 金币收集
  coins.forEach(c => {
    if (c.collected) return;
    if (overlap(p.mesh.position.x - 0.3, p.mesh.position.y, p.mesh.position.x + 0.3, p.mesh.position.y + 1.3, c.minX, c.minY, c.maxX, c.maxY)) {
      c.collected = true; scene.remove(c.mesh);
      G.score += 5; spawnParticles(c.mesh.position, 0xffd700, 8);
      playSound('coin'); updateHUD();
    }
  });

  // 敌人碰撞
  enemies.forEach(e => {
    if (!e.alive) return;
    if (overlap(p.mesh.position.x - 0.3, p.mesh.position.y, p.mesh.position.x + 0.3, p.mesh.position.y + 1.3, e.group.position.x - 0.5, e.group.position.y, e.group.position.x + 0.5, e.group.position.y + 1.2)) {
      if (p.vy < 0 && p.mesh.position.y + 1.3 > e.group.position.y + 1.0) {
        // 踩到敌人
        e.alive = false; e.squishTimer = 0.5; p.vy = 0.2;
        G.score += 20; playSound('bump');
        spawnParticles(e.group.position, 0x795548, 12); updateHUD();
      } else if (p.invincible <= 0) hurtPlayer();
    }
  });

  // 旗杆检测
  if (flagPole && Math.abs(p.mesh.position.x - flagPole.position.x) < 1.5 && p.mesh.position.y < 8) {
    levelComplete();
  }
}

function hurtPlayer() {
  if (player.invincible > 0 || player.dead) return;
  G.lives--; playSound('die'); updateHUD();
  if (G.lives <= 0) { player.dead = true; setTimeout(gameOver, 500); return; }
  player.invincible = 2; player.vy = 0.08; // 小幅弹起，避免落到头顶平台上
  if (player.mesh.position.y < -5) {
    player.mesh.position.set(Math.max(2, G.cameraX), 3, 0);
    player.vx = 0; player.vy = 0;
  }
}
