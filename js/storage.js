// P1 局外成长持久化：存档 / 局外经验 / 成就检测
const Storage = {
  KEY: 'rg_h5_save',

  defaultData() {
    return {
      level: 1, exp: 0, gold: 0, talentPoints: 0,
      talents: {}, unlockedWeapons: [], achievements: [],
      stats: { runs: 0, kills: 0, bestTime: 0, bestKills: 0, totalExp: 0, evos: 0 },
    };
  },

  Load() {
    try {
      const raw = localStorage.getItem(this.KEY);
      if (!raw) return this.defaultData();
      const d = JSON.parse(raw);
      return Object.assign(this.defaultData(), d || {});
    } catch (e) { return this.defaultData(); }
  },

  Save(data) {
    try { localStorage.setItem(this.KEY, JSON.stringify(data)); } catch (e) {}
  },

  Reset() {
    try { localStorage.removeItem(this.KEY); } catch (e) {}
  },

  expNeed(level) { return level * 100; },

  // 结算累加局外经验，升级 +1 天赋点
  addExp(amount) {
    const d = this.Load();
    d.exp += amount;
    d.stats.totalExp = (d.stats.totalExp || 0) + amount;
    let ups = 0;
    while (d.exp >= this.expNeed(d.level)) {
      d.exp -= this.expNeed(d.level);
      d.level++;
      d.talentPoints = (d.talentPoints || 0) + 1;
      ups++;
    }
    this.Save(d);
    return { data: d, ups };
  },

  // ---------- 成就（12 条） ----------
  ACHIEVEMENTS: [
    { id: 'first_blood', name: '初次处置', desc: '完成第一局', cond: s => s.stats.runs >= 1 },
    { id: 'kill_50', name: '清道夫', desc: '单局处置 50 个敌人', cond: (s, r) => r.kills >= 50 },
    { id: 'kill_500', name: '屠戮者', desc: '单局处置 500 个敌人', cond: (s, r) => r.kills >= 500 },
    { id: 'survive_5min', name: '坚守五分钟', desc: '单局存活 5 分钟', cond: (s, r) => r.time >= 300 },
    { id: 'survive_10min', name: '裂界老兵', desc: '单局存活 10 分钟', cond: (s, r) => r.time >= 600 },
    { id: 'first_evo', name: '高危方案', desc: '解锁一次进化', cond: (s, r) => r.evoCount >= 1 },
    { id: 'evo_master', name: '进化大师', desc: '单局解锁 2 次进化', cond: (s, r) => r.evoCount >= 2 },
    { id: 'level_10', name: '成长之路', desc: '局外等级达到 10', cond: s => s.level >= 10 },
    { id: 'runs_10', name: '十次轮回', desc: '累计完成 10 局', cond: s => s.stats.runs >= 10 },
    { id: 'best_kills', name: '处置专家', desc: '单局处置 200 个敌人', cond: (s, r) => r.kills >= 200 },
    { id: 'talent_first', name: '天赋觉醒', desc: '点亮第一个天赋', cond: s => Object.keys(s.talents || {}).length >= 1 },
    { id: 'gold_hoard', name: '源质囤积', desc: '累计获得 1000 源质', cond: s => (s.gold || 0) >= 1000 },
  ],

  // 结算后逐条检测，新解锁 toast 提示
  checkAchievements(report) {
    const d = this.Load();
    d.achievements = d.achievements || [];
    let changed = false;
    for (const a of this.ACHIEVEMENTS) {
      if (d.achievements.includes(a.id)) continue;
      let ok = false;
      try { ok = a.cond(d, report || {}); } catch (e) { ok = false; }
      if (ok) {
        d.achievements.push(a.id);
        changed = true;
        if (typeof UI !== 'undefined') UI.toast('成就解锁：' + a.name);
      }
    }
    if (changed) this.Save(d);
    return d;
  },

  // 结算入口：累加经验 + 统计 + 成就
  recordRun(report) {
    const d = this.Load();
    d.stats.runs++;
    d.stats.kills += report.kills;
    d.stats.bestTime = Math.max(d.stats.bestTime, report.time);
    d.stats.bestKills = Math.max(d.stats.bestKills, report.kills);
    d.stats.evos = (d.stats.evos || 0) + report.evoCount;
    d.gold = (d.gold || 0) + Math.round(report.kills * 0.5 + report.time * 0.2);
    this.Save(d);
    const r = this.addExp(Math.round(report.kills + report.time));
    if (r.ups > 0 && typeof UI !== 'undefined') {
      UI.toast('局外等级提升！天赋点 +1');
      if (typeof SFX !== 'undefined') SFX.play('levelup');
    }
    this.checkAchievements(report);
    return r.data;
  },
};
