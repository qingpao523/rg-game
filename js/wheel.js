// 结算转盘：8 格，canvas 旋转动画，每日免费 1 次 / 100 金币
const WHEEL_ITEMS = [
  { label: '碎片×2',  type: 'shard',  value: 2,   weight: 25, color: '#8a6a3a' },
  { label: '碎片×4',  type: 'shard',  value: 4,   weight: 15, color: '#c9a86a' },
  { label: '金币×100', type: 'gold',  value: 100, weight: 20, color: '#4a6a8a' },
  { label: '金币×200', type: 'gold',  value: 200, weight: 10, color: '#6a9aca' },
  { label: '天赋点×1', type: 'tp',    value: 1,   weight: 5,  color: '#c0392b' },
  { label: '经验×300', type: 'exp',   value: 300, weight: 15, color: '#3a7a4a' },
  { label: '经验×500', type: 'exp',   value: 500, weight: 8,  color: '#5aaa6a' },
  { label: '谢谢参与', type: 'none',  value: 0,   weight: 2,  color: '#3a3a4a' },
];

const Wheel = {
  open: false,
  spinning: false,
  angle: 0,        // 当前角度（弧度）
  speed: 0,        // 当前角速度
  targetAngle: 0,  // 目标停止角度
  result: null,    // 停止后的奖励
  resultT: 0,      // 奖励展示计时
  spinCost: 100,
  dailyKey: 'rg_h5_wheel_date',

  // 每次死亡结算后调用
  show() {
    this.open = true;
    this.spinning = false;
    this.result = null;
    this.resultT = 0;
    this.angle = 0;
  },

  freeLeft() {
    const today = new Date().toISOString().slice(0, 10);
    const d = Storage.Load();
    if (d._wheelDate !== today) { d._wheelDate = today; d._wheelFree = 1; Storage.Save(d); }
    return d._wheelFree || 0;
  },

  canSpin() {
    if (this.spinning) return false;
    if (this.freeLeft() > 0) return true;
    const d = Storage.Load();
    return (d.gold || 0) >= this.spinCost;
  },

  spin() {
    if (this.spinning || this.result) return;
    const d = Storage.Load();
    if (this.freeLeft() > 0) { d._wheelFree--; }
    else if ((d.gold || 0) >= this.spinCost) { d.gold -= this.spinCost; }
    else { UI.toast('金币不足'); return; }
    Storage.Save(d);

    // 加权随机选格子
    const total = WHEEL_ITEMS.reduce((s, i) => s + i.weight, 0);
    let roll = Math.random() * total, idx = 0;
    for (let i = 0; i < WHEEL_ITEMS.length; i++) {
      roll -= WHEEL_ITEMS[i].weight;
      if (roll <= 0) { idx = i; break; }
    }
    this.result = WHEEL_ITEMS[idx];

    // 计算目标角度：让顶部指针（-π/2）正好停在选中格子中心
    const segAngle = (Math.PI * 2) / WHEEL_ITEMS.length;
    const segCenter = idx * segAngle + segAngle / 2;
    // 指针在顶部(-π/2)，格子中心需转到该位置：angle = -π/2 - segCenter，补足整圈保证正角度
    const spins = 5 + Math.random() * 2;
    this.targetAngle = spins * Math.PI * 2 + (Math.PI * 1.5 - segCenter);
    this.speed = 12 + Math.random() * 4; // 初始角速度
    this.spinning = true;
    if (typeof SFX !== 'undefined') SFX.play('pickup');
  },

  applyReward() {
    const r = this.result;
    if (!r || r.type === 'none') return;
    const d = Storage.Load();
    if (r.type === 'gold') d.gold = (d.gold || 0) + r.value;
    // 双池口径：与升级奖励一致，通用/专精各 +1（旧 talentPoints 字段已废弃，不再写入）
    else if (r.type === 'tp') {
      d.generalTalentPoints = (d.generalTalentPoints || 0) + r.value;
      d.specialistTalentPoints = (d.specialistTalentPoints || 0) + r.value;
    }
    else if (r.type === 'shard') d.shards = (d.shards || 0) + r.value;
    else if (r.type === 'exp') Storage.addExp(r.value);
    Storage.Save(d);
  },

  update(dt) {
    if (!this.open) return;
    if (this.spinning) {
      this.angle += this.speed * dt;
      // 减速：越接近目标越慢
      const remain = this.targetAngle - this.angle;
      if (remain < Math.PI * 2) this.speed = Math.max(0.5, this.speed * 0.97);
      if (remain <= 0.02) {
        this.spinning = false;
        this.angle = this.targetAngle;
        this.applyReward();
        this.resultT = 0;
        if (typeof SFX !== 'undefined') SFX.play(this.result.type === 'none' ? 'hit' : 'levelup');
      }
    } else if (this.result) {
      this.resultT += dt;
    }
  },

  draw(ctx) {
    if (!this.open) return;
    const W = CONFIG.canvas.w, H = CONFIG.canvas.h;
    const cx = W / 2, cy = H / 2 - 40, R = 220;

    // 遮罩
    ctx.fillStyle = 'rgba(4,4,10,0.85)';
    ctx.fillRect(0, 0, W, H);

    // 标题
    UI.goldText(ctx, '战 利 品 分 配', cx, cy - R - 60, 36);
    ctx.font = '15px "PingFang SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(200,200,210,0.7)';
    const free = this.freeLeft();
    ctx.fillText(free > 0 ? '今日免费次数：' + free : '每次消耗 ' + this.spinCost + ' 金币', cx, cy - R - 28);

    // 转盘
    const segAngle = (Math.PI * 2) / WHEEL_ITEMS.length;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.angle);
    for (let i = 0; i < WHEEL_ITEMS.length; i++) {
      const item = WHEEL_ITEMS[i];
      const a0 = i * segAngle, a1 = a0 + segAngle;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, R, a0, a1);
      ctx.closePath();
      ctx.fillStyle = item.color;
      ctx.globalAlpha = 0.85;
      ctx.fill();
      ctx.strokeStyle = 'rgba(201,168,106,0.6)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 文字
      ctx.save();
      ctx.rotate(a0 + segAngle / 2);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#f0ead8';
      ctx.font = 'bold 15px "PingFang SC", sans-serif';
      ctx.fillText(item.label, R * 0.65, 5);
      ctx.restore();
    }
    // 中心圆
    ctx.beginPath(); ctx.arc(0, 0, 36, 0, Math.PI * 2);
    ctx.fillStyle = '#1a1a28'; ctx.fill();
    ctx.strokeStyle = '#c9a86a'; ctx.lineWidth = 3; ctx.stroke();
    ctx.restore();

    // 指针
    ctx.save();
    ctx.fillStyle = '#f0d9a0';
    ctx.beginPath();
    ctx.moveTo(cx, cy - R - 18);
    ctx.lineTo(cx - 12, cy - R + 8);
    ctx.lineTo(cx + 12, cy - R + 8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();

    // 结果展示
    if (this.result && !this.spinning) {
      const alpha = Math.min(1, this.resultT * 3);
      ctx.save();
      ctx.globalAlpha = alpha;
      UI.goldText(ctx, this.result.type === 'none' ? '谢谢参与' : '获得：' + this.result.label, cx, cy + R + 70, 32);
      ctx.restore();
    }

    // 按钮
    const bw = 240, bh = 64, bx = cx - bw / 2, by = cy + R + 110;
    if (!this.spinning) {
      if (!this.result) {
        const can = this.canSpin();
        ctx.save();
        ctx.globalAlpha = can ? 1 : 0.4;
        UI.drawButton(ctx, bx, by, bw, bh, '分 配', can);
        ctx.restore();
        this._spinBtn = { x: bx, y: by, w: bw, h: bh };
      } else {
        UI.drawButton(ctx, bx, by, bw, bh, '确 认', true);
        this._spinBtn = { x: bx, y: by, w: bw, h: bh };
      }
    } else {
      this._spinBtn = null;
    }

    // 金币显示
    const d = Storage.Load();
    ctx.font = '16px "PingFang SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(201,168,106,0.8)';
    ctx.fillText('金币 ' + (d.gold || 0) + ' · 碎片 ' + (d.shards || 0), cx, cy + R + 196);
  },

  tap(x, y) {
    if (!this.open) return false;
    if (this._spinBtn && UI.inRect(x, y, this._spinBtn)) {
      if (!this.result) this.spin();
      else { this.open = false; this.result = null; Game.state = 'menu'; }
      return true;
    }
    return true; // 拦截所有点击
  },
};
