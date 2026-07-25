// 技能系统：20 基础技能 + 4 进化、投射物、区域、召唤物、升级三选一
const Skills = {
  owned: [],          // {id, lv, t(冷却计时), idle(buff 闲置计时)}
  consumed: new Set(),// 被进化消耗的基础技能，本局不再出现
  evoCount: 0,
  projectiles: [],
  zones: [],
  summons: [],
  cloud: null,

  reset(classId) {
    this.owned = [{ id: CONFIG.classes[classId].start, lv: 1, t: 0, idle: 0 }];
    this.consumed = new Set();
    this.evoCount = 0;
    this.projectiles.length = 0;
    this.zones.length = 0;
    this.summons.length = 0;
    this.cloud = null;
  },

  hasSkill(id) { return this.owned.some(s => s.id === id); },
  getSkill(id) { return this.owned.find(s => s.id === id); },
  cfgOf(id) { return CONFIG.skills[id] || CONFIG.evolutions[id]; },
  lvData(s) {
    const c = this.cfgOf(s.id);
    return this.lvlData(c, s.lv);
  },
  // 支持无限等级：超出 levels 数组时从最后两级差值线性外推
  lvlData(c, lv) {
    if (!c.levels) return c;
    const levels = c.levels;
    if (lv <= levels.length) return levels[lv - 1];
    const last = levels[levels.length - 1];
    const prev = levels[levels.length - 2] || last;
    const extra = lv - levels.length;
    const out = {};
    for (const k in last) {
      if (typeof last[k] === 'number') {
        const delta = last[k] - (prev[k] !== undefined ? prev[k] : last[k]);
        out[k] = last[k] + delta * extra;
        if (k === 'cd') out[k] = Math.max(0.3, out[k]); // CD 不低于 0.3s
        if (k === 'count' || k === 'chains' || k === 'max' || k === 'pierce') out[k] = Math.max(1, Math.round(out[k]));
      } else {
        out[k] = last[k];
      }
    }
    return out;
  },

  enhanceMult() {
    const s = this.getSkill('taoist_skull_enhance');
    return s ? 1 + this.lvData(s).atk : 1;
  },

  // ---------- 主更新 ----------
  update(dt) {
    for (const s of this.owned) {
      const c = this.cfgOf(s.id);
      const d = this.lvData(s);
      this['bh_' + c.behavior](s, c, d, dt);
    }
    this.updateProjectiles(dt);
    this.updateZones(dt);
    this.updateSummons(dt);
    if (this.cloud) this.updateCloud(dt);
  },

  // ---------- 行为：魔法飞弹 ----------
  bh_missile(s, c, d, dt) {
    s.t -= dt;
    if (s.t > 0) return;
    const targets = this._getTargets(d.count, 620);
    if (!targets.length) { s.t = 0.2; return; }
    s.t = d.cd * Player.cdMult;
    targets.forEach((e, i) => {
      const ang = Math.atan2(e.y - Player.y, e.x - Player.x) + (i - (targets.length - 1) / 2) * 0.22;
      this.spawnProj({
        img: c.projectile, x: Player.x, y: Player.y - 50, speed: 520,
        vx: Math.cos(ang) * 520, vy: Math.sin(ang) * 520,
        dmg: d.dmg, r: 14, homing: 6, target: e, life: 2.5, h: 44,
      });
    });
  },

  // P0 目标选取：单投射物锁定最近敌人，多投射物保持 nearestN 扇形
  _getTargets(count, range) {
    if (count <= 1) {
      const e = Enemies.nearest(Player.x, Player.y, range);
      return e ? [e] : [];
    }
    return Enemies.nearestN(Player.x, Player.y, range, count);
  },

  // ---------- 行为：爆裂火球 ----------
  bh_fireball(s, c, d, dt) {
    s.t -= dt;
    if (s.t > 0) return;
    const targets = this._getTargets(d.count, 640);
    if (!targets.length) { s.t = 0.2; return; }
    s.t = d.cd * Player.cdMult;
    for (const e of targets) {
      const ang = Math.atan2(e.y - Player.y, e.x - Player.x);
      this.spawnProj({
        img: c.projectile, x: Player.x, y: Player.y - 50, speed: 400,
        vx: Math.cos(ang) * 400, vy: Math.sin(ang) * 400,
        dmg: d.dmg, r: 16, aoe: d.radius, life: 2.2, h: 52, spin: 3,
      });
    }
  },

  // ---------- 行为：灾厄光环 ----------
  bh_doom_aura(s, c, d, dt) {
    s.t -= dt;
    if (s.t > 0) return;
    s.t = 0.3;
    for (const e of Enemies.list) {
      if (!e.dead && M.dist(Player.x, Player.y, e.x, e.y) < d.radius) {
        e.resDown = d.resDown; e.resDownT = 0.6;
      }
    }
  },

  // ---------- 行为：炎附 / 感电烙印（周期 buff） ----------
  bh_buff_fire(s, c, d, dt) { this.buffCycle(s, d, dt, 'fire'); },
  bh_buff_thunder(s, c, d, dt) { this.buffCycle(s, d, dt, 'thunder'); },
  buffCycle(s, d, dt, key) {
    const b = Player.buffs[key];
    if (b.t > 0) {
      b.t -= dt;
      if (b.t <= 0) s.idle = d.cd;
    } else {
      s.idle -= dt;
      if (s.idle <= 0) {
        b.t = d.dur; b.dmg = d.dmg; b.lv = s.lv;
        FX.text(Player.x, Player.y - 110, key === 'fire' ? '炎附' : '感电', key === 'fire' ? '#ff9a3c' : '#9fd8ff', 20);
      }
    }
  },

  // ---------- 行为：弹射闪电 ----------
  bh_chain(s, c, d, dt) {
    s.t -= dt;
    if (s.t > 0) return;
    const first = Enemies.nearest(Player.x, Player.y, 520);
    if (!first) { s.t = 0.25; return; }
    s.t = d.cd * Player.cdMult;
    this.chainHit(Player.x, Player.y - 40, first, d.dmg, d.chains, d.decay, 220, null);
  },

  chainHit(x, y, first, dmg, chains, decay, range, perHit) {
    let from = { x, y: y }, cur = first;
    const visited = new Set();
    for (let i = 0; i < chains && cur; i++) {
      FX.bolt(from.x, from.y, cur.x, cur.y - 30, '#9fd8ff', 0.2);
      Enemies.hurt(cur, dmg, { color: '#9fd8ff' });
      if (perHit) perHit(cur);
      visited.add(cur);
      from = cur;
      dmg *= (1 - decay);
      cur = Enemies.nearest(from.x, from.y, range, visited);
    }
  },

  // ---------- 行为：天雷击 ----------
  bh_bolt(s, c, d, dt) {
    s.t -= dt;
    if (s.t > 0) return;
    const e = Enemies.tankiest(Player.x, Player.y, 620);
    if (!e) { s.t = 0.25; return; }
    s.t = d.cd * Player.cdMult;
    const tb = Player.talentBonus;
    const crit = Math.random() < (d.crit + (tb && tb.boltCrit ? tb.boltCrit : 0) + (tb && tb.crit ? tb.crit : 0));
    FX.bolt(e.x, e.y - 200, e.x, e.y, '#cfeaff', 0.22);
    FX.imgFx(crit ? 'effects/crit_effect.png' : 'effects/hit_effect.png', e.x, e.y - 30, 90, { life: 0.3 });
    Enemies.hurt(e, Math.round(d.dmg * (tb && tb.thunderDmg ? 1 + tb.thunderDmg : 1)), { crit, color: '#cfeaff' });
  },

  // ---------- 行为：雷云 ----------
  bh_cloud(s, c, d, dt) {
    if (this.cloud) {
      if (this.cloud.t >= this.cloud.dur) { this.cloud = null; s.idle = 3; }
      return;
    }
    s.idle = (s.idle || 0) - dt;
    if (s.idle <= 0) this.cloud = { t: 0, dur: d.dur, zap: 0, dmg: d.dmg, radius: d.radius, interval: d.interval };
  },
  updateCloud(dt) {
    const cl = this.cloud;
    cl.t += dt; cl.zap -= dt;
    if (cl.zap <= 0) {
      const e = Enemies.randomIn(Player.x, Player.y, cl.radius);
      if (e) {
        cl.zap = cl.interval;
        FX.bolt(cl.x || Player.x, Player.y - 150, e.x, e.y - 20, '#b7e3ff', 0.15);
        Enemies.hurt(e, cl.dmg, { color: '#b7e3ff' });
      }
    }
    cl.x = Player.x;
  },

  // ---------- 行为：麻痹领域 ----------
  bh_paralyze(s, c, d, dt) {
    s.t -= dt;
    if (s.t > 0) return;
    const e = Enemies.nearest(Player.x, Player.y, 420);
    if (!e) { s.t = 0.3; return; }
    s.t = d.cd * Player.cdMult;
    this.zones.push({ kind: 'paralyze', x: e.x, y: e.y, r: d.radius, t: 0, dur: 3, tick: 0, dmg: d.dmg, slow: d.slow, stun: d.stun });
  },

  // ---------- 行为：燃烧咒 ----------
  bh_curse(s, c, d, dt) {
    s.t -= dt;
    if (s.t > 0) return;
    const e = Enemies.nearest(Player.x, Player.y, 560);
    if (!e) { s.t = 0.25; return; }
    s.t = d.cd * Player.cdMult;
    const ang = Math.atan2(e.y - Player.y, e.x - Player.x);
    this.spawnProj({
      img: c.projectile, x: Player.x, y: Player.y - 50, speed: 460,
      vx: Math.cos(ang) * 460, vy: Math.sin(ang) * 460,
      dmg: d.dmg, r: 14, life: 2, h: 46,
      burn: { dps: d.dps, dur: d.burnDur, spread: d.spread },
    });
  },

  // ---------- 行为：火墙 ----------
  bh_wall(s, c, d, dt) {
    s.t -= dt;
    if (s.t > 0) return;
    const e = Enemies.nearest(Player.x, Player.y, 520);
    if (!e) { s.t = 0.3; return; }
    s.t = d.cd * Player.cdMult;
    const ang = Math.atan2(e.y - Player.y, e.x - Player.x);
    this.zones.push({
      kind: 'wall', x: Player.x + Math.cos(ang) * 130, y: Player.y + Math.sin(ang) * 130,
      ang: ang + Math.PI / 2, len: 230, halfW: d.radius / 2, t: 0, dur: d.dur, tick: 0, dmg: d.dmg,
    });
  },

  // ---------- 行为：召唤 ----------
  bh_summon_melee(s, c, d, dt) {
    s.t -= dt;
    if (s.t > 0) return;
    const tb = Player.talentBonus;
    const cap = d.max + (tb && tb.summonCap ? tb.summonCap : 0);
    const n = this.summons.filter(u => u.kind === 'melee').length;
    if (n >= cap) { s.t = 0.5; return; }
    s.t = d.cd * Player.cdMult;
    this.spawnSkeleton('melee', d.dmg, d.hp, 0);
  },
  bh_summon_archer(s, c, d, dt) {
    s.t -= dt;
    if (s.t > 0) return;
    const n = this.summons.filter(u => u.kind === 'archer').length;
    if (n >= CONFIG.archerCap) { s.t = 0.5; return; }
    s.t = d.cd * Player.cdMult;
    this.spawnSkeleton('archer', d.dmg, d.hp, 0, d.range);
  },
  spawnSkeleton(kind, dmg, hp, tag, range) {
    const tb = Player.talentBonus;
    const em = this.enhanceMult() * Player.summonMult;
    const hpMult = tb && tb.summonHp ? 1 + tb.summonHp : 1;
    const a = M.rand(0, Math.PI * 2);
    this.summons.push({
      kind, tag: tag || 0,
      x: Player.x + Math.cos(a) * 60, y: Player.y + Math.sin(a) * 60,
      hp: Math.round(hp * em * hpMult), maxHp: Math.round(hp * em * hpMult),
      dmg: dmg * em, range: range || 0,
      r: 20, atkCd: 0, flash: 0, anim: M.rand(0, 5), pulse: 0,
      buffMult: 1, buffT: 0, faceX: 1, dead: false,
    });
    FX.ring(Player.x, Player.y, 10, 60, '#b8c7d9', 0.35, 3);
  },

  // ---------- 行为：进化 · 陨石术 ----------
  bh_meteor(s, c, d, dt) {
    s.t -= dt;
    if (s.t > 0) return;
    const e = Enemies.densest(Player.x, Player.y, 560) || Enemies.nearest(Player.x, Player.y, 560);
    if (!e) { s.t = 0.3; return; }
    s.t = d.cd * Player.cdMult;
    this.zones.push({ kind: 'telegraph', x: e.x, y: e.y, r: d.radius, t: 0, dur: d.telegraph, dmg: d.dmg, burnDps: d.burnDps, burnDur: d.burnDur });
  },

  // ---------- 行为：进化 · 雷网审判 ----------
  bh_thunder_net(s, c, d, dt) {
    s.t -= dt;
    if (s.t > 0) return;
    const first = Enemies.nearest(Player.x, Player.y, 560);
    if (!first) { s.t = 0.25; return; }
    s.t = d.cd * Player.cdMult;
    FX.imgFx('effects/thunder_net_vfx.png', first.x, first.y - 20, 260, { life: 0.5, scale0: 0.6, scale1: 1.2 });
    this.chainHit(Player.x, Player.y - 40, first, d.dmg, d.chains, 0, d.chainRange, (e) => {
      this.addShock(e, d.shockStacks, 3);
    });
  },

  // ---------- 行为：进化 · 灾厄飞星 ----------
  bh_doom_star(s, c, d, dt) {
    s.t -= dt;
    if (s.t > 0) return;
    const targets = Enemies.nearestN(Player.x, Player.y, 640, d.count);
    if (!targets.length) { s.t = 0.2; return; }
    s.t = d.cd * Player.cdMult;
    targets.forEach((e, i) => {
      const ang = Math.atan2(e.y - Player.y, e.x - Player.x) + (i - (targets.length - 1) / 2) * 0.3;
      this.spawnProj({
        img: 'projectiles/magic_missile.png', x: Player.x, y: Player.y - 50, speed: 560,
        vx: Math.cos(ang) * 560, vy: Math.sin(ang) * 560,
        dmg: d.dmg, r: 15, homing: 7, target: e, life: 2.6, h: 50,
        pierce: d.pierce, doomAmp: d.amp, doomDur: d.ampDur,
      });
    });
  },

  // ---------- 行为：进化 · 白骨军势 ----------
  bh_bone_army(s, c, d, dt) {
    s.t -= dt;
    if (s.t > 0) return;
    const army = this.summons.filter(u => u.tag === 1);
    if (army.length >= d.cap) { s.t = 0.5; return; }
    s.t = d.cd * Player.cdMult;
    const em = (1 + d.buff) * Player.summonMult;
    for (let i = 0; i < 2 && army.length + i < d.cap; i++) {
      const kind = (army.length + i) % 3 === 2 ? 'archer' : 'melee';
      this.summons.push({
        kind, tag: 1,
        x: Player.x + M.rand(-70, 70), y: Player.y + M.rand(-70, 70),
        hp: Math.round(d.hp * em), maxHp: Math.round(d.hp * em),
        dmg: d.dmg * em, range: 260, r: 20, atkCd: 0, flash: 0,
        anim: M.rand(0, 5), pulse: 0, buffMult: 1, buffT: 0, faceX: 1, dead: false,
      });
    }
    Enemies.areaDamage(Player.x, Player.y, d.burstRadius, d.burstDmg, { color: '#b8c7d9' });
    FX.ring(Player.x, Player.y, 20, d.burstRadius, '#b8c7d9', 0.4, 4);
  },

  // ---------- P3 新增行为：冰锥术（穿透+减速） ----------
  bh_ice_shard(s, c, d, dt) {
    s.t -= dt;
    if (s.t > 0) return;
    const targets = this._getTargets(d.count, 620);
    if (!targets.length) { s.t = 0.2; return; }
    s.t = d.cd * Player.cdMult;
    targets.forEach((e, i) => {
      const ang = Math.atan2(e.y - Player.y, e.x - Player.x) + (i - (targets.length - 1) / 2) * 0.22;
      this.spawnProj({
        img: c.projectile, x: Player.x, y: Player.y - 50, speed: 480,
        vx: Math.cos(ang) * 480, vy: Math.sin(ang) * 480,
        dmg: d.dmg, r: 12, pierce: d.pierce, slow: d.slow, life: 2.5, h: 40,
        color: '#aee6ff',
      });
    });
  },

  // ---------- P3 新增行为：石魔像（高生命召唤物，嘲讽） ----------
  bh_stone_golem(s, c, d, dt) {
    s.t -= dt;
    if (s.t > 0) return;
    const tb = Player.talentBonus;
    const cap = d.max + (tb && tb.summonCapPlus ? tb.summonCapPlus : 0);
    const n = this.summons.filter(u => u.kind === 'golem').length;
    if (n >= cap) { s.t = 0.5; return; }
    s.t = d.cd * Player.cdMult;
    const em = this.enhanceMult() * Player.summonMult;
    const hpMult = tb && tb.summonHp ? 1 + tb.summonHp : 1;
    const a = M.rand(0, Math.PI * 2);
    this.summons.push({
      kind: 'golem', tag: 0,
      x: Player.x + Math.cos(a) * 60, y: Player.y + Math.sin(a) * 60,
      hp: Math.round(d.hp * em * hpMult), maxHp: Math.round(d.hp * em * hpMult),
      dmg: d.dmg * em, range: 0, r: 28, atkCd: 0, flash: 0, anim: M.rand(0, 5), pulse: 0,
      buffMult: 1, buffT: 0, faceX: 1, dead: false,
      tauntR: d.tauntR, tauntT: 0,
    });
    FX.ring(Player.x, Player.y, 10, 70, '#c9a86a', 0.4, 4);
    FX.text(Player.x, Player.y - 90, '石魔像', '#c9a86a', 18);
  },

  bh_passive() {},

  // ---------- 行为：钢铁皮肤（被动减伤，与 armor 加算，Player.hurt 内封顶 30%） ----------
  bh_iron_skin(s, c, d) {
    Player.damageReduction = d.dr;
  },

  // ---------- 行为：生命祝福（被动，升级时生效，见 onLevelUp） ----------
  bh_vitality() {},

  // ---------- 行为：冰霜结界（周期护盾，存在时减速周围，被击破时冻结） ----------
  bh_ice_barrier(s, c, d, dt) {
    s.t -= dt;
    const sh = Player.shield;
    if (sh && sh.barrier) {
      // 结界存在：减速周围敌人（半径 120px）
      for (const e of Enemies.list) {
        if (!e.dead && M.dist(Player.x, Player.y, e.x, e.y) < 120) {
          e.slowPct = Math.max(e.slowPct || 0, d.slow);
          e.slowT = Math.max(e.slowT || 0, 0.4);
        }
      }
      return;
    }
    if (s.t > 0) return;
    s.t = d.cd * Player.cdMult;
    Player.shield = { hp: d.shield, t: d.dur, convert: 0, absorbed: 0, barrier: { freeze: d.freeze } };
    FX.ring(Player.x, Player.y, 24, 110, '#aee6ff', 0.5, 5);
    FX.text(Player.x, Player.y - 110, '冰霜结界', '#aee6ff', 20);
  },

  // 冰霜结界被击破：冻结周围敌人（半径 150px）
  barrierShatter(freezeDur) {
    FX.ring(Player.x, Player.y, 30, 150, '#aee6ff', 0.5, 6);
    FX.imgFx('effects/frozen_field_vfx.png', Player.x, Player.y, 240, { life: 0.5, scale0: 0.5, scale1: 1.1 });
    for (const e of Enemies.list) {
      if (e.dead) continue;
      if (M.dist(Player.x, Player.y, e.x, e.y) < 150) {
        e.freezeT = Math.max(e.freezeT || 0, freezeDur);
      }
    }
    Engine.addShake(4);
  },

  // P3 元素反应：燃烧+冰霜=蒸汽爆炸
  triggerSteam(e) {
    if (!e || e.dead) return;
    // 消耗燃烧和冻结/寒意，产生蒸汽爆炸
    e.burnT = 0; e.burnDps = 0;
    e.freezeT = 0; e.chillT = 0;
    const dmg = Math.round(15 + Player.level * 2);
    FX.ring(e.x, e.y, 10, 80, '#e8e8f0', 0.4, 5);
    FX.imgFx('effects/frozen_field_vfx.png', e.x, e.y, 100, { life: 0.4, scale0: 0.6, scale1: 1.2, alpha0: 0.7 });
    Enemies.areaDamage(e.x, e.y, 80, dmg, { color: '#e8e8f0', exclude: e });
    if (typeof SFX !== 'undefined') SFX.play('evolve');
    UI.toast('元素反应：蒸汽爆炸！');
  },

  // 技能获得/升级时的即时效果挂载（参考焚身爆/亡者复苏的被动 hook 方式）
  onLevelUp(id) {
    if (id === 'vitality') {
      const d = this.lvData(this.getSkill('vitality'));
      Player.maxHpBonus += d.hp;
      Player.maxHp += d.hp;
      Player.heal(d.hp); // 回复等量生命
    }
  },

  // ---------- 投射物 ----------
  spawnProj(o) {
    this.projectiles.push(Object.assign({ t: 0, pierce: 0, hitSet: null, spin: 0, rot: 0 }, o));
  },
  updateProjectiles(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.t += dt;
      if (p.homing && (!p.target || p.target.dead)) p.target = Enemies.nearest(p.x, p.y, 500);
      if (p.homing && p.target) {
        const want = Math.atan2(p.target.y - p.y, p.target.x - p.x);
        const cur = Math.atan2(p.vy, p.vx);
        let diff = want - cur;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        const turn = M.clamp(diff, -p.homing * dt, p.homing * dt);
        const a = cur + turn;
        p.vx = Math.cos(a) * p.speed; p.vy = Math.sin(a) * p.speed;
      }
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.rot = p.spin ? p.rot + p.spin * dt : Math.atan2(p.vy, p.vx);
      let dead = p.t >= p.life;
      // P0：复用 Enemies 空间网格，只查同格 + 邻格敌人（40 = 最大敌人半径·精英），平方距离粗筛
      Enemies.forEachNear(p.x, p.y, p.r + 40, (e) => {
        if (dead || e.dead) return;
        if (p.hitSet && p.hitSet.has(e)) return;
        const dx = p.x - e.x, dy = p.y - (e.y - e.r);
        const rr = p.r + e.r;
        if (dx * dx + dy * dy >= rr * rr) return;
        this.projHit(p, e);
        if (p.pierce > 0) {
          p.pierce--;
          (p.hitSet = p.hitSet || new Set()).add(e);
        } else dead = true;
      });
      if (dead) {
        if (p.aoe) this.explode(p.x, p.y, p.aoe, p.dmg, p.burn);
        this.projectiles.splice(i, 1);
      }
    }
  },
  projHit(p, e) {
    if (p.aoe) {
      // 爆炸弹：直接命中伤害并入 AoE，避免双倍
      this.explode(p.x, p.y, p.aoe, p.dmg, p.burn);
      p.aoe = 0; p.dmg = 0;
    } else {
      Enemies.hurt(e, p.dmg, { color: '#fff', summon: p.summon });
    }
    if (Player.buffs.fire.t > 0) Enemies.hurt(e, Player.buffs.fire.dmg, { noAmp: true, color: '#ff9a3c' });
    if (Player.buffs.thunder.t > 0) this.addShock(e, 1, Player.buffs.thunder.lv);
    if (p.burn) this.applyBurn(e, p.burn.dps, p.burn.dur, p.burn.spread);
    // P3：冰锥术减速
    if (p.slow) { e.slowPct = Math.max(e.slowPct || 0, p.slow); e.slowT = Math.max(e.slowT || 0, 1.5); }
    if (p.doomAmp) { e.doomAmp = p.doomAmp; e.doomT = p.doomDur; }
    FX.imgFx('effects/hit_effect.png', p.x, p.y, 46, { life: 0.2, alpha0: 0.8 });
  },
  explode(x, y, radius, dmg, burn) {
    FX.ring(x, y, 10, radius, '#ff9a3c', 0.35, 5);
    FX.imgFx('effects/hit_effect.png', x, y, radius * 1.6, { life: 0.3 });
    Enemies.areaDamage(x, y, radius, dmg, { color: '#ff9a3c' });
    if (burn) {
      for (const e of Enemies.list) {
        if (!e.dead && M.dist(x, y, e.x, e.y) < radius) this.applyBurn(e, burn.dps, burn.dur, burn.spread);
      }
    }
    // P0：火球爆炸震动删除（~1 次/秒过于频繁，命中特效已足够）
  },

  addShock(e, stacks, lv) {
    const tb = Player.talentBonus;
    e.shockStacks = Math.min(3, (e.shockStacks || 0) + stacks);
    e.shockAmp = CONFIG.status.shockAmp[M.clamp(lv, 1, 5) - 1];
    e.shockT = CONFIG.status.shockDur + (tb && tb.shockDur ? tb.shockDur : 0);
  },
  applyBurn(e, dps, dur, spread) {
    // P3 元素反应：对冻结/寒意敌人施加燃烧 → 蒸汽爆炸
    if ((e.freezeT > 0 || (e.chillT || 0) >= 1) && e.burnT <= 0) {
      this.triggerSteam(e);
      return;
    }
    e.burnDps = Math.max(e.burnDps || 0, dps);
    e.burnT = Math.max(e.burnT || 0, dur);
    e.burnSpread = spread || 0;
  },

  // ---------- 区域 ----------
  updateZones(dt) {
    for (let i = this.zones.length - 1; i >= 0; i--) {
      const z = this.zones[i];
      z.t += dt;
      if (z.kind === 'telegraph') {
        if (z.t >= z.dur) {
          FX.imgFx('effects/meteor_vfx.png', z.x, z.y, z.r * 2.4, { life: 0.5, scale0: 0.7, scale1: 1.3 });
          Enemies.areaDamage(z.x, z.y, z.r, z.dmg, { color: '#ff9a3c' });
          for (const e of Enemies.list) {
            if (!e.dead && M.dist(z.x, z.y, e.x, e.y) < z.r) this.applyBurn(e, z.burnDps, z.burnDur, 0);
          }
          Engine.addShake(8, true); // P0：大震动通道
          this.zones.splice(i, 1);
        }
        continue;
      }
      if (z.t >= z.dur) { this.zones.splice(i, 1); continue; }
      if (z.kind === 'spring') {
        // P3 源质泉：站上 3 秒汲取 50 经验
        if (!z.given) {
          if (M.dist(z.x, z.y, Player.x, Player.y) < z.r) {
            z.stand += dt;
            if (z.stand >= 3) {
              z.given = true;
              Player.gainExp(50);
              FX.text(Player.x, Player.y - 80, '+50 经验', '#8fd3ff', 20);
              FX.ring(z.x, z.y, 20, z.r, '#8fd3ff', 0.5, 4);
              if (typeof SFX !== 'undefined') SFX.play('levelup');
            }
          } else {
            z.stand = Math.max(0, z.stand - dt * 0.5);
          }
        }
        continue;
      }
      z.tick -= dt;
      if (z.tick > 0) continue;
      z.tick = 0.5;
      if (z.kind === 'paralyze') {
        for (const e of Enemies.list) {
          if (e.dead || M.dist(z.x, z.y, e.x, e.y) > z.r + e.r) continue;
          Enemies.hurt(e, z.dmg, { color: '#9fd8ff' });
          e.slowPct = Math.max(e.slowPct || 0, z.slow); e.slowT = CONFIG.status.slowDur;
          if (Math.random() < z.stun) e.stunT = Math.max(e.stunT || 0, CONFIG.status.stunDur);
        }
      } else if (z.kind === 'wall') {
        const x2 = z.x + Math.cos(z.ang) * z.len, y2 = z.y + Math.sin(z.ang) * z.len;
        for (const e of Enemies.list) {
          if (e.dead) continue;
          if (M.segDist(e.x, e.y, z.x, z.y, x2, y2) < z.halfW + e.r) {
            Enemies.hurt(e, z.dmg, { color: '#ff9a3c' });
            this.applyBurn(e, 4, 2, 0);
          }
        }
      } else if (z.kind === 'frozen') {
        const tb = Player.talentBonus;
        const slowBonus = tb && tb.slowPct ? tb.slowPct : 0;
        const freezeDurBonus = tb && tb.freezeDur ? tb.freezeDur : 0;
        const shatterMult = tb && tb.shatterDmg ? 1 + tb.shatterDmg : 1;
        for (const e of Enemies.list) {
          if (e.dead) continue;
          const inside = M.dist(z.x, z.y, e.x, e.y) < z.r;
          if (inside) {
            Enemies.hurt(e, z.dps * 0.5, { color: '#aee6ff' });
            e.slowPct = Math.max(e.slowPct || 0, z.slow + slowBonus); e.slowT = 0.6;
            // P3 元素反应：对燃烧敌人施加冰霜 → 蒸汽爆炸
            if (e.burnT > 0) { this.triggerSteam(e); continue; }
            e.chillT = (e.chillT || 0) + 0.5;
            if (e.chillT >= 2 && !(e.freezeT > 0)) {
              e.freezeT = CONFIG.status.freezeDur[z.lv - 1] + freezeDurBonus;
              e.chillT = 0;
              e.pendingShatter = Math.round(z.shatter * shatterMult);
            }
          } else e.chillT = 0;
        }
      }
    }
  },

  // ---------- 召唤物 ----------
  updateSummons(dt) {
    for (let i = this.summons.length - 1; i >= 0; i--) {
      const u = this.summons[i];
      if (u.dead || u.hp <= 0) { this.killSummon(u); this.summons.splice(i, 1); continue; }
      u.anim += dt; u.atkCd -= dt; u.flash = Math.max(0, u.flash - dt);
      u.pulse = Math.max(0, u.pulse - dt * 3);
      if (u.buffT > 0) { u.buffT -= dt; if (u.buffT <= 0) u.buffMult = 1; }
      // P1：索敌 0.2s 降频（原每帧全表扫描）；目标死亡立即重索
      u.retargetT = (u.retargetT || 0) - dt;
      if (u.retargetT <= 0 || (u.target && u.target.dead)) {
        u.target = Enemies.nearest(u.x, u.y, 700);
        u.retargetT = 0.2;
      }
      const e = u.target && !u.target.dead ? u.target : null;
      if (u.kind === 'melee' || u.kind === 'risen') {
        const tx = e ? e.x : Player.x + Math.cos(u.anim * 0.7) * 90;
        const ty = e ? e.y : Player.y + Math.sin(u.anim * 0.7) * 90;
        const dd = M.dist(u.x, u.y, tx, ty);
        if (dd > (e ? e.r + 18 : 30)) {
          u.faceX = tx > u.x ? 1 : -1;
          u.x += (tx - u.x) / dd * 150 * dt;
          u.y += (ty - u.y) / dd * 150 * dt;
        }
        if (e && dd < e.r + 34 && u.atkCd <= 0) {
          u.atkCd = 0.8; u.pulse = 1;
          Enemies.hurt(e, u.dmg * u.buffMult, { color: '#b8c7d9', summon: true });
        }
      } else { // archer
        if (e) {
          const dd = M.dist(u.x, u.y, e.x, e.y);
          const want = u.range * 0.8;
          if (dd > want) {
            u.faceX = e.x > u.x ? 1 : -1;
            u.x += (e.x - u.x) / dd * 130 * dt;
            u.y += (e.y - u.y) / dd * 130 * dt;
          } else if (u.atkCd <= 0) {
            u.atkCd = 1.2; u.pulse = 1;
            const ang = Math.atan2(e.y - u.y, e.x - u.x);
            this.spawnProj({
              img: 'projectiles/skeleton_arrow.png', x: u.x, y: u.y - 30, speed: 600,
              vx: Math.cos(ang) * 600, vy: Math.sin(ang) * 600,
              dmg: u.dmg * u.buffMult, r: 10, life: 1.5, h: 34, summon: true,
            });
          }
        } else {
          const dd = M.dist(u.x, u.y, Player.x, Player.y);
          if (dd > 120) { u.x += (Player.x - u.x) / dd * 140 * dt; u.y += (Player.y - u.y) / dd * 140 * dt; }
        }
      }
    }
  },

  hurtSummon(u, dmg) {
    u.hp -= dmg;
    u.flash = 0.12;
    FX.text(u.x, u.y - 55, Math.round(dmg), '#ff9b9b', 15);
  },

  killSummon(u) {
    const s = this.getSkill('taoist_corpse_burst');
    if (s) {
      const d = this.lvData(s);
      FX.ring(u.x, u.y, 10, d.radius, '#b8c7d9', 0.35, 4);
      Enemies.areaDamage(u.x, u.y, d.radius, d.dmg, { color: '#b8c7d9' });
    }
  },

  recallSummons(refreshHp, mult, dur) {
    for (const u of this.summons) {
      const a = M.rand(0, Math.PI * 2);
      u.x = Player.x + Math.cos(a) * 70;
      u.y = Player.y + Math.sin(a) * 70;
      u.hp = Math.min(u.maxHp, Math.max(u.hp, refreshHp));
      u.buffMult = mult; u.buffT = dur;
      FX.ring(u.x, u.y, 8, 46, '#c9a86a', 0.3, 3);
    }
  },

  // ---------- 击杀钩子（由 Enemies.kill 调用） ----------
  onEnemyKilled(e, source) {
    if (e.burnT > 0) {
      const ig = this.getSkill('taoist_ignite_explode');
      if (ig) {
        const d = this.lvData(ig);
        FX.ring(e.x, e.y, 10, d.radius, '#ff9a3c', 0.35, 5);
        Enemies.areaDamage(e.x, e.y, d.radius, d.dmg, { color: '#ff9a3c', exclude: e });
      }
      const bc = this.getSkill('taoist_burn_curse');
      if (bc && e.burnSpread) {
        const n = Enemies.nearest(e.x, e.y, e.burnSpread, new Set([e]));
        if (n) {
          const d = this.lvData(bc);
          this.applyBurn(n, d.dps, d.burnDur, d.spread);
        }
      }
    }
    const rd = this.getSkill('taoist_raise_dead');
    if (rd && e.type !== 'goblin') {
      const d = this.lvData(rd);
      const tb = Player.talentBonus;
      let chance = d.chance + (tb && tb.raiseChance ? tb.raiseChance : 0);
      // 召唤流滚雪球：召唤物击杀时复活概率翻倍
      if (source === 'summon') chance = Math.min(1, chance * 2);
      const risen = this.summons.filter(u => u.kind === 'risen').length;
      if (risen < d.max && Math.random() < chance) {
        const em = this.enhanceMult() * Player.summonMult;
        this.summons.push({
          kind: 'risen', tag: 0, x: e.x, y: e.y,
          hp: Math.round(d.hp * em), maxHp: Math.round(d.hp * em),
          dmg: 6 * em, range: 0, r: 20, atkCd: 0, flash: 0,
          anim: M.rand(0, 5), pulse: 0, buffMult: 1, buffT: 0, faceX: 1, dead: false,
        });
        FX.text(e.x, e.y - 50, '复苏', '#b8c7d9', 18);
      }
    }
  },

  // P2 流派判定：统计 owned 技能 flow 标签频次，最高频流派名
  dominantFlow() {
    const cnt = {};
    for (const s of this.owned) {
      const c = this.cfgOf(s.id);
      if (!c || !c.flow) continue;
      cnt[c.flow] = (cnt[c.flow] || 0) + (CONFIG.evolutions[s.id] ? 3 : 1);
    }
    let best = null, bn = 0;
    for (const f in cnt) if (cnt[f] > bn) { bn = cnt[f]; best = f; }
    return best || '无';
  },

  // ---------- 升级三选一 ----------
  genChoices() {
    const out = [];
    const evos = [];
    for (const eid in CONFIG.evolutions) {
      if (this.hasSkill(eid)) continue;
      const ev = CONFIG.evolutions[eid];
      const main = this.getSkill(ev.main), cat = this.getSkill(ev.catalyst);
      if (main && main.lv >= 5 && cat && cat.lv >= 3) evos.push({ type: 'evo', id: eid });
    }
    if (evos.length) out.push(M.choice(evos));

    const pool = [];
    for (const s of this.owned) {
      if (CONFIG.evolutions[s.id]) continue;
      if (!CONFIG.evolutions[s.id]) pool.push({ type: 'up', id: s.id, w: 2 });
    }
    if (this.owned.length < CONFIG.skillSlots) {
      for (const id in CONFIG.skills) {
        if (this.hasSkill(id) || this.consumed.has(id)) continue;
        pool.push({ type: 'new', id, w: 1 });
      }
    }
    while (out.length < 3 && pool.length) {
      const pick = M.weightedPick(pool);
      pool.splice(pool.indexOf(pick), 1);
      out.push(pick);
    }
    const stats = CONFIG.statCards.slice();
    while (out.length < 3 && stats.length) {
      const sc = stats.splice(M.randInt(0, stats.length - 1), 1)[0];
      out.push({ type: 'stat', stat: sc.id });
    }
    return out;
  },

  describe(ch) {
    if (ch.type === 'evo') {
      const c = CONFIG.evolutions[ch.id];
      return { icon: c.icon, name: c.name, sub: '进化 · 合并两个技能', lines: [c.desc], flow: c.flow, evo: true };
    }
    if (ch.type === 'stat') {
      const c = CONFIG.statCards.find(s => s.id === ch.stat);
      return { icon: null, name: c.name, sub: '属性强化', lines: [c.desc], flow: c.flow };
    }
    const c = CONFIG.skills[ch.id];
    if (ch.type === 'new') {
      const d = c.levels[0];
      return { icon: c.icon, name: c.name, sub: '新条目 · Lv.1', lines: [c.desc, this.statLine(c, d)], flow: c.flow };
    }
    const s = this.getSkill(ch.id);
    const d = this.lvlData(c, s.lv + 1); // 升级后的数值（支持无限等级外推，避免越界 undefined）
    return { icon: c.icon, name: c.name, sub: `Lv.${s.lv} → Lv.${s.lv + 1}`, lines: [c.desc, this.statLine(c, d)], flow: c.flow };
  },
  statLine(c, d) {
    const parts = [];
    if (d.dmg != null) parts.push('伤害 ' + d.dmg);
    if (d.dps != null) parts.push('灼烧 ' + d.dps + '/s');
    if (d.cd != null) parts.push('冷却 ' + d.cd + 's');
    if (d.count != null) parts.push('数量 ' + d.count);
    if (d.chains != null) parts.push('弹射 ' + d.chains);
    if (d.radius != null) parts.push('范围 ' + d.radius);
    if (d.resDown != null) parts.push('减抗 ' + Math.round(d.resDown * 100) + '%');
    if (d.hp != null) parts.push('生命 ' + d.hp);
    if (d.max != null) parts.push('上限 ' + d.max);
    if (d.chance != null) parts.push('概率 ' + Math.round(d.chance * 100) + '%');
    if (d.atk != null) parts.push('强化 +' + Math.round(d.atk * 100) + '%');
    if (d.slow != null) parts.push('减速 ' + Math.round(d.slow * 100) + '%');
    if (d.dr != null) parts.push('减伤 ' + Math.round(d.dr * 100) + '%');
    if (d.shield != null) parts.push('护盾 ' + d.shield);
    if (d.freeze != null) parts.push('冻结 ' + d.freeze + 's');
    return parts.join(' · ');
  },

  applyChoice(ch) {
    if (ch.type === 'up') {
      this.getSkill(ch.id).lv++;
      this.onLevelUp(ch.id);
      if (typeof SFX !== 'undefined') SFX.play('levelup');
    } else if (ch.type === 'new') {
      this.owned.push({ id: ch.id, lv: 1, t: 0, idle: 0 });
      this.onLevelUp(ch.id);
      if (typeof SFX !== 'undefined') SFX.play('levelup');
    } else if (ch.type === 'evo') {
      const ev = CONFIG.evolutions[ch.id];
      this.owned = this.owned.filter(s => s.id !== ev.main && s.id !== ev.catalyst);
      this.consumed.add(ev.main); this.consumed.add(ev.catalyst);
      this.owned.push({ id: ch.id, lv: 1, t: 0, idle: 0 });
      this.evoCount++;
      if (typeof SFX !== 'undefined') SFX.play('evolve');
      if (typeof Game !== 'undefined') Game.hitstopFrames = Math.max(Game.hitstopFrames, 8);
      UI.toast('高危处置方案解锁：' + ev.name);
      FX.imgFx('effects/upgrade_effect.png', Player.x, Player.y - 60, 220, { life: 0.8, scale0: 0.6, scale1: 1.4 });
    } else if (ch.type === 'stat') {
      if (ch.stat === 'hp') { Player.maxHp += 25; Player.heal(25); }
      else if (ch.stat === 'speed') Player.speed *= 1.06;
      else if (ch.stat === 'dmg') Player.dmgMult += 0.08;
      else if (ch.stat === 'pickup') Player.pickup *= 1.3;
    }
  },

  // ---------- 绘制 ----------
  drawZones(ctx) {
    for (const z of this.zones) {
      const x = Engine.SX(z.x), y = Engine.SY(z.y);
      ctx.save();
      if (z.kind === 'paralyze') {
        const img = Assets.img('effects/paralysis_field.png');
        ctx.globalAlpha = 0.55 + Math.sin(z.t * 8) * 0.15;
        if (img) ctx.drawImage(img, x - z.r, y - z.r * 0.7, z.r * 2, z.r * 1.4);
        ctx.strokeStyle = 'rgba(159,216,255,0.5)';
        ctx.beginPath(); ctx.arc(x, y, z.r, 0, Math.PI * 2); ctx.stroke();
      } else if (z.kind === 'wall') {
        const img = Assets.img('effects/fire_wall.png');
        ctx.translate(x, y);
        ctx.rotate(z.ang);
        ctx.globalAlpha = 0.85;
        if (img) ctx.drawImage(img, 0, -z.halfW * 1.6, z.len, z.halfW * 3.2);
        else { ctx.fillStyle = 'rgba(255,120,40,0.5)'; ctx.fillRect(0, -z.halfW, z.len, z.halfW * 2); }
      } else if (z.kind === 'frozen') {
        ctx.globalAlpha = 0.16;
        ctx.fillStyle = '#aee6ff';
        ctx.beginPath(); ctx.arc(x, y, z.r, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = '#aee6ff';
        ctx.setLineDash([12, 10]);
        ctx.beginPath(); ctx.arc(x, y, z.r, 0, Math.PI * 2); ctx.stroke();
      } else if (z.kind === 'telegraph') {
        const k = z.t / z.dur;
        ctx.globalAlpha = 0.7;
        ctx.strokeStyle = '#ff5a3c';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(x, y, z.r, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 0.25 + k * 0.4;
        ctx.fillStyle = '#ff5a3c';
        ctx.beginPath(); ctx.arc(x, y, z.r * k, 0, Math.PI * 2); ctx.fill();
      } else if (z.kind === 'spring') {
        const pulse = 0.5 + Math.sin(z.t * 4) * 0.15;
        ctx.globalAlpha = z.given ? 0.12 : 0.22 + pulse * 0.1;
        ctx.fillStyle = '#8fd3ff';
        ctx.beginPath(); ctx.arc(x, y, z.r, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.7;
        ctx.strokeStyle = '#8fd3ff';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(x, y, z.r, 0, Math.PI * 2); ctx.stroke();
        if (!z.given && z.stand > 0) {
          ctx.globalAlpha = 0.95;
          ctx.strokeStyle = '#f0d9a0';
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.arc(x, y, z.r * 0.6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, z.stand / 3));
          ctx.stroke();
        }
      }
      ctx.restore();
    }
  },

  drawAuras(ctx) {
    const da = this.getSkill('doom_aura');
    if (da) {
      const d = this.lvData(da);
      const x = Engine.SX(Player.x), y = Engine.SY(Player.y);
      ctx.save();
      ctx.globalAlpha = 0.1 + Math.sin(Player.anim * 2) * 0.03;
      ctx.fillStyle = '#8a5cff';
      ctx.beginPath(); ctx.arc(x, y, d.radius, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = '#8a5cff';
      ctx.setLineDash([8, 14]);
      ctx.beginPath(); ctx.arc(x, y, d.radius, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    if (this.cloud) {
      const bob = Math.sin(Player.anim * 2.2) * 6;
      Assets.drawSprite(ctx, 'effects/thunder_cloud.png', Engine.SX(Player.x), Engine.SY(Player.y) - 130 + bob, 90, { alpha: 0.9 });
    }
  },

  drawSummons(ctx) {
    for (const u of this.summons) {
      const x = Engine.SX(u.x), y = Engine.SY(u.y);
      const bob = Math.sin(u.anim * 8) * 3;
      const img = u.kind === 'archer' ? 'summons/skeleton_shoot.png' : 'summons/skeleton_idle.png';
      Assets.drawSprite(ctx, img, x, y, 72, { bob, flash: u.flash, pulse: 1 + u.pulse * 0.18, flip: u.faceX < 0 });
      if (u.hp < u.maxHp) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(x - 22, y - 84, 44, 5);
        ctx.fillStyle = '#b8c7d9';
        ctx.fillRect(x - 22, y - 84, 44 * u.hp / u.maxHp, 5);
      }
    }
  },

  drawProjectiles(ctx) {
    for (const p of this.projectiles) {
      const img = Assets.img(p.img);
      if (!img) continue;
      const x = Engine.SX(p.x), y = Engine.SY(p.y);
      const w = p.h * img.naturalWidth / img.naturalHeight;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(p.rot);
      ctx.drawImage(img, -w / 2, -p.h / 2, w, p.h);
      ctx.restore();
    }
  },
};
