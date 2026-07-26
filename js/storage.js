// P1 局外成长持久化：存档 / 局外经验 / 成就检测
const Storage = {
  KEY: 'rg_h5_save',
  _cache: null,   // 内存缓存：Load() 不再每次 JSON.parse
  _dirty: false,  // 标脏：Save() 后 1s 批量落盘
  _flushT: null,

  defaultData() {
    return {
      level: 1, exp: 0, gold: 0, shards: 0,
      generalTalentPoints: 0, specialistTalentPoints: 0,
      talents: {}, unlockedWeapons: [], achievements: [],
      stats: { runs: 0, kills: 0, bestTime: 0, bestKills: 0, totalExp: 0, evos: 0 },
    };
  },

  Load() {
    if (this._cache) return this._cache;
    let d;
    try {
      const raw = localStorage.getItem(this.KEY);
      d = raw ? Object.assign(this.defaultData(), JSON.parse(raw) || {}) : this.defaultData();
    } catch (e) { d = this.defaultData(); }
    // P3 迁移：旧版 talentPoints → 新版双池
    if (d.talentPoints !== undefined && d.generalTalentPoints === undefined) {
      d.generalTalentPoints = d.talentPoints;
      d.specialistTalentPoints = d.talentPoints;
      delete d.talentPoints;
    }
    this._cache = d;
    return d;
  },

  Save(data) {
    this._cache = data;
    this._dirty = true;
    this.scheduleFlush(); // 1s 批量落盘，战斗中拾取碎片不再同步写 localStorage
  },

  scheduleFlush() {
    if (this._flushT) return;
    this._flushT = setTimeout(() => {
      this._flushT = null;
      this.flush();
    }, 1000);
  },

  // 立即落盘（页面隐藏/关闭前调用，避免 1s 窗口内丢数据）
  flush() {
    if (!this._dirty || !this._cache) return;
    this._dirty = false;
    try { localStorage.setItem(this.KEY, JSON.stringify(this._cache)); } catch (e) {}
  },

  Reset() {
    this._cache = null;
    this._dirty = false;
    if (this._flushT) { clearTimeout(this._flushT); this._flushT = null; }
    try { localStorage.removeItem(this.KEY); } catch (e) {}
  },

  // 经济重平衡：满级50需~30天（每日6局×8分钟）
  expNeed(level) {
    const eco = (typeof CONFIG !== 'undefined' && CONFIG._remoteEconomy) || {};
    const base = eco.expNeedBase != null ? eco.expNeedBase : 20;
    const linear = eco.expNeedLinear != null ? eco.expNeedLinear : 15;
    const quad = eco.expNeedQuad != null ? eco.expNeedQuad : 0.8;
    return Math.floor(base + level * linear + level * level * quad);
  },

  // 结算累加局外经验，升级 +1 通用点 +1 专精点
  addExp(amount) {
    const d = this.Load();
    d.exp += amount;
    d.stats.totalExp = (d.stats.totalExp || 0) + amount;
    let ups = 0;
    while (d.exp >= this.expNeed(d.level)) {
      d.exp -= this.expNeed(d.level);
      d.level++;
      d.generalTalentPoints = (d.generalTalentPoints || 0) + 1;
      d.specialistTalentPoints = (d.specialistTalentPoints || 0) + 1;
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

  // 结算入口：累加经验 + 统计 + 成就（经济重平衡版）
  recordRun(report) {
    const d = this.Load();
    d.stats.runs++;
    d.stats.kills += report.kills;
    d.stats.bestTime = Math.max(d.stats.bestTime, report.time);
    d.stats.bestKills = Math.max(d.stats.bestKills, report.kills);
    d.stats.evos = (d.stats.evos || 0) + report.evoCount;
    // 结算公式读远程 settlement 配置（回退默认值）
    const st = (typeof CONFIG !== 'undefined' && CONFIG._remoteSettlement) || {};
    const goldPerKill = st.goldPerKill != null ? st.goldPerKill : 0.1;
    const goldPerSecond = st.goldPerSecond != null ? st.goldPerSecond : 0.05;
    const expPerKill = st.expPerKill != null ? st.expPerKill : 0.3;
    const expPerSecond = st.expPerSecond != null ? st.expPerSecond : 0.5;
    d.gold = (d.gold || 0) + Math.round(report.kills * goldPerKill + report.time * goldPerSecond);
    d.shards = (d.shards || 0) + (report.shards || 0);
    this.Save(d);
    const expGain = Math.round(report.kills * expPerKill + report.time * expPerSecond);
    const r = this.addExp(expGain);
    if (r.ups > 0 && typeof UI !== 'undefined') {
      UI.toast('局外等级提升！通用+专精天赋点各 +1');
      if (typeof SFX !== 'undefined') SFX.play('levelup');
    }
    this.checkAchievements(report);
    // P2：异步上报结算数据 + 同步完整存档到服务器
    this._reportToServer(report);
    this.syncToServer();
    return r.data;
  },

  // ---------- P2 服务端同步 ----------
  // 服务端地址：http/https 访问时用同源地址（游戏由 node 服务器同源伺服，远程设备也能打到同一台服务器）；
  // file:// 直接打开时回退 localhost:3000（本地开发）。绝不硬编码 localhost，否则远程设备会指向它自己。
  SERVER_URL: (typeof location !== 'undefined' && (location.protocol === 'http:' || location.protocol === 'https:'))
    ? location.origin : 'http://localhost:3000',
  _token: null,

  // 获取/生成稳定的玩家 ID（存本地，跨会话不变）
  getPlayerId() {
    const d = this.Load();
    if (!d.playerId) {
      d.playerId = 'web_' + (crypto.randomUUID ? crypto.randomUUID().slice(0, 12) : Math.random().toString(36).slice(2, 14));
      this.Save(d);
    }
    return d.playerId;
  },

  async loginToServer() {
    try {
      const res = await fetch(this.SERVER_URL + '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: 'web', playerId: this.getPlayerId() }),
      });
      const j = await res.json();
      this._token = j.token;
      return j.player;
    } catch (e) { console.warn('[storage] server login failed:', e.message); return null; }
  },

  async syncToServer() {
    if (!this._token) await this.loginToServer();
    if (!this._token) return null;
    try {
      const d = this.Load();
      const res = await fetch(this.SERVER_URL + '/api/player/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + this._token },
        body: JSON.stringify({
          playerId: this.getPlayerId(),
          level: d.level, exp: d.exp, gold: d.gold, shards: d.shards,
          generalTalentPoints: d.generalTalentPoints, specialistTalentPoints: d.specialistTalentPoints,
          talents: d.talents, weapons: d.weapons, achievements: d.achievements, stats: d.stats,
        }),
      });
      const j = await res.json();
      return j.player;
    } catch (e) { console.warn('[storage] sync failed:', e.message); return null; }
  },

  async _reportToServer(report) {
    if (!this._token) return; // 未登录不阻塞
    const st = (typeof CONFIG !== 'undefined' && CONFIG._remoteSettlement) || {};
    const expPerKill = st.expPerKill != null ? st.expPerKill : 0.3;
    const expPerSecond = st.expPerSecond != null ? st.expPerSecond : 0.5;
    const goldPerKill = st.goldPerKill != null ? st.goldPerKill : 0.1;
    const goldPerSecond = st.goldPerSecond != null ? st.goldPerSecond : 0.05;
    try {
      fetch(this.SERVER_URL + '/api/run/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + this._token },
        body: JSON.stringify({
          playerId: this.getPlayerId(),
          class_id: Game.classId, wave: report.wave, time_seconds: Math.round(report.time),
          kills: report.kills, evolutions: report.evoCount,
          skills: (report.build || []).map(b => b.name),
          flow: report.flow || '',
          exp_earned: Math.round(report.kills * expPerKill + report.time * expPerSecond),
          gold_earned: Math.round(report.kills * goldPerKill + report.time * goldPerSecond),
          shards_earned: report.shards || 0,
        }),
      }).catch(() => {}); // 静默失败，不影响本地
    } catch (e) {}
  },
};

// 页面隐藏/关闭前强制落盘，避免 1s 批量窗口内丢数据
window.addEventListener('beforeunload', () => Storage.flush());
window.addEventListener('pagehide', () => Storage.flush());
