// 碎片合成武器 + 局外背包
const WEAPONS = {
  taoist: [
    { id: 'w_t1', name: '桃木剑', rarity: '普通', shards: 20, icon: 'icons/thunder_seal.png',
      desc: '魔法飞弹命中后分裂 1 枚小飞弹（50% 伤害）', effect: { type: 'missile_split', value: 1 } },
    { id: 'w_t2', name: '五雷令牌', rarity: '稀有', shards: 50, icon: 'icons/thunder_bolt.png',
      desc: '天雷击命中后地面留电弧 2s（30% 伤害/s）', effect: { type: 'bolt_zone', value: 2 } },
  ],
  samurai: [
    { id: 'w_s1', name: '无名刀', rarity: '普通', shards: 20, icon: 'icons/flash_slash.png',
      desc: '一闪路径上留下残影剑气（40% 伤害）', effect: { type: 'slash_after', value: 0.4 } },
    { id: 'w_s2', name: '村正妖刀', rarity: '稀有', shards: 50, icon: 'icons/doom_star.png',
      desc: '击杀后 3s 内下次一闪伤害 +50%', effect: { type: 'kill_amp', value: 0.5 } },
  ],
  pharaoh: [
    { id: 'w_p1', name: '枯骨杖', rarity: '普通', shards: 20, icon: 'icons/summon_skeleton.png',
      desc: '骷髅上限 +1', effect: { type: 'summon_cap', value: 1 } },
    { id: 'w_p2', name: '阿努比斯权杖', rarity: '稀有', shards: 50, icon: 'icons/skeleton_archer.png',
      desc: '骷髅射手额外发射 1 支骨箭', effect: { type: 'archer_multi', value: 1 } },
  ],
  ice_witch: [
    { id: 'w_i1', name: '冰晶法杖', rarity: '普通', shards: 20, icon: 'icons/ice_shard.png',
      desc: '冰锥碎片命中后 20% 概率冻结 0.5s', effect: { type: 'ice_freeze', value: 0.2 } },
    { id: 'w_i2', name: '霜之哀伤', rarity: '稀有', shards: 50, icon: 'icons/frozen_field.png',
      desc: '极寒领域半径 +20%', effect: { type: 'field_range', value: 0.2 } },
  ],
  crusader: [
    { id: 'w_c1', name: '铁壁盾', rarity: '普通', shards: 20, icon: 'icons/holy_shield.png',
      desc: '护盾上限 +20', effect: { type: 'shield_hp', value: 20 } },
    { id: 'w_c2', name: '圣光战锤', rarity: '稀有', shards: 50, icon: 'icons/holy_guardian.png',
      desc: '圣盾冲阵结束时击退范围 +30%', effect: { type: 'charge_knock', value: 0.3 } },
  ],
};

const Craft = {
  open: false,
  tab: 'weapons', // weapons / backpack

  toggle(tab) {
    this.open = !this.open;
    if (tab) this.tab = tab;
    if (this.open) this._initWeapons();
  },

  _initWeapons() {
    const d = Storage.Load();
    d.weapons = d.weapons || {};
    for (const cid of CONFIG.classOrder) {
      if (!d.weapons[cid]) {
        d.weapons[cid] = WEAPONS[cid].map(w => ({ id: w.id, owned: false }));
      }
    }
    Storage.Save(d);
  },

  shards() { return (Storage.Load().shards || 0); },

  craft(cid, wid) {
    const d = Storage.Load();
    const w = WEAPONS[cid].find(x => x.id === wid);
    if (!w) return false;
    const owned = d.weapons[cid].find(x => x.id === wid);
    if (!owned || owned.owned) return false;
    if ((d.shards || 0) < w.shards) { UI.toast('碎片不足（需要 ' + w.shards + '）'); return false; }
    d.shards -= w.shards;
    owned.owned = true;
    Storage.Save(d);
    UI.toast('合成成功：' + w.name);
    if (typeof SFX !== 'undefined') SFX.play('evolve');
    return true;
  },

  ownedWeapons(cid) {
    const d = Storage.Load();
    if (!d.weapons || !d.weapons[cid]) return [];
    return WEAPONS[cid].filter(w => d.weapons[cid].find(x => x.id === w.id && x.owned));
  },

  // 战斗中自动装备第一把已拥有武器的效果
  applyWeaponEffects(classId) {
    const owned = this.ownedWeapons(classId);
    if (!owned.length) return;
    const w = owned[0]; // 简化：只装备第一把
    Player._weaponEffect = w.effect;
    Player._weaponName = w.name;
  },

  draw(ctx) {
    if (!this.open) return;
    const W = CONFIG.canvas.w, H = CONFIG.canvas.h;
    ctx.fillStyle = 'rgba(4,4,10,0.9)';
    ctx.fillRect(0, 0, W, H);

    UI.goldText(ctx, this.tab === 'weapons' ? '武 器 库' : '背 包', W / 2, 80, 36);

    // 页签
    // 排行榜 tab 受 features.leaderboard 门控
    const tabs = [['weapons', '武器'], ['backpack', '背包']];
    if (!CONFIG.features || CONFIG.features.leaderboard !== false) tabs.push(['leaderboard', '排行']);
    this._tabs = [];
    tabs.forEach((t, i) => {
      const tx = W / 2 - 185 + i * 130, ty = 110, tw = 110, th = 40;
      const active = this.tab === t[0];
      ctx.save();
      ctx.fillStyle = active ? 'rgba(201,168,106,0.3)' : 'rgba(20,20,30,0.8)';
      ctx.strokeStyle = 'rgba(201,168,106,0.6)';
      this._rr(ctx, tx, ty, tw, th, 8);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = active ? '#f0d9a0' : 'rgba(180,180,195,0.7)';
      ctx.font = 'bold 17px "PingFang SC", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(t[1], tx + tw / 2, ty + 26);
      ctx.restore();
      this._tabs.push({ x: tx, y: ty, w: tw, h: th, id: t[0] });
    });

    // 碎片数
    ctx.font = '16px "PingFang SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(201,168,106,0.85)';
    ctx.fillText('碎片 ' + this.shards(), W / 2, 178);

    if (this.tab === 'weapons') this._drawWeapons(ctx);
    else if (this.tab === 'backpack') this._drawBackpack(ctx);
    else if (this.tab === 'leaderboard') this._drawLeaderboard(ctx);

    // 关闭按钮
    const cbw = 200, cbh = 52, cbx = (W - cbw) / 2, cby = H - 100;
    UI.drawButton(ctx, cbx, cby, cbw, cbh, '返 回', false);
    this._closeBtn = { x: cbx, y: cby, w: cbw, h: cbh };
  },

  _drawWeapons(ctx) {
    const W = CONFIG.canvas.w;
    this._craftBtns = [];
    let y = 200;
    for (const cid of CONFIG.classOrder) {
      const c = CONFIG.classes[cid];
      const d = Storage.Load();
      const owned = d.weapons && d.weapons[cid] ? d.weapons[cid] : [];

      // 职业标题
      ctx.fillStyle = '#f0d9a0';
      ctx.font = 'bold 19px "PingFang SC", serif';
      ctx.textAlign = 'left';
      ctx.fillText(c.name + ' · ' + c.title, 60, y);
      y += 16;

      for (const w of WEAPONS[cid]) {
        const ow = owned.find(x => x.id === w.id);
        const isOwned = ow && ow.owned;
        y += 48;
        ctx.save();
        ctx.fillStyle = isOwned ? 'rgba(28,38,18,0.9)' : 'rgba(14,14,22,0.88)';
        ctx.strokeStyle = isOwned ? 'rgba(100,180,100,0.5)' : 'rgba(201,168,106,0.35)';
        this._rr(ctx, 60, y, 600, 40, 8);
        ctx.fill(); ctx.stroke();

        // 图标
        const icon = Assets.img(w.icon);
        if (icon) ctx.drawImage(icon, 68, y + 4, 32, 32);

        // 名称+稀有度
        ctx.textAlign = 'left';
        ctx.fillStyle = isOwned ? '#a0d8a0' : '#e8e2d2';
        ctx.font = 'bold 15px "PingFang SC", sans-serif';
        ctx.fillText(w.name, 110, y + 25);
        ctx.fillStyle = w.rarity === '史诗' ? '#c0392b' : w.rarity === '稀有' ? '#6a9aca' : 'rgba(160,160,175,0.7)';
        ctx.font = '12px "PingFang SC", sans-serif';
        ctx.fillText(w.rarity, 110 + ctx.measureText(w.name).width + 20, y + 25);

        // 效果
        ctx.fillStyle = 'rgba(180,180,195,0.7)';
        ctx.font = '12px "PingFang SC", sans-serif';
        ctx.fillText(w.desc, 110, y + 38);

        // 合成按钮
        if (!isOwned) {
          const canCraft = this.shards() >= w.shards;
          ctx.fillStyle = canCraft ? 'rgba(201,168,106,0.8)' : 'rgba(60,60,70,0.5)';
          this._rr(ctx, 520, y + 6, 120, 28, 6);
          ctx.fill();
          ctx.fillStyle = canCraft ? '#2a1e08' : 'rgba(140,140,150,0.5)';
          ctx.font = 'bold 13px "PingFang SC", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('合成 ' + w.shards + ' 碎片', 580, y + 25);
          this._craftBtns.push({ x: 520, y: y + 6, w: 120, h: 28, cid, wid: w.id });
        } else {
          ctx.fillStyle = '#a0d8a0';
          ctx.font = 'bold 13px "PingFang SC", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('已拥有', 580, y + 25);
        }
        ctx.restore();
      }
      y += 64;
    }
  },

  _drawBackpack(ctx) {
    const W = CONFIG.canvas.w;
    const d = Storage.Load();
    const s = d.stats || {};

    // 统计
    ctx.fillStyle = '#f0d9a0';
    ctx.font = 'bold 19px "PingFang SC", serif';
    ctx.textAlign = 'left';
    ctx.fillText('处置统计', 60, 220);

    const stats = [
      ['局外等级', 'Lv.' + (d.level || 1)],
      ['天赋点', (d.talentPoints || 0) + ' 点'],
      ['金币', (d.gold || 0)],
      ['碎片', (d.shards || 0)],
      ['总局数', s.runs || 0],
      ['总击杀', s.kills || 0],
      ['最高波次', '第 ' + (s.bestKills ? Math.ceil(s.bestKills / 20) : 0) + ' 波'],
      ['最长存活', UI.fmtTime(s.bestTime || 0)],
      ['进化次数', s.evos || 0],
    ];
    stats.forEach((row, i) => {
      const y = 260 + i * 36;
      ctx.fillStyle = 'rgba(180,180,195,0.85)';
      ctx.font = '15px "PingFang SC", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(row[0], 80, y);
      ctx.fillStyle = '#f0d9a0';
      ctx.font = 'bold 16px "PingFang SC", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(String(row[1]), 640, y);
    });

    // 成就
    const ay = 260 + stats.length * 36 + 30;
    ctx.fillStyle = '#f0d9a0';
    ctx.font = 'bold 19px "PingFang SC", serif';
    ctx.textAlign = 'left';
    ctx.fillText('成就 ' + (d.achievements ? d.achievements.length : 0) + '/' + Storage.ACHIEVEMENTS.length, 60, ay);

    const achList = Storage.ACHIEVEMENTS;
    const unlocked = d.achievements || [];
    let ax = 60, ayy = ay + 16;
    achList.forEach((a, i) => {
      const has = unlocked.includes(a.id);
      if (i > 0 && i % 3 === 0) { ax = 60; ayy += 56; }
      ctx.save();
      ctx.globalAlpha = has ? 1 : 0.35;
      ctx.fillStyle = has ? 'rgba(28,38,18,0.9)' : 'rgba(14,14,22,0.88)';
      ctx.strokeStyle = has ? 'rgba(100,180,100,0.5)' : 'rgba(100,100,110,0.3)';
      this._rr(ctx, ax, ayy, 190, 46, 8);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = has ? '#a0d8a0' : 'rgba(140,140,150,0.6)';
      ctx.font = 'bold 13px "PingFang SC", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(a.name, ax + 95, ayy + 20);
      ctx.fillStyle = has ? 'rgba(180,180,195,0.7)' : 'rgba(100,100,110,0.4)';
      ctx.font = '11px "PingFang SC", sans-serif';
      ctx.fillText(a.desc, ax + 95, ayy + 37);
      ctx.restore();
      ax += 200;
    });
  },

  _drawLeaderboard(ctx) {
    const W = CONFIG.canvas.w;
    ctx.fillStyle = '#f0d9a0';
    ctx.font = 'bold 19px "PingFang SC", serif';
    ctx.textAlign = 'center';
    ctx.fillText('排 行 榜', W / 2, 220);
    ctx.font = '14px "PingFang SC", sans-serif';
    ctx.fillStyle = 'rgba(160,160,175,0.6)';
    ctx.fillText('需连接服务器', W / 2, 250);

    if (!this._lbData) {
      this._fetchLeaderboard();
      ctx.fillStyle = 'rgba(200,200,210,0.5)';
      ctx.fillText('加载中…', W / 2, 400);
      return;
    }

    const rows = this._lbData;
    if (!rows.length) {
      ctx.fillStyle = 'rgba(200,200,210,0.5)';
      ctx.fillText('暂无数据', W / 2, 400);
      return;
    }

    ctx.textAlign = 'left';
    rows.slice(0, 20).forEach((r, i) => {
      const y = 300 + i * 34;
      const isTop3 = i < 3;
      ctx.fillStyle = isTop3 ? '#f0d9a0' : 'rgba(200,200,210,0.75)';
      ctx.font = (isTop3 ? 'bold ' : '') + '15px "PingFang SC", sans-serif';
      ctx.fillText('#' + (i + 1), 80, y);
      ctx.fillText(r.name || '执契者', 140, y);
      ctx.textAlign = 'right';
      ctx.fillStyle = isTop3 ? '#c9a86a' : 'rgba(201,168,106,0.7)';
      ctx.fillText(r.score + (this._lbType === 'survival' ? 's' : ' 击杀'), 620, y);
      ctx.textAlign = 'left';
    });
  },

  async _fetchLeaderboard() {
    if (this._lbFetching) return;
    this._lbFetching = true;
    try {
      const res = await fetch(Storage.SERVER_URL + '/api/leaderboard?class=all&type=survival');
      const j = await res.json();
      this._lbData = j.leaderboard || [];
    } catch (e) { this._lbData = []; }
    this._lbFetching = false;
  },

  _rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  },

  tap(x, y) {
    if (!this.open) return false;
    // 页签
    if (this._tabs) {
      for (const t of this._tabs) {
        if (UI.inRect(x, y, t)) { this.tab = t.id; return true; }
      }
    }
    // 合成按钮
    if (this._craftBtns) {
      for (const b of this._craftBtns) {
        if (UI.inRect(x, y, b)) { this.craft(b.cid, b.wid); return true; }
      }
    }
    // 关闭
    if (this._closeBtn && UI.inRect(x, y, this._closeBtn)) {
      this.open = false;
      return true;
    }
    return true; // 拦截所有点击
  },
};
