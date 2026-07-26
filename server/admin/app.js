// 无尽入侵 · 管理后台逻辑
const AdminApp = {
  token: localStorage.getItem('admin_token') || '',
  currentPage: 'dashboard',
  editingSkillId: null,
  editingAnnId: null,
  skillIconData: null,

  // ---------- API ----------
  async api(method, path, body) {
    const opts = { method, headers: { 'Content-Type': 'application/json', 'X-Admin-Token': this.token } };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(path, opts);
    if (res.status === 401) { this.showLogin(); throw new Error('unauthorized'); }
    return res.json();
  },

  // ---------- 登录 ----------
  async login() {
    const pass = document.getElementById('login-pass').value;
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pass }),
      });
      const data = await res.json();
      if (data.token) {
        this.token = data.token;
        localStorage.setItem('admin_token', data.token);
        this.showMain();
      } else {
        document.getElementById('login-err').textContent = '密码错误';
      }
    } catch (e) {
      document.getElementById('login-err').textContent = '连接失败：' + e.message;
    }
  },

  logout() {
    this.api('POST', '/api/admin/logout').catch(() => {});
    this.token = '';
    localStorage.removeItem('admin_token');
    this.showLogin();
  },

  showLogin() {
    document.getElementById('login-page').style.display = 'flex';
    document.getElementById('main-app').style.display = 'none';
  },

  showMain() {
    document.getElementById('login-page').style.display = 'none';
    document.getElementById('main-app').style.display = 'flex';
    this.nav('dashboard');
  },

  // ---------- 导航 ----------
  nav(page) {
    this.currentPage = page;
    document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.page === page));
    document.querySelectorAll('.page').forEach(el => el.classList.toggle('active', el.id === 'page-' + page));
    const loaders = { dashboard: () => this.loadDashboard(), players: () => this.loadPlayers(), runs: () => this.loadRuns(), skills: () => this.loadSkills(), config: () => this.loadConfig(), leaderboard: () => this.loadLeaderboard(), announcements: () => this.loadAnnouncements(), enemies: () => this.loadEnemies() };
    if (loaders[page]) loaders[page]();
  },

  // ---------- 仪表盘 ----------
  async loadDashboard() {
    try {
      const s = await this.api('GET', '/api/admin/stats');
      const grid = document.getElementById('stats-grid');
      grid.innerHTML = [
        ['总玩家', s.totalPlayers], ['总局数', s.totalRuns], ['今日局数', s.todayRuns],
        ['平均存活', s.avgSurvival + 's'], ['平均击杀', s.avgKills], ['封禁数', s.bannedCount],
      ].map(([label, value]) => `<div class="stat-card"><div class="stat-value">${value}</div><div class="stat-label">${label}</div></div>`).join('');
      const dist = document.getElementById('class-dist');
      const names = { taoist: '道士', samurai: '武士', pharaoh: '法老', ice_witch: '寒冰女巫', crusader: '十字军' };
      dist.innerHTML = Object.entries(s.classDistribution || {}).map(([k, v]) => `<div class="class-bar"><div class="cb-name">${names[k] || k}</div><div class="cb-count">${v}</div></div>`).join('') || '<p style="color:rgba(200,200,210,0.4)">暂无数据</p>';
    } catch (e) { console.error(e); }
  },

  // ---------- 玩家管理 ----------
  playersPage: 1,
  async loadPlayers(page) {
    this.playersPage = page || 1;
    const search = document.getElementById('player-search').value;
    try {
      const data = await this.api('GET', `/api/admin/players?page=${this.playersPage}&search=${encodeURIComponent(search)}`);
      const tbody = document.getElementById('players-body');
      tbody.innerHTML = data.items.map(p => `<tr>
        <td title="${p.id}">${p.id.slice(0, 12)}…</td>
        <td><span class="tag tag-blue">${p.platform}</span></td>
        <td>Lv.${p.level}</td><td>${p.exp || 0}</td><td>${p.gold}</td><td>${p.shards || 0}</td>
        <td>${p.generalTalentPoints || 0}</td><td>${p.specialistTalentPoints || 0}</td>
        <td>${(p.stats || {}).runs || 0}</td><td>${(p.stats || {}).kills || 0}</td>
        <td>${p.banned ? '<span class="tag tag-red">封禁</span>' : '<span class="tag tag-green">正常</span>'}</td>
        <td>${(p.updated_at || '').slice(0, 16).replace('T', ' ')}</td>
        <td>
          <button class="btn-sm" onclick="AdminApp.viewPlayer('${p.id}')">详情</button>
          ${p.banned ? `<button class="btn-sm" onclick="AdminApp.unbanPlayer('${p.id}')">解封</button>` : `<button class="btn-sm btn-danger" onclick="AdminApp.banPlayer('${p.id}')">封禁</button>`}
        </td>
      </tr>`).join('');
      this.renderPagination('players-pagination', data.total, data.page, data.size, p => this.loadPlayers(p));
    } catch (e) { console.error(e); }
  },

  async viewPlayer(id) {
    try {
      const { player: p } = await this.api('GET', `/api/admin/players/${encodeURIComponent(id)}`);
      const c = document.getElementById('player-detail-content');
      c.innerHTML = `
        <div class="detail-grid">
          <div class="detail-item"><div class="di-label">玩家 ID</div><div class="di-value" style="font-size:13px;word-break:break-all">${p.id}</div></div>
          <div class="detail-item"><div class="di-label">平台</div><div class="di-value">${p.platform}</div></div>
          <div class="detail-item"><div class="di-label">等级 / 经验</div><div class="di-value">Lv.${p.level} / ${p.exp}</div></div>
          <div class="detail-item"><div class="di-label">金币 / 碎片</div><div class="di-value">${p.gold} / ${p.shards || 0}</div></div>
          <div class="detail-item"><div class="di-label">通用天赋点</div><div class="di-value">${p.generalTalentPoints || 0}</div></div>
          <div class="detail-item"><div class="di-label">专精天赋点</div><div class="di-value">${p.specialistTalentPoints || 0}</div></div>
          <div class="detail-item"><div class="di-label">总局数 / 总击杀</div><div class="di-value">${(p.stats||{}).runs||0} / ${(p.stats||{}).kills||0}</div></div>
          <div class="detail-item"><div class="di-label">最长存活 / 最高击杀</div><div class="di-value">${(p.stats||{}).bestTime||0}s / ${(p.stats||{}).bestKills||0}</div></div>
          <div class="detail-item detail-full"><div class="di-label">已点亮天赋</div><div class="detail-json">${JSON.stringify(p.talents || {}, null, 2)}</div></div>
          <div class="detail-item detail-full"><div class="di-label">武器</div><div class="detail-json">${JSON.stringify(p.weapons || {}, null, 2)}</div></div>
          <div class="detail-item detail-full"><div class="di-label">成就 (${(p.achievements||[]).length})</div><div class="detail-json">${(p.achievements||[]).join(', ') || '无'}</div></div>
        </div>`;
      document.getElementById('player-detail-modal').style.display = 'flex';
    } catch (e) { console.error(e); }
  },

  async banPlayer(id) { if (confirm('确认封禁该玩家？')) { await this.api('POST', `/api/admin/players/${encodeURIComponent(id)}/ban`); this.loadPlayers(this.playersPage); } },
  async unbanPlayer(id) { await this.api('POST', `/api/admin/players/${encodeURIComponent(id)}/unban`); this.loadPlayers(this.playersPage); },

  // ---------- 对局记录 ----------
  runsPage: 1,
  async loadRuns(page) {
    this.runsPage = page || 1;
    const cls = document.getElementById('run-class-filter').value;
    const minWave = document.getElementById('run-min-wave').value;
    const minKills = document.getElementById('run-min-kills').value;
    let url = `/api/admin/runs?page=${this.runsPage}`;
    if (cls) url += `&class=${cls}`;
    if (minWave) url += `&minWave=${minWave}`;
    if (minKills) url += `&minKills=${minKills}`;
    try {
      const data = await this.api('GET', url);
      const names = { taoist: '道士', samurai: '武士', pharaoh: '法老', ice_witch: '寒冰女巫', crusader: '十字军' };
      document.getElementById('runs-body').innerHTML = data.items.map(r => `<tr>
        <td>${r.id}</td><td title="${r.player_id}">${(r.player_id||'').slice(0,10)}…</td>
        <td>${names[r.class_id] || r.class_id}</td><td>第${r.wave}波</td>
        <td>${r.time_seconds}s</td><td>${r.kills}</td><td>${r.evolutions||0}</td>
        <td><span class="tag tag-gold">${r.flow || '-'}</span></td>
        <td>${r.exp_earned||0}</td><td>${r.gold_earned||0}</td><td>${r.shards_earned||0}</td>
        <td>${(r.created_at||'').slice(0,16).replace('T',' ')}</td>
      </tr>`).join('');
      this.renderPagination('runs-pagination', data.total, data.page, data.size, p => this.loadRuns(p));
    } catch (e) { console.error(e); }
  },

  // ---------- 技能管理 ----------
  async loadSkills() {
    try {
      const { skills } = await this.api('GET', '/api/admin/skills');
      const tbody = document.getElementById('skills-body');
      tbody.innerHTML = Object.entries(skills).map(([id, s]) => `<tr>
        <td>${s.iconData ? `<img src="${s.iconData}" class="skill-icon">` : (s.icon ? `<span class="tag tag-gold">${s.icon.split('/').pop()}</span>` : '-')}</td>
        <td><code>${id}</code></td><td>${s.name}</td>
        <td><span class="tag tag-blue">${s.flow || '-'}</span></td>
        <td><code>${s.behavior || '-'}</code></td>
        <td>${(s.tags || []).map(t => `<span class="tag tag-gold">${t}</span>`).join('')}</td>
        <td>${(s.levels || []).length}</td>
        <td>
          <button class="btn-sm" onclick="AdminApp.showSkillEditor('${id}')">编辑</button>
          <button class="btn-sm btn-danger" onclick="AdminApp.deleteSkill('${id}')">删除</button>
        </td>
      </tr>`).join('');
    } catch (e) { console.error(e); }
  },

  showSkillEditor(id) {
    this.editingSkillId = id;
    this.skillIconData = null;
    document.getElementById('skill-editor-title').textContent = id ? '编辑技能：' + id : '新建技能';
    document.getElementById('sk-id').value = id || '';
    document.getElementById('sk-id').disabled = !!id;
    document.getElementById('sk-icon-preview').innerHTML = '';
    if (id) {
      this.api('GET', `/api/admin/skills/${encodeURIComponent(id)}`).then(({ skill: s }) => {
        document.getElementById('sk-name').value = s.name || '';
        document.getElementById('sk-flow').value = s.flow || '';
        document.getElementById('sk-behavior').value = s.behavior || '';
        document.getElementById('sk-desc').value = s.desc || '';
        document.getElementById('sk-tags').value = (s.tags || []).join(',');
        document.getElementById('sk-projectile').value = s.projectile || '';
        document.getElementById('sk-icon').value = s.icon || '';
        document.getElementById('sk-levels').value = JSON.stringify(s.levels || [], null, 2);
        if (s.iconData) { document.getElementById('sk-icon-preview').innerHTML = `<img src="${s.iconData}">`; this.skillIconData = s.iconData; }
      });
    } else {
      ['sk-name','sk-flow','sk-behavior','sk-desc','sk-tags','sk-projectile','sk-icon'].forEach(f => document.getElementById(f).value = '');
      document.getElementById('sk-levels').value = '[\n  \n]';
    }
    document.getElementById('skill-editor-modal').style.display = 'flex';
  },

  previewSkillIcon(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      this.skillIconData = e.target.result;
      document.getElementById('sk-icon-preview').innerHTML = `<img src="${this.skillIconData}">`;
    };
    reader.readAsDataURL(file);
  },

  async saveSkill() {
    const id = document.getElementById('sk-id').value.trim();
    if (!id) { alert('技能 ID 不能为空'); return; }
    let levels;
    try { levels = JSON.parse(document.getElementById('sk-levels').value); } catch { alert('等级数值表 JSON 格式错误'); return; }
    const data = {
      name: document.getElementById('sk-name').value,
      flow: document.getElementById('sk-flow').value,
      behavior: document.getElementById('sk-behavior').value,
      desc: document.getElementById('sk-desc').value,
      tags: document.getElementById('sk-tags').value.split(',').map(t => t.trim()).filter(Boolean),
      projectile: document.getElementById('sk-projectile').value || undefined,
      icon: document.getElementById('sk-icon').value || undefined,
      levels,
    };
    try {
      if (this.editingSkillId) {
        await this.api('PUT', `/api/admin/skills/${encodeURIComponent(this.editingSkillId)}`, data);
        if (this.skillIconData) await this.api('POST', `/api/admin/skills/${encodeURIComponent(this.editingSkillId)}/icon`, { iconData: this.skillIconData });
      } else {
        await this.api('POST', '/api/admin/skills', { id, ...data });
        if (this.skillIconData) await this.api('POST', `/api/admin/skills/${encodeURIComponent(id)}/icon`, { iconData: this.skillIconData });
      }
      this.closeModal('skill-editor-modal');
      this.loadSkills();
    } catch (e) { alert('保存失败：' + e.message); }
  },

  async deleteSkill(id) {
    if (!confirm(`确认删除技能 ${id}？此操作不可恢复。`)) return;
    await this.api('DELETE', `/api/admin/skills/${encodeURIComponent(id)}`);
    this.loadSkills();
  },

  // ---------- 怪物管理 ----------
  editingEnemyId: null,
  async loadEnemies() {
    try {
      const { enemies } = await this.api('GET', '/api/admin/enemies');
      document.getElementById('enemies-body').innerHTML = Object.entries(enemies || {}).map(([id, e]) => `<tr>
        <td><code>${id}</code></td><td>${e.name}</td><td>${e.hp}</td>
        <td>+${e.hpWave || 0}</td><td>+${((e.hpWavePct || 0) * 100).toFixed(0)}%</td>
        <td>${e.dmg}</td><td>${e.speed}</td><td>${e.exp}</td>
        <td>
          <button class="btn-sm" onclick="AdminApp.showEnemyEditor('${id}')">编辑</button>
          <button class="btn-sm btn-danger" onclick="AdminApp.deleteEnemy('${id}')">删除</button>
        </td>
      </tr>`).join('');
    } catch (e) { console.error(e); }
  },

  showEnemyEditor(id) {
    this.editingEnemyId = id;
    document.getElementById('enemy-editor-title').textContent = id ? '编辑怪物：' + id : '新增怪物';
    document.getElementById('en-id').value = id || '';
    document.getElementById('en-id').disabled = !!id;
    if (id) {
      this.api('GET', '/api/admin/enemies').then(({ enemies }) => {
        const e = enemies[id];
        if (!e) return;
        document.getElementById('en-name').value = e.name || '';
        document.getElementById('en-hp').value = e.hp || 20;
        document.getElementById('en-hpWave').value = e.hpWave || 0;
        document.getElementById('en-hpWavePct').value = e.hpWavePct || 0;
        document.getElementById('en-dmg').value = e.dmg || 0;
        document.getElementById('en-dmgWave').value = e.dmgWave || 0;
        document.getElementById('en-speed').value = e.speed || 85;
        document.getElementById('en-exp').value = e.exp || 1;
        document.getElementById('en-r').value = e.r || 24;
        document.getElementById('en-drawH').value = e.drawH || 80;
        document.getElementById('en-img').value = e.img || '';
      });
    } else {
      ['en-name','en-img'].forEach(f => document.getElementById(f).value = '');
      document.getElementById('en-hp').value = 20; document.getElementById('en-hpWave').value = 5;
      document.getElementById('en-hpWavePct').value = 0.08; document.getElementById('en-dmg').value = 8;
      document.getElementById('en-dmgWave').value = 0.5; document.getElementById('en-speed').value = 85;
      document.getElementById('en-exp').value = 1; document.getElementById('en-r').value = 24;
      document.getElementById('en-drawH').value = 80;
    }
    document.getElementById('enemy-editor-modal').style.display = 'flex';
  },

  async saveEnemy() {
    const id = document.getElementById('en-id').value.trim();
    if (!id) { alert('怪物 ID 不能为空'); return; }
    const data = {
      name: document.getElementById('en-name').value,
      hp: parseFloat(document.getElementById('en-hp').value) || 20,
      hpWave: parseFloat(document.getElementById('en-hpWave').value) || 0,
      hpWavePct: parseFloat(document.getElementById('en-hpWavePct').value) || 0,
      dmg: parseFloat(document.getElementById('en-dmg').value) || 0,
      dmgWave: parseFloat(document.getElementById('en-dmgWave').value) || 0,
      speed: parseFloat(document.getElementById('en-speed').value) || 85,
      exp: parseFloat(document.getElementById('en-exp').value) || 1,
      r: parseFloat(document.getElementById('en-r').value) || 24,
      drawH: parseFloat(document.getElementById('en-drawH').value) || 80,
      img: document.getElementById('en-img').value || undefined,
    };
    try {
      if (this.editingEnemyId) await this.api('PUT', `/api/admin/enemies/${encodeURIComponent(this.editingEnemyId)}`, data);
      else await this.api('POST', '/api/admin/enemies', { id, ...data });
      this.closeModal('enemy-editor-modal');
      this.loadEnemies();
    } catch (e) { alert('保存失败：' + e.message); }
  },

  async deleteEnemy(id) {
    if (!confirm(`确认删除怪物 ${id}？`)) return;
    await this.api('DELETE', `/api/admin/enemies/${encodeURIComponent(id)}`);
    this.loadEnemies();
  },

  // ---------- 游戏配置（schema 驱动） ----------
  _cfgSchema: null,
  _cfgValues: {},   // path -> 当前编辑值
  _cfgOrig: {},     // path -> 原始值（用于 diff/修改标记）

  async loadConfig() {
    try {
      // 拉取 schema + 当前配置
      const [schemaRes, cfgRes] = await Promise.all([
        this.api('GET', '/api/admin/config/schema'),
        this.api('GET', '/api/admin/config'),
      ]);
      this._cfgSchema = schemaRes.schema;
      this._cfgRules = schemaRes.crossFieldRules || [];
      const c = cfgRes.config;
      document.getElementById('config-version').textContent = '当前版本：v' + (c.version || 1);

      // 提取每个字段的当前值
      this._cfgValues = {}; this._cfgOrig = {};
      for (const f of this._cfgSchema) {
        const v = this._getPath(c, f.path);
        const val = v !== undefined ? v : f.def;
        this._cfgValues[f.path] = val;
        this._cfgOrig[f.path] = val;
      }
      this._renderConfigEditor();
    } catch (e) { console.error(e); }
  },

  _getPath(obj, path) { return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj); },
  _setPath(obj, path, val) {
    const keys = path.split('.'); let o = obj;
    for (let i = 0; i < keys.length - 1; i++) { if (o[keys[i]] == null || typeof o[keys[i]] !== 'object') o[keys[i]] = {}; o = o[keys[i]]; }
    o[keys[keys.length - 1]] = val;
  },

  // 模块分组（path 前缀 -> 模块名）
  _cfgModules: [
    { prefix: 'player.', name: '🧑 玩家基础属性', desc: '玩家的基础数值' },
    { prefix: 'playerExp.', name: '📈 局内升级经验曲线', desc: '公式：expNeed(lv) = base + lv×linear + lv²×quad' },
    { prefix: 'settlement.', name: '💰 结算奖励', desc: '每局结算的局外经验/金币/碎片' },
    { prefix: 'economy.', name: '💵 局外升级曲线', desc: '局外等级升级所需经验' },
    { prefix: 'waves.', name: '🌊 波次曲线', desc: '刷怪节奏与难度' },
    { prefix: 'drops.', name: '🎁 掉落系统', desc: '精英/哥布林掉落' },
    { prefix: 'talents.', name: '🌟 天赋解锁', desc: '天赋层级解锁条件' },
    { prefix: 'weapons.', name: '🗡️ 武器合成', desc: '武器碎片需求' },
    { prefix: 'skillSystem.', name: '⚔️ 技能系统', desc: '技能栏/进化/等级上限' },
    { prefix: 'features.', name: '🔧 功能开关', desc: '功能开/关' },
  ],

  _renderConfigEditor() {
    const editor = document.getElementById('config-editor');
    let html = '';
    for (const mod of this._cfgModules) {
      const fields = this._cfgSchema.filter(f => f.path.startsWith(mod.prefix));
      if (!fields.length) continue;
      html += `<div class="config-section"><h4>${mod.name}</h4><p style="font-size:12px;color:rgba(200,200,210,0.4);margin:2px 0 10px">${mod.desc}</p><div class="config-row">`;
      for (const f of fields) {
        const val = this._cfgValues[f.path];
        const inputId = 'cfgf_' + f.path.replace(/\./g, '_');
        const shortName = f.path.split('.').pop();
        if (f.type === 'bool') {
          html += `<div class="config-field"><label title="${f.desc}"><input type="checkbox" id="${inputId}" data-path="${f.path}" ${val ? 'checked' : ''} onchange="AdminApp.onCfgInput(this)"> ${f.label}</label><div class="cfg-path">${f.path}</div><div class="cfg-err" id="err_${inputId}"></div></div>`;
        } else {
          const step = f.step || (f.type === 'int' ? 1 : 0.1);
          html += `<div class="config-field"><label title="${f.desc}">${f.label}${f.unit ? '(' + f.unit + ')' : ''}</label><input type="number" step="${step}" id="${inputId}" data-path="${f.path}" value="${val}" oninput="AdminApp.onCfgInput(this)"><div class="cfg-path">${f.path} · 范围 ${f.min}~${f.max}</div><div class="cfg-err" id="err_${inputId}"></div></div>`;
        }
      }
      html += `</div></div>`;
    }
    editor.innerHTML = html;
    this._updateSaveBtn();
  },

  // 实时校验单个字段
  _validateCfgField(f, val) {
    if (f.type === 'bool') return null;
    if (val === '' || val === null || val === undefined) return '不能为空';
    const n = parseFloat(val);
    if (isNaN(n)) return '必须是数字';
    if (f.type === 'int' && !Number.isInteger(n)) return '必须是整数';
    if (n < f.min) return '不能小于 ' + f.min;
    if (n > f.max) return '不能大于 ' + f.max;
    return null;
  },

  onCfgInput(el) {
    const path = el.dataset.path;
    const f = this._cfgSchema.find(x => x.path === path);
    if (!f) return;
    const val = f.type === 'bool' ? el.checked : el.value;
    this._cfgValues[path] = val;
    // 实时校验
    const err = this._validateCfgField(f, val);
    const errEl = document.getElementById('err_cfgf_' + path.replace(/\./g, '_'));
    if (errEl) { errEl.textContent = err || ''; el.style.borderColor = err ? '#e06c6c' : ''; }
    this._updateSaveBtn();
  },

  // 跨字段校验
  _validateCrossField() {
    const errs = [];
    for (const rule of this._cfgRules) {
      const va = parseFloat(this._cfgValues[rule.a]), vb = parseFloat(this._cfgValues[rule.b]);
      if (va === undefined || vb === undefined || isNaN(va) || isNaN(vb)) continue;
      const ok = rule.op === '<=' ? va <= vb : va >= vb;
      if (!ok) errs.push({ path: rule.a, msg: rule.msg });
    }
    return errs;
  },

  _updateSaveBtn() {
    // 统计错误数 + 修改数
    let errCount = 0, changedCount = 0;
    for (const f of this._cfgSchema) {
      const err = this._validateCfgField(f, this._cfgValues[f.path]);
      if (err) errCount++;
      if (String(this._cfgValues[f.path]) !== String(this._cfgOrig[f.path])) changedCount++;
    }
    errCount += this._validateCrossField().length;
    const btn = document.getElementById('save-config-btn');
    if (btn) {
      btn.disabled = errCount > 0;
      btn.textContent = errCount > 0 ? `保存并发布（${errCount} 个字段待修正）` : (changedCount > 0 ? `保存并发布（${changedCount} 项修改）` : '保存并发布');
    }
  },

  async saveConfig() {
    // 客户端校验（单字段 + 跨字段）
    const errors = [];
    for (const f of this._cfgSchema) {
      const err = this._validateCfgField(f, this._cfgValues[f.path]);
      if (err) errors.push({ path: f.path, msg: err });
    }
    errors.push(...this._validateCrossField());
    if (errors.length) { alert('有 ' + errors.length + ' 个字段待修正：\n' + errors.slice(0, 5).map(e => e.path + ': ' + e.msg).join('\n')); return; }

    // 构建 payload（只包含修改过的字段，深合并由服务端处理）
    const payload = {};
    for (const f of this._cfgSchema) {
      const val = this._cfgValues[f.path];
      if (String(val) !== String(this._cfgOrig[f.path])) {
        this._setPath(payload, f.path, f.type === 'bool' ? val : parseFloat(val));
      }
    }
    if (Object.keys(payload).length === 0) { alert('没有修改'); return; }

    try {
      const res = await fetch('/api/admin/config', {
        method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Admin-Token': this.token },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        const msgs = (data.errors || []).map(e => e.path + ': ' + e.msg).join('\n');
        alert('服务端校验失败：\n' + msgs); return;
      }
      // 保存后回读确认
      const { config: readBack } = await this.api('GET', '/api/admin/config');
      let mismatch = [];
      for (const f of this._cfgSchema) {
        if (String(this._cfgValues[f.path]) !== String(this._cfgOrig[f.path])) {
          const rb = this._getPath(readBack, f.path);
          if (String(rb) !== String(this._cfgValues[f.path])) mismatch.push(f.path);
        }
      }
      document.getElementById('config-version').textContent = '当前版本：v' + readBack.version;
      // 更新原始值
      for (const f of this._cfgSchema) this._cfgOrig[f.path] = this._cfgValues[f.path];
      this._updateSaveBtn();
      if (mismatch.length) alert('⚠️ 回读不一致：' + mismatch.join(', '));
      else alert('✓ 回读一致，配置已发布 v' + readBack.version);
    } catch (e) { alert('保存失败：' + e.message); }
  },

  // ---------- 排行榜 ----------
  async loadLeaderboard() {
    const cls = document.getElementById('lb-class').value;
    const type = document.getElementById('lb-type').value;
    try {
      const { leaderboard } = await this.api('GET', `/api/admin/leaderboard?class=${cls}&type=${type}`);
      document.getElementById('lb-body').innerHTML = leaderboard.map((e, i) => `<tr>
        <td>${i < 3 ? ['🥇','🥈','🥉'][i] : i + 1}</td>
        <td>${e.name || e.player_id}</td><td>${e.score}${type === 'survival' ? 's' : ''}</td>
        <td>${(e.updated_at||'').slice(0,16).replace('T',' ')}</td>
      </tr>`).join('') || '<tr><td colspan="4" style="text-align:center;color:rgba(200,200,210,0.4)">暂无数据</td></tr>';
    } catch (e) { console.error(e); }
  },

  async resetLeaderboard() {
    const cls = document.getElementById('lb-class').value;
    const type = document.getElementById('lb-type').value;
    if (!confirm(`确认重置 ${cls === 'all' ? '全部职业' : cls} 的${type === 'survival' ? '存活' : '击杀'}排行榜？`)) return;
    await this.api('POST', '/api/admin/leaderboard/reset', { classId: cls, type });
    this.loadLeaderboard();
  },

  // ---------- 公告管理 ----------
  async loadAnnouncements() {
    try {
      const { announcements } = await this.api('GET', '/api/admin/announcements');
      document.getElementById('ann-body').innerHTML = announcements.map(a => `<tr>
        <td>${a.title || '-'}</td><td>${(a.content || '').slice(0, 50)}${(a.content||'').length > 50 ? '…' : ''}</td>
        <td>${a.active !== false ? '<span class="tag tag-green">启用</span>' : '<span class="tag tag-red">停用</span>'}</td>
        <td>${(a.created_at||'').slice(0,16).replace('T',' ')}</td>
        <td>
          <button class="btn-sm" onclick="AdminApp.showAnnouncementEditor('${a.id}')">编辑</button>
          <button class="btn-sm btn-danger" onclick="AdminApp.deleteAnnouncement('${a.id}')">删除</button>
        </td>
      </tr>`).join('') || '<tr><td colspan="5" style="text-align:center;color:rgba(200,200,210,0.4)">暂无公告</td></tr>';
    } catch (e) { console.error(e); }
  },

  showAnnouncementEditor(id) {
    this.editingAnnId = id;
    document.getElementById('ann-editor-title').textContent = id ? '编辑公告' : '发布公告';
    if (id) {
      this.api('GET', '/api/admin/announcements').then(({ announcements }) => {
        const a = announcements.find(x => x.id === id);
        if (a) {
          document.getElementById('ann-title').value = a.title || '';
          document.getElementById('ann-content').value = a.content || '';
          document.getElementById('ann-active').checked = a.active !== false;
        }
      });
    } else {
      document.getElementById('ann-title').value = '';
      document.getElementById('ann-content').value = '';
      document.getElementById('ann-active').checked = true;
    }
    document.getElementById('ann-editor-modal').style.display = 'flex';
  },

  async saveAnnouncement() {
    const data = {
      title: document.getElementById('ann-title').value,
      content: document.getElementById('ann-content').value,
      active: document.getElementById('ann-active').checked,
    };
    try {
      if (this.editingAnnId) await this.api('PUT', `/api/admin/announcements/${this.editingAnnId}`, data);
      else await this.api('POST', '/api/admin/announcements', data);
      this.closeModal('ann-editor-modal');
      this.loadAnnouncements();
    } catch (e) { alert('保存失败：' + e.message); }
  },

  async deleteAnnouncement(id) {
    if (!confirm('确认删除该公告？')) return;
    await this.api('DELETE', `/api/admin/announcements/${id}`);
    this.loadAnnouncements();
  },

  // ---------- 工具 ----------
  closeModal(id) { document.getElementById(id).style.display = 'none'; },

  renderPagination(containerId, total, page, size, callback) {
    const pages = Math.ceil(total / size);
    const el = document.getElementById(containerId);
    if (pages <= 1) { el.innerHTML = ''; return; }
    let html = `<button ${page <= 1 ? 'disabled' : ''} onclick="(${callback.toString()})(${page - 1})">‹</button>`;
    for (let i = 1; i <= Math.min(pages, 7); i++) {
      html += `<button class="${i === page ? 'active' : ''}" onclick="(${callback.toString()})(${i})">${i}</button>`;
    }
    html += `<button ${page >= pages ? 'disabled' : ''} onclick="(${callback.toString()})(${page + 1})">›</button>`;
    el.innerHTML = html;
  },

  // ---------- 初始化 ----------
  async init() {
    if (!this.token) { this.showLogin(); return; }
    try {
      const res = await fetch('/api/admin/check', { headers: { 'X-Admin-Token': this.token } });
      if (res.ok) this.showMain();
      else this.showLogin();
    } catch { this.showLogin(); }
  },
};

// 启动
AdminApp.init();
