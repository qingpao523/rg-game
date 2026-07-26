// 玩家：职业属性、移动、主动技（无法力系统，主动技仅 CD）
const Player = {
  reset(classId) {
    const c = CONFIG.classes[classId];
    const P = CONFIG.player;
    this.classId = classId;
    this.cfg = c;
    this.x = 0; this.y = 0;
    this.maxHp = P.hp + (c.passive.hpBonus || 0);
    this.hp = this.maxHp;
    this.speed = P.speed * (c.passive.speedMult || 1);
    this.pickup = P.pickup;
    this.dmgMult = 1;
    this.level = 1;
    this.exp = 0;
    this.expNeed = CONFIG.expNeed(1);
    this.pendingLevels = 0;
    this.faceX = 0; this.faceY = -1;
    this.anim = 0;
    this.moving = false;
    this.flash = 0;
    this.hurtT = 0;
    this.iframes = 0;
    this.activeCd = 0;
    this.activeCdMax = 1;
    this.shield = null;
    this.buffs = { fire: { t: 0, dmg: 0 }, thunder: { t: 0, dmg: 0, lv: 1 } };
    this.damageReduction = 0;
    this.maxHpBonus = 0;
    this.dead = false;

    // P3 v2.0：应用局外天赋加成（百分比制）
    if (typeof Talents !== 'undefined') {
      const b = Talents.bonuses();
      if (b.hpPct) { this.maxHp = Math.round(this.maxHp * (1 + b.hpPct)); this.hp = this.maxHp; }
      if (b.speedPct) this.speed *= 1 + b.speedPct;
      if (b.pickupPct) this.pickup *= 1 + b.pickupPct;
      if (b.dmgReduction) this.damageReduction += b.dmgReduction;
      // 拾取之王：拾取范围 +50%
      if (b.pickupKing) this.pickup *= 1.5;
      this.talentBonus = b;
    }

    // 天赋 v2.0：计时器类天赋状态（每局清零）
    this.lastStandCd = 0;                        // 背水一战冷却
    this.autoPickupT = 0;                        // 自动拾取
    this.ccImmuneT = 0;                          // 不屈意志（控制免疫）
    this.unbreakableCd = 0;                      // 不屈意志冷却
    this.immortalCd = 0; this.immortalT = 0;     // 不朽
    this.chainSlashT = 0;                        // 连斩增伤窗口
    this._outOfCombat = 0;                       // 永动之躯：脱战计时
  },

  get armor() { return this.cfg.passive.armor || 0; },
  get cdMult() { return this.cfg.passive.cdMult || 1; },
  get summonMult() { return this.cfg.passive.summonMult || 1; },

  activeLv() { return CONFIG.activeLevel(this.level); },
  activeData() {
    return CONFIG.actives[this.cfg.active].levels[this.activeLv() - 1];
  },

  update(dt) {
    const mv = Engine.moveVector();
    this.moving = !!(mv.x || mv.y);
    if (this.moving) {
      this.faceX = mv.x; this.faceY = mv.y;
      this.x += mv.x * this.speed * dt;
      this.y += mv.y * this.speed * dt;
      this.anim += dt;
    } else {
      this.anim += dt * 0.4;
    }
    this.activeCd = Math.max(0, this.activeCd - dt);
    this.hurtT = Math.max(0, this.hurtT - dt);
    this.iframes = Math.max(0, this.iframes - dt);
    this.flash = Math.max(0, this.flash - dt);

    // 天赋 v2.0：计时器递减
    this.lastStandCd = Math.max(0, this.lastStandCd - dt);
    this.autoPickupT = Math.max(0, this.autoPickupT - dt);
    this.ccImmuneT = Math.max(0, this.ccImmuneT - dt);
    this.unbreakableCd = Math.max(0, this.unbreakableCd - dt);
    this.immortalCd = Math.max(0, this.immortalCd - dt);
    this.immortalT = Math.max(0, this.immortalT - dt);
    this.chainSlashT = Math.max(0, this.chainSlashT - dt);

    const tb = this.talentBonus;

    // 永动之躯：移动时每秒回 0.5% 最大生命，脱战（3s 未受击）翻倍
    if (tb && tb.perpetual && this.hp > 0 && this.hp < this.maxHp) {
      if (this.hurtT <= 0) this._outOfCombat += dt; else this._outOfCombat = 0;
      const rate = 0.005 * (this._outOfCombat >= 3 ? 2 : 1);
      if (this.moving) this.hp = Math.min(this.maxHp, this.hp + this.maxHp * rate * dt);
    }

    // 背水一战：生命 <30% 时获 20% 最大生命护盾 5s，CD 90s
    if (tb && tb.lastStand && this.lastStandCd <= 0 && !this.shield && !this.dead && this.hp > 0 && this.hp < this.maxHp * 0.3) {
      const shHp = Math.round(this.maxHp * 0.2);
      this.shield = { hp: shHp, t: 5, convert: 0, absorbed: 0, lastStand: true };
      this.lastStandCd = 90;
      FX.ring(this.x, this.y, 20, 140, '#f0d9a0', 0.5, 6);
      FX.text(this.x, this.y - 110, '背水一战', '#f0d9a0', 20);
      if (typeof SFX !== 'undefined') SFX.play('evolve');
    }

    // 自动拾取：每 8s（拾取之王 3s）把周围经验球/碎片/血瓶吸到身边
    if (tb && (tb.autoPickup || tb.pickupKing) && this.autoPickupT <= 0 && typeof Enemies !== 'undefined') {
      this.autoPickupT = tb.pickupKing ? 3 : 8;
      const R = 320;
      for (const dr of Enemies.drops) {
        if (dr.kind === 'chest') continue;
        const ddx = dr.x - this.x, ddy = dr.y - this.y;
        if (ddx * ddx + ddy * ddy < R * R) { dr.x = this.x + M.rand(-10, 10); dr.y = this.y + M.rand(-10, 10); }
      }
    }

    if (this.shield) {
      this.shield.t -= dt;
      if (this.shield.t <= 0 || this.shield.hp <= 0) {
        // 冰霜结界被击破（非自然到期）：冻结周围敌人
        if (this.shield.barrier && this.shield.hp <= 0) Skills.barrierShatter(this.shield.barrier.freeze);
        const broken = this.shield;
        this.shield = null;
        this.onShieldBreak(broken);
      }
    }
  },

  // 护盾破裂结算：圣光回响 / 光明审判（十字军专精天赋）
  onShieldBreak(sh) {
    const absorbed = sh.absorbed || 0;
    // 圣盾冲阵到期/破裂：吸收量转真伤（原有机制）
    if (!sh.barrier && !sh.lastStand) {
      const trueDmg = Math.round(absorbed * sh.convert);
      if (trueDmg > 0) {
        FX.ring(this.x, this.y, 20, 170, '#ffe9a8', 0.4, 6);
        Enemies.areaDamage(this.x, this.y, 170, trueDmg, { color: '#ffe9a8', noAmp: true });
      }
    }
    const tb = this.talentBonus;
    if (!tb) return;
    // 圣光回响：护盾破裂时对周围造成 50%/100% 吸收量伤害
    if (tb.holyEcho && absorbed > 0) {
      const dmg = Math.round(absorbed * tb.holyEcho);
      FX.ring(this.x, this.y, 30, 190, '#ffe9a8', 0.45, 6);
      Enemies.areaDamage(this.x, this.y, 190, dmg, { color: '#ffe9a8' });
      Engine.addShake(4);
    }
    // 光明审判：护盾破裂时光柱轰击最近 3 敌，造成 200% 吸收量伤害
    if (tb.lightJudgment && absorbed > 0) {
      const dmg = Math.round(absorbed * 2);
      const targets = Enemies.nearestN(this.x, this.y, 640, 3);
      for (const e of targets) {
        FX.bolt(e.x, e.y - 220, e.x, e.y, '#ffe9a8', 0.25);
        FX.imgFx('effects/hit_effect.png', e.x, e.y - 20, 110, { life: 0.3 });
        Enemies.hurt(e, dmg, { color: '#ffe9a8' });
      }
      if (targets.length) Engine.addShake(5);
    }
  },

  hurt(dmg) {
    if (this.dead || this.iframes > 0 || this.hurtT > 0) return;
    const tb = this.talentBonus;
    // 铁壁：护盾存在期间受伤额外 -10%/-20%
    if (tb && tb.ironWall && this.shield && this.shield.hp > 0) dmg *= 1 - tb.ironWall;
    if (this.shield && this.shield.hp > 0) {
      const absorbed = Math.min(this.shield.hp, dmg);
      this.shield.hp -= absorbed;
      this.shield.absorbed += absorbed;
      dmg -= absorbed;
      if (dmg <= 0) { this.hurtT = 0.25; return; }
    }
    const red = Math.min(0.30, this.armor + this.damageReduction); // 减伤与护甲加算，封顶 30%
    const d = Math.max(1, Math.round(dmg * (1 - red)));
    this.hp -= d;
    this.flash = 0.15;
    this.hurtT = CONFIG.player.hurtCd;
    // 不屈意志：受控时立即清除并免疫 2s，CD 60s（玩家无控制状态，受击时给控制免疫 + 短暂无敌帧）
    if (tb && tb.unbreakable && this.unbreakableCd <= 0) {
      this.ccImmuneT = 2;
      this.iframes = Math.max(this.iframes, 0.5);
      this.unbreakableCd = 60;
      FX.ring(this.x, this.y, 20, 120, '#f0d9a0', 0.4, 5);
      FX.text(this.x, this.y - 110, '不屈意志', '#f0d9a0', 18);
    }
    Engine.addShake(3); // P0：受击降幅（原 7，被围时 2 次/秒形成永震）
    FX.text(this.x, this.y - 90, '-' + d, '#ff6b6b', 22);
    if (this.hp <= 0) {
      // 不朽：每 120s 一次，致命伤害锁定 1HP 持续 3s 无敌
      if (tb && tb.immortal && this.immortalCd <= 0) {
        this.hp = 1;
        this.immortalT = 3;
        this.iframes = Math.max(this.iframes, 3);
        this.immortalCd = 120;
        this.dead = false;
        FX.ring(this.x, this.y, 20, 220, '#ffd75e', 0.6, 8);
        FX.text(this.x, this.y - 110, '不朽', '#ffd75e', 24);
        UI.toast('不朽触发！3 秒无敌');
        if (typeof SFX !== 'undefined') SFX.play('evolve');
        return;
      }
      this.hp = 0; this.dead = true; Game.onDeath();
    }
  },

  heal(v) {
    this.hp = Math.min(this.maxHp, this.hp + v);
    FX.text(this.x, this.y - 90, '+' + Math.round(v), '#7dff9b', 22);
  },

  gainExp(v) {
    // 拾取之王：经验球 +10%
    const tb = this.talentBonus;
    if (tb && tb.pickupKing) v = Math.round(v * 1.1);
    this.exp += v;
    const maxLv = CONFIG._maxLevel || 0; // 0=无限
    while (this.exp >= this.expNeed) {
      if (maxLv > 0 && this.level >= maxLv) { this.exp = this.expNeed; break; } // 等级封顶
      this.exp -= this.expNeed;
      this.level++;
      this.expNeed = CONFIG.expNeed(this.level);
      this.pendingLevels++;
      // P1：等级提升明显反馈
      UI.banner('等级提升！Lv.' + this.level, '魔契之书正在重写条目');
      if (typeof SFX !== 'undefined') SFX.play('levelup');
      FX.imgFx('effects/level_up_particle.png', this.x, this.y - 60, 120, { life: 0.8, scale0: 0.5, scale1: 1.5, alpha0: 0.9 });
    }
    if (this.pendingLevels > 0) Game.tryOpenUpgrade();
  },

  canCast() {
    return !this.dead && this.activeCd <= 0;
  },

  castActive() {
    if (!this.canCast()) return false;
    const id = this.cfg.active;
    const d = this.activeData();
    const tb = this.talentBonus;
    // 居合：一闪 CD -10%/-20%
    const cdMult = (id === 'flash_slash' && tb && tb.iaiCd) ? 1 - tb.iaiCd : 1;
    this.activeCdMax = d.cd * cdMult;
    this.activeCd = d.cd * cdMult;
    this['cast_' + id](d);
    return true;
  },

  // 道士：敕令雷符 —— 轰击最密敌群并弹射
  cast_thunder_seal(d) {
    const t = Enemies.densest(this.x, this.y, 700) || Enemies.nearest(this.x, this.y, 700);
    FX.imgFx('effects/thunder_seal_vfx.png', this.x, this.y - 70, 130, { life: 0.5, scale1: 1.4 });
    if (!t) return;
    FX.bolt(this.x, this.y - 120, t.x, t.y, '#9fd8ff', 0.22);
    Enemies.hurt(t, d.dmg, { color: '#9fd8ff' });
    let from = t, dmg = d.dmg * 0.8;
    const visited = new Set([t]);
    for (let i = 1; i < d.chains; i++) {
      const n = Enemies.nearest(from.x, from.y, 240, visited);
      if (!n) break;
      FX.bolt(from.x, from.y - 30, n.x, n.y - 30, '#9fd8ff', 0.18);
      Enemies.hurt(n, dmg, { color: '#9fd8ff' });
      visited.add(n); from = n; dmg *= 0.85;
    }
    if (Math.random() < 0.25 && !t.dead) {
      FX.bolt(t.x, t.y - 160, t.x, t.y, '#cfeaff', 0.2);
      Enemies.hurt(t, d.dmg * 0.5, { color: '#cfeaff', crit: true });
    }
    Engine.addShake(5);
  },

  // 武士：一闪 —— 无敌突进斩，击杀返还冷却
  cast_flash_slash(d) {
    const tb = this.talentBonus || {};
    // 连斩：上次一闪击杀后窗口内，本次伤害 +30%/+60%
    let dmgMult = this.chainSlashT > 0 && tb.chainSlash ? 1 + tb.chainSlash : 1;
    // 血刃狂歌：生命 <50% 时伤害 +50%
    if (tb.bloodBlade && this.hp < this.maxHp * 0.5) dmgMult *= 1.5;
    const finalDmg = Math.round(d.dmg * dmgMult);
    // 刹那永恒：无敌 +0.5s
    const invuln = d.invuln + (tb.timeStop ? 0.5 : 0);
    // 无双乱舞：3 段连续突进斩
    const segs = tb.tripleSlash ? 3 : 1;
    const segLen = tb.tripleSlash ? 150 : 280;
    let kills = 0, healed = false;
    let px = this.x, py = this.y;
    for (let seg = 0; seg < segs; seg++) {
      // 每段重新取朝向（三段可随输入转向）
      let fx = this.faceX, fy = this.faceY;
      const ml = Math.hypot(fx, fy);
      if (ml < 0.01) { fx = 1; fy = 0; } else { fx /= ml; fy /= ml; }
      const nx = px + fx * segLen, ny = py + fy * segLen;
      for (const e of Enemies.list) {
        if (e.dead) continue;
        if (M.segDist(e.x, e.y, px, py, nx, ny) < 70 + e.r) {
          if (Enemies.hurt(e, finalDmg, { color: '#ffe9a8' })) {
            kills++;
            // 血刃狂歌：击杀回 5% 生命
            if (tb.bloodBlade && !healed) { healed = true; this.heal(this.maxHp * 0.05); }
          }
          // 刹那永恒：路径敌人时间停止 1s
          if (tb.timeStop && !e.dead) e.stunT = Math.max(e.stunT || 0, 1);
        }
      }
      // 剑气残留：路径留下剑气区域 1s/2s（30%/60% 伤害）
      if (tb.slashTrail) {
        Skills.zones.push({
          kind: 'slash_trail', x: (px + nx) / 2, y: (py + ny) / 2,
          ang: Math.atan2(fy, fx), len: segLen, halfW: 52,
          t: 0, dur: tb.slashTrail >= 0.6 ? 2 : 1, tick: 0,
          dmg: Math.round(d.dmg * tb.slashTrail),
        });
      }
      const ang = Math.atan2(fy, fx);
      FX.imgFx('effects/flash_slash_vfx.png', (px + nx) / 2, (py + ny) / 2, 200, { life: 0.35, rot: ang, scale1: 1.25 });
      px = nx; py = ny;
    }
    this.x = px; this.y = py;
    this.iframes = Math.max(this.iframes, invuln);
    // 连斩：有击杀则开启增伤窗口（3s/5s）
    if (tb.chainSlash && kills > 0) this.chainSlashT = tb.chainSlash >= 0.6 ? 5 : 3;
    // 居合：击杀返还额外 +10%/+20%
    const killCdBonus = tb.iaiKill || 0;
    this.activeCd = Math.max(0.5, this.activeCd - this.activeCdMax * (d.killCd + killCdBonus) * kills);
    Engine.addShake(3); // P0：一闪降幅（原 6，cd 仅 2s 过于频繁）
  },

  // 法老：冥棺敕命 —— 冲击 + 召回强化召唤物
  cast_sarcophagus(d) {
    FX.imgFx('effects/sarcophagus_vfx.png', this.x, this.y - 40, 200, { life: 0.7, scale0: 0.7, scale1: 1.15 });
    FX.ring(this.x, this.y, 30, 230, '#c9a86a', 0.45, 7);
    Enemies.areaDamage(this.x, this.y, 230, d.dmg, { color: '#c9a86a' });
    // 冥府之门：召回后召唤物全属性 +50% 持续 10s
    const tb = this.talentBonus;
    const mult = tb && tb.netherGate ? d.mult * 1.5 : d.mult;
    const dur = tb && tb.netherGate ? 10 : 8;
    Skills.recallSummons(d.refreshHp, mult, dur);
    Engine.addShake(6);
  },

  // 寒冰女巫：极寒领域 —— 脚下冰域
  cast_frozen_field(d) {
    const tb = this.talentBonus;
    const aoeMult = tb && tb.aoePct ? 1 + tb.aoePct : 1;
    // 冰河时代：连续 3 次冰霜新星，每次范围扩大
    const novas = tb && tb.iceAge ? 3 : 1;
    for (let i = 0; i < novas; i++) {
      Skills.zones.push({
        kind: 'frozen', x: this.x, y: this.y, r: Math.round(d.radius * aoeMult * (1 + 0.15 * i)),
        t: -i * 0.4, dur: 6 + i * 0.4, tick: 0,
        dps: d.dps, slow: d.slow, shatter: d.shatter, lv: this.activeLv(),
        iceAge: !!(tb && tb.iceAge),
      });
    }
    FX.imgFx('effects/frozen_field_vfx.png', this.x, this.y, d.radius * 1.7, { life: 0.8, scale0: 0.5, scale1: 1.05, alpha0: 0.9 });
  },

  // 十字军：圣盾冲阵 —— 护盾 + 推进
  cast_holy_shield(d) {
    const tb = this.talentBonus;
    // 不屈圣盾：护盾上限 +50%
    const shieldMult = tb && tb.unbreakableShield ? 1.5 : 1;
    this.shield = { hp: Math.round(d.absorb * shieldMult), t: 5, convert: d.convert, absorbed: 0 };
    const fx = this.faceX || 1, fy = this.faceY || 0;
    const nx = this.x + fx * 220, ny = this.y + fy * 220;
    for (const e of Enemies.list) {
      if (e.dead) continue;
      if (M.segDist(e.x, e.y, this.x, this.y, nx, ny) < 80 + e.r) {
        Enemies.hurt(e, d.dmg, { color: '#ffe9a8' });
      }
    }
    // 神圣领域：路径留下圣光区域 5s，持续伤害 + 减速
    if (tb && tb.holyDomain) {
      const aoeMult = tb.aoePct ? 1 + tb.aoePct : 1;
      Skills.zones.push({
        kind: 'holy', x: (this.x + nx) / 2, y: (this.y + ny) / 2,
        r: Math.round(110 * aoeMult), t: 0, dur: 5, tick: 0,
        dmg: Math.round(d.dmg * 0.5), slow: 0.35,
      });
    }
    FX.imgFx('effects/holy_shield_vfx.png', this.x, this.y - 50, 150, { life: 0.6, scale0: 0.8, scale1: 1.2 });
    this.x = nx; this.y = ny;
    Engine.addShake(4);
  },

  draw(ctx) {
    const x = Engine.SX(this.x), y = Engine.SY(this.y);
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.ellipse(x, y + 4, 26, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const bob = this.moving ? Math.sin(this.anim * 10) * 4 : Math.sin(this.anim * 3) * 2.5;
    const tilt = this.moving ? this.faceX * 0.09 : 0;
    const img = this.moving ? this.cfg.move : this.cfg.idle;
    Assets.drawSprite(ctx, img, x, y, CONFIG.player.drawH, {
      bob, tilt, flash: this.flash, flip: this.faceX < -0.1,
    });

    if (this.shield && this.shield.hp > 0) {
      ctx.save();
      ctx.globalAlpha = 0.35 + Math.sin(this.anim * 6) * 0.1;
      ctx.strokeStyle = this.shield.barrier ? '#aee6ff' : '#ffe9a8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y - 55, 58, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  },
};
