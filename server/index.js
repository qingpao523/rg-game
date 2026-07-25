// 《无尽入侵》H5 后端服务器（零依赖，纯 Node.js http 模块）
const http = require('http');
const crypto = require('crypto');
const { PlayerDB, RunDB, LBDB } = require('./db');

const SECRET = process.env.RG_SECRET || 'rg-h5-dev-secret-2026';
const PORT = process.env.PORT || 3000;

// ---------- 工具 ----------
function json(res, code, data) {
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', c => { body += c; if (body.length > 262144) req.destroy(); });
    req.on('end', () => { try { resolve(JSON.parse(body || '{}')); } catch { resolve({}); } });
  });
}

function sign(data) {
  return crypto.createHmac('sha256', SECRET).update(JSON.stringify(data)).digest('hex').slice(0, 16);
}

function verifyRunData(body) {
  const { kills, time_seconds, wave } = body;
  if (kills < 0 || time_seconds < 0 || wave < 0) return false;
  if (time_seconds > 0 && kills / time_seconds > 50) return false;
  if (wave > 0 && time_seconds / wave < 5) return false;
  if (kills > 0 && wave === 0) return false;
  return true;
}

function sanitizePlayer(p) {
  return {
    level: p.level, exp: p.exp, gold: p.gold, shards: p.shards,
    talentPoints: p.talent_points,
    talents: p.talents, weapons: p.weapons,
    achievements: p.achievements, stats: p.stats,
  };
}

function mergeVal(server, local) {
  if (typeof local === 'number' && typeof server === 'number') return Math.max(server, local);
  if (typeof local === 'object' && local !== null && !Array.isArray(local) && typeof server === 'object' && server !== null && !Array.isArray(server)) {
    const out = { ...server };
    for (const [k, v] of Object.entries(local)) out[k] = mergeVal(out[k], v);
    return out;
  }
  if (Array.isArray(local) && Array.isArray(server)) return [...new Set([...server, ...local])];
  return local !== undefined ? local : server;
}

function auth(req) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return null;
  return PlayerDB.get(token);
}

// ---------- 路由 ----------
const routes = {
  'POST /api/auth/login': async (req, res) => {
    const body = await readBody(req);
    const platform = body.platform || 'web';
    const uid = body.platform_uid || crypto.randomUUID();
    let player = PlayerDB.findByPlatform(platform, uid);
    if (!player) player = PlayerDB.create(crypto.randomUUID(), platform, uid);
    json(res, 200, { token: player.id, player: sanitizePlayer(player) });
  },

  'GET /api/player/profile': async (req, res) => {
    const player = auth(req);
    if (!player) return json(res, 401, { error: 'invalid token' });
    json(res, 200, { player: sanitizePlayer(player) });
  },

  'POST /api/player/sync': async (req, res) => {
    const player = auth(req);
    if (!player) return json(res, 401, { error: 'invalid token' });
    const local = await readBody(req);
    const merged = {
      level: Math.max(player.level, local.level || 1),
      exp: Math.max(player.exp, local.exp || 0),
      gold: Math.max(player.gold, local.gold || 0),
      shards: Math.max(player.shards, local.shards || 0),
      talent_points: Math.max(player.talent_points, local.talentPoints || 0),
      talents: mergeVal(player.talents, local.talents),
      weapons: mergeVal(player.weapons, local.weapons),
      achievements: [...new Set([...(player.achievements || []), ...(local.achievements || [])])],
      stats: mergeVal(player.stats, local.stats),
    };
    const updated = PlayerDB.update(player.id, merged);
    json(res, 200, { player: sanitizePlayer(updated) });
  },

  'POST /api/run/complete': async (req, res) => {
    const player = auth(req);
    if (!player) return json(res, 401, { error: 'invalid token' });
    const body = await readBody(req);
    if (!verifyRunData(body)) return json(res, 422, { error: 'invalid run data' });

    RunDB.add({
      player_id: player.id,
      class_id: body.class_id,
      wave: body.wave,
      time_seconds: body.time_seconds,
      kills: body.kills,
      evolutions: body.evolutions || 0,
      skills: body.skills || [],
      flow: body.flow || '',
      exp_earned: body.exp_earned || 0,
      gold_earned: body.gold_earned || 0,
      shards_earned: body.shards_earned || 0,
    });

    const name = '执契者·' + player.id.slice(0, 6);
    LBDB.update(body.class_id, 'survival', player.id, body.time_seconds, name);
    LBDB.update(body.class_id, 'kills', player.id, body.kills, name);

    json(res, 200, { ok: true });
  },

  'GET /api/leaderboard': async (req, res, params) => {
    const classId = params.get('class') || 'all';
    const type = params.get('type') || 'survival';
    if (!['survival', 'kills'].includes(type)) return json(res, 400, { error: 'invalid type' });
    const rows = LBDB.top(classId, type, 100);
    json(res, 200, { leaderboard: rows });
  },

  'GET /api/config/version': async (req, res) => {
    json(res, 200, { version: '0.2.0', updateRequired: false });
  },
};

// ---------- 启动 ----------
const server = http.createServer(async (req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    });
    return res.end();
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const key = `${req.method} ${url.pathname}`;
  const handler = routes[key];

  if (!handler) {
    return json(res, 404, { error: 'not found', path: url.pathname });
  }

  try {
    await handler(req, res, url.searchParams);
  } catch (e) {
    console.error('[server] error:', e);
    json(res, 500, { error: 'internal error' });
  }
});

server.listen(PORT, () => {
  console.log(`[rg-h5-server] listening on :${PORT}`);
  console.log(`[rg-h5-server] data dir: ${require('path').join(__dirname, 'data')}`);
});
