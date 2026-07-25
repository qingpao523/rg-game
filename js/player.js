// 玩家：职业属性、移动、法力、主动技
const Player = {
  reset(classId) {
    const c = CONFIG.classes[classId];
    const P = CONFIG.player;
    this.classId = classId;
    this.cfg = c;
    this.x = 0; this.y = 0;
    this.maxHp = P.hp + (c.passive.hpBonus || 0);
    this.hp = this.maxHp;
    this.maxMana = P.mana + (c.passive.manaBonus || 0);
    this.mana = this.maxMana;
    this.manaRegen = P.manaRegen * (c.passive.manaRegenMult || 1);
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
    this.shield = null; // {hp,t,convert,absorbed,barrier}
    this.buffs = { fire: { t: 0, dmg: 0 }, thunder: { t: 0, dmg: 0, lv: 1 } };
    this.damageReduction = 0; // 钢铁皮肤：与 armor 加算，封顶 30%
    this.maxHpBonus = 0;      // 生命祝福：技能提供的生命上限
    this.dead = false;

    // P3 v2.0：应用局外天赋加成（百分比制）
    if (typeof Talents !== 'undefined') {
      const b = Talents.bonuses();
      if (b.hpPct) { this.maxHp = Math.round(this.maxHp * (1 + b.hpPct)); this.hp = this.maxHp; }
      if (b.speedPct) this.speed *= 1 + b.speedPct;
      if (b.pickupPct) this.pickup *= 1 + b.pickupPct;
      if (b.manaRegenPct) this.manaRegen *= 1 + b.manaRegenPct;
      if (b.dmgReduction) this.damageReduction += b.dmgReduction;
      this.talentBonus = b;
    }
  },

  get armor() { return this.cfg.passive.armor || 0; },
  get cdMult() {
    const cd = this.talentBonus && this.talentBonus.cd ? 1 - this.talentBonus.cd : 1;
    return (this.cfg.passive.cdMult || 1) * cd;
  },
  get summonMult() { return (this.cfg.passive.summonMult || 1) * (this.talentBonus && this.talentBonus.summonDmg ? 1 + this.talentBonus.summonDmg : 1); },

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
    this.mana = Math.min(this.maxMana, this.mana + this.manaRegen * dt);
    this.activeCd = Math.max(0, this.activeCd - dt);
    this.hurtT = Math.max(0, this.hurtT - dt);
    this.iframes = Math.max(0, this.iframes - dt);
    this.flash = Math.max(0, this.flash - dt);

    // P3 v2.0 天赋：regenPct 每秒回复最大生命百分比
    const tb = this.talentBonus;
    if (tb && tb.regenPct && this.hp < this.maxHp && this.hp > 0) {
      this.hp = Math.min(this.maxHp, this.hp + this.maxHp * tb.regenPct * dt);
    }

    if (this.shield) {
      this.shield.t -= dt;
      if (this.shield.t <= 0 || this.shield.hp <= 0) {
        // 冰霜结界被击破（非自然到期）：冻结周围敌人
        if (this.shield.barrier && this.shield.hp <= 0) Skills.barrierShatter(this.shield.barrier.freeze);
        const trueDmg = Math.round(this.shield.absorbed * this.shield.convert);
        if (trueDmg > 0) {
          FX.ring(this.x, this.y, 20, 170, '#ffe9a8', 0.4, 6);
          Enemies.areaDamage(this.x, this.y, 170, trueDmg, { color: '#ffe9a8', noAmp: true });
        }
        this.shield = null;
      }
    }
  },

  hurt(dmg) {
    if (this.dead || this.iframes > 0 || this.hurtT > 0) return;
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
    // P1 天赋：iframe 受击无敌加成
    const tb = this.talentBonus;
    if (tb && tb.iframe) this.iframes += tb.iframe;
    Engine.addShake(3); // P0：受击降幅（原 7，被围时 2 次/秒形成永震）
    FX.text(this.x, this.y - 90, '-' + d, '#ff6b6b', 22);
    if (this.hp <= 0) {
      // P1 天赋：revive 每局复活 1 次（30% 血）
      if (tb && tb.revive && !this._revived) {
        this._revived = true;
        this.hp = Math.round(this.maxHp * 0.3);
        this.flash = 0.5;
        UI.toast('不屈意志触发！复活（30% 生命）');
        if (typeof SFX !== 'undefined') SFX.play('evolve');
        FX.ring(this.x, this.y, 20, 200, '#f0d9a0', 0.6, 8);
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
    // P1 天赋：exp 经验获取加成
    const tb = this.talentBonus;
    if (tb && tb.exp) v = Math.round(v * (1 + tb.exp));
    this.exp += v;
    while (this.exp >= this.expNeed) {
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
    return !this.dead && this.activeCd <= 0 && this.mana >= CONFIG.player.activeCost;
  },

  castActive() {
    if (!this.canCast()) return false;
    this.mana -= CONFIG.player.activeCost;
    const id = this.cfg.active;
    const d = this.activeData();
    const tb = this.talentBonus;
    const cdMult = (id === 'flash_slash' && tb && tb.flashCd) ? 1 - tb.flashCd : 1;
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
    const fx = this.faceX || 1, fy = this.faceY || 0;
    const nx = this.x + fx * 280, ny = this.y + fy * 280;
    const tb = this.talentBonus;
    const dmgMult = (tb && tb.flashDmg ? 1 + tb.flashDmg : 1) * (tb && tb.activeDmg ? 1 + tb.activeDmg : 1);
    const finalDmg = Math.round(d.dmg * dmgMult);
    let kills = 0;
    for (const e of Enemies.list) {
      if (e.dead) continue;
      if (M.segDist(e.x, e.y, this.x, this.y, nx, ny) < 70 + e.r) {
        if (Enemies.hurt(e, finalDmg, { color: '#ffe9a8' })) kills++;
      }
    }
    const ang = Math.atan2(fy, fx);
    FX.imgFx('effects/flash_slash_vfx.png', (this.x + nx) / 2, (this.y + ny) / 2, 200, { life: 0.35, rot: ang, scale1: 1.25 });
    this.x = nx; this.y = ny;
    this.iframes = Math.max(this.iframes, d.invuln);
    const killCdBonus = tb && tb.killCd ? tb.killCd : 0;
    this.activeCd = Math.max(0.5, this.activeCd - this.activeCdMax * (d.killCd + killCdBonus) * kills);
    Engine.addShake(3); // P0：一闪降幅（原 6，cd 仅 2s 过于频繁）
  },

  // 法老：冥棺敕命 —— 冲击 + 召回强化召唤物
  cast_sarcophagus(d) {
    FX.imgFx('effects/sarcophagus_vfx.png', this.x, this.y - 40, 200, { life: 0.7, scale0: 0.7, scale1: 1.15 });
    FX.ring(this.x, this.y, 30, 230, '#c9a86a', 0.45, 7);
    Enemies.areaDamage(this.x, this.y, 230, d.dmg, { color: '#c9a86a' });
    Skills.recallSummons(d.refreshHp, d.mult, 8);
    Engine.addShake(6);
  },

  // 寒冰女巫：极寒领域 —— 脚下冰域
  cast_frozen_field(d) {
    Skills.zones.push({
      kind: 'frozen', x: this.x, y: this.y, r: d.radius, t: 0, dur: 6, tick: 0,
      dps: d.dps, slow: d.slow, shatter: d.shatter, lv: this.activeLv(),
    });
    FX.imgFx('effects/frozen_field_vfx.png', this.x, this.y, d.radius * 1.7, { life: 0.8, scale0: 0.5, scale1: 1.05, alpha0: 0.9 });
  },

  // 十字军：圣盾冲阵 —— 护盾 + 推进
  cast_holy_shield(d) {
    const tb = this.talentBonus;
    const shieldMult = tb && tb.shieldHp ? 1 + tb.shieldHp : 1;
    const convertBonus = tb && tb.convert ? tb.convert : 0;
    const dmgMult = (tb && tb.chargeDmg ? 1 + tb.chargeDmg : 1) * (tb && tb.activeDmg ? 1 + tb.activeDmg : 1);
    this.shield = { hp: Math.round(d.absorb * shieldMult), t: 5, convert: d.convert + convertBonus, absorbed: 0 };
    const fx = this.faceX || 1, fy = this.faceY || 0;
    const nx = this.x + fx * 220, ny = this.y + fy * 220;
    const finalDmg = Math.round(d.dmg * dmgMult);
    for (const e of Enemies.list) {
      if (e.dead) continue;
      if (M.segDist(e.x, e.y, this.x, this.y, nx, ny) < 80 + e.r) {
        Enemies.hurt(e, finalDmg, { color: '#ffe9a8' });
      }
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
