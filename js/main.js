// 主循环、场景切换、全局状态
const Game = {
  state: 'loading', // loading / menu / battle / upgrade / pause / dying / death / wheel
  time: 0,
  hitstopFrames: 0, // P0 命中顿帧：>0 时跳过 update 仅 render
  choices: [],
  report: null,
  dyingT: 0,
  classId: 'taoist',
  canvas: null,
  ctx: null,
  lastTs: 0,
  menuT: 0,
  loadProgress: 0,

  init() {
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());
    Engine.init(this.canvas, this);
    Assets.loadAll(
      (n, total) => { this.loadProgress = n / total; },
      () => { this.state = 'menu'; this.fetchRemoteConfig(); }
    );
    requestAnimationFrame((ts) => this.loop(ts));
  },

  // S5：启动时拉取远程配置覆盖本地 CONFIG（静默失败，不影响单机）
  async fetchRemoteConfig() {
    const SERVER = (typeof Storage !== 'undefined' && Storage.SERVER_URL) || 'http://localhost:3000';
    this._configServer = SERVER;
    // 先登录服务端（拿到 token，后续上报对局/同步存档才能生效）
    if (typeof Storage !== 'undefined') { await Storage.loginToServer(); }
    try {
      const res = await fetch(SERVER + '/api/config/game');
      const { config, skills } = await res.json();
      if (config) {
        this._applyRemoteConfig(config, skills);
        // 缓存到 localStorage（离线兜底）
        try { localStorage.setItem('rg_h5_remote_config', JSON.stringify({ version: config.version, config, skills, ts: Date.now() })); } catch (e) {}
        this._remoteVersion = config.version;
        console.log('[config] 远程配置已加载 v' + config.version);
      }
      // 拉取公告
      const annRes = await fetch(SERVER + '/api/announcement');
      const { announcements } = await annRes.json();
      if (announcements && announcements.length > 0) {
        this.announcement = announcements[0];
      }
    } catch (e) {
      // 服务端不可达：使用最后一次成功的缓存（而非硬编码默认值）
      try {
        const cached = JSON.parse(localStorage.getItem('rg_h5_remote_config'));
        if (cached && cached.config) {
          this._applyRemoteConfig(cached.config, cached.skills);
          this._remoteVersion = cached.version;
          console.warn('[config] 离线模式：使用缓存配置 v' + cached.version);
          if (typeof UI !== 'undefined') UI.toast('离线模式：使用缓存配置 v' + cached.version);
        } else {
          console.warn('[config] 远程配置拉取失败，使用本地默认值:', e.message);
        }
      } catch (e2) {
        console.warn('[config] 远程配置拉取失败，使用本地默认值:', e.message);
      }
    }
    // 启动 60s 版本轮询
    this._startConfigPolling();
  },

  // 应用远程配置到 CONFIG（全量消费点）
  _applyRemoteConfig(config, skills) {
    // 客户端兜底校验：越界值单字段回退默认值
    const clamp = (v, min, max, def) => { const n = parseFloat(v); if (isNaN(n)) return def; if (n < min) { console.warn('[config] 值越界回退:', v, '->', def); return def; } if (n > max) { console.warn('[config] 值越界回退:', v, '->', def); return def; } return n; };

    // 玩家基础属性
    if (config.player) {
      CONFIG.player.hp = clamp(config.player.hp, 1, 99999, 120);
      CONFIG.player.speed = clamp(config.player.speed, 10, 2000, 230);
      CONFIG.player.pickup = clamp(config.player.pickup, 10, 2000, 110);
      CONFIG.player.hurtCd = clamp(config.player.hurtCd, 0, 10, 0.5);
      if (config.player.drawH != null) CONFIG.player.drawH = clamp(config.player.drawH, 10, 1000, 118);
    }
    // 局内经验曲线
    if (config.playerExp) CONFIG._remotePlayerExp = config.playerExp;
    // 局外经济
    if (config.economy) CONFIG._remoteEconomy = config.economy;
    if (config.settlement) CONFIG._remoteSettlement = config.settlement;
    // 波次参数
    if (config.waves) Object.assign(CONFIG.waves, config.waves);
    // 功能开关
    if (config.features) CONFIG.features = config.features;
    // 掉落参数（合并默认值，避免缺字段）
    if (config.drops) CONFIG.drops = Object.assign({}, CONFIG.drops, config.drops);
    // 怪物定义（逐怪深合并 + 支持删除同步 + spawnWeight）
    if (config.enemies) {
      for (const id in config.enemies) {
        if (CONFIG.enemies[id]) Object.assign(CONFIG.enemies[id], config.enemies[id]);
        else CONFIG.enemies[id] = config.enemies[id]; // 新增怪物
      }
      // 同步删除：远程没有的自定义怪物从客户端移除（内置4种保留）
      const builtin = ['grunt', 'charger', 'elite', 'goblin'];
      for (const id in CONFIG.enemies) {
        if (!builtin.includes(id) && !config.enemies[id]) delete CONFIG.enemies[id];
      }
    }
    // 天赋解锁表（合并入 TALENT_TREE，保留 1:0 键）
    if (config.talents && typeof TALENT_TREE !== 'undefined') {
      if (config.talents.generalUnlock) TALENT_TREE.generalUnlock = Object.assign({ 1: 0 }, config.talents.generalUnlock);
      if (config.talents.specialistUnlock) TALENT_TREE.specialistUnlock = Object.assign({ 1: 0 }, config.talents.specialistUnlock);
    }
    // 武器碎片需求（按稀有度覆写 craft.js WEAPONS 的 shards）
    if (config.weapons && typeof WEAPONS !== 'undefined') {
      CONFIG._remoteWeapons = config.weapons;
      for (const cid in WEAPONS) {
        for (const w of WEAPONS[cid]) {
          if (w.rarity === '普通' && config.weapons.normalShards != null) w.shards = config.weapons.normalShards;
          if (w.rarity === '稀有' && config.weapons.rareShards != null) w.shards = config.weapons.rareShards;
        }
      }
    }
    // 技能系统（映射顶层 skillSlots/archerCap + 进化等级 + maxLevel）
    if (config.skillSystem) {
      if (config.skillSystem.skillSlots != null) CONFIG.skillSlots = clamp(config.skillSystem.skillSlots, 1, 12, 8);
      if (config.skillSystem.archerCap != null) CONFIG.archerCap = clamp(config.skillSystem.archerCap, 0, 20, 3);
      CONFIG._evoReq = { main: config.skillSystem.evoMainLevel || 5, catalyst: config.skillSystem.evoCatalystLevel || 3 };
      CONFIG._maxLevel = config.skillSystem.maxLevel || 0;
    }
    // 远程技能定义覆盖本地（放开"仅合并已存在技能"限制，新技能可注入）
    if (skills && Object.keys(skills).length > 0) {
      for (const [id, s] of Object.entries(skills)) {
        if (CONFIG.skills[id]) {
          Object.assign(CONFIG.skills[id], { name: s.name, desc: s.desc, flow: s.flow, tags: s.tags, levels: s.levels });
          if (s.behavior) CONFIG.skills[id].behavior = s.behavior;
          if (s.icon) CONFIG.skills[id].icon = s.icon;
          if (s.projectile) CONFIG.skills[id].projectile = s.projectile;
        } else if (s.behavior) {
          // 新增技能注入（需有 behavior 才能生效）
          CONFIG.skills[id] = { name: s.name, icon: s.icon, flow: s.flow, behavior: s.behavior, desc: s.desc, tags: s.tags || [], projectile: s.projectile, levels: s.levels || [] };
        }
      }
      console.log('[config] 远程技能定义已合并');
    }
  },

  // 60s 版本轮询 + 页面恢复时检查
  _startConfigPolling() {
    if (this._configPolling) return;
    this._configPolling = true;
    const check = async () => {
      try {
        const res = await fetch(this._configServer + '/api/config/version');
        const { version } = await res.json();
        if (version && version > (this._remoteVersion || 0)) {
          const full = await fetch(this._configServer + '/api/config/game');
          const { config, skills } = await full.json();
          if (config) {
            // 局内延迟应用：战斗/升级/濒死/转盘状态不打断，回菜单再应用
            const inBattle = ['battle', 'upgrade', 'dying', 'wheel'].includes(this.state);
            if (inBattle) {
              this._pendingConfig = { config, skills };
              if (typeof UI !== 'undefined') UI.toast('配置已更新至 v' + version + '，下一局生效');
            } else {
              this._applyRemoteConfig(config, skills);
              try { localStorage.setItem('rg_h5_remote_config', JSON.stringify({ version, config, skills, ts: Date.now() })); } catch (e) {}
              if (typeof UI !== 'undefined') UI.toast('配置已更新至 v' + version);
            }
            this._remoteVersion = version;
          }
        }
      } catch (e) { /* 静默 */ }
    };
    setInterval(check, 60000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
  },

  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const scale = Math.min(window.innerWidth / CONFIG.canvas.w, window.innerHeight / CONFIG.canvas.h);
    this.canvas.style.width = CONFIG.canvas.w * scale + 'px';
    this.canvas.style.height = CONFIG.canvas.h * scale + 'px';
    this.canvas.width = Math.round(CONFIG.canvas.w * dpr);
    this.canvas.height = Math.round(CONFIG.canvas.h * dpr);
    this.dpr = dpr;
    this._bloomGrad = null; // P0：渐变缓存，resize 时重建
  },

  start(classId) {
    this.classId = classId;
    if (typeof SFX !== 'undefined') SFX.unlock();
    Player.reset(classId);
    Skills.reset(classId);
    Enemies.reset();
    FX.reset();
    UI.reset();
    Engine.cam.x = 0; Engine.cam.y = 0; Engine.cam.shake = 0;
    this.time = 0;
    this.report = null;
    this._battleLoadT = 0;       // 战斗资源加载等待计时
    this._battleForceReady = false; // 兜底：等待超时后强制进入，避免软锁
    if (typeof Assets !== 'undefined') Assets.retryFailed(); // 菜单阶段失败/超时的资源重试一次
    this.state = 'battle';
    if (typeof Craft !== 'undefined') Craft.applyWeaponEffects(classId);
    UI.banner('进入裂界', Player.cfg.name + ' · ' + Player.cfg.title);
  },

  loop(ts) {
    const dt = Math.min(0.05, (ts - this.lastTs) / 1000 || 0.016);
    this.lastTs = ts;
    if (this.hitstopFrames > 0) {
      this.hitstopFrames--; // 顿帧期间冻结逻辑，仅渲染
    } else {
      this.update(dt);
    }
    this.render();
    requestAnimationFrame((t) => this.loop(t));
  },

  update(dt) {
    // 全局：每 5s 智能重试失败的资源（慢网/掉线加载失败的图，菜单与战斗都覆盖；仍在下载的不打断）
    if ((this._assetRetryT = (this._assetRetryT || 0) + dt) > 5) { this._assetRetryT = 0; if (typeof Assets !== 'undefined') Assets.retryFailed(); }
    if (this.state === 'menu') { this.menuT += dt; UI.update(dt); if (typeof Wheel !== 'undefined') Wheel.update(dt); return; }
    if (this.state === 'wheel') { if (typeof Wheel !== 'undefined') Wheel.update(dt); UI.update(dt); return; }
    if (this.state === 'battle') {
      if (!Assets.battleReady(this.classId)) {
        if (!this._battleForceReady) {
          this._battleLoadT = (this._battleLoadT || 0) + dt;
          if ((this._retryT = (this._retryT || 0) + dt) > 6) { this._retryT = 0; Assets.retryFailed(); } // 定期重试失败资源
          if (this._battleLoadT > 20) this._battleForceReady = true; // 兜底：等太久强制进入，避免软锁
          else return; // 冻结逻辑，配合加载界面
        }
      }
      this.time += dt;
      Player.update(dt);
      Skills.update(dt);
      Enemies.update(dt);
      FX.update(dt);
      UI.update(dt);
      Engine.updateCamera(dt, Player.x, Player.y);
    } else if (this.state === 'dying') {
      this.dyingT -= dt;
      FX.update(dt);
      UI.update(dt);
      if (this.dyingT <= 0) {
        this.report = {
          time: this.time,
          kills: Enemies.kills,
          level: Player.level,
          evoCount: Skills.evoCount,
          wave: Enemies.wave,
          flow: Skills.dominantFlow(),
          build: Skills.owned.map(s => {
            const c = Skills.cfgOf(s.id);
            return { icon: c.icon, name: c.name, lv: s.lv, evo: !!CONFIG.evolutions[s.id] };
          }),
        };
        if (typeof Storage !== 'undefined') Storage.recordRun(this.report);
        this.state = 'death';
      }
    } else {
      UI.update(dt);
    }
  },

  render() {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = '#050508';
    ctx.fillRect(0, 0, CONFIG.canvas.w, CONFIG.canvas.h);
    if (this.state === 'loading') { this.drawLoading(ctx); return; }
    if (this.state === 'menu') {
      UI.drawMenu(ctx, this.menuT);
      if (typeof TalentsUI !== 'undefined' && TalentsUI.open) TalentsUI.draw(ctx);
      if (typeof Craft !== 'undefined' && Craft.open) Craft.draw(ctx);
      return;
    }
    if (this.state === 'wheel') {
      UI.drawDeath(ctx);
      if (typeof Wheel !== 'undefined') Wheel.draw(ctx);
      UI.drawToasts(ctx);
      return;
    }
    // 战斗关键资源未真正加载完成且未触发兜底强制进入时，显示加载界面避免黑屏/空战斗
    if (!Assets.battleReady(this.classId) && !this._battleForceReady) {
      this.drawBattleLoading(ctx);
      UI.drawToasts(ctx);
      return;
    }
    this.drawWorld(ctx);
    this.applyBloom(ctx);
    UI.drawHUD(ctx);
    if (this.state === 'upgrade') UI.drawUpgrade(ctx);
    else if (this.state === 'pause') UI.drawPause(ctx);
    else if (this.state === 'dying') UI.drawDying(ctx);
    else if (this.state === 'death') UI.drawDeath(ctx);
    UI.drawToasts(ctx);
  },

  applyBloom(ctx) {
    const W = CONFIG.canvas.w, H = CONFIG.canvas.h;
    // P0：渐变对象缓存，避免每帧 createRadialGradient
    if (!this._bloomGrad) {
      const g = ctx.createRadialGradient(W / 2, H / 2, W * 0.3, W / 2, H / 2, W * 0.72);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,0.45)');
      this._bloomGrad = g;
    }
    ctx.save();
    ctx.fillStyle = this._bloomGrad;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  },

  drawWorld(ctx) {
    const W = CONFIG.canvas.w, H = CONFIG.canvas.h;
    const bg = Assets.img('maps/broken_dragon_palace_bg.png');
    if (bg) {
      const tw = bg.naturalWidth, th = bg.naturalHeight;
      const ox = ((-Engine.cam.x % tw) + tw) % tw - tw;
      const oy = ((-Engine.cam.y % th) + th) % th - th;
      for (let x = ox; x < W; x += tw) {
        for (let y = oy; y < H; y += th) {
          ctx.drawImage(bg, x + Engine.cam.sx, y + Engine.cam.sy);
        }
      }
      ctx.fillStyle = 'rgba(4,4,10,0.42)';
      ctx.fillRect(0, 0, W, H);
    }
    Skills.drawZones(ctx);
    Enemies.drawDrops(ctx);
    Skills.drawSummons(ctx);
    Enemies.draw(ctx);
    Player.draw(ctx);
    Skills.drawProjectiles(ctx);
    Skills.drawAuras(ctx);
    FX.draw(ctx);
    const fog = Assets.img('maps/black_fog_edge_overlay.png');
    if (fog) {
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.drawImage(fog, 0, 0, W, H);
      ctx.restore();
    }
  },

  drawLoading(ctx) {
    UI.goldText(ctx, '无尽入侵', 360, 560, 46);
    const p = this.loadProgress || 0;
    ctx.fillStyle = 'rgba(201,168,106,0.25)';
    ctx.fillRect(210, 620, 300, 6);
    ctx.fillStyle = '#c9a86a';
    ctx.fillRect(210, 620, 300 * p, 6);
    ctx.fillStyle = 'rgba(200,200,210,0.7)';
    ctx.font = '15px "PingFang SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('档案解封中 ' + Math.round(p * 100) + '%', 360, 660);
  },

  // 战斗资源加载界面（远程慢网下进战斗时显示，避免黑屏/空战斗）
  drawBattleLoading(ctx) {
    UI.goldText(ctx, '战场加载中', 360, 580, 36);
    // 如实反映 3 个关键战斗资源（背景/人物/小怪）的就绪数，避免整体进度显示 100% 却仍在等待的误导
    const c = CONFIG.classes[this.classId] || CONFIG.classes[CONFIG.classOrder[0]];
    const keys = ['maps/broken_dragon_palace_bg.png', c.idle, 'enemies/grunt_move.png'];
    const done = keys.filter(k => Assets.img(k)).length;
    ctx.fillStyle = 'rgba(201,168,106,0.25)';
    ctx.fillRect(210, 630, 300, 6);
    ctx.fillStyle = '#c9a86a';
    ctx.fillRect(210, 630, 300 * (done / keys.length), 6);
    ctx.fillStyle = 'rgba(200,200,210,0.7)';
    ctx.font = '15px "PingFang SC", sans-serif';
    ctx.textAlign = 'center';
    const dots = '.'.repeat(1 + (Math.floor((this._battleLoadT || 0) * 2) % 3));
    ctx.fillText('战斗资源载入 ' + done + '/' + keys.length + dots, 360, 670);
  },

  tryOpenUpgrade() {
    if (this.state !== 'battle' || Player.pendingLevels <= 0) return;
    this.choices = Skills.genChoices();
    this.state = 'upgrade';
  },

  pickChoice(choice) {
    Skills.applyChoice(choice);
    Player.pendingLevels--;
    if (Player.pendingLevels > 0) this.choices = Skills.genChoices();
    else this.state = 'battle';
  },

  togglePause() {
    if (this.state === 'battle') this.state = 'pause';
    else if (this.state === 'pause') this.state = 'battle';
  },

  pauseAction(id) {
    if (id === 'resume') this.state = 'battle';
    else if (id === 'restart') this.start(this.classId);
    else if (id === 'menu') this.state = 'menu';
  },

  onDeath() {
    if (this.state !== 'battle') return;
    this.state = 'dying';
    this.dyingT = 1.4;
    if (typeof SFX !== 'undefined') SFX.play('death');
    Engine.addShake(12, true); // P0：大震动通道
  },

  applyGoblinReward() {
    const r = M.choice(CONFIG.goblinRewards);
    if (r.id === 'heal') Player.heal(Player.maxHp * 0.4);
    else if (r.id === 'dmg') Player.dmgMult += 0.10;
    else if (r.id === 'magnet') Player.pickup *= 1.4;
    else if (r.id === 'skill') {
      const ups = Skills.owned.filter(s => !CONFIG.evolutions[s.id] && s.lv < 5);
      if (ups.length) { const s = M.choice(ups); s.lv++; Skills.onLevelUp(s.id); }
      else Player.dmgMult += 0.08;
    }
    UI.toast('缴获稀有奖励：' + r.name + '（' + r.desc + '）');
    FX.ring(Player.x, Player.y, 20, 160, '#ffd75e', 0.5, 5);
  },

  onTap(x, y) { UI.tap(x, y); },

  onKey(code) {
    if (code === 'Space') {
      if (this.state === 'battle') Player.castActive();
    } else if (code === 'Escape' || code === 'KeyP') {
      if (this.state === 'battle' || this.state === 'pause') this.togglePause();
    }
  },
};

// 启动（兼容动态加载：若 window load 已触发则立即初始化）
if (document.readyState === 'complete') Game.init();
else window.addEventListener('load', () => Game.init());
