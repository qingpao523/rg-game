// 输入（键盘/鼠标/触屏摇杆）、相机、数学工具、特效与浮字池
const Engine = {
  keys: {},
  cam: { x: 0, y: 0, sx: 0, sy: 0, shake: 0 },
  joy: { active: false, id: null, ox: 0, oy: 0, dx: 0, dy: 0 },
  canvas: null,

  init(canvas, game) {
    this.canvas = canvas;
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      game.onKey(e.code);
    });
    window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });

    const toGame = (cx, cy) => {
      const r = canvas.getBoundingClientRect();
      return { x: (cx - r.left) * CONFIG.canvas.w / r.width, y: (cy - r.top) * CONFIG.canvas.h / r.height };
    };
    const inJoyZone = (p) => p.x < CONFIG.canvas.w * 0.55 && p.y > CONFIG.canvas.h * 0.5;

    canvas.addEventListener('mousedown', (e) => {
      const p = toGame(e.clientX, e.clientY);
      if (game.state === 'battle' && inJoyZone(p)) {
        this.joyStart('mouse', p);
      } else {
        game.onTap(p.x, p.y);
      }
    });
    window.addEventListener('mousemove', (e) => {
      if (this.joy.active && this.joy.id === 'mouse') this.joyMove(toGame(e.clientX, e.clientY));
    });
    window.addEventListener('mouseup', () => { if (this.joy.id === 'mouse') this.joyEnd(); });

    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        const p = toGame(t.clientX, t.clientY);
        if (game.state === 'battle' && inJoyZone(p) && !this.joy.active) this.joyStart(t.identifier, p);
        else game.onTap(p.x, p.y);
      }
    }, { passive: false });
    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (this.joy.active && t.identifier === this.joy.id) this.joyMove(toGame(t.clientX, t.clientY));
      }
    }, { passive: false });
    const touchEnd = (e) => {
      for (const t of e.changedTouches) if (t.identifier === this.joy.id) this.joyEnd();
    };
    canvas.addEventListener('touchend', touchEnd);
    canvas.addEventListener('touchcancel', touchEnd);
  },

  joyStart(id, p) {
    this.joy.active = true; this.joy.id = id;
    this.joy.ox = p.x; this.joy.oy = p.y; this.joy.dx = 0; this.joy.dy = 0;
  },
  joyMove(p) {
    const R = 90;
    let dx = p.x - this.joy.ox, dy = p.y - this.joy.oy;
    const d = Math.hypot(dx, dy);
    if (d > R) { dx = dx / d * R; dy = dy / d * R; }
    this.joy.dx = dx / R; this.joy.dy = dy / R;
  },
  joyEnd() { this.joy.active = false; this.joy.id = null; this.joy.dx = 0; this.joy.dy = 0; },

  moveVector() {
    let x = 0, y = 0;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) x -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) x += 1;
    if (this.keys['KeyW'] || this.keys['ArrowUp']) y -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) y += 1;
    if (x || y) {
      const d = Math.hypot(x, y);
      return { x: x / d, y: y / d };
    }
    if (this.joy.active) {
      const d = Math.hypot(this.joy.dx, this.joy.dy);
      if (d > 0.15) return { x: this.joy.dx / Math.max(1, d), y: this.joy.dy / Math.max(1, d) };
    }
    return { x: 0, y: 0 };
  },

  // 世界坐标 -> 屏幕坐标
  SX(x) { return x - this.cam.x + CONFIG.canvas.w / 2 + this.cam.sx; },
  SY(y) { return y - this.cam.y + CONFIG.canvas.h / 2 + this.cam.sy; },

  // P0 震动节流分级：max 合并（不叠加）+ 小震动 0.25s CD + 幅度上限；big=true 走大震动通道
  addShake(n, big) {
    const now = performance.now();
    if (!big) {
      if (now - (this._smallShakeT || 0) < 250) return;
      this._smallShakeT = now;
      n = Math.min(n, 5);
    }
    this.cam.shake = Math.min(big ? 14 : 8, Math.max(this.cam.shake, n));
  },
  updateCamera(dt, tx, ty) {
    const c = this.cam;
    c.x += (tx - c.x) * Math.min(1, dt * 6);
    c.y += (ty - c.y) * Math.min(1, dt * 6);
    c.shake = Math.max(0, c.shake - dt * 30);
    c.sx = (Math.random() - 0.5) * c.shake;
    c.sy = (Math.random() - 0.5) * c.shake;
  },
};

// ---- 数学工具 ----
const M = {
  rand(a, b) { return a + Math.random() * (b - a); },
  randInt(a, b) { return Math.floor(M.rand(a, b + 1)); },
  choice(arr) { return arr[Math.floor(Math.random() * arr.length)]; },
  clamp(v, a, b) { return v < a ? a : v > b ? b : v; },
  dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); },
  ang(ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax); },
  // 线段 (x1,y1)-(x2,y2) 到点 (px,py) 的距离
  segDist(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const len2 = dx * dx + dy * dy;
    let t = len2 ? ((px - x1) * dx + (py - y1) * dy) / len2 : 0;
    t = M.clamp(t, 0, 1);
    return M.dist(px, py, x1 + dx * t, y1 + dy * t);
  },
  weightedPick(items, wKey) {
    let sum = 0;
    for (const it of items) sum += it[wKey || 'w'] || 1;
    let r = Math.random() * sum;
    for (const it of items) { r -= it[wKey || 'w'] || 1; if (r <= 0) return it; }
    return items[items.length - 1];
  },
};

// ---- 特效与浮字（世界坐标系，带对象复用） ----
const FX = {
  effects: [],
  texts: [],

  reset() { this.effects.length = 0; this.texts.length = 0; },

  spawn(o) {
    this.effects.push(Object.assign({
      type: 'img', t: 0, life: 0.5, alpha0: 1, alpha1: 0,
      scale0: 1, scale1: 1.2, rot: 0, rotV: 0, h: 80,
    }, o));
  },
  ring(x, y, r0, r1, color, life, width) {
    this.spawn({ type: 'ring', x, y, r0, r1, color, life: life || 0.4, w: width || 4 });
  },
  // 命中环境光亮斑：径向渐变圆，快速淡出
  glow(x, y, r, color, life, alpha) {
    this.spawn({ type: 'glow', x, y, r: r || 30, color: color || '#fff', life: life || 0.1, alpha0: alpha != null ? alpha : 0.3, alpha1: 0, scale0: 1, scale1: 1.3 });
  },
  // P0 glow 渐变预渲染：按颜色缓存 128x128 offscreen canvas，draw 时 drawImage 代替每帧 createRadialGradient
  glowSprite(color) {
    const cache = this._glowSprites || (this._glowSprites = {});
    let c = cache[color];
    if (!c) {
      c = document.createElement('canvas');
      c.width = c.height = 128;
      const g2 = c.getContext('2d');
      const grad = g2.createRadialGradient(64, 64, 0, 64, 64, 64);
      grad.addColorStop(0, color);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      g2.fillStyle = grad;
      g2.fillRect(0, 0, 128, 128);
      cache[color] = c;
    }
    return c;
  },
  bolt(x1, y1, x2, y2, color, life) {
    this.spawn({ type: 'bolt', x: x1, y: y1, x2, y2, color: color || '#9fd8ff', life: life || 0.18, scale0: 1, scale1: 1 });
  },
  imgFx(path, x, y, h, opts) {
    this.spawn(Object.assign({ type: 'img', img: path, x, y, h }, opts || {}));
  },
  text(x, y, str, color, size) {
    this.texts.push({ x, y, str: String(str), color: color || '#fff', size: size || 18, t: 0, life: 0.8 });
  },

  update(dt) {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const e = this.effects[i];
      e.t += dt;
      if (e.t >= e.life) this.effects.splice(i, 1);
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.t += dt; t.y -= dt * 55;
      if (t.t >= t.life) this.texts.splice(i, 1);
    }
  },

  draw(ctx) {
    for (const e of this.effects) {
      const k = e.t / e.life;
      const a = e.alpha0 + (e.alpha1 - e.alpha0) * k;
      const s = e.scale0 + (e.scale1 - e.scale0) * k;
      const x = Engine.SX(e.x), y = Engine.SY(e.y);
      ctx.save();
      ctx.globalAlpha = Math.max(0, a);
      if (e.type === 'ring') {
        ctx.strokeStyle = e.color;
        ctx.lineWidth = e.w;
        ctx.beginPath();
        ctx.arc(x, y, e.r0 + (e.r1 - e.r0) * k, 0, Math.PI * 2);
        ctx.stroke();
      } else if (e.type === 'glow') {
        const rr = e.r * s;
        ctx.drawImage(this.glowSprite(e.color), x - rr, y - rr, rr * 2, rr * 2);
      } else if (e.type === 'bolt') {
        ctx.strokeStyle = e.color;
        ctx.lineWidth = 3.5;
        ctx.shadowColor = e.color; ctx.shadowBlur = 10;
        const x2 = Engine.SX(e.x2), y2 = Engine.SY(e.y2);
        const segs = 6;
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (let i = 1; i < segs; i++) {
          const t = i / segs;
          const mx = x + (x2 - x) * t + (Math.random() - 0.5) * 26;
          const my = y + (y2 - y) * t + (Math.random() - 0.5) * 26;
          ctx.lineTo(mx, my);
        }
        ctx.lineTo(x2, y2);
        ctx.stroke();
      } else if (e.type === 'img') {
        const img = Assets.img(e.img);
        if (img) {
          const h = e.h * s;
          const w = h * img.naturalWidth / img.naturalHeight;
          ctx.translate(x, y);
          ctx.rotate(e.rot + e.rotV * e.t);
          ctx.drawImage(img, -w / 2, -h / 2, w, h);
        }
      }
      ctx.restore();
    }
    ctx.textAlign = 'center';
    for (const t of this.texts) {
      const k = t.t / t.life;
      ctx.save();
      ctx.globalAlpha = 1 - k * k;
      ctx.font = `bold ${t.size}px "PingFang SC", "Microsoft YaHei", sans-serif`;
      ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      ctx.lineWidth = 3;
      const x = Engine.SX(t.x), y = Engine.SY(t.y);
      ctx.strokeText(t.str, x, y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.str, x, y);
      ctx.restore();
    }
  },
};
