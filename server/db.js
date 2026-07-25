// JSON 文件存储（零依赖，后续可迁移到 SQLite/MySQL）
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const PLAYERS_FILE = path.join(DATA_DIR, 'players.json');
const RUNS_FILE = path.join(DATA_DIR, 'runs.json');
const LB_FILE = path.join(DATA_DIR, 'leaderboards.json');

// 确保数据目录存在
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function loadJSON(file, fallback) {
  try {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) { console.error('[db] load error:', file, e.message); }
  return fallback;
}

function saveJSON(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 1), 'utf8');
  } catch (e) { console.error('[db] save error:', file, e.message); }
}

// ---------- Players ----------
let players = loadJSON(PLAYERS_FILE, {});

const PlayerDB = {
  get(id) { return players[id] || null; },
  findByPlatform(platform, uid) {
    return Object.values(players).find(p => p.platform === platform && p.platform_uid === uid) || null;
  },
  create(id, platform, uid) {
    players[id] = {
      id, platform, platform_uid: uid,
      level: 1, exp: 0, gold: 0, shards: 0, talent_points: 0,
      talents: {}, weapons: {}, achievements: [], stats: {},
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
  save() { saveJSON(PLAYERS_FILE, players); },
};

// ---------- Run Records ----------
let runs = loadJSON(RUNS_FILE, []);

const RunDB = {
  add(record) {
    runs.push({ ...record, id: runs.length + 1, created_at: new Date().toISOString() });
    // 保留最近 10000 条
    if (runs.length > 10000) runs = runs.slice(-10000);
    this.save();
  },
  byPlayer(playerId, limit = 50) {
    return runs.filter(r => r.player_id === playerId).slice(-limit);
  },
  save() { saveJSON(RUNS_FILE, runs); },
};

// ---------- Leaderboards ----------
let leaderboards = loadJSON(LB_FILE, {});

const LBDB = {
  // key: `${classId}:${type}`
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
  save() { saveJSON(LB_FILE, leaderboards); },
};

module.exports = { PlayerDB, RunDB, LBDB };
