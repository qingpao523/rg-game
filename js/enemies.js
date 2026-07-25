// 怪物 AI、波次导演、宝藏哥布林、经验掉落
const Enemies = {
  list: [],
  drops: [],
  goblin: null,
  wave: 1,
  kills: 0,
  spawnT: 0,
  eliteT: 0,
  goblinT: 0,
  eventDone: false,   // P3：120-240s 低谷事件是否已触发
  eventType: null,    // 'spring' | 'rift'
  eventT: 0,          // 裂界裂缝剩余时间
  expDouble: false,   // 裂界裂缝期间经验翻倍
  // P0 空间哈希网格（cell 64px）：separate 与投射物碰撞共用，每帧重建一次，数组池复用避免 GC
  grid: { cell: 64, map: new Map(), pool: [] },

  reset() {
    this.list.length = 0;
    this.drops.length = 0;
    this.grid.map.clear();
    this.goblin = null;
    this.wave = 1;
    this.kills = 0;
    this.spawnT = 1;
    this.eliteT = CONFIG.waves.eliteFirstTime;
    this.goblinT = CONFIG.waves.goblinFirst;
    this.eventDone = false;
    this.eventType = null;
    this.eventT = 0;
    this.expDouble = false;
  },

  // ---------- 空间网格 ----------
  _gridKey(cx, cy) { return ((cx & 0xffff) << 16) | (cy & 0xffff); },

  // 每帧重建一次：清空旧格子（数组压入池复用），按存活敌人当前位置入格，并赋 _qi 序号供配对去重
  buildGrid() {
    const g = this.grid;
    for (const arr of g.map.values()) { arr.length = 0; g.pool.push(arr); }
    g.map.clear();
    const inv = 1 / g.cell;
    let qi = 0;
    for (const e of this.list) {
      if (e.dead) continue;
      e._qi = qi++;
      const key = this._gridKey(Math.floor(e.x * inv), Math.floor(e.y * inv));
      let arr = g.map.get(key);
      if (!arr) { arr = g.pool.pop() || []; g.map.set(key, arr); }
      arr.push(e);
    }
  },

  // 访问 (x,y) 半径 r 覆盖的所有格子内的敌人（投射物碰撞用：只查同格 + 邻格）
  forEachNear(x, y, r, cb) {
    const inv = 1 / this.grid.cell;
    const x0 = Math.floor((x - r) * inv), x1 = Math.floor((x + r) * inv);
    const y0 = Math.floor((y - r) * inv), y1 = Math.floor((y + r) * inv);
    for (let cx = x0; cx <= x1; cx++) {
      for (let cy = y0; cy <= y1; cy++) {
        const arr = this.grid.map.get(this._gridKey(cx, cy));
        if (!arr) continue;
        for (let i = 0; i < arr.length; i++) cb(arr[i]);
      }
    }
  },

  // ---------- 查询 ----------
  nearest(x, y, maxD, exclude) {
    let best = null, bd = maxD || 1e9;
    for (const e of this.list) {
      if (e.dead || (exclude && exclude.has(e))) continue;
      const d = M.dist(x, y, e.x, e.y);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  },
  nearestN(x, y, maxD, n) {
    return this.list
      .filter(e => !e.dead && M.dist(x, y, e.x, e.y) < maxD)
      .sort((a, b) => M.dist(x, y, a.x, a.y) - M.dist(x, y, b.x, b.y))
      .slice(0, n);
  },
  tankiest(x, y, maxD) {
    let best = null;
    for (const e of this.list) {
      if (e.dead || M.dist(x, y, e.x, e.y) > maxD) continue;
      if (!best || e.hp > best.hp) best = e;
    }
    return best;
  },
  densest(x, y, maxD) {
    const cands = this.list.filter(e => !e.dead && M.dist(x, y, e.x, e.y) < maxD);
    let best = null, bn = 1;
    for (const c of cands) {
      let n = 0;
      for (const o of cands) if (M.dist(c.x, c.y, o.x, o.y) < 160) n++;
      if (n > bn) { bn = n; best = c; }
    }
    return best;
  },
  randomIn(x, y, r) {
    const c = this.list.filter(e => !e.dead && M.dist(x, y, e.x, e.y) < r);
    return c.length ? M.choice(c) : null;
  },

  // ---------- 伤害 ----------
  hurt(e, dmg, opts) {
    if (!e || e.dead) return false;
    opts = opts || {};
    let d = dmg;
    if (!opts.noAmp) {
      d *= Player.dmgMult;
      if (e.resDownT > 0) d *= 1 + e.resDown;
      if (e.shockT > 0) d *= 1 + e.shockStacks * e.shockAmp;
      if (e.doomT > 0) d *= 1 + e.doomAmp;
    }
    if (opts.crit) d *= 2;
    d = Math.max(1, Math.round(d));
    e.hp -= d;
    e.flash = 0.12;
    FX.text(e.x + M.rand(-8, 8), e.y - e.r * 2 - 8, d, opts.crit ? '#ffd75e' : (opts.color || '#fff'), opts.crit ? 26 : 17);
    if (typeof SFX !== 'undefined') SFX.play(opts.crit ? 'crit' : 'hit');
    if (opts.crit) {
      FX.glow(e.x, e.y - e.r, 30, '#ffd75e', 0.1, 0.4);
      if (typeof Game !== 'undefined') Game.hitstopFrames = Math.max(Game.hitstopFrames, 4);
    }
    if (e.hp <= 0) { this.kill(e); return true; }
    return false;
  },
  areaDamage(x, y, r, dmg, opts) {
    for (const e of this.list) {
      if (e.dead || (opts && opts.exclude === e)) continue;
      if (M.dist(x, y, e.x, e.y) < r + e.r) this.hurt(e, dmg, opts);
    }
  },

  kill(e) {
    if (e.dead) return;
    e.dead = true;
    this.kills++;
    FX.imgFx('effects/hit_effect.png', e.x, e.y - 20, e.r * 2.4, { life: 0.25 });
    Skills.onEnemyKilled(e);
    if (e.type === 'goblin') {
      this.drops.push({ kind: 'chest', x: e.x, y: e.y, v: 0, anim: 0 });
      // P0：哥布林额外掉 2-3 个高价值经验碎片 + 1 个源质碎片
      const shards = M.randInt(2, 3);
      for (let i = 0; i < shards; i++) {
        this.drops.push({ kind: 'exp', x: e.x + M.rand(-24, 24), y: e.y + M.rand(-24, 24), v: 8, anim: M.rand(0, 5) });
      }
      this.drops.push({ kind: 'shard', x: e.x + M.rand(-16, 16), y: e.y + M.rand(-16, 16), v: 1, anim: M.rand(0, 5) });
      this.goblin = null;
      UI.toast('宝藏哥布林已被处置，掉落稀有奖励');
    } else {
      const chunks = e.exp >= 8 ? 3 : e.exp >= 3 ? 2 : 1;
      for (let i = 0; i < chunks; i++) {
        this.drops.push({
          kind: 'exp', x: e.x + M.rand(-16, 16), y: e.y + M.rand(-16, 16),
          v: Math.ceil(e.exp / chunks), anim: M.rand(0, 5),
        });
      }
    }
  },

  // ---------- 生成 ----------
  spawnAtEdge(type) {
    const cfg = CONFIG.enemies[type];
    const ang = M.rand(0, Math.PI * 2);
    const R = type === 'goblin' ? CONFIG.waves.goblinSpawnR : 840; // 哥布林出生更近，便于拦截
    const w = this.wave;
    this.list.push({
      type, cfg,
      x: Player.x + Math.cos(ang) * R, y: Player.y + Math.sin(ang) * R,
      hp: Math.round(cfg.hp + cfg.hpWave * (w - 1)),
      maxHp: Math.round(cfg.hp + cfg.hpWave * (w - 1)),
      dmg: cfg.dmg + cfg.dmgWave * (w - 1),
      speed: cfg.speed, r: cfg.r, exp: cfg.exp,
      dead: false, flash: 0, anim: M.rand(0, 5), atkT: 0,
      state: 'chase', stateT: 0, lockX: 0, lockY: 0, life: type === 'goblin' ? 22 : 0,
      arcDir: Math.random() < 0.5 ? 1 : -1,          // 哥布林弧线逃跑的绕行方向
      spawnT: type === 'elite' ? 1.2 : 0,            // 精英出生符文预警，结束后才移动
      slamT: 6,                                      // 精英砸地 AoE 计时
      slowPct: 0, slowT: 0, stunT: 0, freezeT: 0, pendingShatter: 0, chillT: 0,
      burnDps: 0, burnT: 0, burnSpread: 0, burnAcc: 0,
      shockStacks: 0, shockT: 0, shockAmp: 0, resDown: 0, resDownT: 0, doomAmp: 0, doomT: 0,
      faceX: 1,
    });
    if (type === 'goblin') {
      this.goblin = this.list[this.list.length - 1];
      UI.toast('宝藏哥布林现身！拦截它');
    }
    if (type === 'elite') {
      const ne = this.list[this.list.length - 1];
      FX.ring(ne.x, ne.y, 30, 130, '#ff5a3c', 1.2, 5); // 出生点符文预警圈
    }
  },

  // ---------- 更新 ----------
  update(dt) {
    const W = CONFIG.waves;
    const w = Math.floor(Game.time / W.waveTime) + 1;
    if (w !== this.wave) {
      this.wave = w;
      UI.banner('第 ' + w + ' 波', w >= 5 ? '裂界压力持续攀升' : '');
    }

    // P3：120-240s 低谷期随机触发一种节奏事件
    if (!this.eventDone && Game.time >= 120 && Game.time <= 240) {
      this.eventDone = true;
      this.eventType = Math.random() < 0.5 ? 'spring' : 'rift';
      if (this.eventType === 'spring') {
        const a = M.rand(0, Math.PI * 2);
        Skills.zones.push({ kind: 'spring', x: Player.x + Math.cos(a) * 220, y: Player.y + Math.sin(a) * 220, r: 110, t: 0, dur: 30, stand: 0, given: false });
        UI.banner('源质泉涌现', '站上泉眼 3 秒汲取 50 经验');
      } else {
        this.eventT = 15;
        this.expDouble = true;
        UI.banner('裂界裂缝撕开', '15 秒内刷怪密度×3 · 经验翻倍');
        UI.redPulse(1.5);
      }
    }
    if (this.eventType === 'rift' && this.eventT > 0) {
      this.eventT -= dt;
      if (this.eventT <= 0) { this.expDouble = false; this.eventType = null; }
    }

    this.spawnT -= dt;
    if (this.spawnT <= 0 && this.list.filter(e => !e.dead).length < W.maxAlive) {
      const interval = Math.max(W.minInterval, W.baseInterval - Game.time / 600) / (this.eventType === 'rift' ? 3 : 1);
      this.spawnT = interval;
      const batch = Math.min(12, W.batchBase + Math.floor(this.wave * W.batchPerWave));
      for (let i = 0; i < batch; i++) {
        const t = this.wave >= W.chargerFromWave && Math.random() < 0.3 ? 'charger' : 'grunt';
        this.spawnAtEdge(t);
      }
    }
    this.eliteT -= dt;
    if (this.eliteT <= 0) {
      this.eliteT = W.eliteInterval;
      const n = Math.min(W.eliteCap, 1 + Math.floor((Game.time - W.eliteFirstTime) / 150));
      for (let i = 0; i < n; i++) this.spawnAtEdge('elite');
      UI.banner('高危单位：司灾铜像苏醒');
      Engine.addShake(8, true); // P0：大震动通道
      UI.redPulse(1.5);
    }
    this.goblinT -= dt;
    if (this.goblinT <= 0) {
      this.goblinT = M.rand(W.goblinMin, W.goblinMax);
      if (!this.goblin) this.spawnAtEdge('goblin');
    }

    for (let i = this.list.length - 1; i >= 0; i--) {
      const e = this.list[i];
      if (e.dead) { this.list.splice(i, 1); continue; }
      this.updateOne(e, dt);
    }
    this.buildGrid(); // P0：每帧重建空间网格（本帧 separate 与下一帧投射物碰撞共用）
    this.separate();
    this.updateDrops(dt);
  },

  pickTarget(e) {
    let best = null, bd = 150;
    for (const u of Skills.summons) {
      const d = M.dist(e.x, e.y, u.x, u.y);
      if (d < bd) { bd = d; best = u; }
    }
    return best || Player;
  },

  updateOne(e, dt) {
    e.anim += dt;
    e.flash = Math.max(0, e.flash - dt);
    // 精英出生符文预警期间不行动
    if (e.spawnT > 0) { e.spawnT -= dt; return; }
    e.atkT -= dt;
    e.resDownT -= dt; e.shockT -= dt; e.doomT -= dt;
    if (e.shockT <= 0) e.shockStacks = 0;
    e.slowT -= dt;
    if (e.slowT <= 0) e.slowPct = 0;

    // 灼烧
    if (e.burnT > 0) {
      e.burnT -= dt;
      e.burnAcc += dt;
      if (e.burnAcc >= 0.5) {
        e.burnAcc -= 0.5;
        e.hp -= e.burnDps * 0.5;
        FX.text(e.x, e.y - e.r * 2, Math.round(e.burnDps * 0.5), '#ff9a3c', 13);
        if (e.hp <= 0) { this.kill(e); return; }
      }
    }
    // 冰冻 / 定身
    if (e.freezeT > 0) {
      e.freezeT -= dt;
      if (e.freezeT <= 0 && e.pendingShatter) {
        const sh = e.pendingShatter; e.pendingShatter = 0;
        FX.imgFx('effects/crit_effect.png', e.x, e.y - 20, 90, { life: 0.3 });
        this.hurt(e, sh, { color: '#aee6ff' });
      }
      return;
    }
    if (e.stunT > 0) { e.stunT -= dt; return; }

    const spd = e.speed * (1 - (e.slowPct || 0));
    const target = this.pickTarget(e);
    const isPlayer = target === Player;
    const tr = isPlayer ? 26 : target.r;
    const dd = M.dist(e.x, e.y, target.x, target.y);

    if (e.type === 'goblin') {
      e.life -= dt;
      if (e.life <= 0 || dd > 1400) {
        e.dead = true;
        this.goblin = null;
        UI.toast('宝藏哥布林逃离了裂界');
        return;
      }
      // 弧线逃跑：径向逃逸 ≈ 总速度 85%，叠加切向漂移绕玩家跑弧线
      const ang = Math.atan2(e.y - Player.y, e.x - Player.x);
      const rx = Math.cos(ang), ry = Math.sin(ang);      // 径向（远离玩家）
      const tx = -ry * e.arcDir, ty = rx * e.arcDir;     // 切向（绕玩家弧线）
      const vx = rx * 0.85 + tx * 0.527;                 // 0.527 = sqrt(1 - 0.85^2)
      const vy = ry * 0.85 + ty * 0.527;
      e.x += vx * spd * dt;
      e.y += vy * spd * dt;
      e.faceX = vx >= 0 ? 1 : -1;
      return;
    }

    if (e.type === 'charger') {
      e.stateT -= dt;
      if (e.state === 'chase') {
        this.moveToward(e, target.x, target.y, spd, dt);
        if (isPlayer && dd < e.cfg.chargeRange) { e.state = 'tele'; e.stateT = 0.5; }
      } else if (e.state === 'tele') {
        if (e.stateT <= 0) {
          e.state = 'charge'; e.stateT = 0.7;
          const a = Math.atan2(target.y - e.y, target.x - e.x);
          e.lockX = Math.cos(a); e.lockY = Math.sin(a);
        }
      } else if (e.state === 'charge') {
        e.x += e.lockX * e.cfg.chargeSpeed * dt;
        e.y += e.lockY * e.cfg.chargeSpeed * dt;
        if (e.stateT <= 0) { e.state = 'rest'; e.stateT = 0.8; }
      } else if (e.stateT <= 0) e.state = 'chase';
    } else if (e.type === 'elite') {
      this.updateElite(e, spd, dt);
    } else {
      this.moveToward(e, target.x, target.y, spd, dt);
    }

    // 接触攻击
    if (dd < e.r + tr + 4 && e.atkT <= 0 && e.cfg.dmg > 0) {
      e.atkT = 0.9;
      if (isPlayer) Player.hurt(e.dmg);
      else Skills.hurtSummon(target, e.dmg);
    }
  },

  // ---------- 精英：砸地 AoE ----------
  slamRadius() { return Math.min(150, 100 + 5 * this.wave); },
  slamDamage() { return 12 + 2 * this.wave; },

  updateElite(e, spd, dt) {
    if (e.state === 'slamTele') {
      // 灾纹预警 1s：原地蓄力不移动（预警圈在 draw 中绘制）
      e.stateT -= dt;
      if (e.stateT <= 0) {
        e.state = 'chase';
        e.slamT = 6;
        const r = this.slamRadius();
        FX.ring(e.x, e.y, 20, r, '#ff5a3c', 0.4, 6);
        FX.imgFx('effects/hit_effect.png', e.x, e.y, r * 1.5, { life: 0.3 });
        Engine.addShake(8, true); // P0：大震动通道
        if (M.dist(e.x, e.y, Player.x, Player.y) < r + 26) Player.hurt(this.slamDamage());
      }
      return;
    }
    e.slamT -= dt;
    if (e.slamT <= 0) {
      e.state = 'slamTele';
      e.stateT = 1.0;
      return;
    }
    this.moveToward(e, Player.x, Player.y, spd, dt);
  },

  moveToward(e, tx, ty, spd, dt) {
    const dd = M.dist(e.x, e.y, tx, ty);
    if (dd < 1) return;
    e.faceX = tx > e.x ? 1 : -1;
    e.x += (tx - e.x) / dd * spd * dt;
    e.y += (ty - e.y) / dd * spd * dt;
  },

  // P0：基于空间网格的分离——只检查同格 + 相邻 8 格，_qi 保证每对只处理一次，平方距离粗筛后再开方
  separate() {
    const inv = 1 / this.grid.cell;
    for (const a of this.list) {
      if (a.dead) continue;
      const cx = Math.floor(a.x * inv), cy = Math.floor(a.y * inv);
      for (let gx = cx - 1; gx <= cx + 1; gx++) {
        for (let gy = cy - 1; gy <= cy + 1; gy++) {
          const arr = this.grid.map.get(this._gridKey(gx, gy));
          if (!arr) continue;
          for (let k = 0; k < arr.length; k++) {
            const b = arr[k];
            if (b._qi <= a._qi) continue; // 每对只处理一次
            const dx = b.x - a.x, dy = b.y - a.y;
            const min = a.r + b.r - 6;
            const d2 = dx * dx + dy * dy;
            if (d2 === 0 || d2 >= min * min) continue; // 平方距离粗筛
            const d = Math.sqrt(d2);
            const push = (min - d) / d * 0.4;
            a.x -= dx * push; a.y -= dy * push;
            b.x += dx * push; b.y += dy * push;
          }
        }
      }
    }
  },

  updateDrops(dt) {
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i];
      d.anim += dt;
      const dd = M.dist(d.x, d.y, Player.x, Player.y);
      const magnetR = d.kind === 'chest' ? Player.pickup * 0.7 : Player.pickup;
      if (dd < magnetR && dd > 1) {
        const sp = d.kind === 'chest' ? 300 : 460;
        d.x += (Player.x - d.x) / dd * sp * dt;
        d.y += (Player.y - d.y) / dd * sp * dt;
      }
      if (dd < 28) {
        if (d.kind === 'exp') {
          const v = this.expDouble ? d.v * 2 : d.v;
          Player.gainExp(v);
          if (typeof SFX !== 'undefined') SFX.play('pickup');
          FX.text(Player.x, Player.y - 70, '+' + v + ' 经验', '#8fd3ff', 14);
        } else if (d.kind === 'shard') {
          if (typeof SFX !== 'undefined') SFX.play('pickup');
          if (typeof Storage !== 'undefined') {
            const sd = Storage.Load();
            sd.gold = (sd.gold || 0) + 1;
            Storage.Save(sd);
          }
          FX.text(Player.x, Player.y - 70, '+1 源质碎片', '#c9a86a', 15);
        } else {
          Game.applyGoblinReward();
        }
        this.drops.splice(i, 1);
      }
    }
  },

  // ---------- 绘制 ----------
  drawDrops(ctx) {
    for (const d of this.drops) {
      const x = Engine.SX(d.x), y = Engine.SY(d.y) + Math.sin(d.anim * 4) * 3;
      Assets.drawSprite(ctx, 'drops/pickup_glow.png', x, y, d.kind === 'chest' ? 70 : 40, { alpha: 0.7 });
      if (d.kind === 'exp') {
        Assets.drawSprite(ctx, 'drops/experience_crystal.png', x, y, d.v >= 4 ? 34 : 24, {});
      } else if (d.kind === 'shard') {
        ctx.save();
        ctx.translate(x, y - 6);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = '#c9a86a';
        ctx.strokeStyle = '#f0d9a0';
        ctx.lineWidth = 2;
        ctx.fillRect(-8, -8, 16, 16);
        ctx.strokeRect(-8, -8, 16, 16);
        ctx.restore();
      } else {
        ctx.save();
        ctx.translate(x, y - 14);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = '#ffd75e';
        ctx.strokeStyle = '#8a6a1f';
        ctx.lineWidth = 3;
        ctx.fillRect(-13, -13, 26, 26);
        ctx.strokeRect(-13, -13, 26, 26);
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#5a430f';
        ctx.font = 'bold 18px "PingFang SC", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('宝', x, y - 7);
        ctx.restore();
      }
    }
  },

  draw(ctx) {
    for (const e of this.list) {
      if (e.dead) continue;
      const x = Engine.SX(e.x), y = Engine.SY(e.y);
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.ellipse(x, y + 2, e.r * 0.9, e.r * 0.38, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      if (e.type === 'charger' && e.state === 'tele') {
        ctx.save();
        ctx.globalAlpha = 0.4 + Math.sin(e.anim * 20) * 0.2;
        ctx.strokeStyle = '#ff5a3c';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(x, y - e.r, e.r + 12, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }

      // 精英出生符文预警圈（1.2s 后精英才开始移动）
      if (e.spawnT > 0) {
        const k = 1 - e.spawnT / 1.2;
        ctx.save();
        ctx.globalAlpha = 0.5 + Math.sin(e.anim * 16) * 0.2;
        ctx.strokeStyle = '#ff5a3c';
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 8]);
        ctx.beginPath(); ctx.arc(x, y - e.r, e.r + 26, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 0.18 + k * 0.3;
        ctx.fillStyle = '#ff5a3c';
        ctx.beginPath(); ctx.arc(x, y - e.r, (e.r + 26) * k, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }

      // 精英砸地灾纹预警（1s 后爆发）
      if (e.type === 'elite' && e.state === 'slamTele') {
        const sr = this.slamRadius();
        const k = 1 - e.stateT / 1.0;
        ctx.save();
        ctx.globalAlpha = 0.75;
        ctx.strokeStyle = '#ff5a3c';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(x, y, sr, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 0.22 + k * 0.35;
        ctx.fillStyle = '#ff5a3c';
        ctx.beginPath(); ctx.arc(x, y, sr * k, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }

      const bob = Math.sin(e.anim * (e.type === 'elite' ? 4 : 8)) * 3;
      const pulse = e.state === 'charge' ? 1.12 : 1;
      const sprite = e.type === 'charger' && e.state === 'charge' ? 'enemies/charger_charge.png' : e.cfg.img;
      Assets.drawSprite(ctx, sprite, x, y, e.cfg.drawH, {
        bob, flash: e.flash, pulse, flip: e.faceX < 0,
      });

      if (e.freezeT > 0) {
        ctx.save();
        ctx.globalAlpha = 0.45;
        ctx.fillStyle = '#aee6ff';
        ctx.beginPath(); ctx.arc(x, y - e.r, e.r + 6, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }

      // 状态图标
      const icons = [];
      if (e.burnT > 0) icons.push('status/burn.png');
      if (e.shockT > 0) icons.push('status/shock.png');
      if (e.slowT > 0 && e.slowPct > 0) icons.push('status/slow.png');
      if (e.stunT > 0) icons.push('status/stun.png');
      if (e.freezeT > 0) icons.push('status/freeze.png');
      const topY = y - e.cfg.drawH;
      icons.forEach((p, k) => {
        const img = Assets.img(p);
        if (img) ctx.drawImage(img, x - icons.length * 10 + k * 20, topY - 26, 18, 18);
      });

      if (e.type === 'elite' || e.type === 'goblin') {
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.fillRect(x - 34, topY - 14, 68, 6);
        ctx.fillStyle = e.type === 'elite' ? '#ff5a5a' : '#ffd75e';
        ctx.fillRect(x - 34, topY - 14, 68 * Math.max(0, e.hp / e.maxHp), 6);
      }
    }
  },
};
