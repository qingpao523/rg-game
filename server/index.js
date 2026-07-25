// 《无尽入侵》H5 服务端：玩家 API + 管理后台（零依赖）
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { PlayerDB, RunDB, LBDB, SkillDB, ConfigDB, AnnouncementDB, AdminAuth, StatsDB } = require('./db');

const PORT = process.env.PORT || 3000;
const ADMIN_DIR = path.join(__dirname, 'admin');

// ---------- 工具 ----------
function json(res, code, data) {
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Token',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', c => { body += c; if (body.length > 1048576) req.destroy(); });
    req.on('end', () => { try { resolve(JSON.parse(body || '{}')); } catch { resolve({}); } });
  });
}

function getCookie(req, name) {
  const cookies = (req.headers.cookie || '').split(';');
  for (const c of cookies) {
    const [k, v] = c.trim().split('=');
    if (k === name) return v;
  }
  return null;
}

function isAdmin(req) {
  const token = req.headers['x-admin-token'] || getCookie(req, 'admin_token');
  return token && AdminAuth.check(token);
}

function serveStatic(res, filePath, contentType) {
  try {
    const data = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': contentType, 'Access-Control-Allow-Origin': '*' });
    res.end(data);
  } catch {
    res.writeHead(404); res.end('Not Found');
  }
}

// ---------- 路由 ----------
const routes = {};

function route(method, path, handler) { routes[`${method} ${path}`] = handler; }

// ===== 玩家 API =====

route('POST', '/api/auth', async (req, res) => {
  const body = await readBody(req);
  const { platform = 'web', code, unionId } = body;
  let playerId;
  if (platform === 'wx' && code) {
    // 微信：code 换 openid（需要 appid/secret，开发阶段用 code 哈希模拟）
    playerId = 'wx_' + crypto.createHash('md5').update(code).digest('hex').slice(0, 16);
  } else if (platform === 'taptap' && unionId) {
    playerId = 'tt_' + unionId;
  } else if (platform === 'tt' && code) {
    playerId = 'dy_' + crypto.createHash('md5').update(code).digest('hex').slice(0, 16);
  } else {
    playerId = body.playerId || 'web_' + crypto.randomUUID().slice(0, 8);
  }
  let player = PlayerDB.get(playerId);
  if (!player) player = PlayerDB.create(playerId, platform, code || unionId || playerId);
  if (player.banned) return json(res, 403, { error: 'banned' });
  json(res, 200, { playerId, player: sanitize(player) });
});

route('GET', '/api/player/profile', async (req, res, params) => {
  const pid = params.get('playerId');
  const player = PlayerDB.get(pid);
  if (!player) return json(res, 404, { error: 'not found' });
  json(res, 200, { player: sanitize(player) });
});

route('POST', '/api/player/sync', async (req, res) => {
  const body = await readBody(req);
  const { playerId, ...save } = body;
  if (!playerId) return json(res, 400, { error: 'missing playerId' });
  let player = PlayerDB.get(playerId);
  if (!player) player = PlayerDB.create(playerId, save.platform || 'web', playerId);
  if (player.banned) return json(res, 403, { error: 'banned' });
  const merged = {
    level: Math.max(player.level, save.level || 1),
    exp: Math.max(player.exp, save.exp || 0),
    gold: Math.max(player.gold, save.gold || 0),
    shards: Math.max(player.shards, save.shards || 0),
    generalTalentPoints: Math.max(player.generalTalentPoints || 0, save.generalTalentPoints || 0),
    specialistTalentPoints: Math.max(player.specialistTalentPoints || 0, save.specialistTalentPoints || 0),
    talents: mergeObj(player.talents, save.talents),
    weapons: mergeObj(player.weapons, save.weapons),
    achievements: [...new Set([...(player.achievements || []), ...(save.achievements || [])])],
    stats: mergeObj(player.stats, save.stats),
  };
  const updated = PlayerDB.update(playerId, merged);
  json(res, 200, { player: sanitize(updated) });
});

route('POST', '/api/run/complete', async (req, res) => {
  const body = await readBody(req);
  const { playerId, class_id, wave, time_seconds, kills, evolutions, skills, flow, exp_earned, gold_earned, shards_earned } = body;
  if (!playerId || !class_id) return json(res, 400, { error: 'missing fields' });
  if (kills < 0 || time_seconds < 0 || wave < 0) return json(res, 422, { error: 'invalid data' });
  if (time_seconds > 0 && kills / time_seconds > 50) return json(res, 422, { error: 'suspicious data' });
  RunDB.add({ player_id: playerId, class_id, wave, time_seconds, kills, evolutions: evolutions || 0, skills: skills || [], flow: flow || '', exp_earned: exp_earned || 0, gold_earned: gold_earned || 0, shards_earned: shards_earned || 0 });
  const player = PlayerDB.get(playerId);
  const name = player ? (player.name || '执契者·' + playerId.slice(0, 6)) : '执契者';
  LBDB.update(class_id, 'survival', playerId, time_seconds, name);
  LBDB.update(class_id, 'kills', playerId, kills, name);
  json(res, 200, { ok: true });
});

route('GET', '/api/leaderboard', async (req, res, params) => {
  const classId = params.get('class') || 'all';
  const type = params.get('type') || 'survival';
  if (!['survival', 'kills'].includes(type)) return json(res, 400, { error: 'invalid type' });
  json(res, 200, { leaderboard: LBDB.top(classId, type, 100) });
});

route('GET', '/api/config/game', async (req, res) => {
  json(res, 200, { config: ConfigDB.get(), skills: SkillDB.getAll() });
});

route('GET', '/api/config/version', async (req, res) => {
  json(res, 200, { version: ConfigDB.get().version || 1 });
});

route('GET', '/api/announcement', async (req, res) => {
  json(res, 200, { announcements: AnnouncementDB.list().filter(a => a.active !== false) });
});

// ===== 管理后台 API =====

route('POST', '/api/admin/login', async (req, res) => {
  const { password } = await readBody(req);
  const token = AdminAuth.login(password || '');
  if (!token) return json(res, 401, { error: 'wrong password' });
  res.writeHead(200, {
    'Content-Type': 'application/json; charset=utf-8',
    'Set-Cookie': `admin_token=${token}; Path=/; HttpOnly; SameSite=Strict`,
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify({ ok: true, token }));
});

route('GET', '/api/admin/check', async (req, res) => {
  json(res, isAdmin(req) ? 200 : 401, { ok: isAdmin(req) });
});

route('POST', '/api/admin/logout', async (req, res) => {
  const token = req.headers['x-admin-token'] || getCookie(req, 'admin_token');
  if (token) AdminAuth.logout(token);
  json(res, 200, { ok: true });
});

// 仪表盘
route('GET', '/api/admin/stats', async (req, res) => {
  if (!isAdmin(req)) return json(res, 401, { error: 'unauthorized' });
  json(res, 200, StatsDB.dashboard());
});

// 玩家管理
route('GET', '/api/admin/players', async (req, res, params) => {
  if (!isAdmin(req)) return json(res, 401, { error: 'unauthorized' });
  const page = parseInt(params.get('page')) || 1;
  const search = params.get('search') || '';
  json(res, 200, PlayerDB.list(page, 20, search));
});

route('GET', '/api/admin/players/:id', async (req, res, params, pathParams) => {
  if (!isAdmin(req)) return json(res, 401, { error: 'unauthorized' });
  const player = PlayerDB.get(pathParams.id);
  if (!player) return json(res, 404, { error: 'not found' });
  json(res, 200, { player });
});

route('POST', '/api/admin/players/:id/ban', async (req, res, params, pathParams) => {
  if (!isAdmin(req)) return json(res, 401, { error: 'unauthorized' });
  const player = PlayerDB.setBanned(pathParams.id, true);
  json(res, player ? 200 : 404, { ok: !!player });
});

route('POST', '/api/admin/players/:id/unban', async (req, res, params, pathParams) => {
  if (!isAdmin(req)) return json(res, 401, { error: 'unauthorized' });
  const player = PlayerDB.setBanned(pathParams.id, false);
  json(res, player ? 200 : 404, { ok: !!player });
});

// 对局记录
route('GET', '/api/admin/runs', async (req, res, params) => {
  if (!isAdmin(req)) return json(res, 401, { error: 'unauthorized' });
  const page = parseInt(params.get('page')) || 1;
  const filters = {
    class_id: params.get('class') || undefined,
    minWave: params.get('minWave') ? parseInt(params.get('minWave')) : undefined,
    minKills: params.get('minKills') ? parseInt(params.get('minKills')) : undefined,
  };
  json(res, 200, RunDB.list(page, 20, filters));
});

// 技能管理
route('GET', '/api/admin/skills', async (req, res) => {
  if (!isAdmin(req)) return json(res, 401, { error: 'unauthorized' });
  json(res, 200, { skills: SkillDB.getAll() });
});

route('GET', '/api/admin/skills/:id', async (req, res, params, pathParams) => {
  if (!isAdmin(req)) return json(res, 401, { error: 'unauthorized' });
  const skill = SkillDB.get(pathParams.id);
  json(res, skill ? 200 : 404, skill ? { skill } : { error: 'not found' });
});

route('POST', '/api/admin/skills', async (req, res) => {
  if (!isAdmin(req)) return json(res, 401, { error: 'unauthorized' });
  const body = await readBody(req);
  const { id, ...data } = body;
  if (!id) return json(res, 400, { error: 'missing skill id' });
  if (SkillDB.get(id)) return json(res, 409, { error: 'skill already exists' });
  json(res, 201, { skill: SkillDB.create(id, data) });
});

route('PUT', '/api/admin/skills/:id', async (req, res, params, pathParams) => {
  if (!isAdmin(req)) return json(res, 401, { error: 'unauthorized' });
  const body = await readBody(req);
  const skill = SkillDB.update(pathParams.id, body);
  json(res, skill ? 200 : 404, skill ? { skill } : { error: 'not found' });
});

route('DELETE', '/api/admin/skills/:id', async (req, res, params, pathParams) => {
  if (!isAdmin(req)) return json(res, 401, { error: 'unauthorized' });
  const ok = SkillDB.remove(pathParams.id);
  json(res, ok ? 200 : 404, { ok });
});

route('POST', '/api/admin/skills/:id/icon', async (req, res, params, pathParams) => {
  if (!isAdmin(req)) return json(res, 401, { error: 'unauthorized' });
  const body = await readBody(req);
  if (!body.iconData) return json(res, 400, { error: 'missing iconData (base64)' });
  const ok = SkillDB.setIcon(pathParams.id, body.iconData);
  json(res, ok ? 200 : 404, { ok });
});

// 游戏配置
route('GET', '/api/admin/config', async (req, res) => {
  if (!isAdmin(req)) return json(res, 401, { error: 'unauthorized' });
  json(res, 200, { config: ConfigDB.get() });
});

route('PUT', '/api/admin/config', async (req, res) => {
  if (!isAdmin(req)) return json(res, 401, { error: 'unauthorized' });
  const body = await readBody(req);
  json(res, 200, { config: ConfigDB.update(body) });
});

// 排行榜管理
route('GET', '/api/admin/leaderboard', async (req, res, params) => {
  if (!isAdmin(req)) return json(res, 401, { error: 'unauthorized' });
  const classId = params.get('class') || 'all';
  const type = params.get('type') || 'survival';
  json(res, 200, { leaderboard: LBDB.top(classId, type, 100) });
});

route('POST', '/api/admin/leaderboard/reset', async (req, res) => {
  if (!isAdmin(req)) return json(res, 401, { error: 'unauthorized' });
  const { classId, type } = await readBody(req);
  LBDB.reset(classId || 'all', type || 'survival');
  json(res, 200, { ok: true });
});

// 公告管理
route('GET', '/api/admin/announcements', async (req, res) => {
  if (!isAdmin(req)) return json(res, 401, { error: 'unauthorized' });
  json(res, 200, { announcements: AnnouncementDB.list() });
});

route('POST', '/api/admin/announcements', async (req, res) => {
  if (!isAdmin(req)) return json(res, 401, { error: 'unauthorized' });
  const body = await readBody(req);
  json(res, 201, { announcement: AnnouncementDB.create(body) });
});

route('PUT', '/api/admin/announcements/:id', async (req, res, params, pathParams) => {
  if (!isAdmin(req)) return json(res, 401, { error: 'unauthorized' });
  const body = await readBody(req);
  const a = AnnouncementDB.update(pathParams.id, body);
  json(res, a ? 200 : 404, a ? { announcement: a } : { error: 'not found' });
});

route('DELETE', '/api/admin/announcements/:id', async (req, res, params, pathParams) => {
  if (!isAdmin(req)) return json(res, 401, { error: 'unauthorized' });
  json(res, AnnouncementDB.remove(pathParams.id) ? 200 : 404, { ok: true });
});

// 怪物管理（通过 config.enemies 读写）
route('GET', '/api/admin/enemies', async (req, res) => {
  if (!isAdmin(req)) return json(res, 401, { error: 'unauthorized' });
  json(res, 200, { enemies: ConfigDB.get().enemies || {} });
});

route('POST', '/api/admin/enemies', async (req, res) => {
  if (!isAdmin(req)) return json(res, 401, { error: 'unauthorized' });
  const body = await readBody(req);
  const { id, ...data } = body;
  if (!id) return json(res, 400, { error: 'missing enemy id' });
  const cfg = ConfigDB.get();
  if (cfg.enemies && cfg.enemies[id]) return json(res, 409, { error: 'enemy already exists' });
  cfg.enemies = cfg.enemies || {};
  cfg.enemies[id] = data;
  ConfigDB.update({ enemies: cfg.enemies });
  json(res, 201, { enemy: data, id });
});

route('PUT', '/api/admin/enemies/:id', async (req, res, params, pathParams) => {
  if (!isAdmin(req)) return json(res, 401, { error: 'unauthorized' });
  const body = await readBody(req);
  const cfg = ConfigDB.get();
  if (!cfg.enemies || !cfg.enemies[pathParams.id]) return json(res, 404, { error: 'not found' });
  Object.assign(cfg.enemies[pathParams.id], body);
  ConfigDB.update({ enemies: cfg.enemies });
  json(res, 200, { enemy: cfg.enemies[pathParams.id] });
});

route('DELETE', '/api/admin/enemies/:id', async (req, res, params, pathParams) => {
  if (!isAdmin(req)) return json(res, 401, { error: 'unauthorized' });
  const cfg = ConfigDB.get();
  if (!cfg.enemies || !cfg.enemies[pathParams.id]) return json(res, 404, { error: 'not found' });
  delete cfg.enemies[pathParams.id];
  ConfigDB.update({ enemies: cfg.enemies });
  json(res, 200, { ok: true });
});

// ---------- 工具函数 ----------
function sanitize(p) {
  return {
    level: p.level, exp: p.exp, gold: p.gold, shards: p.shards,
    generalTalentPoints: p.generalTalentPoints, specialistTalentPoints: p.specialistTalentPoints,
    talents: p.talents, weapons: p.weapons, achievements: p.achievements, stats: p.stats,
  };
}

function mergeObj(server, local) {
  const s = server || {};
  const l = local || {};
  const out = { ...s };
  for (const [k, v] of Object.entries(l)) {
    if (typeof v === 'number' && typeof out[k] === 'number') out[k] = Math.max(out[k], v);
    else if (typeof v === 'object' && v !== null && !Array.isArray(v)) out[k] = { ...(out[k] || {}), ...v };
    else out[k] = v;
  }
  return out;
}

// ---------- 路由匹配（支持 :param） ----------
function matchRoute(method, pathname) {
  const key = `${method} ${pathname}`;
  if (routes[key]) return { handler: routes[key], pathParams: {} };
  // 尝试参数路由
  for (const [pattern, handler] of Object.entries(routes)) {
    const [m, p] = pattern.split(' ');
    if (m !== method) continue;
    const patternParts = p.split('/');
    const pathParts = pathname.split('/');
    if (patternParts.length !== pathParts.length) continue;
    const pathParams = {};
    let match = true;
    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) {
        pathParams[patternParts[i].slice(1)] = decodeURIComponent(pathParts[i]);
      } else if (patternParts[i] !== pathParts[i]) {
        match = false; break;
      }
    }
    if (match) return { handler, pathParams };
  }
  return null;
}

// ---------- 服务器 ----------
const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Token',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    });
    return res.end();
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  // 管理后台静态文件
  if (pathname === '/admin' || pathname === '/admin/') {
    return serveStatic(res, path.join(ADMIN_DIR, 'index.html'), 'text/html; charset=utf-8');
  }
  if (pathname.startsWith('/admin/')) {
    const file = pathname.slice(7);
    const ext = path.extname(file);
    const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.png': 'image/png', '.json': 'application/json' };
    return serveStatic(res, path.join(ADMIN_DIR, file), types[ext] || 'application/octet-stream');
  }

  // API 路由
  const matched = matchRoute(req.method, pathname);
  if (matched) {
    try {
      await matched.handler(req, res, url.searchParams, matched.pathParams);
    } catch (e) {
      console.error('[server] error:', e);
      json(res, 500, { error: 'internal error' });
    }
    return;
  }

  json(res, 404, { error: 'not found', path: pathname });
});

server.listen(PORT, () => {
  console.log(`[rg-h5-server] listening on :${PORT}`);
  console.log(`[rg-h5-server] admin panel: http://localhost:${PORT}/admin/`);
  console.log(`[rg-h5-server] default admin password: rg-admin-2026`);
});
