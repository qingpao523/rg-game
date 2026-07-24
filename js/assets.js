// 资源加载与白剪影缓存（受击闪白用）
const Assets = {
  images: {},
  whites: {},
  loaded: 0,
  total: 0,
  failed: [],

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

  loadAll(onProgress, onDone) {
    const list = this.buildManifest();
    this.total = list.length;
    let finished = 0;
    const step = () => { finished++; this.loaded = finished; onProgress(finished, this.total); if (finished >= this.total) onDone(); };
    for (const path of list) {
      const img = new Image();
      img.onload = step;
      img.onerror = () => { this.failed.push(path); step(); };
      img.src = 'assets/' + path;
      this.images[path] = img;
    }
  },

  img(path) {
    const i = this.images[path];
    return i && i.complete && i.naturalWidth > 0 ? i : null;
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
