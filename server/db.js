// 存储层：JSON 文件（后续可迁移 SQLite/MySQL）
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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
    fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 1), 'utf8');
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
    runs.push({ ...record, id: runs.length + 1, created_at: new Date().toISOString() });
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
    const key = `${classId}:${type}`;
    const entries = leaderboards[key] || {};
    return Object.entries(entries)
      .map(([pid, e]) => ({ player_id: pid, ...e }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  },
  reset(classId, type) {
    const key = `${classId}:${type}`;
    leaderboards[key] = {};
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
    // 与客户端 config.js 保持一致的默认技能定义
    return {
      magic_missile: { name: '魔法飞弹', flow: '灾厄流', behavior: 'missile', desc: '自动追踪的灾厄飞弹', tags: ['灾厄', '投射'], projectile: 'projectiles/magic_missile.png', icon: 'icons/magic_missile.png',
        levels: [{ dmg: 8, cd: 1.0, count: 1 }, { dmg: 12, cd: 0.95, count: 1 }, { dmg: 16, cd: 0.9, count: 2 }, { dmg: 20, cd: 0.85, count: 2 }, { dmg: 24, cd: 0.8, count: 3 }] },
      fireball: { name: '爆裂火球', flow: '火焰流', behavior: 'fireball', desc: '爆炸范围伤害', tags: ['火焰', '投射', '范围'], projectile: 'projectiles/fireball.png', icon: 'icons/fireball.png',
        levels: [{ dmg: 15, cd: 2.0, count: 1, radius: 40 }, { dmg: 23, cd: 1.9, count: 1, radius: 45 }, { dmg: 31, cd: 1.8, count: 1, radius: 50 }, { dmg: 39, cd: 1.7, count: 2, radius: 55 }, { dmg: 47, cd: 1.6, count: 2, radius: 60 }] },
      doom_aura: { name: '灾厄光环', flow: '灾厄流', behavior: 'doom_aura', desc: '削弱光环内敌人的抗性', tags: ['灾厄', '光环'], icon: 'icons/doom_aura.png',
        levels: [{ radius: 200, resDown: 0.15 }, { radius: 210, resDown: 0.20 }, { radius: 220, resDown: 0.25 }, { radius: 230, resDown: 0.30 }, { radius: 250, resDown: 0.35 }] },
      fire_attunement: { name: '炎附', flow: '火焰流', behavior: 'buff_fire', desc: '周期点燃所有攻击，附加火伤', tags: ['火焰', '附伤'], icon: 'icons/fire_attunement.png',
        levels: [{ dmg: 5, dur: 6, cd: 8 }, { dmg: 8, dur: 7, cd: 7.5 }, { dmg: 11, dur: 8, cd: 7 }, { dmg: 14, dur: 9, cd: 6.5 }, { dmg: 17, dur: 10, cd: 6 }] },
      thunder_mark: { name: '感电烙印', flow: '雷霆流', behavior: 'buff_thunder', desc: '周期标记敌人，受击时追加雷伤', tags: ['雷霆', '附伤'], icon: 'icons/thunder_mark.png',
        levels: [{ dmg: 8, dur: 4, cd: 6 }, { dmg: 12, dur: 4.5, cd: 5.5 }, { dmg: 16, dur: 5, cd: 5 }, { dmg: 20, dur: 5.5, cd: 4.5 }, { dmg: 24, dur: 6, cd: 4 }] },
      chain_lightning: { name: '弹射闪电', flow: '雷霆流', behavior: 'chain', desc: '闪电在敌人间弹射', tags: ['雷霆', '投射', '连锁'], icon: 'icons/chain_lightning.png',
        levels: [{ dmg: 12, cd: 3.0, chains: 3, decay: 0.20 }, { dmg: 18, cd: 2.8, chains: 3, decay: 0.18 }, { dmg: 24, cd: 2.6, chains: 4, decay: 0.16 }, { dmg: 30, cd: 2.4, chains: 4, decay: 0.14 }, { dmg: 36, cd: 2.2, chains: 5, decay: 0.12 }] },
      taoist_thunder_bolt: { name: '天雷击', flow: '雷霆流', behavior: 'bolt', desc: '对最肉敌人落雷', tags: ['雷霆', '投射', '爆发'], icon: 'icons/thunder_bolt.png',
        levels: [{ dmg: 25, cd: 3.5, crit: 0.05 }, { dmg: 37, cd: 3.35, crit: 0.08 }, { dmg: 49, cd: 3.2, crit: 0.11 }, { dmg: 61, cd: 3.05, crit: 0.14 }, { dmg: 73, cd: 2.9, crit: 0.17 }] },
      taoist_thunder_cloud: { name: '雷云', flow: '雷霆流', behavior: 'cloud', desc: '头顶雷云周期放电', tags: ['雷霆', '光环'], icon: 'icons/thunder_cloud.png',
        levels: [{ dmg: 6, interval: 1.5, radius: 250, dur: 8 }, { dmg: 9, interval: 1.4, radius: 260, dur: 9 }, { dmg: 12, interval: 1.3, radius: 270, dur: 10 }, { dmg: 15, interval: 1.2, radius: 280, dur: 11 }, { dmg: 18, interval: 1.1, radius: 300, dur: 12 }] },
      taoist_paralyze_zone: { name: '麻痹领域', flow: '雷霆流', behavior: 'paralyze', desc: '地面电场减速+定身', tags: ['雷霆', '区域', '控制'], icon: 'icons/paralysis_field.png',
        levels: [{ dmg: 4, cd: 6, slow: 0.40, stun: 0.15, radius: 60 }, { dmg: 6, cd: 5.8, slow: 0.45, stun: 0.18, radius: 65 }, { dmg: 8, cd: 5.6, slow: 0.50, stun: 0.21, radius: 70 }, { dmg: 10, cd: 5.4, slow: 0.55, stun: 0.24, radius: 75 }, { dmg: 12, cd: 5.2, slow: 0.60, stun: 0.30, radius: 80 }] },
      taoist_burn_curse: { name: '燃烧咒', flow: '火焰流', behavior: 'curse', desc: '点燃目标并传染', tags: ['火焰', '附伤', '持续'], icon: 'icons/burn_curse.png',
        levels: [{ dmg: 10, dps: 4, burnDur: 3, spread: 80, cd: 5 }, { dmg: 15, dps: 6, burnDur: 3.5, spread: 85, cd: 4.8 }, { dmg: 20, dps: 8, burnDur: 4, spread: 90, cd: 4.6 }, { dmg: 25, dps: 10, burnDur: 4.5, spread: 95, cd: 4.4 }, { dmg: 30, dps: 12, burnDur: 5, spread: 100, cd: 4.2 }] },
      taoist_fire_wall: { name: '火墙', flow: '火焰流', behavior: 'wall', desc: '地面火焰带', tags: ['火焰', '区域'], icon: 'icons/fire_wall.png',
        levels: [{ dmg: 12, cd: 5, dur: 5, radius: 60 }, { dmg: 18, cd: 4.8, dur: 5.5, radius: 65 }, { dmg: 24, cd: 4.6, dur: 6, radius: 70 }, { dmg: 30, cd: 4.4, dur: 6.5, radius: 75 }, { dmg: 36, cd: 4.2, dur: 7, radius: 80 }] },
      taoist_ignite_explode: { name: '焚身爆', flow: '火焰流', behavior: 'passive', desc: '灼烧敌人死亡时爆炸', tags: ['火焰', '区域', '被动'], icon: 'icons/taoist_ignite_explode.png',
        levels: [{ dmg: 15, radius: 60 }, { dmg: 23, radius: 65 }, { dmg: 31, radius: 70 }, { dmg: 39, radius: 75 }, { dmg: 47, radius: 80 }] },
      taoist_summon_skeleton: { name: '召唤骷髅', flow: '召唤流', behavior: 'summon_melee', desc: '召唤近战骷髅兵', tags: ['召唤'], icon: 'icons/summon_skeleton.png',
        levels: [{ dmg: 6, hp: 30, cd: 6, max: 3 }, { dmg: 9, hp: 40, cd: 5.7, max: 3 }, { dmg: 12, hp: 50, cd: 5.4, max: 4 }, { dmg: 15, hp: 60, cd: 5.1, max: 4 }, { dmg: 18, hp: 70, cd: 4.8, max: 5 }] },
      taoist_summon_archer: { name: '骷髅射手', flow: '召唤流', behavior: 'summon_archer', desc: '召唤远程骷髅射手', tags: ['召唤'], icon: 'icons/skeleton_archer.png',
        levels: [{ dmg: 8, hp: 20, cd: 7, range: 250 }, { dmg: 12, hp: 28, cd: 6.7, range: 260 }, { dmg: 16, hp: 36, cd: 6.4, range: 270 }, { dmg: 20, hp: 44, cd: 6.1, range: 280 }, { dmg: 24, hp: 52, cd: 5.8, range: 300 }] },
      taoist_raise_dead: { name: '亡者复苏', flow: '召唤流', behavior: 'passive', desc: '击杀概率复活骷髅，召唤物击杀概率翻倍', tags: ['召唤', '被动'], icon: 'icons/taoist_raise_dead.png',
        levels: [{ chance: 0.40, hp: 15, max: 6 }, { chance: 0.45, hp: 20, max: 7 }, { chance: 0.50, hp: 25, max: 8 }, { chance: 0.55, hp: 30, max: 9 }, { chance: 0.60, hp: 35, max: 10 }] },
      taoist_skull_enhance: { name: '骷髅强化', flow: '召唤流', behavior: 'passive', desc: '全局骷髅属性加成', tags: ['召唤', '被动'], icon: 'icons/taoist_skull_enhance.png',
        levels: [{ atkMult: 0.30, hpMult: 0.30 }, { atkMult: 0.40, hpMult: 0.40 }, { atkMult: 0.50, hpMult: 0.50 }, { atkMult: 0.60, hpMult: 0.60 }, { atkMult: 0.80, hpMult: 0.80 }] },
      taoist_corpse_burst: { name: '尸爆', flow: '召唤流', behavior: 'passive', desc: '骷髅死亡时爆炸', tags: ['召唤', '区域', '被动'], icon: 'icons/taoist_corpse_burst.png',
        levels: [{ dmg: 12, radius: 70 }, { dmg: 18, radius: 75 }, { dmg: 24, radius: 80 }, { dmg: 30, radius: 85 }, { dmg: 36, radius: 90 }] },
      iron_skin: { name: '钢铁皮肤', flow: '存续流', behavior: 'iron_skin', desc: '被动减伤，与护甲加算封顶30%', tags: ['防御', '被动'], icon: 'icons/frost_iron_wall.png',
        levels: [{ dr: 0.06 }, { dr: 0.09 }, { dr: 0.12 }, { dr: 0.15 }, { dr: 0.18 }] },
      vitality: { name: '生命祝福', flow: '存续流', behavior: 'vitality', desc: '被动增加生命上限', tags: ['防御', '被动'], icon: 'icons/holy_obelisk.png',
        levels: [{ hp: 25 }, { hp: 35 }, { hp: 45 }, { hp: 55 }, { hp: 70 }] },
      ice_barrier: { name: '冰霜结界', flow: '存续流', behavior: 'ice_barrier', desc: '周期凝结冰盾，减速周围，破裂冻结', tags: ['防御', '控制'], icon: 'icons/ice_barrier.png',
        levels: [{ cd: 12, shield: 30, dur: 4, slow: 0.25, freeze: 1.0 }, { cd: 12, shield: 45, dur: 4.5, slow: 0.30, freeze: 1.25 }, { cd: 11, shield: 60, dur: 5, slow: 0.35, freeze: 1.5 }, { cd: 11, shield: 75, dur: 5.5, slow: 0.40, freeze: 1.75 }, { cd: 10, shield: 95, dur: 6, slow: 0.45, freeze: 2.0 }] },
      ice_shard: { name: '冰锥术', flow: '冰霜流', behavior: 'ice_shard', desc: '发射穿透冰锥，命中减速', tags: ['冰霜', '投射', '控制'], projectile: 'projectiles/ice_shard.png', icon: 'icons/ice_shard.png',
        levels: [{ dmg: 10, cd: 1.8, count: 1, slow: 0.20, pierce: 2 }, { dmg: 14, cd: 1.7, count: 1, slow: 0.25, pierce: 2 }, { dmg: 18, cd: 1.6, count: 2, slow: 0.30, pierce: 3 }, { dmg: 22, cd: 1.5, count: 2, slow: 0.35, pierce: 3 }, { dmg: 28, cd: 1.4, count: 3, slow: 0.40, pierce: 4 }] },
      stone_golem: { name: '石魔像', flow: '召唤流', behavior: 'stone_golem', desc: '召唤高生命石魔像，嘲讽周围敌人', tags: ['召唤', '防御'], icon: 'icons/holy_guardian.png',
        levels: [{ dmg: 8, hp: 120, cd: 12, max: 1, tauntR: 150 }, { dmg: 11, hp: 160, cd: 11, max: 1, tauntR: 170 }, { dmg: 14, hp: 200, cd: 10, max: 2, tauntR: 190 }, { dmg: 17, hp: 250, cd: 9, max: 2, tauntR: 210 }, { dmg: 22, hp: 320, cd: 8, max: 3, tauntR: 240 }] },
    };
  },
  save() { saveJSON('skills.json', skills); },
};

// ---------- Game Config（管理后台可编辑） ----------
let gameConfig = loadJSON('config.json', null);

const ConfigDB = {
  get() {
    if (!gameConfig) {
      gameConfig = this._default();
      this.save();
    }
    return gameConfig;
  },
  update(data) {
    gameConfig = { ...this.get(), ...data, version: (this.get().version || 1) + 1, updated_at: new Date().toISOString() };
    this.save();
    return gameConfig;
  },
  _default() {
    return {
      version: 1,
      // 经济系统（局外）
      economy: { expMult: 0.3, timeMult: 0.5, goldKillMult: 0.1, goldTimeMult: 0.05, expNeedBase: 20, expNeedLinear: 15, expNeedQuad: 0.8 },
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
