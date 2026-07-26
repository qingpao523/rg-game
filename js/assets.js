// 资源加载与白剪影缓存（受击闪白用）
const Assets = {
  images: {},
  whites: {},
  _embed: {}, // 内嵌资源（ASSETS_EMBED base64）的 Image 缓存
  loaded: 0,
  total: 0,
  failed: [],

  // 内嵌路径清单（与 tools/embed_assets.js 一致）：这些资源走 base64，不发网络请求
  EMBEDDED_PATHS: {
    'maps/broken_dragon_palace_bg.png': 1, 'maps/black_fog_edge_overlay.png': 1,
    'characters/taoist_idle.png': 1, 'characters/taoist_move.png': 1,
    'characters/samurai_idle.png': 1, 'characters/samurai_move.png': 1,
    'characters/pharaoh_idle.png': 1, 'characters/pharaoh_move.png': 1,
    'characters/ice_witch_idle.png': 1, 'characters/ice_witch_move.png': 1,
    'characters/crusader_idle.png': 1, 'characters/crusader_move.png': 1,
    'enemies/grunt_move.png': 1, 'enemies/charger_move.png': 1, 'enemies/charger_charge.png': 1,
    'enemies/elite_move.png': 1, 'enemies/goblin_run.png': 1,
  },

  _isEmbeddedPath(path) { return !!this.EMBEDDED_PATHS[path]; },

  // 资源内嵌数据是否已就绪（ASSETS_EMBED 异步加载完成后才可用）
  _isEmbedded(path) {
    return typeof ASSETS_EMBED !== 'undefined' && !!ASSETS_EMBED[path];
  },

  buildManifest() {
    const set = new Set(CONFIG.assetsExtra);
    for (const id in CONFIG.skills) set.add(CONFIG.skills[id].icon);
    for (const id in CONFIG.evolutions) set.add(CONFIG.evolutions[id].icon);
    for (const id in CONFIG.actives) set.add(CONFIG.actives[id].icon);
    for (const cid of CONFIG.classOrder) {
      const c = CONFIG.classes[cid];
      set.add(c.portrait); set.add(c.idle); set.add(c.move);
    }
    return [...set];
  },

  // 菜单关键资源前缀（这些先加载，加载完即可进入游戏，其余后台加载）
  ESSENTIAL_PREFIXES: ['menu/', 'portraits/', 'ui/button', 'ui/class_select_card', 'ui/portrait_frame'],

  _isEssential(path) {
    return this.ESSENTIAL_PREFIXES.some(p => path.startsWith(p));
  },

  loadAll(onProgress, onDone) {
    // 已内嵌的资源（base64 随代码加载）一律不发网络请求，直接跳过
    const list = this.buildManifest().filter(p => !this._isEmbeddedPath(p));
    this.total = list.length;
    const essentialList = list.filter(p => this._isEssential(p));
    const deferredList = list.filter(p => !this._isEssential(p));
    this._essentialTotal = essentialList.length;

    let finished = 0;
    let essentialDone = 0;
    let menuReady = false;
    const TIMEOUT = 8000; // 单图加载超时兜底，防止某图挂起卡死在 98%

    const step = (path, ok, isEssential) => {
      finished++;
      this.loaded = finished;
      if (isEssential) {
        essentialDone++;
        onProgress(essentialDone, essentialList.length); // 进度条反映关键资源进度
      }
      // 关键资源全部就绪 → 立即进入游戏（不等其余资源）
      if (!menuReady && essentialDone >= essentialList.length) {
        menuReady = true;
        onDone();
      }
    };

    const loadOne = (path, isEssential) => {
      const img = new Image();
      let settled = false;
      const settle = (ok) => {
        if (settled) return;
        settled = true;
        if (!ok) this.failed.push(path);
        step(path, ok, isEssential);
      };
      img.onload = () => settle(true);
      img.onerror = () => settle(false);
      // 超时兜底：图加载挂起时强制结束，避免卡死
      img._timeout = setTimeout(() => settle(false), TIMEOUT);
      img.addEventListener('load', () => clearTimeout(img._timeout));
      img.addEventListener('error', () => clearTimeout(img._timeout));
      img.src = 'assets/' + path + '?v=' + (window.GAME_VERSION || '1');
      this.images[path] = img;
    };

    // 第一阶段：关键资源（菜单必需），加载完即可进入游戏
    for (const path of essentialList) loadOne(path, true);
    // 第二阶段：其余资源后台加载（不阻塞进入游戏）
    for (const path of deferredList) loadOne(path, false);

    // 兜底：即使关键资源超时，也保证最终能进入游戏
    setTimeout(() => { if (!menuReady) { menuReady = true; onDone(); } }, TIMEOUT + 1000);
  },

  img(path) {
    // 内嵌路径：走 base64（随代码加载），ASSETS_EMBED 未就绪时返回 null 等待，绝不回退网络
    if (this._isEmbeddedPath(path)) {
      if (!this._isEmbedded(path)) return null;
      let e = this._embed[path];
      if (!e) { e = new Image(); e.src = ASSETS_EMBED[path]; this._embed[path] = e; }
      return (e.complete && e.naturalWidth > 0) ? e : null;
    }
    const i = this.images[path];
    return i && i.complete && i.naturalWidth > 0 ? i : null;
  },

  // 战斗关键资源是否"真正加载完成"（地图背景 + 当前职业精灵 + 基础小怪）。
  // 注意：必须用 img() 判断真实加载，不能用"失败/超时即就绪"——慢网下资源 8s 超时
  // 被标记 failed 但其实仍在下载，若当作就绪会直接渲染出资源缺失的空战斗（背景/人物/怪物全 invisible）。
  // 真正加载完成前由 main.js 展示加载界面；确实加载失败（404）时由 main.js 的兜底计时器强制进入，避免软锁。
  battleReady(classId) {
    const c = CONFIG.classes[classId] || CONFIG.classes[CONFIG.classOrder[0]];
    return !!this.img('maps/broken_dragon_palace_bg.png')
      && !!this.img(c.idle)
      && !!this.img('enemies/grunt_move.png');
  },

  // 重新加载已失败/超时的资源。慢网超时的资源往往还能下完，404 的也值得重试一次。
  // 进入战斗时与战斗中定期调用，配合 battleReady 的真实加载判断，最大化资源可用率。
  retryFailed() {
    if (!this.failed.length) return;
    const retry = this.failed.slice();
    this.failed = [];
    for (const path of retry) this._reload(path);
  },

  _reload(path) {
    const img = new Image();
    img.onerror = () => { if (!this.failed.includes(path)) this.failed.push(path); };
    img.src = 'assets/' + path + '?v=' + (window.GAME_VERSION || '1') + '&r=' + (this._retryN = (this._retryN || 0) + 1);
    this.images[path] = img;
  },

  // 白色剪影：受击闪白
  white(path) {
    if (this.whites[path]) return this.whites[path];
    const src = this.img(path);
    if (!src) return null;
    const c = document.createElement('canvas');
    c.width = src.naturalWidth; c.height = src.naturalHeight;
    const x = c.getContext('2d');
    x.drawImage(src, 0, 0);
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = '#ffffff';
    x.fillRect(0, 0, c.width, c.height);
    this.whites[path] = c;
    return c;
  },

  // 通用精灵绘制：以 (x,y) 为脚底中心，按高度等比绘制，可带浮动/倾斜/脉冲/闪白
  drawSprite(ctx, path, x, y, h, opts) {
    const img = this.img(path);
    if (!img) return;
    opts = opts || {};
    const w = h * img.naturalWidth / img.naturalHeight;
    const bob = opts.bob || 0;
    const tilt = opts.tilt || 0;
    const scale = opts.pulse || 1;
    ctx.save();
    ctx.translate(x, y + bob);
    if (tilt) ctx.rotate(tilt);
    if (opts.flip) ctx.scale(-1, 1);
    ctx.scale(scale, scale);
    if (opts.alpha != null) ctx.globalAlpha = opts.alpha;
    ctx.drawImage(img, -w / 2, -h, w, h);
    if (opts.flash > 0) {
      const wh = this.white(path);
      if (wh) {
        ctx.globalAlpha = Math.min(1, opts.flash * 6);
        ctx.drawImage(wh, -w / 2, -h, w, h);
      }
    }
    ctx.restore();
  },
};
