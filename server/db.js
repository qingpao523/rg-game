// 存储层：JSON 文件（后续可迁移 SQLite/MySQL）
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function loadJSON(file, fallback) {
  try {
    const p = path.join(DATA_DIR, file);
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) { console.error('[db] load error:', file, e.message); }
  return fallback;
}

function saveJSON(file, data) {
  try {
    // 原子写：先写临时文件再 rename，避免进程中断时 JSON 损坏
    const p = path.join(DATA_DIR, file);
    const tmp = p + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data, null, 1), 'utf8');
    fs.renameSync(tmp, p);
  } catch (e) { console.error('[db] save error:', file, e.message); }
}

// ---------- Players ----------
let players = loadJSON('players.json', {});

const PlayerDB = {
  get(id) { return players[id] || null; },
  list(page = 1, size = 20, search = '') {
    let all = Object.values(players);
    if (search) {
      const s = search.toLowerCase();
      all = all.filter(p =>
        (p.id || '').toLowerCase().includes(s) ||
        (p.name || '').toLowerCase().includes(s) ||
        (p.platform || '').toLowerCase().includes(s)
      );
    }
    all.sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''));
    const total = all.length;
    const start = (page - 1) * size;
    return { total, page, size, items: all.slice(start, start + size) };
  },
  create(id, platform, uid) {
    players[id] = {
      id, platform, platform_uid: uid, name: '',
      level: 1, exp: 0, gold: 0, shards: 0,
      generalTalentPoints: 0, specialistTalentPoints: 0,
      talents: {}, weapons: {}, achievements: [], stats: {},
      banned: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.save();
    return players[id];
  },
  update(id, fields) {
    if (!players[id]) return null;
    Object.assign(players[id], fields, { updated_at: new Date().toISOString() });
    this.save();
    return players[id];
  },
  setBanned(id, banned) {
    if (!players[id]) return null;
    players[id].banned = banned;
    players[id].updated_at = new Date().toISOString();
    this.save();
    return players[id];
  },
  save() { saveJSON('players.json', players); },
};

// ---------- Run Records ----------
let runs = loadJSON('runs.json', []);

const RunDB = {
  add(record) {
    // UUID 避免截断后 runs.length+1 与存量记录撞 id
    runs.push({ ...record, id: crypto.randomUUID(), created_at: new Date().toISOString() });
    if (runs.length > 10000) runs = runs.slice(-10000);
    this.save();
  },
  list(page = 1, size = 20, filters = {}) {
    let all = [...runs];
    if (filters.class_id) all = all.filter(r => r.class_id === filters.class_id);
    if (filters.minWave) all = all.filter(r => r.wave >= filters.minWave);
    if (filters.minKills) all = all.filter(r => r.kills >= filters.minKills);
    all.reverse(); // 最新的在前
    const total = all.length;
    const start = (page - 1) * size;
    return { total, page, size, items: all.slice(start, start + size) };
  },
  get(id) { return runs.find(r => r.id === id) || null; },
  save() { saveJSON('runs.json', runs); },
};

// ---------- Leaderboards ----------
let leaderboards = loadJSON('leaderboards.json', {});

const LBDB = {
  update(classId, type, playerId, score, name) {
    const key = `${classId}:${type}`;
    if (!leaderboards[key]) leaderboards[key] = {};
    const existing = leaderboards[key][playerId];
    if (!existing || score > existing.score) {
      leaderboards[key][playerId] = { score, name, updated_at: new Date().toISOString() };
      this.save();
      return true;
    }
    return false;
  },
  top(classId, type, limit = 100) {
    // 全部职业：汇总所有 `${class}:${type}` 键，同一玩家取最高分去重
    if (classId === 'all') {
      const best = new Map();
      for (const [key, entries] of Object.entries(leaderboards)) {
        if (!key.endsWith(':' + type)) continue;
        const cls = key.slice(0, key.lastIndexOf(':'));
        for (const [pid, e] of Object.entries(entries)) {
          const prev = best.get(pid);
          if (!prev || e.score > prev.score) best.set(pid, { player_id: pid, class_id: cls, ...e });
        }
      }
      return [...best.values()].sort((a, b) => b.score - a.score).slice(0, limit);
    }
    const key = `${classId}:${type}`;
    const entries = leaderboards[key] || {};
    return Object.entries(entries)
      .map(([pid, e]) => ({ player_id: pid, ...e }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  },
  reset(classId, type) {
    if (classId === 'all') {
      // 全部职业：清空该类型的所有职业榜单
      for (const key of Object.keys(leaderboards)) {
        if (key.endsWith(':' + type)) delete leaderboards[key];
      }
    } else {
      leaderboards[`${classId}:${type}`] = {};
    }
    this.save();
  },
  save() { saveJSON('leaderboards.json', leaderboards); },
};

// ---------- Skills（管理后台可编辑） ----------
let skills = loadJSON('skills.json', null);

const SkillDB = {
  getAll() {
    if (!skills) {
      // 首次从客户端 config.js 的默认技能初始化
      skills = this._defaultSkills();
      this.save();
    }
    return skills;
  },
  get(id) { return (skills || {})[id] || null; },
  create(id, data) {
    if (!skills) skills = {};
    skills[id] = { ...data, id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    this.save();
    return skills[id];
  },
  update(id, data) {
    if (!skills || !skills[id]) return null;
    Object.assign(skills[id], data, { updated_at: new Date().toISOString() });
    this.save();
    return skills[id];
  },
  remove(id) {
    if (!skills || !skills[id]) return false;
    delete skills[id];
    this.save();
    return true;
  },
  setIcon(id, base64) {
    if (!skills || !skills[id]) return false;
    skills[id].iconData = base64; // base64 data URI
    skills[id].updated_at = new Date().toISOString();
    this.save();
    return true;
  },
  _defaultSkills() {
    // 单一事实源：直接从客户端 js/config.js 读取技能定义（vm 执行纯对象模块），
    // 彻底消灭服务端手工复制导致的字段漂移（如 atk/atkMult 不一致 → 召唤物 NaN）
    try {
      const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'config.js'), 'utf8');
      const ctx = vm.createContext({ console });
      vm.runInContext(src, ctx, { filename: 'config.js' });
      const clientSkills = vm.runInContext('CONFIG.skills', ctx);
      const out = {};
      for (const [id, s] of Object.entries(clientSkills)) {
        out[id] = {
          name: s.name, flow: s.flow, behavior: s.behavior, desc: s.desc,
          tags: s.tags || [], icon: s.icon, projectile: s.projectile || null,
          levels: JSON.parse(JSON.stringify(s.levels)),
        };
      }
      return out;
    } catch (e) {
      console.error('[db] load client skills failed:', e.message);
      return {};
    }
  },
  save() { saveJSON('skills.json', skills); },
};

// ---------- Game Config（管理后台可编辑） ----------
let gameConfig = loadJSON('config.json', null);

const ConfigDB = {
  HISTORY_DIR: path.join(DATA_DIR, 'config-history'),

  get() {
    if (!gameConfig) {
      gameConfig = this._default();
      this.save();
    }
    // 补全缺失字段（兼容 schema 之前创建的 config.json）
    this._ensureComplete();
    return gameConfig;
  },

  // 用 schema 默认值补全 config 中缺失的字段
  _ensureComplete() {
    try {
      const schema = require('./admin/config-schema.js');
      let changed = false;
      for (const f of schema.CONFIG_SCHEMA) {
        if (schema.getPath(gameConfig, f.path) === undefined) {
          schema.setPath(gameConfig, f.path, f.def);
          changed = true;
        }
      }
      if (changed) this.save();
    } catch (e) { /* schema 加载失败时跳过补全 */ }
  },

  // schema 白名单深合并 + 版本历史快照（消灭浅合并丢字段）
  update(data) {
    const schema = require('./admin/config-schema.js');
    // 更新前快照（用于回滚）
    this._snapshot();
    // 按 schema 白名单深合并：payload 未提供的字段保持原值
    const merged = schema.deepMergeConfig(this.get(), data);
    gameConfig = { ...merged, version: (this.get().version || 1) + 1, updated_at: new Date().toISOString() };
    this.save();
    return gameConfig;
  },

  _snapshot() {
    try {
      if (!fs.existsSync(this.HISTORY_DIR)) fs.mkdirSync(this.HISTORY_DIR, { recursive: true });
      const cur = this.get();
      const file = path.join(this.HISTORY_DIR, `v${cur.version || 1}.json`);
      fs.writeFileSync(file, JSON.stringify(cur, null, 1), 'utf8');
      // 只保留最近 30 份
      const files = fs.readdirSync(this.HISTORY_DIR).filter(f => f.endsWith('.json')).sort();
      while (files.length > 30) { fs.unlinkSync(path.join(this.HISTORY_DIR, files.shift())); }
    } catch (e) { console.error('[db] snapshot error:', e.message); }
  },

  // 版本历史列表
  history() {
    try {
      if (!fs.existsSync(this.HISTORY_DIR)) return [];
      return fs.readdirSync(this.HISTORY_DIR).filter(f => f.endsWith('.json')).map(f => {
        try {
          const c = JSON.parse(fs.readFileSync(path.join(this.HISTORY_DIR, f), 'utf8'));
          return { version: c.version, updated_at: c.updated_at, file: f };
        } catch { return null; }
      }).filter(Boolean).sort((a, b) => (b.version || 0) - (a.version || 0));
    } catch { return []; }
  },

  // 回滚到指定版本：用历史快照内容写入，version 继续 +1（绝不回退版本号）
  rollback(version) {
    const schema = require('./admin/config-schema.js');
    const file = path.join(this.HISTORY_DIR, `v${version}.json`);
    if (!fs.existsSync(file)) return null;
    const snapshot = JSON.parse(fs.readFileSync(file, 'utf8'));
    this._snapshot(); // 回滚前也快照当前状态
    const merged = schema.deepMergeConfig(this.get(), snapshot);
    gameConfig = { ...merged, version: (this.get().version || 1) + 1, updated_at: new Date().toISOString() };
    this.save();
    return gameConfig;
  },

  _default() {
    return {
      version: 1,
      // 经济系统（局外）
      economy: { expNeedBase: 20, expNeedLinear: 15, expNeedQuad: 0.8 },
      // 局内经验曲线（玩家升级）
      playerExp: { base: 5, linear: 3, quad: 0.35 },
      // 结算奖励公式
      settlement: { expPerKill: 0.3, expPerSecond: 0.5, goldPerKill: 0.1, goldPerSecond: 0.05, shardPerElite: 1, shardPerGoblin: [2, 3] },
      // 玩家基础属性
      player: { hp: 120, speed: 230, pickup: 110, hurtCd: 0.5, drawH: 118 },
      // 怪物定义（可增删改）
      enemies: {
        grunt: { name: '杂兵', hp: 20, hpWave: 5, hpWavePct: 0.08, dmg: 8, dmgWave: 0.5, speed: 85, exp: 1, r: 24, drawH: 80, img: 'enemies/grunt_move.png' },
        charger: { name: '冲锋兵', hp: 15, hpWave: 3, hpWavePct: 0.06, dmg: 12, dmgWave: 0.6, speed: 70, chargeSpeed: 330, chargeRange: 380, exp: 2, r: 24, drawH: 84, img: 'enemies/charger_move.png' },
        elite: { name: '精英', hp: 80, hpWave: 20, hpWavePct: 0.12, dmg: 20, dmgWave: 1.2, speed: 55, exp: 10, r: 40, drawH: 150, img: 'enemies/elite_move.png' },
        goblin: { name: '宝藏哥布林', hp: 40, hpWave: 8, hpWavePct: 0.10, dmg: 0, dmgWave: 0, speed: 170, exp: 15, r: 22, drawH: 76, img: 'enemies/goblin_run.png' },
      },
      // 掉落系统
      drops: { eliteShardChance: 0.3, eliteHealChance: 0.25, healValue: 30, goblinExpValue: 8, goblinShardMin: 2, goblinShardMax: 3, expDoubleChance: 0 },
      // 波次曲线
      waves: { waveTime: 25, baseInterval: 1.5, minInterval: 0.45, batchBase: 2, batchPerWave: 0.8, maxAlive: 120, chargerFromWave: 2, eliteFirstTime: 70, eliteInterval: 30, eliteCap: 5, goblinFirst: 45, goblinMin: 40, goblinMax: 70, goblinSpawnR: 520 },
      // 天赋解锁条件
      talents: { generalUnlock: { 2: 8, 3: 16, 4: 24 }, specialistUnlock: { 2: 5, 3: 10 } },
      // 武器碎片需求
      weapons: { normalShards: 20, rareShards: 50 },
      // 技能系统
      skillSystem: { maxLevel: 0, skillSlots: 8, archerCap: 3, evoMainLevel: 5, evoCatalystLevel: 3 },
      // 功能开关
      features: { elementalReaction: true, wheel: true, leaderboard: true, skipUpgrade: true },
      updated_at: new Date().toISOString(),
    };
  },
  save() { saveJSON('config.json', gameConfig); },
};

// ---------- Announcements ----------
let announcements = loadJSON('announcements.json', []);

const AnnouncementDB = {
  list() { return announcements.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')); },
  get(id) { return announcements.find(a => a.id === id) || null; },
  create(data) {
    const a = { id: crypto.randomUUID(), ...data, created_at: new Date().toISOString() };
    announcements.push(a);
    this.save();
    return a;
  },
  update(id, data) {
    const a = announcements.find(x => x.id === id);
    if (!a) return null;
    Object.assign(a, data, { updated_at: new Date().toISOString() });
    this.save();
    return a;
  },
  remove(id) {
    const idx = announcements.findIndex(x => x.id === id);
    if (idx < 0) return false;
    announcements.splice(idx, 1);
    this.save();
    return true;
  },
  save() { saveJSON('announcements.json', announcements); },
};

// ---------- Admin Auth ----------
const ADMIN_PASS_HASH = process.env.ADMIN_PASS_HASH || crypto.createHash('sha256').update('rg-admin-2026').digest('hex');
const sessions = new Set();

const AdminAuth = {
  login(password) {
    const hash = crypto.createHash('sha256').update(password).digest('hex');
    if (hash === ADMIN_PASS_HASH) {
      const token = crypto.randomUUID();
      sessions.add(token);
      return token;
    }
    return null;
  },
  check(token) { return sessions.has(token); },
  logout(token) { sessions.delete(token); },
};

// ---------- Stats ----------
const StatsDB = {
  dashboard() {
    const allPlayers = Object.values(players);
    const today = new Date().toISOString().slice(0, 10);
    const todayRuns = runs.filter(r => (r.created_at || '').startsWith(today));
    const classDist = {};
    for (const r of runs) { classDist[r.class_id] = (classDist[r.class_id] || 0) + 1; }
    const avgTime = runs.length ? Math.round(runs.reduce((s, r) => s + r.time_seconds, 0) / runs.length) : 0;
    const avgKills = runs.length ? Math.round(runs.reduce((s, r) => s + r.kills, 0) / runs.length) : 0;
    return {
      totalPlayers: allPlayers.length,
      totalRuns: runs.length,
      todayRuns: todayRuns.length,
      avgSurvival: avgTime,
      avgKills,
      classDistribution: classDist,
      bannedCount: allPlayers.filter(p => p.banned).length,
    };
  },
};

module.exports = { PlayerDB, RunDB, LBDB, SkillDB, ConfigDB, AnnouncementDB, AdminAuth, StatsDB };
