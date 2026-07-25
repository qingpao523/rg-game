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
        <td>Lv.${p.level}</td><td>${p.gold}</td><td>${p.shards || 0}</td>
        <td>${(p.stats || {}).runs || 0}</td>
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

  // ---------- 游戏配置（全数值） ----------
  async loadConfig() {
    try {
      const { config: c } = await this.api('GET', '/api/admin/config');
      document.getElementById('config-version').textContent = '当前版本：v' + (c.version || 1);
      const editor = document.getElementById('config-editor');
      const p = c.player || {};
      const pe = c.playerExp || {};
      const st = c.settlement || {};
      const ss = c.skillSystem || {};
      const dr = c.drops || {};
      editor.innerHTML = `
        <div class="config-section"><h4>🧑 玩家基础属性</h4><div class="config-row">
          <div class="config-field"><label>生命值</label><input type="number" id="cfg-p-hp" value="${p.hp ?? 120}"></div>
          <div class="config-field"><label>移速</label><input type="number" id="cfg-p-speed" value="${p.speed ?? 230}"></div>
          <div class="config-field"><label>拾取范围</label><input type="number" id="cfg-p-pickup" value="${p.pickup ?? 110}"></div>
          <div class="config-field"><label>受击CD(s)</label><input type="number" step="0.1" id="cfg-p-hurtCd" value="${p.hurtCd ?? 0.5}"></div>
        </div></div>
        <div class="config-section"><h4>📈 局内经验曲线（升级）</h4><div class="config-row">
          <div class="config-field"><label>基础经验</label><input type="number" id="cfg-pe-base" value="${pe.base ?? 5}"></div>
          <div class="config-field"><label>线性系数</label><input type="number" step="0.5" id="cfg-pe-linear" value="${pe.linear ?? 3}"></div>
          <div class="config-field"><label>二次系数</label><input type="number" step="0.05" id="cfg-pe-quad" value="${pe.quad ?? 0.35}"></div>
        </div><p style="font-size:12px;color:rgba(200,200,210,0.4);margin-top:4px">公式：expNeed(lv) = base + lv × linear + lv² × quad</p></div>
        <div class="config-section"><h4>💰 局外经济（结算奖励）</h4><div class="config-row">
          <div class="config-field"><label>经验/击杀</label><input type="number" step="0.1" id="cfg-expMult" value="${c.economy?.expMult ?? 0.3}"></div>
          <div class="config-field"><label>经验/秒</label><input type="number" step="0.1" id="cfg-timeMult" value="${c.economy?.timeMult ?? 0.5}"></div>
          <div class="config-field"><label>金币/击杀</label><input type="number" step="0.01" id="cfg-goldKillMult" value="${c.economy?.goldKillMult ?? 0.1}"></div>
          <div class="config-field"><label>金币/秒</label><input type="number" step="0.01" id="cfg-goldTimeMult" value="${c.economy?.goldTimeMult ?? 0.05}"></div>
        </div><div class="config-row">
          <div class="config-field"><label>升级基础经验</label><input type="number" id="cfg-expNeedBase" value="${c.economy?.expNeedBase ?? 20}"></div>
          <div class="config-field"><label>升级线性系数</label><input type="number" id="cfg-expNeedLinear" value="${c.economy?.expNeedLinear ?? 15}"></div>
          <div class="config-field"><label>升级二次系数</label><input type="number" step="0.1" id="cfg-expNeedQuad" value="${c.economy?.expNeedQuad ?? 0.8}"></div>
        </div></div>
        <div class="config-section"><h4>🎁 掉落系统</h4><div class="config-row">
          <div class="config-field"><label>精英碎片概率</label><input type="number" step="0.05" id="cfg-eliteShardChance" value="${dr.eliteShardChance ?? 0.3}"></div>
          <div class="config-field"><label>精英血瓶概率</label><input type="number" step="0.05" id="cfg-eliteHealChance" value="${dr.eliteHealChance ?? 0.25}"></div>
          <div class="config-field"><label>血瓶回复量</label><input type="number" id="cfg-healValue" value="${dr.healValue ?? 30}"></div>
          <div class="config-field"><label>哥布林经验值</label><input type="number" id="cfg-goblinExpValue" value="${dr.goblinExpValue ?? 8}"></div>
          <div class="config-field"><label>哥布林碎片最少</label><input type="number" id="cfg-goblinShardMin" value="${dr.goblinShardMin ?? 2}"></div>
          <div class="config-field"><label>哥布林碎片最多</label><input type="number" id="cfg-goblinShardMax" value="${dr.goblinShardMax ?? 3}"></div>
        </div></div>
        <div class="config-section"><h4>🌊 波次曲线</h4><div class="config-row">
          <div class="config-field"><label>每波时长(s)</label><input type="number" id="cfg-waveTime" value="${c.waves?.waveTime ?? 25}"></div>
          <div class="config-field"><label>初始刷怪间隔</label><input type="number" step="0.1" id="cfg-baseInterval" value="${c.waves?.baseInterval ?? 1.5}"></div>
          <div class="config-field"><label>最小刷怪间隔</label><input type="number" step="0.05" id="cfg-minInterval" value="${c.waves?.minInterval ?? 0.45}"></div>
          <div class="config-field"><label>最大存活怪数</label><input type="number" id="cfg-maxAlive" value="${c.waves?.maxAlive ?? 120}"></div>
        </div><div class="config-row">
          <div class="config-field"><label>精英首现(s)</label><input type="number" id="cfg-eliteFirstTime" value="${c.waves?.eliteFirstTime ?? 70}"></div>
          <div class="config-field"><label>精英间隔(s)</label><input type="number" id="cfg-eliteInterval" value="${c.waves?.eliteInterval ?? 30}"></div>
          <div class="config-field"><label>精英上限</label><input type="number" id="cfg-eliteCap" value="${c.waves?.eliteCap ?? 5}"></div>
          <div class="config-field"><label>哥布林首现(s)</label><input type="number" id="cfg-goblinFirst" value="${c.waves?.goblinFirst ?? 45}"></div>
        </div></div>
        <div class="config-section"><h4>⚔️ 技能系统</h4><div class="config-row">
          <div class="config-field"><label>技能栏数量</label><input type="number" id="cfg-skillSlots" value="${ss.skillSlots ?? 8}"></div>
          <div class="config-field"><label>射手上限</label><input type="number" id="cfg-archerCap" value="${ss.archerCap ?? 3}"></div>
          <div class="config-field"><label>进化主技能等级</label><input type="number" id="cfg-evoMainLevel" value="${ss.evoMainLevel ?? 5}"></div>
          <div class="config-field"><label>进化催化等级</label><input type="number" id="cfg-evoCatalystLevel" value="${ss.evoCatalystLevel ?? 3}"></div>
          <div class="config-field"><label>等级上限(0=无限)</label><input type="number" id="cfg-maxLevel" value="${ss.maxLevel ?? 0}"></div>
        </div></div>
        <div class="config-section"><h4>🔧 功能开关</h4><div class="config-row">
          <div class="config-field"><label><input type="checkbox" id="cfg-featReaction" ${c.features?.elementalReaction ? 'checked' : ''}> 元素反应</label></div>
          <div class="config-field"><label><input type="checkbox" id="cfg-featWheel" ${c.features?.wheel ? 'checked' : ''}> 战利品分配</label></div>
          <div class="config-field"><label><input type="checkbox" id="cfg-featLeaderboard" ${c.features?.leaderboard ? 'checked' : ''}> 排行榜</label></div>
          <div class="config-field"><label><input type="checkbox" id="cfg-featSkip" ${c.features?.skipUpgrade !== false ? 'checked' : ''}> 升级可跳过</label></div>
        </div></div>`;
    } catch (e) { console.error(e); }
  },

  async saveConfig() {
    const v = id => parseFloat(document.getElementById(id)?.value) || 0;
    const data = {
      player: { hp: v('cfg-p-hp'), speed: v('cfg-p-speed'), pickup: v('cfg-p-pickup'), hurtCd: v('cfg-p-hurtCd') },
      playerExp: { base: v('cfg-pe-base'), linear: v('cfg-pe-linear'), quad: v('cfg-pe-quad') },
      economy: { expMult: v('cfg-expMult'), timeMult: v('cfg-timeMult'), goldKillMult: v('cfg-goldKillMult'), goldTimeMult: v('cfg-goldTimeMult'), expNeedBase: v('cfg-expNeedBase'), expNeedLinear: v('cfg-expNeedLinear'), expNeedQuad: v('cfg-expNeedQuad') },
      drops: { eliteShardChance: v('cfg-eliteShardChance'), eliteHealChance: v('cfg-eliteHealChance'), healValue: v('cfg-healValue'), goblinExpValue: v('cfg-goblinExpValue'), goblinShardMin: v('cfg-goblinShardMin'), goblinShardMax: v('cfg-goblinShardMax') },
      waves: { waveTime: v('cfg-waveTime'), baseInterval: v('cfg-baseInterval'), minInterval: v('cfg-minInterval'), maxAlive: v('cfg-maxAlive'), eliteFirstTime: v('cfg-eliteFirstTime'), eliteInterval: v('cfg-eliteInterval'), eliteCap: v('cfg-eliteCap'), goblinFirst: v('cfg-goblinFirst') },
      skillSystem: { skillSlots: v('cfg-skillSlots'), archerCap: v('cfg-archerCap'), evoMainLevel: v('cfg-evoMainLevel'), evoCatalystLevel: v('cfg-evoCatalystLevel'), maxLevel: v('cfg-maxLevel') },
      features: { elementalReaction: document.getElementById('cfg-featReaction')?.checked, wheel: document.getElementById('cfg-featWheel')?.checked, leaderboard: document.getElementById('cfg-featLeaderboard')?.checked, skipUpgrade: document.getElementById('cfg-featSkip')?.checked },
    };
    try {
      const { config } = await this.api('PUT', '/api/admin/config', data);
      document.getElementById('config-version').textContent = '当前版本：v' + config.version;
      alert('配置已保存并发布为 v' + config.version);
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
