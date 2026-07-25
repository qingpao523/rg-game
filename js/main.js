// 主循环、场景切换、全局状态
const Game = {
  state: 'loading', // loading / menu / battle / upgrade / pause / dying / death
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
      () => { this.state = 'menu'; }
    );
    requestAnimationFrame((ts) => this.loop(ts));
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
    this.state = 'battle';
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
    if (this.state === 'menu') { this.menuT += dt; UI.update(dt); return; }
    if (this.state === 'battle') {
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
    else if (r.id === 'mana') { Player.maxMana += 25; Player.mana = Player.maxMana; }
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

window.addEventListener('load', () => Game.init());
