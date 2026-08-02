// 《无尽入侵》H5 服务端：玩家 API + 管理后台（零依赖）
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { PlayerDB, RunDB, LBDB, SkillDB, ConfigDB, AnnouncementDB, AdminAuth, StatsDB } = require('./db');
const { safeJoin, relFromPathname } = require('./safe-path');
const { manageChatContext } = require('./chat-context');

const PORT = process.env.PORT || 3000;
// 本地 Ollama（管理端 AI 助手）
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'richardyoung/qwythos-9b-abliterated:IQ4_XS';
const OLLAMA_TIMEOUT_MS = parseInt(process.env.OLLAMA_TIMEOUT_MS || '300000', 10);
const OLLAMA_NUM_CTX = parseInt(process.env.OLLAMA_NUM_CTX || '64000', 10);
// 对话上下文水位：估算占用达到该比例时自动清理早期消息，避免触发 Ollama 超上下文报错
const OLLAMA_CTX_RESET_RATIO = parseFloat(process.env.OLLAMA_CTX_RESET_RATIO || '0.7', 10);

// 查询模型实际上下文上限（按模型 clamp，避免小上下文模型直接报错）
let _ollamaTagsCache = { ts: 0, models: [] };
async function getModelNumCtx(model) {
  const now = Date.now();
  if (now - _ollamaTagsCache.ts > 10000) {
    try {
      const r = await fetch(OLLAMA_URL + '/api/tags', { signal: AbortSignal.timeout(5000) });
      const j = await r.json();
      _ollamaTagsCache = { ts: now, models: j.models || [] };
    } catch {}
  }
  const m = _ollamaTagsCache.models.find(x => x.name === model);
  const ctx = m && m.details && m.details.context_length ? m.details.context_length : OLLAMA_NUM_CTX;
  return Math.min(OLLAMA_NUM_CTX, ctx);
}
const ADMIN_DIR = path.join(__dirname, 'admin');
// 游戏根目录（server 的上一级），用于直接伺服游戏本体（index.html / js / assets）
const GAME_ROOT = path.join(__dirname, '..');
const GAME_TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav',
};

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
  return new Promise((resolve, reject) => {
    let body = '';
    let tooLarge = false;
    req.on('data', c => {
      if (tooLarge) return;
      body += c;
      if (body.length > 1048576) {
        tooLarge = true;
        const err = new Error('payload too large');
        err.statusCode = 413;
        reject(err);
      }
    });
    req.on('error', reject);
    req.on('end', () => {
      if (tooLarge) return;
      try { resolve(JSON.parse(body || '{}')); } catch { resolve({}); }
    });
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

// 计算图片资源内容哈希（图片内容变 → 哈希变 → 客户端换 URL 重新下载；不变则走缓存）
function computeAssetVer() {
  const dir = path.join(GAME_ROOT, 'assets');
  const items = [];
  (function walk(d) {
    let entries;
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const fp = path.join(d, e.name);
      if (e.isDirectory()) walk(fp);
      else { try { const s = fs.statSync(fp); items.push(fp + ':' + s.size + ':' + s.mtimeMs); } catch {} }
    }
  })(dir);
  items.sort();
  return crypto.createHash('md5').update(items.join('|')).digest('hex').slice(0, 12);
}
let _assetVerCache = { ver: '', ts: 0 };
function getAssetVer() {
  const now = Date.now();
  if (now - _assetVerCache.ts > 5000) { _assetVerCache = { ver: computeAssetVer(), ts: now }; }
  return _assetVerCache.ver;
}

// 计算 JS 代码内容指纹（js/ 目录文件名+大小+mtime）：代码变 → 指纹变 → 客户端换 URL 重新下载
function computeCodeVer() {
  const dir = path.join(GAME_ROOT, 'js');
  const items = [];
  let entries;
  try { entries = fs.readdirSync(dir); } catch { return 'dev'; }
  for (const f of entries) {
    if (!f.endsWith('.js')) continue;
    try { const s = fs.statSync(path.join(dir, f)); items.push(f + ':' + s.size + ':' + s.mtimeMs); } catch {}
  }
  items.sort();
  return crypto.createHash('md5').update(items.join('|')).digest('hex').slice(0, 10);
}
let _codeVerCache = { ver: '', ts: 0 };
function getCodeVer() {
  const now = Date.now();
  if (now - _codeVerCache.ts > 5000) { _codeVerCache = { ver: computeCodeVer(), ts: now }; }
  return _codeVerCache.ver;
}

// 管理端资源版本指纹（index.html/app.js/style.css）：内容变 → 指纹变 → HTML 引用新 URL，旧缓存天然失效
function computeAdminVer() {
  const items = [];
  for (const f of ['index.html', 'app.js', 'style.css']) {
    try { const s = fs.statSync(path.join(ADMIN_DIR, f)); items.push(f + ':' + s.size + ':' + s.mtimeMs); } catch {}
  }
  items.sort();
  return crypto.createHash('md5').update(items.join('|')).digest('hex').slice(0, 10);
}
let _adminVerCache = { ver: '', ts: 0 };
function getAdminVer() {
  const now = Date.now();
  if (now - _adminVerCache.ts > 5000) { _adminVerCache = { ver: computeAdminVer(), ts: now }; }
  return _adminVerCache.ver;
}

// ---------- 管理端 AI 助手：知识库 ----------
// 缓存客户端纯数据脚本（config.js / craft.js）的 vm 求值结果，内容变化自动失效
const _clientEvalCache = {};
function evalClientFile(relPath, expr) {
  const filePath = path.join(GAME_ROOT, relPath);
  let src;
  try { src = fs.readFileSync(filePath, 'utf8'); } catch { return null; }
  const cached = _clientEvalCache[relPath];
  if (cached && cached.src === src) return cached.value;
  try {
    const ctx = vm.createContext({ console });
    vm.runInContext(src, ctx, { filename: relPath });
    const value = JSON.parse(JSON.stringify(vm.runInContext(expr, ctx)));
    _clientEvalCache[relPath] = { src, value };
    return value;
  } catch (e) {
    console.error('[chat] eval client file failed:', relPath, e.message);
    return null;
  }
}

function buildKnowledgeBase() {
  const cfg = ConfigDB.get();
  const skills = SkillDB.getAll();
  const parts = [];
  parts.push('【当前游戏配置 v' + (cfg.version || 1) + '】\n' + JSON.stringify(cfg));
  const enemies = currentEnemies();
  parts.push('【怪物定义（' + Object.keys(enemies).length + ' 个）】\n' + JSON.stringify(enemies));
  const skillLines = [];
  for (const [id, s] of Object.entries(skills || {})) {
    skillLines.push(JSON.stringify({ id, name: s.name, flow: s.flow, behavior: s.behavior, desc: s.desc, tags: s.tags, projectile: s.projectile, levels: s.levels }));
  }
  parts.push('【技能定义（' + skillLines.length + ' 个）】\n' + skillLines.join('\n'));
  const cc = evalClientFile('js/config.js', 'CONFIG');
  if (cc) {
    if (cc.classes) parts.push('【职业】\n' + JSON.stringify(cc.classes));
    if (cc.actives) parts.push('【职业主动技】\n' + JSON.stringify(cc.actives));
    if (cc.evolutions) parts.push('【技能进化】\n' + JSON.stringify(cc.evolutions));
    if (cc.statCards) parts.push('【升级属性卡】\n' + JSON.stringify(cc.statCards));
    if (cc.goblinRewards) parts.push('【哥布林奖励】\n' + JSON.stringify(cc.goblinRewards));
  }
  const weapons = evalClientFile('js/craft.js', 'WEAPONS');
  if (weapons) parts.push('【武器（合成与效果）】\n' + JSON.stringify(weapons));
  return parts.join('\n\n');
}

// ---------- 代码知识库（按问题自动检索） ----------
// 全量代码远超模型上下文，因此维护文件索引 + 命中行窗口提取，只把相关文件/片段注入提示词
function listCodeFiles() {
  const files = [];
  const add = (rel) => {
    try {
      const abs = path.join(GAME_ROOT, rel);
      const st = fs.statSync(abs);
      if (st.isFile()) files.push({ rel, abs, size: st.size, mtimeMs: st.mtimeMs });
    } catch {}
  };
  for (const f of fs.readdirSync(path.join(GAME_ROOT, 'js'))) if (f.endsWith('.js')) add('js/' + f);
  for (const f of fs.readdirSync(path.join(GAME_ROOT, 'server'))) if (f.endsWith('.js')) add('server/' + f);
  for (const f of fs.readdirSync(path.join(GAME_ROOT, 'server', 'admin'))) if (f.endsWith('.js')) add('server/admin/' + f);
  for (const f of fs.readdirSync(path.join(GAME_ROOT, 'tools'))) if (f.endsWith('.sh')) add('tools/' + f);
  add('index.html');
  return files;
}

let _codeKbCache = { sig: '', files: [] };
function getCodeFiles() {
  const listed = listCodeFiles();
  const sig = listed.map(f => f.rel + ':' + f.size + ':' + f.mtimeMs).join('|');
  if (_codeKbCache.sig === sig) return _codeKbCache.files;
  for (const f of listed) { try { f.content = fs.readFileSync(f.abs, 'utf8'); } catch { f.content = ''; } }
  _codeKbCache = { sig, files: listed };
  return listed;
}

// 问题分词：英文标识符 + 中文双字词（过滤常见虚词）
function kbTokens(question) {
  const s = String(question || '').toLowerCase();
  const tokens = new Set();
  for (const m of s.matchAll(/[a-z_][a-z0-9_]{2,}/g)) tokens.add(m[0]);
  const cjk = s.replace(/[^\u4e00-\u9fff]/g, ' ');
  for (let i = 0; i < cjk.length - 1; i++) {
    const a = cjk[i], b = cjk[i + 1];
    if (a !== ' ' && b !== ' ') tokens.add(a + b);
  }
  for (const w of ['怎么', '什么', '可以', '一下', '这个', '那个', '然后', '还是', '请问', '当前', '现在', '为什么']) tokens.delete(w);
  return [...tokens].slice(0, 40);
}

// 大文件只取命中行附近 ±8 行的窗口，小文件整段返回
function excerptCodeFile(f, tokens, budget) {
  if (f.content.length <= 15000) return f.content;
  const lines = f.content.split('\n');
  const hit = new Set();
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i].toLowerCase();
    if (tokens.some(t => ln.includes(t))) {
      for (let j = Math.max(0, i - 8); j <= Math.min(lines.length - 1, i + 8); j++) hit.add(j);
    }
  }
  if (!hit.size) return null;
  const sorted = [...hit].sort((a, b) => a - b);
  const ranges = [];
  let start = sorted[0], prev = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - prev <= 17) prev = sorted[i];
    else { ranges.push([start, prev]); start = prev = sorted[i]; }
  }
  ranges.push([start, prev]);
  let out = '';
  for (const [a, b] of ranges) {
    if (out.length >= budget) break;
    out += lines.slice(a, b + 1).join('\n') + '\n';
  }
  return out;
}

function retrieveCodeKB(question) {
  const tokens = kbTokens(question);
  const files = getCodeFiles();
  const scored = [];
  for (const f of files) {
    const lower = f.content.toLowerCase();
    let score = 0;
    for (const t of tokens) {
      let cnt = 0, i = -1;
      while ((i = lower.indexOf(t, i + 1)) !== -1 && cnt < 10) cnt++;
      if (cnt > 0) score += Math.min(4, cnt);
    }
    if (score > 0) scored.push({ f, score });
  }
  scored.sort((a, b) => b.score - a.score || a.f.size - b.f.size);
  const MAX = parseInt(process.env.OLLAMA_CODE_KB_CHARS || '22000', 10);
  const parts = [];
  let used = 0;
  for (const { f } of scored) {
    if (used >= MAX) break;
    const ex = excerptCodeFile(f, tokens, MAX - used);
    if (!ex) continue;
    parts.push('// ===== ' + f.rel + ' =====\n' + ex);
    used += ex.length + f.rel.length + 20;
  }
  return parts;
}

// 怪物数据：服务端 config.enemies 优先，缺失时回退客户端内置定义（线上 config 可能为空对象）
function currentEnemies() {
  const cfgEnemies = (ConfigDB.get().enemies || {});
  const cc = evalClientFile('js/config.js', 'CONFIG');
  const clientEnemies = (cc && cc.enemies) || {};
  return Object.assign({}, clientEnemies, cfgEnemies);
}

function buildChatSystemPrompt() {
  const kb = buildKnowledgeBase();
  const codeParts = retrieveCodeKB(lastChatQuestion());
  const codeMap = getCodeFiles().map(f => f.rel + ' (' + f.content.split('\n').length + ' 行)').join('\n');
  return [
    '你是《无尽入侵》H5 游戏管理后台的「AI 配置助手」，面向不会写代码的运营/管理小白。',
    '下面是当前游戏的知识库（配置、技能、职业、进化、武器等），回答管理者的问题时：',
    '- 用简体中文，直接、简洁、友好；',
    '- 引用具体配置路径和当前值（如 waves.baseInterval = 1.5、player.hp = 120）；',
    '- 给修改建议时给出具体改法和预期影响，但不要直接修改配置（管理员在「游戏配置」页面手动保存）；',
    '- 数据一律以知识库为准，知识库没有的信息明确说「知识库里没有」，不要编造数值；',
    '- 可以解释字段含义（如 HP%/波 = 每波血量百分比成长）。',
    '- 注意数值方向：waves.baseInterval 越小刷怪越频繁（更难）；waves.waveTime 越大每波越长（更轻松）；waves.eliteFirstTime / waves.goblinFirst 越大精英/哥布林越晚出现（更轻松）；waves.batchBase 越大每批怪越多（更难）。给建议时先确认方向再给数值。',
    '- 如果管理者问的是代码实现（某功能在哪实现、怎么改代码、数据怎么流转），优先用下面的【代码知识库】回答，并明确指出文件路径；',
    '- 代码知识库是按问题自动检索的片段，回答文件位置时只引用片段中真实出现的文件和代码，不确定就说明不确定，不要编造代码、函数名或行号。',
    '',
    '【知识库】',
    kb,
    '',
    '【代码文件索引】',
    codeMap,
    '',
    '【本次问题检索到的相关代码】',
    codeParts.length ? codeParts.join('\n\n') : '（未命中代码片段；可换更具体的问法，例如提到功能名或文件）',
  ].join('\n');
}

let _lastChatQuestion = '';
function lastChatQuestion() { return _lastChatQuestion; }

// 伺服静态文件，支持缓存头 + ETag（If-None-Match 命中返回 304，不重复下载）
function serveStatic(req, res, filePath, contentType, cacheControl) {
  let stat, data;
  try { stat = fs.statSync(filePath); data = fs.readFileSync(filePath); } catch { res.writeHead(404); return res.end('Not Found'); }
  // stat 指纹（size+mtime）代替整文件 MD5：同内容同 ETag，避免大图每请求全量哈希
  const etag = '"' + stat.size + '-' + Math.floor(stat.mtimeMs) + '"';
  const headers = { 'Content-Type': contentType, 'Access-Control-Allow-Origin': '*', 'ETag': etag };
  if (cacheControl) headers['Cache-Control'] = cacheControl;
  if (req.headers['if-none-match'] === etag) { res.writeHead(304, headers); return res.end(); }
  res.writeHead(200, headers);
  res.end(data);
}

// 伺服游戏本体静态文件（带路径穿越防护 + 缓存策略）
function serveGame(req, res, pathname) {
  const rel = relFromPathname(pathname);
  if (rel === null) { res.writeHead(400); return res.end('Bad Request'); }
  const filePath = safeJoin(GAME_ROOT, rel);
  if (!filePath) { res.writeHead(403); return res.end('Forbidden'); }
  const ext = path.extname(filePath).toLowerCase();
  const type = GAME_TYPES[ext] || 'application/octet-stream';
  // 图片资源：URL 带 av=ASSET_VER（内容哈希），内容变才换 URL，故可长缓存 immutable
  if (rel.startsWith('assets/')) return serveStatic(req, res, filePath, type, 'public, max-age=31536000, immutable');
  // JS：URL 带 v=GAME_VERSION（代码版本），版本不变则走缓存，故长缓存 immutable
  if (rel.startsWith('js/')) return serveStatic(req, res, filePath, type, 'public, max-age=31536000, immutable');
  // 其余（docs/tools）：短缓存
  return serveStatic(req, res, filePath, type, 'public, max-age=300');
}

// ---------- 路由 ----------
const routes = {};

function route(method, path, handler) { routes[`${method} ${path}`] = handler; }

// ===== 玩家 API =====

async function handleAuth(req, res) {
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
  const token = crypto.randomUUID();
  json(res, 200, { token, playerId, player: sanitize(player) });
}

// 主路径 + 兼容旧客户端曾使用的 /api/auth/login（此前路径不一致导致登录/上报全部失败）
route('POST', '/api/auth', handleAuth);
route('POST', '/api/auth/login', handleAuth);

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
  const { playerId, class_id, wave, time_seconds, kills, evolutions, level, skills, talents, weapon, weapon_effect, weapons, final_hp, max_hp, flow, exp_earned, gold_earned, shards_earned } = body;
  if (!playerId || !class_id) return json(res, 400, { error: 'missing fields' });
  // 职业白名单：防止非法/未知 class_id 污染对局记录与排行榜
  const CLASS_IDS = ['taoist', 'samurai', 'pharaoh', 'ice_witch', 'crusader'];
  if (!CLASS_IDS.includes(class_id)) return json(res, 422, { error: 'invalid class', class_id });
  for (const [k, v] of Object.entries({ wave, time_seconds, kills, evolutions })) {
    if (typeof v !== 'number' || !isFinite(v) || v < 0) return json(res, 422, { error: 'invalid data', field: k });
  }
  if (kills < 0 || time_seconds < 0 || wave < 0) return json(res, 422, { error: 'invalid data' });
  if (time_seconds > 0 && kills / time_seconds > 50) return json(res, 422, { error: 'suspicious data' });
  RunDB.add({
    player_id: playerId, class_id, wave, time_seconds, kills, evolutions: evolutions || 0,
    level: level || 1,
    skills: skills || [], talents: talents || {}, weapon: weapon || '', weapon_effect: weapon_effect || '',
    weapons: weapons || [], final_hp: final_hp, max_hp: max_hp,
    flow: flow || '', exp_earned: exp_earned || 0, gold_earned: gold_earned || 0, shards_earned: shards_earned || 0,
  });
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

// ===== 管理端 AI 助手（本地 Ollama） =====

route('GET', '/api/admin/chat/models', async (req, res) => {
  if (!isAdmin(req)) return json(res, 401, { error: 'unauthorized' });
  let tags;
  try {
    const r = await fetch(OLLAMA_URL + '/api/tags', { signal: AbortSignal.timeout(5000) });
    tags = await r.json();
  } catch (e) {
    return json(res, 502, { error: '无法连接本地 Ollama（' + OLLAMA_URL + '），请确认 Ollama 已启动：' + e.message });
  }
  const models = (tags.models || [])
    .filter(m => m.capabilities && m.capabilities.includes('completion'))
    .map(m => m.name);
  const cfg = ConfigDB.get();
  const skillCount = Object.keys(SkillDB.getAll() || {}).length;
  const enemyCount = Object.keys(currentEnemies()).length;
  const codeFiles = getCodeFiles().length;
  json(res, 200, {
    models,
    defaultModel: OLLAMA_MODEL,
    numCtx: OLLAMA_NUM_CTX,
    resetRatio: OLLAMA_CTX_RESET_RATIO,
    knowledge: { configVersion: cfg.version || 1, skillCount, enemyCount, codeFiles },
  });
});

route('POST', '/api/admin/chat', async (req, res) => {
  if (!isAdmin(req)) return json(res, 401, { error: 'unauthorized' });
  const body = await readBody(req);
  const { model, messages } = body;
  if (!model || !Array.isArray(messages) || !messages.length) return json(res, 400, { error: 'missing model/messages' });
  let history = messages
    .slice(-20)
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .map(m => ({ role: m.role, content: m.content.trim().slice(0, 8000) }));
  if (!history.length) return json(res, 400, { error: 'empty messages' });
  // 记录最近一问，供代码知识库按问题检索
  const lastUserMsg = [...history].reverse().find(m => m.role === 'user');
  _lastChatQuestion = lastUserMsg ? lastUserMsg.content : '';

  // ---------- 上下文水位管理：接近阈值自动清理早期对话 ----------
  const systemPrompt = buildChatSystemPrompt();
  const numCtx = await getModelNumCtx(model);
  const managed = manageChatContext(systemPrompt, history, numCtx, OLLAMA_CTX_RESET_RATIO);
  history = managed.history;
  const contextReset = managed.contextReset;

  const payload = {
    model,
    stream: true,
    messages: [{ role: 'system', content: systemPrompt }, ...history],
    // 模型默认上下文只有 8k，知识库加入代码后会超限；显式扩到模型支持的上限（默认 64k）
    options: { temperature: 0.7, num_ctx: numCtx },
  };

  let ollama;
  try {
    ollama = await fetch(OLLAMA_URL + '/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(OLLAMA_TIMEOUT_MS),
    });
  } catch (e) {
    return json(res, 502, { error: 'Ollama 调用失败（' + OLLAMA_URL + '）：' + e.message + '。请确认 Ollama 已启动且模型 ' + model + ' 已拉取。' });
  }
  if (!ollama.ok || !ollama.body) {
    const txt = await ollama.text().catch(() => '');
    return json(res, 502, { error: 'Ollama 返回错误 ' + ollama.status + '：' + txt.slice(0, 200) });
  }

  // SSE 流式转发给管理端
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache',
    'X-Accel-Buffering': 'no',
  });
  if (contextReset) {
    res.write('data: ' + JSON.stringify({ notice: '⚠️ 对话接近上下文上限，已自动清理较早内容；本次回答后开始新对话。' }) + '\n\n');
  }
  const reader = ollama.body.getReader();
  const dec = new TextDecoder();
  let buffer = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += dec.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        const t = line.trim();
        if (!t.startsWith('{')) continue;
        try {
          const j = JSON.parse(t);
          if (j.error) { res.write('data: ' + JSON.stringify({ error: j.error }) + '\n\n'); continue; }
          const msg = j.message || {};
          // 思考模型：thinking = 思考过程，content = 最终回答，两者都要转发给前端展示
          const thinking = msg.thinking;
          const delta = msg.content;
          if (thinking) res.write('data: ' + JSON.stringify({ thinking }) + '\n\n');
          if (delta) res.write('data: ' + JSON.stringify({ delta }) + '\n\n');
        } catch {}
      }
    }
  } catch (e) {
    console.error('[chat] stream error:', e.message);
  }
  res.write('data: [DONE]\n\n');
  res.end();
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

// 配置 schema（供 admin schema 驱动渲染 + 校验）
route('GET', '/api/admin/config/schema', async (req, res) => {
  if (!isAdmin(req)) return json(res, 401, { error: 'unauthorized' });
  const schema = require('./admin/config-schema.js');
  json(res, 200, { schema: schema.CONFIG_SCHEMA, crossFieldRules: schema.CROSS_FIELD_RULES });
});

route('PUT', '/api/admin/config', async (req, res) => {
  if (!isAdmin(req)) return json(res, 401, { error: 'unauthorized' });
  const body = await readBody(req);
  // 服务端严格校验：未知键拒绝 + 类型/范围/跨字段校验
  const schema = require('./admin/config-schema.js');
  const errors = schema.validateConfig(body, { strictUnknownKeys: true });
  if (errors.length) return json(res, 422, { error: 'validation failed', errors });
  json(res, 200, { config: ConfigDB.update(body) });
});

// 配置版本历史
route('GET', '/api/admin/config/history', async (req, res) => {
  if (!isAdmin(req)) return json(res, 401, { error: 'unauthorized' });
  json(res, 200, { history: ConfigDB.history() });
});

// 回滚到指定版本（version 继续 +1，绝不回退版本号）
route('POST', '/api/admin/config/rollback', async (req, res) => {
  if (!isAdmin(req)) return json(res, 401, { error: 'unauthorized' });
  const body = await readBody(req);
  const result = ConfigDB.rollback(body.version);
  if (!result) return json(res, 404, { error: 'version not found' });
  json(res, 200, { config: result });
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
  const schema = require('./admin/config-schema.js');
  const errors = schema.validateEnemy(data);
  if (errors.length) return json(res, 422, { error: 'validation failed', errors });
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
  const schema = require('./admin/config-schema.js');
  const errors = schema.validateEnemy(body);
  if (errors.length) return json(res, 422, { error: 'validation failed', errors });
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
    // 注入资源版本查询串：app.js/style.css 曾因无缓存头被浏览器/Cloudflare 缓存旧版，
    // 导致新 HTML + 旧 JS（AdminApp.toggleChat is not a function）；版本化 URL 彻底绕开旧缓存
    let html;
    try { html = fs.readFileSync(path.join(ADMIN_DIR, 'index.html'), 'utf8'); }
    catch { res.writeHead(404); return res.end('Not Found'); }
    const v = getAdminVer();
    html = html
      .replace('"/admin/app.js"', '"/admin/app.js?v=' + v + '"')
      .replace('"/admin/style.css"', '"/admin/style.css?v=' + v + '"');
    const etag = '"' + crypto.createHash('md5').update(html).digest('hex') + '"';
    const headers = { 'Content-Type': 'text/html; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-cache', 'ETag': etag };
    if (req.headers['if-none-match'] === etag) { res.writeHead(304, headers); return res.end(); }
    res.writeHead(200, headers);
    return res.end(html);
  }
  if (pathname.startsWith('/admin/')) {
    const file = pathname.slice(7);
    const filePath = safeJoin(ADMIN_DIR, file);
    if (!filePath) { res.writeHead(403); return res.end('Forbidden'); }
    const ext = path.extname(file);
    const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.png': 'image/png', '.json': 'application/json' };
    return serveStatic(req, res, filePath, types[ext] || 'application/octet-stream', 'no-cache');
  }

  // 游戏本体静态文件（index.html / js / assets / docs / tools）
  // 使 node server/index.js 成为完整部署：游戏 + API + 管理后台同源，远程访问不再依赖额外静态服务器
  if (pathname === '/' || pathname === '/index.html') {
    // index.html 注入当前 ASSET_VER + GAME_VERSION，no-cache 保证每次拿到最新版本号与资源哈希（ETag 命中则 304）
    let html;
    try { html = fs.readFileSync(path.join(GAME_ROOT, 'index.html'), 'utf8'); }
    catch { res.writeHead(404); return res.end('Not Found'); }
    html = html.replace(/__ASSET_VER__/g, getAssetVer()).replace(/__GAME_VERSION__/g, getCodeVer());
    const etag = '"' + crypto.createHash('md5').update(html).digest('hex') + '"';
    const headers = { 'Content-Type': 'text/html; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-cache', 'ETag': etag };
    if (req.headers['if-none-match'] === etag) { res.writeHead(304, headers); return res.end(); }
    res.writeHead(200, headers);
    return res.end(html);
  }
  if (pathname.startsWith('/js/') || pathname.startsWith('/assets/') || pathname.startsWith('/docs/') || pathname.startsWith('/tools/')) {
    return serveGame(req, res, pathname);
  }

  // API 路由
  const matched = matchRoute(req.method, pathname);
  if (matched) {
    try {
      await matched.handler(req, res, url.searchParams, matched.pathParams);
    } catch (e) {
      console.error('[server] error:', e);
      if (res.writableEnded || res.destroyed) return;
      json(res, e && e.statusCode ? e.statusCode : 500, { error: e && e.statusCode ? e.message : 'internal error' });
      // 413 场景：请求体还在上传，等响应发完再断开连接，避免客户端收到空回复
      if (e && e.statusCode === 413) res.once('finish', () => req.destroy());
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
