// Three.js 场景初始化 + 物体创建

let scene, camera, renderer, clock, player;
const colliders = [];
const enemies = [];
const questionBlocks = [];
const coins = [];
const particles = [];
const clouds = [];
let flagPole;
let groundTiles = [];

// 辅助: 创建带位置的 mesh
function mk(geo, mat, x, y, z) {
  const m = new THREE.Mesh(geo, mat);
  if (x !== undefined) m.position.set(x, y || 0, z || 0);
  return m;
}

function initScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x5c94fc);
  scene.fog = new THREE.Fog(0x5c94fc, 40, 90);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 4, 10);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x5c94fc);
  renderer.shadowMap.enabled = true;
  document.body.insertBefore(renderer.domElement, document.body.firstChild);

  clock = new THREE.Clock();

  // 灯光
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(10, 20, 10);
  dir.castShadow = true;
  dir.shadow.mapSize.set(1024, 1024);
  const sc = dir.shadow.camera;
  sc.left = -50; sc.right = 50; sc.top = 20; sc.bottom = -5; sc.near = 0.5; sc.far = 100;
  scene.add(dir);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

// 创建玩家角色 (缩小版，比例更合理)
function createPlayer() {
  const g = new THREE.Group();

  // 身体 (红衬衫)
  const body = mk(new THREE.BoxGeometry(0.5, 0.5, 0.4), new THREE.MeshPhongMaterial({ color: 0xe53935 }), 0, 0.5, 0);
  body.castShadow = true; g.add(body);

  // 头 (肤色)
  const head = mk(new THREE.BoxGeometry(0.45, 0.4, 0.4), new THREE.MeshPhongMaterial({ color: 0xffcc80 }), 0, 1.0, 0);
  head.castShadow = true; g.add(head);

  // 帽子 (红帽子)
  const hatMat = new THREE.MeshPhongMaterial({ color: 0xe53935 });
  g.add(mk(new THREE.BoxGeometry(0.5, 0.15, 0.45), hatMat, 0.03, 1.3, 0));
  g.add(mk(new THREE.BoxGeometry(0.2, 0.05, 0.45), hatMat, 0.3, 1.23, 0));

  // 眼睛
  const eyeM = new THREE.MeshBasicMaterial({ color: 0x000000 });
  g.add(mk(new THREE.BoxGeometry(0.06, 0.08, 0.03), eyeM, -0.1, 1.03, 0.21));
  g.add(mk(new THREE.BoxGeometry(0.06, 0.08, 0.03), eyeM, 0.1, 1.03, 0.21));

  // 胡子
  g.add(mk(new THREE.BoxGeometry(0.22, 0.04, 0.03), new THREE.MeshBasicMaterial({ color: 0x5d4037 }), 0, 0.9, 0.21));

  // 手臂
  const armM = new THREE.MeshPhongMaterial({ color: 0xe53935 });
  const armL = mk(new THREE.BoxGeometry(0.13, 0.35, 0.13), armM, -0.35, 0.55, 0); g.add(armL);
  const armR = mk(new THREE.BoxGeometry(0.13, 0.35, 0.13), armM, 0.35, 0.55, 0); g.add(armR);

  // 腿 (蓝裤子)
  const legM = new THREE.MeshPhongMaterial({ color: 0x1565c0 });
  const legL = mk(new THREE.BoxGeometry(0.2, 0.35, 0.25), legM, -0.13, 0.17, 0); g.add(legL);
  const legR = mk(new THREE.BoxGeometry(0.2, 0.35, 0.25), legM, 0.13, 0.17, 0); g.add(legR);

  // 鞋子 (棕色)
  const shoeM = new THREE.MeshPhongMaterial({ color: 0x5d4037 });
  g.add(mk(new THREE.BoxGeometry(0.22, 0.1, 0.3), shoeM, -0.13, 0, 0.03));
  g.add(mk(new THREE.BoxGeometry(0.22, 0.1, 0.3), shoeM, 0.13, 0, 0.03));

  g.position.set(2, 0, 0);
  scene.add(g);

  player = {
    mesh: g, vx: 0, vy: 0, onGround: true, facing: 1,
    walkFrame: 0, armL, armR, legL, legR,
    dead: false, invincible: 0,
  };
}

// 创建地面
function createGround(length) {
  groundTiles.forEach(t => scene.remove(t));
  groundTiles = [];
  const geo = new THREE.BoxGeometry(2, 1, 2);
  for (let x = -10; x < length + 10; x += 2) {
    if (Math.random() < 0.06 && x > 5 && x < length - 10) continue;
    const c = Math.random() < 0.3 ? 0x4caf50 : 0x8d6e63;
    const t = mk(geo, new THREE.MeshPhongMaterial({ color: c }), x, -0.5, 0);
    t.receiveShadow = true;
    scene.add(t); groundTiles.push(t);
    colliders.push({ mesh: t, minX: x - 1, maxX: x + 1, minY: -1, maxY: 0 });
  }
}

// 创建平台（碰撞体有厚度 0.5，玩家可从侧面跳上去）
function createPlatform(x, y, w) {
  const m = mk(new THREE.BoxGeometry(w, 0.5, 2), new THREE.MeshPhongMaterial({ color: 0xff8f00 }), x, y, 0);
  m.castShadow = true; m.receiveShadow = true; scene.add(m);
  colliders.push({ mesh: m, minX: x - w / 2, maxX: x + w / 2, minY: y, maxY: y + 0.5 });
}

// 创建砖块（mesh 中心偏移 0.6，让视觉底部对齐地面 y）
function createBrick(x, y) {
  const m = mk(new THREE.BoxGeometry(1.2, 1.2, 1.2), new THREE.MeshPhongMaterial({ color: 0x8d6e63 }), x, y + 0.6, 0);
  m.castShadow = true; scene.add(m);
  colliders.push({ mesh: m, minX: x - 0.6, maxX: x + 0.6, minY: y, maxY: y + 1.2 });
}

// 创建问号砖块（mesh 中心偏移 0.6，让视觉底部对齐 y）
function createQuestionBlock(x, y, problem) {
  const g = new THREE.Group();
  const m = mk(new THREE.BoxGeometry(1.2, 1.2, 1.2), new THREE.MeshPhongMaterial({ color: 0xffd700, emissive: 0xffa000, emissiveIntensity: 0.3 }), 0, 0.6, 0);
  m.castShadow = true; g.add(m);

  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 128;
  const cx = cv.getContext('2d');
  cx.fillStyle = '#fff8e1'; cx.fillRect(0, 0, 128, 128);
  cx.strokeStyle = '#ff8f00'; cx.lineWidth = 4; cx.strokeRect(4, 4, 120, 120);
  cx.fillStyle = '#ff6f00'; cx.font = 'bold 72px Arial'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
  cx.fillText('?', 64, 68);

  const tex = new THREE.CanvasTexture(cv);
  const fm = new THREE.MeshBasicMaterial({ map: tex });
  const ff = mk(new THREE.PlaneGeometry(1.1, 1.1), fm, 0, 0.6, 0.61); g.add(ff);
  const fb = mk(new THREE.PlaneGeometry(1.1, 1.1), fm, 0, 0.6, -0.61); fb.rotation.y = Math.PI; g.add(fb);

  g.position.set(x, y, 0); scene.add(g);
  questionBlocks.push({
    group: g, mesh: m, minX: x - 0.6, maxX: x + 0.6, minY: y, maxY: y + 1.2,
    problem, answered: false, originalY: y, bumpOffset: 0,
  });
}

// 创建金币
function createCoin(x, y) {
  const m = mk(new THREE.CylinderGeometry(0.3, 0.3, 0.08, 16), new THREE.MeshPhongMaterial({ color: 0xffd700, emissive: 0xffa000, emissiveIntensity: 0.2, shininess: 100 }), x, y, 0);
  m.rotation.x = Math.PI / 2; m.castShadow = true; scene.add(m);
  coins.push({ mesh: m, collected: false, minX: x - 0.3, maxX: x + 0.3, minY: y - 0.3, maxY: y + 0.3 });
}

// 创建敌人 (蘑菇)
function createEnemy(x, y) {
  const g = new THREE.Group();
  g.add(mk(new THREE.CylinderGeometry(0.4, 0.5, 0.5, 12), new THREE.MeshPhongMaterial({ color: 0x795548 }), 0, 0.5, 0));
  g.add(mk(new THREE.SphereGeometry(0.55, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhongMaterial({ color: 0x5d4037 }), 0, 0.75, 0));
  const eM = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const pM = new THREE.MeshBasicMaterial({ color: 0x000000 });
  g.add(mk(new THREE.SphereGeometry(0.12, 8, 8), eM, -0.2, 0.85, 0.4));
  g.add(mk(new THREE.SphereGeometry(0.06, 8, 8), pM, -0.2, 0.85, 0.5));
  g.add(mk(new THREE.SphereGeometry(0.12, 8, 8), eM, 0.2, 0.85, 0.4));
  g.add(mk(new THREE.SphereGeometry(0.06, 8, 8), pM, 0.2, 0.85, 0.5));
  const fM = new THREE.MeshPhongMaterial({ color: 0x3e2723 });
  g.add(mk(new THREE.BoxGeometry(0.3, 0.15, 0.3), fM, -0.25, 0, 0.1));
  g.add(mk(new THREE.BoxGeometry(0.3, 0.15, 0.3), fM, 0.25, 0, 0.1));
  g.position.set(x, y, 0); scene.add(g);
    enemies.push({ group: g, x, minX: x - 3, maxX: x + 3, dir: 1, speed: 2 + Math.random() * 1, alive: true, squishTimer: 0 });
}

// 创建云朵
function createClouds() {
  for (let i = 0; i < 30; i++) {
    const g = new THREE.Group();
    const n = 2 + Math.floor(Math.random() * 3);
    for (let j = 0; j < n; j++) {
      const r = 0.8 + Math.random() * 1.2;
      g.add(mk(new THREE.SphereGeometry(r, 12, 8), new THREE.MeshPhongMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 }), j * 1.2 - n * 0.6, Math.random() * 0.3, Math.random() * 0.5));
    }
    g.position.set(Math.random() * 200 - 20, 8 + Math.random() * 6, -3 - Math.random() * 5);
    scene.add(g); clouds.push(g);
  }
}

// 创建旗杆
function createFlag(x) {
  const g = new THREE.Group();
  g.add(mk(new THREE.CylinderGeometry(0.06, 0.06, 8, 8), new THREE.MeshPhongMaterial({ color: 0x9e9e9e }), 0, 4, 0));
  g.add(mk(new THREE.SphereGeometry(0.2, 8, 8), new THREE.MeshPhongMaterial({ color: 0xffd700 }), 0, 8.1, 0));
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 76;
  const cx = cv.getContext('2d');
  cx.fillStyle = '#4caf50'; cx.fillRect(0, 0, 128, 76);
  cx.fillStyle = '#fff'; cx.font = 'bold 36px Arial'; cx.textAlign = 'center'; cx.fillText('★', 64, 48);
  g.add(mk(new THREE.PlaneGeometry(2, 1.2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), side: THREE.DoubleSide }), 1.1, 6.5, 0));
  g.add(mk(new THREE.BoxGeometry(1.5, 0.5, 1.5), new THREE.MeshPhongMaterial({ color: 0x757575 }), 0, -0.25, 0));
  g.position.set(x, 0, 0); scene.add(g);
  flagPole = g;
}

// 粒子效果
function spawnParticles(pos, color, count) {
  count = count || 10;
  for (let i = 0; i < count; i++) {
    const m = mk(new THREE.BoxGeometry(0.15, 0.15, 0.15), new THREE.MeshBasicMaterial({ color }), 0, 0, 0);
    m.position.copy(pos);
    m.userData = { vx: (Math.random() - 0.5) * 0.3, vy: Math.random() * 0.3 + 0.1, vz: (Math.random() - 0.5) * 0.2, life: 1 };
    scene.add(m); particles.push(m);
  }
}

// 星星文字效果
function spawnStarText(pos, text) {
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 64;
  const cx = cv.getContext('2d');
  cx.fillStyle = '#ffd700'; cx.font = 'bold 40px Arial'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
  cx.fillText(text, 64, 32);
  const m = mk(new THREE.PlaneGeometry(1.5, 0.75), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, side: THREE.DoubleSide }), 0, 0, 0);
  m.position.copy(pos); m.userData = { vy: 0.05, life: 1, isText: true };
  scene.add(m); particles.push(m);
}

// 更新粒子
function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.userData.life -= dt * (p.userData.isText ? 0.5 : 1.5);
    if (p.userData.isText) {
      p.position.y += p.userData.vy;
      p.material.opacity = p.userData.life;
    } else {
      p.position.x += p.userData.vx;
      p.position.y += p.userData.vy;
      p.position.z += p.userData.vz;
      p.userData.vy -= 0.01;
      p.scale.setScalar(p.userData.life);
    }
    if (p.userData.life <= 0) {
      scene.remove(p); p.geometry.dispose(); p.material.dispose();
      particles.splice(i, 1);
    }
  }
}

// 更新问号砖块动画
function updateQuestionBlocks(time) {
  questionBlocks.forEach(qb => {
    if (!qb.answered) {
      qb.group.position.y = qb.originalY + Math.sin(time * 2 + qb.minX) * 0.15;
      qb.group.rotation.y = Math.sin(time * 1.5 + qb.minX) * 0.1;
    }
    if (qb.bumpOffset > 0) { qb.bumpOffset *= 0.9; qb.group.position.y += qb.bumpOffset; }
  });
}

// 更新敌人
function updateEnemies(dt) {
  enemies.forEach(e => {
    if (!e.alive) {
      if (e.squishTimer > 0) { e.squishTimer -= dt; e.group.scale.y = Math.max(0.1, e.squishTimer * 2); }
      else scene.remove(e.group);
      return;
    }
    // 预判：移动后脚下是否有地面
    const nextX = e.x + e.dir * e.speed * dt;
    const nextHasGround = colliders.some(c => c.maxY >= -0.01 && c.maxY <= 0.1 && nextX + 0.4 > c.minX && nextX - 0.4 < c.maxX);
    const inRange = nextX >= e.minX && nextX <= e.maxX;

    if (nextHasGround && inRange) {
      // 安全，正常移动
      e.x = nextX;
    } else if (!nextHasGround) {
      // 前方没地面，掉头
      e.dir *= -1;
    } else {
      // 超出巡逻范围，掉头
      e.dir *= -1;
    }

    e.group.position.x = e.x;
    e.group.rotation.y = e.dir > 0 ? 0 : Math.PI;

    // 地面检测：脚下有地面才站着，否则掉落
    const hasGround = colliders.some(c => c.maxY >= -0.01 && c.maxY <= 0.1 && e.x + 0.4 > c.minX && e.x - 0.4 < c.maxX);
    if (hasGround) {
      e.group.position.y = Math.abs(Math.sin(Date.now() * 0.005)) * 0.1;
    } else {
      // 没有地面，掉落
      e.group.position.y -= 3 * dt;
      if (e.group.position.y < -10) scene.remove(e.group);
    }
  });
}

// 相机跟随
function updateCamera() {
  if (!player) return;
  G.cameraX += (player.mesh.position.x - 2 - G.cameraX) * 0.08;
  camera.position.x = G.cameraX;
  camera.position.y = 3.5 + Math.min(player.mesh.position.y, 3) * 0.2;
  camera.lookAt(G.cameraX + 5, 2, 0);
}
