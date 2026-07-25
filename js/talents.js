// 天赋树 v2.0：通用 4 层 + 专精 3 层/职业，层级解锁 + 终极三选一
// 详见 docs/talent-tree-v2.md

const TALENT_TREE = {
  // ---------- 通用天赋（4 层，全职业共享） ----------
  general: [
    // 第 1 层：基础生存（0 点解锁）
    { id: 'G1', layer: 1, name: '健壮', maxLv: 5, desc: '最大生命 +3%/级', effect: lv => ({ hpPct: 0.03 * lv }) },
    { id: 'G2', layer: 1, name: '疾风步', maxLv: 5, desc: '移速 +2%/级', effect: lv => ({ speedPct: 0.02 * lv }) },
    { id: 'G3', layer: 1, name: '扩大拾取', maxLv: 3, desc: '拾取范围 +10%/级', effect: lv => ({ pickupPct: 0.10 * lv }) },
    // 第 2 层：进阶防御（第 1 层投 8 点解锁）
    { id: 'G4', layer: 2, name: '坚韧', maxLv: 5, desc: '受伤 -2%/级', effect: lv => ({ dmgReduction: 0.02 * lv }) },
    { id: 'G5', layer: 2, name: '快速回复', maxLv: 3, desc: '生命回复 +10%/级', effect: lv => ({ regenPct: 0.10 * lv }) },
    // 第 3 层：资源/操作（累计投 16 点解锁）
    { id: 'G7', layer: 3, name: '背水一战', maxLv: 1, desc: '生命<30%时获20%最大生命护盾5s，CD90s', effect: lv => ({ lastStand: lv }) },
    { id: 'G8', layer: 3, name: '自动拾取', maxLv: 1, desc: '每8s自动拾取周围经验球和金币', effect: lv => ({ autoPickup: lv }) },
    { id: 'G9', layer: 3, name: '不屈意志', maxLv: 1, desc: '受控时立即清除并免疫2s，CD60s', effect: lv => ({ unbreakable: lv }) },
    // 第 4 层：终极（累计投 24 点解锁，三选一）
    { id: 'G10', layer: 4, name: '不朽', maxLv: 1, desc: '每120s致命伤害锁定1HP持续3s无敌', effect: lv => ({ immortal: lv }), exclusive: 'G_ULT' },
    { id: 'G11', layer: 4, name: '拾取之王', maxLv: 1, desc: '拾取+50%，自动拾取CD3s，经验球+10%', effect: lv => ({ pickupKing: lv }), exclusive: 'G_ULT' },
    { id: 'G12', layer: 4, name: '永动之躯', maxLv: 1, desc: '移动时每秒回0.5%最大生命，脱战翻倍', effect: lv => ({ perpetual: lv }), exclusive: 'G_ULT' },
  ],

  // ---------- 专精天赋（3 层/职业，形态变化） ----------
  specialist: {
    taoist: [
      { id: 'T1', layer: 1, name: '多重施法', maxLv: 3, desc: '攻击技能5%/10%/15%概率额外释放(60%伤害)', effect: lv => ({ multiCast: 0.05 * lv }) },
      { id: 'T2', layer: 1, name: '投射物分裂', maxLv: 3, desc: '投射命中后概率分裂2枚小弹(30%伤害)', effect: lv => ({ projSplit: 0.10 * lv }) },
      { id: 'T3', layer: 1, name: '范围扩大', maxLv: 3, desc: '所有范围技能半径+5%/10%/15%', effect: lv => ({ aoePct: 0.05 * lv }) },
      { id: 'T4', layer: 2, name: '灼热大地', maxLv: 2, desc: '火焰技能命中后地面留燃烧区2s(20%/40%伤害)', effect: lv => ({ fireGround: 0.20 * lv }) },
      { id: 'T5', layer: 2, name: '过载连锁', maxLv: 2, desc: '闪电连锁次数+1/+2', effect: lv => ({ chainPlus: lv }) },
      { id: 'T6', layer: 2, name: '感电扩散', maxLv: 2, desc: '感电触发时对周围1/2个敌人也施加感电', effect: lv => ({ shockSpread: lv }) },
      { id: 'T7', layer: 3, name: '雷霆之怒', maxLv: 1, desc: '雷暴云无限+分裂2朵；闪电箭变引导连锁', effect: lv => ({ thunderWrath: lv }), exclusive: 'T_ULT' },
      { id: 'T8', layer: 3, name: '焚天灭世', maxLv: 1, desc: '火墙移动分裂3堵；火球变3枚陨石(单发-30%)', effect: lv => ({ fireStorm: lv }), exclusive: 'T_ULT' },
      { id: 'T9', layer: 3, name: '万雷归宗', maxLv: 1, desc: '天雷击命中后对全场感电敌人追加落雷；暴击+10%', effect: lv => ({ thunderAll: lv }), exclusive: 'T_ULT' },
    ],
    samurai: [
      { id: 'S1', layer: 1, name: '多重施法', maxLv: 3, desc: '攻击技能5%/10%/15%概率额外释放(60%伤害)', effect: lv => ({ multiCast: 0.05 * lv }) },
      { id: 'S2', layer: 1, name: '投射物分裂', maxLv: 3, desc: '投射命中后概率分裂2枚小弹(30%伤害)', effect: lv => ({ projSplit: 0.10 * lv }) },
      { id: 'S3', layer: 1, name: '范围扩大', maxLv: 3, desc: '所有范围技能半径+5%/10%/15%', effect: lv => ({ aoePct: 0.05 * lv }) },
      { id: 'S4', layer: 2, name: '剑气残留', maxLv: 2, desc: '一闪路径留剑气1s/2s(30%/60%伤害)', effect: lv => ({ slashTrail: 0.30 * lv }) },
      { id: 'S5', layer: 2, name: '连斩', maxLv: 2, desc: '一闪击杀后3s/5s内下次一闪伤害+30%/+60%', effect: lv => ({ chainSlash: 0.30 * lv }) },
      { id: 'S6', layer: 2, name: '居合', maxLv: 2, desc: '一闪CD-10%/-20%，击杀返还+10%/+20%', effect: lv => ({ iaiCd: 0.10 * lv, iaiKill: 0.10 * lv }) },
      { id: 'S7', layer: 3, name: '无双乱舞', maxLv: 1, desc: '一闪变3段连续突进斩，每段独立判定', effect: lv => ({ tripleSlash: lv }), exclusive: 'S_ULT' },
      { id: 'S8', layer: 3, name: '刹那永恒', maxLv: 1, desc: '一闪无敌+0.5s，路径敌人时间停止1s', effect: lv => ({ timeStop: lv }), exclusive: 'S_ULT' },
      { id: 'S9', layer: 3, name: '血刃狂歌', maxLv: 1, desc: '生命<50%时一闪伤害+50%，击杀回5%生命', effect: lv => ({ bloodBlade: lv }), exclusive: 'S_ULT' },
    ],
    pharaoh: [
      { id: 'P1', layer: 1, name: '多重施法', maxLv: 3, desc: '攻击技能5%/10%/15%概率额外释放(60%伤害)', effect: lv => ({ multiCast: 0.05 * lv }) },
      { id: 'P2', layer: 1, name: '投射物分裂', maxLv: 3, desc: '投射命中后概率分裂2枚小弹(30%伤害)', effect: lv => ({ projSplit: 0.10 * lv }) },
      { id: 'P3', layer: 1, name: '范围扩大', maxLv: 3, desc: '所有范围技能半径+5%/10%/15%', effect: lv => ({ aoePct: 0.05 * lv }) },
      { id: 'P4', layer: 2, name: '召唤大军', maxLv: 2, desc: '同时存在召唤物上限+1/+2', effect: lv => ({ summonCapPlus: lv }) },
      { id: 'P5', layer: 2, name: '亡者献祭', maxLv: 2, desc: '召唤物死亡爆炸伤害+50%/+100%，可触发元素反应', effect: lv => ({ sacrificeDmg: 0.50 * lv, sacrificeReact: lv >= 1 }) },
      { id: 'P6', layer: 2, name: '骷髅精锐', maxLv: 2, desc: '召唤物攻击附带减速10%/20%', effect: lv => ({ summonSlow: 0.10 * lv }) },
      { id: 'P7', layer: 3, name: '不死军团', maxLv: 1, desc: '骷髅变将军/神射手(独立技能)；击杀25%概率自动召唤', effect: lv => ({ undeadArmy: lv }), exclusive: 'P_ULT' },
      { id: 'P8', layer: 3, name: '冥府之门', maxLv: 1, desc: '冥棺敕命召回后召唤物全属性+50%持续10s', effect: lv => ({ netherGate: lv }), exclusive: 'P_ULT' },
      { id: 'P9', layer: 3, name: '亡者国度', maxLv: 1, desc: '亡者复苏概率+20%，复活骷髅永久存在', effect: lv => ({ deadKingdom: lv }), exclusive: 'P_ULT' },
    ],
    ice_witch: [
      { id: 'I1', layer: 1, name: '多重施法', maxLv: 3, desc: '攻击技能5%/10%/15%概率额外释放(60%伤害)', effect: lv => ({ multiCast: 0.05 * lv }) },
      { id: 'I2', layer: 1, name: '投射物分裂', maxLv: 3, desc: '投射命中后概率分裂2枚小弹(30%伤害)', effect: lv => ({ projSplit: 0.10 * lv }) },
      { id: 'I3', layer: 1, name: '范围扩大', maxLv: 3, desc: '所有范围技能半径+5%/10%/15%', effect: lv => ({ aoePct: 0.05 * lv }) },
      { id: 'I4', layer: 2, name: '永冻', maxLv: 2, desc: '冰霜技能寒意概率直接升级为冻结(10%/20%)', effect: lv => ({ instantFreeze: 0.10 * lv }) },
      { id: 'I5', layer: 2, name: '碎冰', maxLv: 2, desc: '冻结敌人死亡时碎裂对周围造成30%/60%伤害', effect: lv => ({ shatterOnDeath: 0.30 * lv }) },
      { id: 'I7', layer: 3, name: '冰河时代', maxLv: 1, desc: '冰霜新星连续3次范围扩大；所有冰霜附带冻结累计', effect: lv => ({ iceAge: lv }), exclusive: 'I_ULT' },
      { id: 'I8', layer: 3, name: '绝对零度', maxLv: 1, desc: '极寒领域内敌人移速-70%，冻结时间+1s', effect: lv => ({ absoluteZero: lv }), exclusive: 'I_ULT' },
      { id: 'I9', layer: 3, name: '冰晶风暴', maxLv: 1, desc: '冰锥术命中后分裂5枚冰晶追踪最近敌人', effect: lv => ({ crystalStorm: lv }), exclusive: 'I_ULT' },
    ],
    crusader: [
      { id: 'C1', layer: 1, name: '多重施法', maxLv: 3, desc: '攻击技能5%/10%/15%概率额外释放(60%伤害)', effect: lv => ({ multiCast: 0.05 * lv }) },
      { id: 'C2', layer: 1, name: '投射物分裂', maxLv: 3, desc: '投射命中后概率分裂2枚小弹(30%伤害)', effect: lv => ({ projSplit: 0.10 * lv }) },
      { id: 'C3', layer: 1, name: '范围扩大', maxLv: 3, desc: '所有范围技能半径+5%/10%/15%', effect: lv => ({ aoePct: 0.05 * lv }) },
      { id: 'C4', layer: 2, name: '灼热大地', maxLv: 2, desc: '火焰技能命中后地面留燃烧区2s(20%/40%伤害)', effect: lv => ({ fireGround: 0.20 * lv }) },
      { id: 'C5', layer: 2, name: '圣光回响', maxLv: 2, desc: '护盾破裂时对周围造成50%/100%吸收量伤害', effect: lv => ({ holyEcho: 0.50 * lv }) },
      { id: 'C6', layer: 2, name: '铁壁', maxLv: 2, desc: '护盾存在期间受伤额外-10%/-20%', effect: lv => ({ ironWall: 0.10 * lv }) },
      { id: 'C7', layer: 3, name: '神圣领域', maxLv: 1, desc: '圣盾冲阵路径留圣光区域5s持续伤害+减速', effect: lv => ({ holyDomain: lv }), exclusive: 'C_ULT' },
      { id: 'C8', layer: 3, name: '光明审判', maxLv: 1, desc: '护盾破裂时光柱轰击最近3敌造成200%吸收量伤害', effect: lv => ({ lightJudgment: lv }), exclusive: 'C_ULT' },
      { id: 'C9', layer: 3, name: '不屈圣盾', maxLv: 1, desc: '护盾上限+50%，存在期间免疫击退和控制', effect: lv => ({ unbreakableShield: lv }), exclusive: 'C_ULT' },
    ],
  },

  // 层级解锁条件（通用）
  generalUnlock: { 1: 0, 2: 8, 3: 16, 4: 24 },
  // 层级解锁条件（专精）
  specialistUnlock: { 1: 0, 2: 5, 3: 10 },
};

const Talents = {
  getLv(data, id) { return (data && data.talents && data.talents[id]) || 0; },

  // 计算某层已投入点数
  layerPoints(data, tree, layer) {
    const nodes = tree.filter(t => t.layer === layer);
    return nodes.reduce((sum, t) => sum + this.getLv(data, t.id), 0);
  },

  // 计算累计投入点数（到某层为止）
  totalPointsUpTo(data, tree, layer) {
    let total = 0;
    for (let l = 1; l <= layer; l++) total += this.layerPoints(data, tree, l);
    return total;
  },

  // 检查某层是否解锁
  isLayerUnlocked(data, tree, layer, unlockTable) {
    if (layer === 1) return true;
    return this.totalPointsUpTo(data, tree, layer - 1) >= unlockTable[layer];
  },

  // 检查终极三选一是否已选（同 exclusive 组只能选一个）
  getExclusiveChoice(data, tree, exclusive) {
    if (!exclusive) return null;
    const chosen = tree.find(t => t.exclusive === exclusive && this.getLv(data, t.id) > 0);
    return chosen ? chosen.id : null;
  },

  // 点击点亮：消耗 1 天赋点（通用/专精分开池）
  unlock(id, isGeneral) {
    const d = Storage.Load();
    const tree = isGeneral ? TALENT_TREE.general : TALENT_TREE.specialist[Game.classId];
    const t = tree.find(x => x.id === id);
    if (!t) return false;

    const lv = this.getLv(d, t.id);
    if (lv >= t.maxLv) return false;

    // 层级解锁检查
    const unlockTable = isGeneral ? TALENT_TREE.generalUnlock : TALENT_TREE.specialistUnlock;
    if (!this.isLayerUnlocked(d, tree, t.layer, unlockTable)) {
      UI.toast('需先投入足够点数解锁本层');
      return false;
    }

    // 终极三选一检查
    if (t.exclusive) {
      const chosen = this.getExclusiveChoice(d, tree, t.exclusive);
      if (chosen && chosen !== id) {
        UI.toast('终极天赋只能三选一');
        return false;
      }
    }

    // 天赋点检查（通用/专精分开）
    const poolKey = isGeneral ? 'generalTalentPoints' : 'specialistTalentPoints';
    if ((d[poolKey] || 0) <= 0) {
      UI.toast((isGeneral ? '通用' : '专精') + '天赋点不足');
      return false;
    }

    d[poolKey]--;
    d.talents[id] = lv + 1;
    Storage.Save(d);
    if (typeof SFX !== 'undefined') SFX.play('pickup');
    return true;
  },

  // 聚合所有已点亮天赋的加成（通用 + 当前职业专精）
  bonuses() {
    const d = Storage.Load();
    const out = {};
    const apply = (tree) => {
      for (const t of tree) {
        const lv = this.getLv(d, t.id);
        if (lv <= 0) continue;
        const eff = t.effect(lv) || {};
        for (const k in eff) out[k] = (out[k] || 0) + eff[k];
      }
    };
    apply(TALENT_TREE.general);
    apply(TALENT_TREE.specialist[Game.classId] || []);
    return out;
  },
};

// 层级式天赋 UI
const TalentsUI = {
  open: false,
  tab: 'general', // general / specialist
  scroll: 0,
  closeBtn: { x: 632, y: 96, w: 56, h: 40 },
  tabBtns: [],
  nodes: [],

  toggle() { this.open = !this.open; this.scroll = 0; this.tab = 'general'; },

  draw(ctx) {
    if (!this.open) return;
    const W = CONFIG.canvas.w, H = CONFIG.canvas.h;
    ctx.fillStyle = 'rgba(4,4,10,0.92)';
    ctx.fillRect(0, 0, W, H);
    UI.goldText(ctx, '天 赋 之 树', W / 2, 120, 36);

    const d = Storage.Load();
    ctx.font = '15px "PingFang SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f0d9a0';
    ctx.fillText('通用点 ' + (d.generalTalentPoints || 0) + ' · 专精点 ' + (d.specialistTalentPoints || 0), W / 2, 155);

    // 页签
    const tabs = [['general', '通用'], ['specialist', '专精·' + (CONFIG.classes[Game.classId]?.name || '')]];
    this.tabBtns = [];
    tabs.forEach((tb, i) => {
      const bx = 180 + i * 190, by = 172, bw = 170, bh = 38;
      ctx.save();
      ctx.fillStyle = this.tab === tb[0] ? 'rgba(201,168,106,0.92)' : 'rgba(28,28,40,0.9)';
      ctx.strokeStyle = 'rgba(201,168,106,0.7)';
      UI.rr(ctx, bx, by, bw, bh, 8);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = this.tab === tb[0] ? '#2a1e08' : '#e0d8c8';
      ctx.font = 'bold 16px "PingFang SC", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(tb[1], bx + bw / 2, by + 25);
      ctx.restore();
      this.tabBtns.push({ x: bx, y: by, w: bw, h: bh, tab: tb[0] });
    });

    // 渲染层级
    const isGen = this.tab === 'general';
    const tree = isGen ? TALENT_TREE.general : (TALENT_TREE.specialist[Game.classId] || []);
    const unlockTable = isGen ? TALENT_TREE.generalUnlock : TALENT_TREE.specialistUnlock;
    const layerNames = isGen
      ? ['基础生存', '进阶防御', '资源/操作', '终极（三选一）']
      : ['技能增幅', '元素/召唤专精', '终极质变（三选一）'];

    this.nodes = [];
    let y = 230 - this.scroll;
    for (let layer = 1; layer <= (isGen ? 4 : 3); layer++) {
      const unlocked = Talents.isLayerUnlocked(d, tree, layer, unlockTable);
      const layerNodes = tree.filter(t => t.layer === layer);

      // 层标题
      ctx.save();
      ctx.globalAlpha = unlocked ? 1 : 0.4;
      ctx.fillStyle = '#c9a86a';
      ctx.font = 'bold 17px "PingFang SC", serif';
      ctx.textAlign = 'left';
      ctx.fillText('第' + layer + '层 · ' + layerNames[layer - 1], 60, y);
      if (!unlocked) {
        ctx.fillStyle = 'rgba(200,100,100,0.8)';
        ctx.font = '13px "PingFang SC", sans-serif';
        ctx.fillText('（需前层投入 ' + unlockTable[layer] + ' 点）', 260, y);
      }
      ctx.restore();
      y += 14;

      // 节点
      for (const t of layerNodes) {
        const lv = Talents.getLv(d, t.id);
        const isUlt = !!t.exclusive;
        const chosenUlt = isUlt ? Talents.getExclusiveChoice(d, tree, t.exclusive) : null;
        const locked = !unlocked || (isUlt && chosenUlt && chosenUlt !== t.id);

        ctx.save();
        ctx.globalAlpha = locked ? 0.35 : 1;
        ctx.fillStyle = lv > 0 ? 'rgba(28,38,18,0.9)' : 'rgba(14,14,22,0.88)';
        ctx.strokeStyle = lv > 0 ? 'rgba(100,180,100,0.6)' : (isUlt ? 'rgba(201,168,106,0.7)' : 'rgba(100,100,110,0.4)');
        ctx.lineWidth = isUlt ? 2 : 1.5;
        UI.rr(ctx, 60, y, 600, 68, 8);
        ctx.fill(); ctx.stroke();

        // 名称 + 等级
        ctx.fillStyle = lv > 0 ? '#a0d8a0' : '#e8e2d2';
        ctx.font = 'bold 15px "PingFang SC", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(t.name, 76, y + 26);
        ctx.fillStyle = '#c9a86a';
        ctx.font = '13px "PingFang SC", sans-serif';
        ctx.fillText(lv + '/' + t.maxLv, 76 + ctx.measureText(t.name).width + 16, y + 26);

        // 描述
        ctx.fillStyle = 'rgba(180,180,195,0.7)';
        ctx.font = '12px "PingFang SC", sans-serif';
        ctx.fillText(t.desc, 76, y + 48);

        // 点亮按钮
        if (!locked && lv < t.maxLv) {
          const bx = 560, by2 = y + 14, bw2 = 80, bh2 = 40;
          ctx.fillStyle = 'rgba(201,168,106,0.8)';
          UI.rr(ctx, bx, by2, bw2, bh2, 6);
          ctx.fill();
          ctx.fillStyle = '#2a1e08';
          ctx.font = 'bold 13px "PingFang SC", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('点亮', bx + bw2 / 2, by2 + 26);
          this.nodes.push({ x: bx, y: by2, w: bw2, h: bh2, id: t.id, isGen });
        }
        ctx.restore();
        y += 78;
      }
      y += 16;
    }

    // 关闭按钮
    const cb = this.closeBtn;
    ctx.save();
    ctx.fillStyle = 'rgba(30,30,42,0.9)';
    ctx.strokeStyle = 'rgba(201,168,106,0.6)';
    UI.rr(ctx, cb.x, cb.y, cb.w, cb.h, 8);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e0d8c8';
    ctx.font = 'bold 18px "PingFang SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('✕', cb.x + cb.w / 2, cb.y + 27);
    ctx.restore();
  },

  tap(x, y) {
    if (!this.open) return false;
    if (UI.inRect(x, y, this.closeBtn)) { this.open = false; return true; }
    for (const b of this.tabBtns) {
      if (UI.inRect(x, y, b)) { this.tab = b.tab; this.scroll = 0; return true; }
    }
    for (const n of this.nodes) {
      if (UI.inRect(x, y, n)) { Talents.unlock(n.id, n.isGen); return true; }
    }
    return true;
  },
};
