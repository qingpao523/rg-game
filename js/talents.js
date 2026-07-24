// P1 局外天赋：通用 16 节点 + 职业 20 节点（简化版），列表式渲染 + 点击点亮
const TALENTS = [
  // ---------- 通用 16 ----------
  { id: 'g_dmg_1', branch: '通用', name: '锋锐契约', desc: '全局伤害 +4%', maxLv: 5, effect: lv => ({ dmg: 0.04 * lv }) },
  { id: 'g_hp_1', branch: '通用', name: '命契延展', desc: '生命上限 +15', maxLv: 5, effect: lv => ({ hp: 15 * lv }) },
  { id: 'g_speed_1', branch: '通用', name: '疾行符文', desc: '移动速度 +3%', maxLv: 5, effect: lv => ({ speed: 0.03 * lv }) },
  { id: 'g_pickup_1', branch: '通用', name: '引力刻印', desc: '拾取范围 +10%', maxLv: 5, effect: lv => ({ pickup: 0.10 * lv }) },
  { id: 'g_cd_1', branch: '通用', name: '急促咏唱', desc: '技能冷却 -3%', maxLv: 5, effect: lv => ({ cd: 0.03 * lv }) },
  { id: 'g_mana_1', branch: '通用', name: '灵脉扩容', desc: '法力回复 +8%', maxLv: 5, effect: lv => ({ manaRegen: 0.08 * lv }) },
  { id: 'g_exp_1', branch: '通用', name: '智慧残页', desc: '经验获取 +5%', maxLv: 5, effect: lv => ({ exp: 0.05 * lv }) },
  { id: 'g_crit_1', branch: '通用', name: '致命直觉', desc: '暴击率 +2%', maxLv: 5, effect: lv => ({ crit: 0.02 * lv }) },
  { id: 'g_armor_1', branch: '通用', name: '霜铁镀层', desc: '受伤减免 +2%', maxLv: 5, effect: lv => ({ armor: 0.02 * lv }) },
  { id: 'g_luck_1', branch: '通用', name: '命运偏袒', desc: '稀有掉落概率 +3%', maxLv: 5, effect: lv => ({ luck: 0.03 * lv }) },
  { id: 'g_regen_1', branch: '通用', name: '生命回流', desc: '每秒回复 0.5 生命', maxLv: 5, effect: lv => ({ regen: 0.5 * lv }) },
  { id: 'g_thorns_1', branch: '通用', name: '荆棘反噬', desc: '反弹 5% 所受伤害', maxLv: 5, effect: lv => ({ thorns: 0.05 * lv }) },
  { id: 'g_magnet_1', branch: '通用', name: '源质共鸣', desc: '经验价值 +5%', maxLv: 5, effect: lv => ({ expValue: 0.05 * lv }) },
  { id: 'g_dash_1', branch: '通用', name: '残影步', desc: '受击无敌时间 +0.05s', maxLv: 5, effect: lv => ({ iframe: 0.05 * lv }) },
  { id: 'g_start_1', branch: '通用', name: '先发制人', desc: '开局额外 1 次升级', maxLv: 1, effect: lv => ({ startLevel: lv }) },
  { id: 'g_revive_1', branch: '通用', name: '不屈意志', desc: '每局复活 1 次（30% 血）', maxLv: 1, effect: lv => ({ revive: lv }) },

  // ---------- 职业 20（4/职业） ----------
  { id: 'c_taoist_1', branch: '道士', name: '雷纹精通', desc: '雷霆伤害 +6%', maxLv: 5, effect: lv => ({ thunderDmg: 0.06 * lv }) },
  { id: 'c_taoist_2', branch: '道士', name: '敕令余韵', desc: '主动技伤害 +8%', maxLv: 5, effect: lv => ({ activeDmg: 0.08 * lv }) },
  { id: 'c_taoist_3', branch: '道士', name: '感电延长', desc: '感电持续 +0.5s', maxLv: 5, effect: lv => ({ shockDur: 0.5 * lv }) },
  { id: 'c_taoist_4', branch: '道士', name: '天雷淬体', desc: '落雷暴击率 +3%', maxLv: 5, effect: lv => ({ boltCrit: 0.03 * lv }) },

  { id: 'c_samurai_1', branch: '武士', name: '拔刀术', desc: '一闪伤害 +10%', maxLv: 5, effect: lv => ({ flashDmg: 0.10 * lv }) },
  { id: 'c_samurai_2', branch: '武士', name: '无念之境', desc: '一闪冷却 -5%', maxLv: 5, effect: lv => ({ flashCd: 0.05 * lv }) },
  { id: 'c_samurai_3', branch: '武士', name: '剑意残留', desc: '击杀返还冷却 +5%', maxLv: 5, effect: lv => ({ killCd: 0.05 * lv }) },
  { id: 'c_samurai_4', branch: '武士', name: '居合架势', desc: '移速额外 +3%', maxLv: 5, effect: lv => ({ speed: 0.03 * lv }) },

  { id: 'c_pharaoh_1', branch: '法老', name: '亡者契约', desc: '召唤物伤害 +8%', maxLv: 5, effect: lv => ({ summonDmg: 0.08 * lv }) },
  { id: 'c_pharaoh_2', branch: '法老', name: '冥骨坚韧', desc: '召唤物生命 +8%', maxLv: 5, effect: lv => ({ summonHp: 0.08 * lv }) },
  { id: 'c_pharaoh_3', branch: '法老', name: '复苏概率', desc: '亡者复苏概率 +4%', maxLv: 5, effect: lv => ({ raiseChance: 0.04 * lv }) },
  { id: 'c_pharaoh_4', branch: '法老', name: '军势扩张', desc: '召唤上限 +1', maxLv: 3, effect: lv => ({ summonCap: lv }) },

  { id: 'c_witch_1', branch: '寒冰女巫', name: '极寒渗透', desc: '冰冻持续 +0.3s', maxLv: 5, effect: lv => ({ freezeDur: 0.3 * lv }) },
  { id: 'c_witch_2', branch: '寒冰女巫', name: '霜脉', desc: '法力上限 +15', maxLv: 5, effect: lv => ({ mana: 15 * lv }) },
  { id: 'c_witch_3', branch: '寒冰女巫', name: '冰晶碎裂', desc: '碎裂伤害 +10%', maxLv: 5, effect: lv => ({ shatterDmg: 0.10 * lv }) },
  { id: 'c_witch_4', branch: '寒冰女巫', name: '减速领域', desc: '减速效果 +5%', maxLv: 5, effect: lv => ({ slowPct: 0.05 * lv }) },

  { id: 'c_crusader_1', branch: '十字军', name: '圣光庇佑', desc: '护盾吸收 +10%', maxLv: 5, effect: lv => ({ shieldHp: 0.10 * lv }) },
  { id: 'c_crusader_2', branch: '十字军', name: '坚定信仰', desc: '生命上限 +20', maxLv: 5, effect: lv => ({ hp: 20 * lv }) },
  { id: 'c_crusader_3', branch: '十字军', name: '真伤转化', desc: '吸收转真伤 +5%', maxLv: 5, effect: lv => ({ convert: 0.05 * lv }) },
  { id: 'c_crusader_4', branch: '十字军', name: '冲锋之势', desc: '冲阵伤害 +10%', maxLv: 5, effect: lv => ({ chargeDmg: 0.10 * lv }) },
];

const Talents = {
  getLv(data, id) { return (data && data.talents && data.talents[id]) || 0; },

  isUnlocked(id) {
    const d = Storage.Load();
    return this.getLv(d, id) > 0;
  },

  // 点击点亮：消耗 1 天赋点
  unlock(id) {
    const d = Storage.Load();
    const t = TALENTS.find(x => x.id === id);
    if (!t) return false;
    const lv = this.getLv(d, id);
    if (lv >= t.maxLv) return false;
    if ((d.talentPoints || 0) <= 0) {
      if (typeof UI !== 'undefined') UI.toast('天赋点不足');
      return false;
    }
    d.talentPoints--;
    d.talents[id] = lv + 1;
    Storage.Save(d);
    if (typeof SFX !== 'undefined') SFX.play('pickup');
    return true;
  },

  // 聚合所有已点亮天赋的加成
  bonuses() {
    const d = Storage.Load();
    const out = {};
    for (const t of TALENTS) {
      const lv = this.getLv(d, t.id);
      if (lv <= 0) continue;
      const eff = t.effect(lv) || {};
      for (const k in eff) out[k] = (out[k] || 0) + eff[k];
    }
    return out;
  },
};

// 列表式天赋 UI（菜单中打开）
const TalentsUI = {
  open: false,
  scroll: 0,
  tab: '通用',
  nodes: [],
  closeBtn: { x: 632, y: 96, w: 56, h: 40 },

  toggle() { this.open = !this.open; this.scroll = 0; this.tab = '通用'; },

  update(dt) { /* 预留滚动惯性 */ },

  draw(ctx) {
    if (!this.open) return;
    const W = CONFIG.canvas.w, H = CONFIG.canvas.h;
    ctx.fillStyle = 'rgba(4,4,10,0.92)';
    ctx.fillRect(0, 0, W, H);
    UI.goldText(ctx, '天 赋 之 树', W / 2, 130, 38);

    const d = Storage.Load();
    ctx.save();
    ctx.font = '16px "PingFang SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f0d9a0';
    ctx.fillText('可用天赋点：' + (d.talentPoints || 0), W / 2, 168);
    ctx.restore();

    // 分页签
    const tabs = ['通用', '职业'];
    this.tabBtns = [];
    tabs.forEach((tb, i) => {
      const bx = 220 + i * 150, by = 188, bw = 130, bh = 40;
      ctx.save();
      ctx.fillStyle = this.tab === tb ? 'rgba(201,168,106,0.92)' : 'rgba(28,28,40,0.9)';
      ctx.strokeStyle = 'rgba(201,168,106,0.7)';
      UI.rr(ctx, bx, by, bw, bh, 8);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = this.tab === tb ? '#2a1e08' : '#e0d8c8';
      ctx.font = 'bold 17px "PingFang SC", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(tb, bx + bw / 2, by + 26);
      ctx.restore();
      this.tabBtns.push({ x: bx, y: by, w: bw, h: bh, tab: tb });
    });

    // 列表
    const list = TALENTS.filter(t => this.tab === '通用' ? t.branch === '通用' : t.branch !== '通用');
    this.nodes = [];
    const x0 = 60, nw = 600, nh = 84, gap = 12;
    let y = 256 - this.scroll;
    for (const t of list) {
      if (y > 240 && y < H - 40) this.drawNode(ctx, t, x0, y, nw, nh, d);
      this.nodes.push({ x: x0, y, w: nw, h: nh, id: t.id });
      y += nh + gap;
    }

    // 关闭按钮
    const cb = this.closeBtn;
    ctx.save();
    ctx.fillStyle = 'rgba(30,30,42,0.9)';
    ctx.strokeStyle = 'rgba(201,168,106,0.8)';
    UI.rr(ctx, cb.x, cb.y, cb.w, cb.h, 8);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e0d8c8';
    ctx.font = 'bold 16px "PingFang SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('关闭', cb.x + cb.w / 2, cb.y + 26);
    ctx.restore();
  },

  drawNode(ctx, t, x, y, w, h, data) {
    const lv = Talents.getLv(data, t.id);
    const maxed = lv >= t.maxLv;
    ctx.save();
    ctx.fillStyle = lv > 0 ? 'rgba(38,30,12,0.95)' : 'rgba(18,18,28,0.92)';
    ctx.strokeStyle = maxed ? '#f0d9a0' : lv > 0 ? 'rgba(201,168,106,0.8)' : 'rgba(120,110,90,0.4)';
    ctx.lineWidth = lv > 0 ? 2 : 1.2;
    UI.rr(ctx, x, y, w, h, 10);
    ctx.fill(); ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = lv > 0 ? '#f0d9a0' : '#e8e2d2';
    ctx.font = 'bold 19px "PingFang SC", serif';
    ctx.fillText(t.name, x + 20, y + 32);

    ctx.fillStyle = '#c9a86a';
    ctx.font = '13px "PingFang SC", sans-serif';
    ctx.fillText(t.branch + ' · Lv.' + lv + '/' + t.maxLv, x + 20 + ctx.measureText(t.name).width + 60, y + 31);

    ctx.fillStyle = 'rgba(200,200,210,0.78)';
    ctx.font = '14px "PingFang SC", sans-serif';
    ctx.fillText(t.desc, x + 20, y + 60);

    ctx.textAlign = 'right';
    if (maxed) {
      ctx.fillStyle = '#f0d9a0';
      ctx.font = 'bold 15px "PingFang SC", sans-serif';
      ctx.fillText('已满级', x + w - 20, y + 48);
    } else {
      ctx.fillStyle = (data.talentPoints || 0) > 0 ? '#8fd3ff' : '#5a6a8a';
      ctx.font = 'bold 14px "PingFang SC", sans-serif';
      ctx.fillText('点击点亮', x + w - 20, y + 48);
    }
    ctx.restore();
  },

  tap(x, y) {
    if (!this.open) return false;
    if (UI.inRect(x, y, this.closeBtn)) { this.open = false; return true; }
    if (this.tabBtns) {
      for (const b of this.tabBtns) {
        if (UI.inRect(x, y, b)) { this.tab = b.tab; this.scroll = 0; return true; }
      }
    }
    for (const n of this.nodes) {
      if (UI.inRect(x, y, n)) { Talents.unlock(n.id); return true; }
    }
    return true;
  },
};
