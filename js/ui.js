// HUD、主菜单、升级三选一、暂停、处置报告
const UI = {
  toasts: [],
  bannerState: null,
  redPulseT: 0, // 精英出场红边脉冲剩余时间
  menuCards: [],
  upgradeCards: [],
  pauseButtons: [],
  deathButtons: [],
  pauseBtn: { x: 672, y: 160, r: 26 },
  activeBtn: { x: 614, y: 1064, r: 56 },

  reset() { this.toasts.length = 0; this.bannerState = null; this.redPulseT = 0; this._redPulseDur = 0; },
  toast(msg) { this.toasts.push({ msg, t: 0, life: 3 }); if (this.toasts.length > 4) this.toasts.shift(); },
  banner(text, sub) { this.bannerState = { text, sub: sub || '', t: 0, life: 2.2 }; },
  redPulse(dur) { this.redPulseT = dur; this._redPulseDur = dur; }, // 精英出场：屏幕红边脉冲

  update(dt) {
    for (let i = this.toasts.length - 1; i >= 0; i--) {
      const t = this.toasts[i];
      t.t += dt;
      if (t.t > t.life) this.toasts.splice(i, 1);
    }
    if (this.bannerState) {
      this.bannerState.t += dt;
      if (this.bannerState.t > this.bannerState.life) this.bannerState = null;
    }
    this.redPulseT = Math.max(0, this.redPulseT - dt);
  },

  fmtTime(s) {
    const m = Math.floor(s / 60), ss = Math.floor(s % 60);
    return (m < 10 ? '0' + m : m) + ':' + (ss < 10 ? '0' + ss : ss);
  },

  wrapText(ctx, text, maxW) {
    const lines = [];
    let line = '';
    for (const ch of text) {
      if (ctx.measureText(line + ch).width > maxW && line) { lines.push(line); line = ch; }
      else line += ch;
    }
    if (line) lines.push(line);
    return lines;
  },

  goldText(ctx, text, x, y, size, align) {
    ctx.save();
    ctx.font = `bold ${size}px "PingFang SC", "Microsoft YaHei", serif`;
    ctx.textAlign = align || 'center';
    const g = ctx.createLinearGradient(x, y - size, x, y + 6);
    g.addColorStop(0, '#f0d9a0');
    g.addColorStop(0.5, '#c9a86a');
    g.addColorStop(1, '#8a6a3a');
    ctx.fillStyle = g;
    ctx.shadowColor = 'rgba(201,168,106,0.45)';
    ctx.shadowBlur = 14;
    ctx.fillText(text, x, y);
    ctx.restore();
  },

  // ---------- 主菜单 ----------
  drawMenu(ctx, t) {
    const W = CONFIG.canvas.w, H = CONFIG.canvas.h;
    const bg = Assets.img('menu/main_menu_bg.png');
    if (bg) {
      const s = Math.max(W / bg.naturalWidth, H / bg.naturalHeight);
      const bw = bg.naturalWidth * s, bh = bg.naturalHeight * s;
      ctx.drawImage(bg, (W - bw) / 2, (H - bh) / 2, bw, bh);
    }
    ctx.fillStyle = 'rgba(5,5,10,0.55)';
    ctx.fillRect(0, 0, W, H);

    const logo = Assets.img('menu/title_logo.png');
    if (logo) {
      const lw = 620, lh = lw * logo.naturalHeight / logo.naturalWidth;
      ctx.drawImage(logo, (W - lw) / 2, 60, lw, lh);
    }
    this.goldText(ctx, '无尽入侵', W / 2, 214, 58);

    // 声音开关按钮（主菜单右上角）
    const sfxOn = (typeof SFX !== 'undefined') && SFX.enabled;
    const sb = { x: W - 76, y: 40, w: 56, h: 40 };
    ctx.save();
    ctx.fillStyle = sfxOn ? 'rgba(201,168,106,0.25)' : 'rgba(60,60,70,0.4)';
    ctx.strokeStyle = 'rgba(201,168,106,0.5)';
    this.rr(ctx, sb.x, sb.y, sb.w, sb.h, 8);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = sfxOn ? '#f0d9a0' : 'rgba(150,150,160,0.6)';
    ctx.font = '18px "PingFang SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(sfxOn ? '🔊' : '🔇', sb.x + sb.w / 2, sb.y + 27);
    ctx.restore();
    this.sfxBtn = sb;
    ctx.save();
    ctx.font = '18px "PingFang SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(201,168,106,0.85)';
    ctx.fillText('裂 界 处 置 档 案 · VOID BREACH', W / 2, 372);
    ctx.strokeStyle = 'rgba(201,168,106,0.4)';
    ctx.beginPath(); ctx.moveTo(160, 392); ctx.lineTo(560, 392); ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.font = '15px "PingFang SC", sans-serif';
    ctx.fillStyle = 'rgba(200,200,210,0.7)';
    ctx.textAlign = 'center';
    ctx.fillText('选择执契者，进入裂界', W / 2, 428);
    ctx.restore();

    this.menuCards = [];
    const cw = 600, ch = 112, x0 = (W - cw) / 2;
    let y = 452;
    for (const cid of CONFIG.classOrder) {
      const c = CONFIG.classes[cid];
      const bob = Math.sin(t * 1.6 + x0 + y) * 1.5;
      ctx.save();
      ctx.translate(0, bob);
      ctx.fillStyle = 'rgba(14,14,22,0.88)';
      ctx.strokeStyle = 'rgba(201,168,106,0.55)';
      ctx.lineWidth = 1.5;
      this.rr(ctx, x0, y, cw, ch, 10);
      ctx.fill(); ctx.stroke();

      const p = Assets.img(c.portrait);
      if (p) {
        ctx.save();
        this.rr(ctx, x0 + 12, y + 12, 88, 88, 8);
        ctx.clip();
        ctx.drawImage(p, x0 + 12, y + 12, 88, 88);
        ctx.restore();
        ctx.strokeStyle = 'rgba(201,168,106,0.7)';
        this.rr(ctx, x0 + 12, y + 12, 88, 88, 8);
        ctx.stroke();
      }
      ctx.textAlign = 'left';
      ctx.fillStyle = '#f0d9a0';
      ctx.font = 'bold 26px "PingFang SC", serif';
      ctx.fillText(c.name, x0 + 118, y + 40);
      ctx.fillStyle = 'rgba(201,168,106,0.75)';
      ctx.font = '15px "PingFang SC", sans-serif';
      ctx.fillText(c.title, x0 + 118 + ctx.measureText(c.name).width + 34, y + 39);
      ctx.fillStyle = 'rgba(220,220,230,0.85)';
      ctx.font = '15px "PingFang SC", sans-serif';
      ctx.fillText('主动技 · ' + CONFIG.actives[c.active].name + '　' + c.passiveDesc, x0 + 118, y + 68);
      ctx.fillStyle = 'rgba(160,160,175,0.7)';
      ctx.font = '13px "PingFang SC", sans-serif';
      ctx.fillText(c.desc, x0 + 118, y + 93);
      ctx.restore();
      this.menuCards.push({ x: x0, y, w: cw, h: ch, classId: cid });
      y += ch + 12;
    }

    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(180,180,195,0.6)';
    ctx.font = '14px "PingFang SC", sans-serif';
    ctx.fillText('WASD / 方向键 / 左下摇杆移动 · 空格 / 右下按钮释放主动技', W / 2, y + 26);
    ctx.fillStyle = 'rgba(201,168,106,0.5)';
    ctx.fillText('生存 8-12 分钟 · 拦截哥布林 · 解锁高危处置方案', W / 2, y + 52);
    ctx.restore();

    // P1：天赋之树入口按钮
    const save = (typeof Storage !== 'undefined') ? Storage.Load() : { level: 1, talentPoints: 0, achievements: [] };
    const tbw = 320, tbh = 64, tbx = (W - tbw) / 2, tby = y + 72;
    ctx.save();
    ctx.fillStyle = 'rgba(28,24,12,0.92)';
    ctx.strokeStyle = 'rgba(201,168,106,0.85)';
    ctx.lineWidth = 2;
    this.rr(ctx, tbx, tby, tbw, tbh, 12);
    ctx.fill(); ctx.stroke();
    this.goldText(ctx, '天 赋 之 树', W / 2, tby + 30, 24);
    ctx.font = '13px "PingFang SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(200,200,210,0.8)';
    ctx.fillText('局外 Lv.' + save.level + ' · 通用点 ' + (save.generalTalentPoints || 0) + ' · 专精点 ' + (save.specialistTalentPoints || 0) + ' · 成就 ' + (save.achievements ? save.achievements.length : 0) + '/12', W / 2, tby + 52);
    ctx.restore();
    this.talentBtn = { x: tbx, y: tby, w: tbw, h: tbh };

    // P1：武器库 + 背包按钮（左右并排）
    const bw2 = 150, bh2 = 48, gap2 = 20;
    const bx2 = (W - bw2 * 2 - gap2) / 2, by2 = tby + tbh + 12;
    const defs2 = [['武器库', 'craft'], ['背包', 'backpack']];
    this.menuExtraBtns = [];
    defs2.forEach((d, i) => {
      const x = bx2 + i * (bw2 + gap2);
      ctx.save();
      ctx.fillStyle = 'rgba(20,18,10,0.9)';
      ctx.strokeStyle = 'rgba(201,168,106,0.7)';
      ctx.lineWidth = 1.5;
      this.rr(ctx, x, by2, bw2, bh2, 10);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#c9a86a';
      ctx.font = 'bold 17px "PingFang SC", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(d[0], x + bw2 / 2, by2 + 30);
      ctx.restore();
      this.menuExtraBtns.push({ x, y: by2, w: bw2, h: bh2, id: d[1] });
    });
  },

  // ---------- HUD ----------
  drawHUD(ctx) {
    const W = CONFIG.canvas.w;
    // 经验条
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, W, 10);
    // P0：渐变缓存，避免每帧 createLinearGradient
    if (!this._expGrad) {
      const eg = ctx.createLinearGradient(0, 0, W, 0);
      eg.addColorStop(0, '#8a6a3a'); eg.addColorStop(1, '#f0d9a0');
      this._expGrad = eg;
    }
    ctx.fillStyle = this._expGrad;
    ctx.fillRect(0, 0, W * Math.min(1, Player.exp / Player.expNeed), 10);

    // 头像
    const px = 58, py = 92;
    const portrait = Assets.img(Player.cfg.portrait);
    ctx.save();
    ctx.beginPath(); ctx.arc(px, py, 36, 0, Math.PI * 2); ctx.clip();
    if (portrait) ctx.drawImage(portrait, px - 36, py - 36, 72, 72);
    ctx.restore();
    ctx.strokeStyle = 'rgba(201,168,106,0.85)';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(px, py, 36, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#0c0c14';
    ctx.beginPath(); ctx.arc(px, py + 40, 17, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(201,168,106,0.7)';
    ctx.beginPath(); ctx.arc(px, py + 40, 17, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#f0d9a0';
    ctx.font = 'bold 15px "PingFang SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(Player.level, px, py + 45);

    // 血条
    this.bar(ctx, 108, 74, 300, 20, Player.hp / Player.maxHp, '#c0392b', '#5a1512', Math.ceil(Player.hp) + ' / ' + Player.maxHp);

    // 右上信息
    ctx.textAlign = 'right';
    ctx.fillStyle = '#e8e2d2';
    ctx.font = 'bold 24px "PingFang SC", sans-serif';
    ctx.fillText(this.fmtTime(Game.time), 700, 52);
    ctx.font = '16px "PingFang SC", sans-serif';
    ctx.fillStyle = 'rgba(201,168,106,0.9)';
    ctx.fillText('第 ' + Enemies.wave + ' 波', 700, 78);
    ctx.fillStyle = 'rgba(200,200,210,0.85)';
    ctx.fillText('击杀 ' + Enemies.kills, 700, 102);

    // 暂停按钮
    ctx.fillStyle = 'rgba(12,12,20,0.75)';
    ctx.beginPath(); ctx.arc(this.pauseBtn.x, this.pauseBtn.y, this.pauseBtn.r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(201,168,106,0.6)';
    ctx.stroke();
    ctx.fillStyle = '#c9a86a';
    ctx.fillRect(this.pauseBtn.x - 7, this.pauseBtn.y - 9, 5, 18);
    ctx.fillRect(this.pauseBtn.x + 2, this.pauseBtn.y - 9, 5, 18);

    // 技能栏（自适应 8 格）
    const n = CONFIG.skillSlots, size = 48, gap = 6;
    const x0 = (W - (n * size + (n - 1) * gap)) / 2, sy = 1212;
    for (let i = 0; i < n; i++) {
      const x = x0 + i * (size + gap);
      ctx.fillStyle = 'rgba(12,12,20,0.8)';
      ctx.strokeStyle = 'rgba(120,110,90,0.4)';
      this.rr(ctx, x, sy, size, size, 8);
      ctx.fill(); ctx.stroke();
      const s = Skills.owned[i];
      if (s) {
        const c = Skills.cfgOf(s.id);
        const icon = Assets.img(c.icon);
        if (icon) ctx.drawImage(icon, x + 3, sy + 3, size - 6, size - 6);
        if (CONFIG.evolutions[s.id]) {
          ctx.strokeStyle = '#f0d9a0';
          ctx.lineWidth = 2;
          this.rr(ctx, x, sy, size, size, 8);
          ctx.stroke();
        }
        ctx.fillStyle = '#0c0c14';
        ctx.beginPath(); ctx.arc(x + size - 9, sy + size - 9, 10, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#f0d9a0';
        ctx.font = 'bold 11px "PingFang SC", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(CONFIG.evolutions[s.id] ? 'EX' : s.lv, x + size - 9, sy + size - 5);
      }
    }

    // 主动技按钮
    const ab = this.activeBtn;
    const frame = Assets.img('ui/active_skill_button.png');
    if (frame) ctx.drawImage(frame, ab.x - 70, ab.y - 70, 140, 140);
    else {
      ctx.fillStyle = 'rgba(12,12,20,0.85)';
      ctx.beginPath(); ctx.arc(ab.x, ab.y, ab.r, 0, Math.PI * 2); ctx.fill();
    }
    const acfg = CONFIG.actives[Player.cfg.active];
    const aicon = Assets.img(acfg.icon);
    if (aicon) ctx.drawImage(aicon, ab.x - 40, ab.y - 40, 80, 80);
    if (Player.activeCd > 0) {
      const k = Player.activeCd / Player.activeCdMax;
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.68)';
      ctx.beginPath();
      ctx.moveTo(ab.x, ab.y);
      ctx.arc(ab.x, ab.y, ab.r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 22px "PingFang SC", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(Math.ceil(Player.activeCd), ab.x, ab.y + 8);
      ctx.restore();
    }
    ctx.fillStyle = '#8fd3ff';
    ctx.font = 'bold 14px "PingFang SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('主动技', ab.x, ab.y + 76);
    ctx.fillStyle = 'rgba(200,200,210,0.55)';
    ctx.font = '12px "PingFang SC", sans-serif';
    ctx.fillText(acfg.name + ' Lv.' + Player.activeLv(), ab.x, ab.y - 66);

    // 摇杆
    const j = Engine.joy;
    if (j.active) {
      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = '#c9a86a';
      ctx.beginPath(); ctx.arc(j.ox, j.oy, 80, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.5;
      ctx.beginPath(); ctx.arc(j.ox + j.dx * 70, j.oy + j.dy * 70, 34, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    } else {
      ctx.save();
      ctx.globalAlpha = 0.07;
      ctx.fillStyle = '#c9a86a';
      ctx.beginPath(); ctx.arc(140, 1064, 80, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    this.drawGoblinArrow(ctx);
    this.drawBanner(ctx);

    // 精英出场：屏幕红边脉冲（P1 修复：衰减时长与 redPulse(dur) 挂钩；P0：渐变缓存，透明度用 globalAlpha 控制）
    if (this.redPulseT > 0) {
      const k = this.redPulseT / (this._redPulseDur || 1.5);
      const a = (0.28 + Math.sin(Game.time * 18) * 0.12) * Math.min(1, k * 2.5);
      if (!this._redPulseGrad) {
        const g = ctx.createRadialGradient(360, 640, 320, 360, 640, 740);
        g.addColorStop(0, 'rgba(200,0,0,0)');
        g.addColorStop(1, 'rgba(220,30,30,1)');
        this._redPulseGrad = g;
      }
      ctx.save();
      ctx.globalAlpha = Math.max(0, a);
      ctx.fillStyle = this._redPulseGrad;
      ctx.fillRect(0, 0, W, CONFIG.canvas.h);
      ctx.restore();
    }

    // 低血量警告（P0：渐变缓存）
    if (Player.hp / Player.maxHp < 0.3) {
      if (!this._lowHpGrad) {
        const g = ctx.createRadialGradient(360, 640, 380, 360, 640, 760);
        g.addColorStop(0, 'rgba(160,0,0,0)');
        g.addColorStop(1, 'rgba(160,0,0,0.35)');
        this._lowHpGrad = g;
      }
      ctx.fillStyle = this._lowHpGrad;
      ctx.fillRect(0, 0, W, CONFIG.canvas.h);
    }
  },

  drawGoblinArrow(ctx) {
    const g = Enemies.goblin;
    if (!g || g.dead) return;
    const gx = Engine.SX(g.x), gy = Engine.SY(g.y);
    const cx = 360, cy = 640;
    const onScreen = gx > 60 && gx < 660 && gy > 120 && gy < 1160;
    const img = Assets.img('ui/goblin_direction_arrow.png');
    const pulse = 1 + Math.sin(Game.time * 6) * 0.12;
    ctx.save();
    if (onScreen) {
      ctx.translate(gx, gy - g.r * 2 - 40);
      ctx.scale(pulse, pulse);
      if (img) ctx.drawImage(img, -20, -30, 40, 60);
    } else {
      const ang = Math.atan2(gy - cy, gx - cx);
      const rx = 280, ry = 500;
      let ex = cx + Math.cos(ang) * rx, ey = cy + Math.sin(ang) * ry;
      ex = M.clamp(ex, 56, 664); ey = M.clamp(ey, 140, 1150);
      ctx.translate(ex, ey);
      ctx.rotate(ang + Math.PI / 2);
      ctx.scale(pulse, pulse);
      if (img) ctx.drawImage(img, -24, -36, 48, 72);
      ctx.rotate(-(ang + Math.PI / 2));
      ctx.fillStyle = '#ffd75e';
      ctx.font = 'bold 14px "PingFang SC", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('宝', 0, 46);
    }
    ctx.restore();
  },

  drawToasts(ctx) {
    ctx.textAlign = 'center';
    this.toasts.forEach((t, i) => {
      const k = t.t / t.life;
      ctx.save();
      ctx.globalAlpha = k < 0.8 ? 1 : (1 - k) * 5;
      ctx.font = 'bold 17px "PingFang SC", sans-serif';
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      const y = 210 + i * 30;
      const w = ctx.measureText(t.msg).width + 30;
      this.rr(ctx, 360 - w / 2, y - 19, w, 26, 13);
      ctx.fill();
      ctx.fillStyle = '#f0d9a0';
      ctx.fillText(t.msg, 360, y);
      ctx.restore();
    });
  },

  drawBanner(ctx) {
    const b = this.bannerState;
    if (!b) return;
    const k = b.t / b.life;
    ctx.save();
    ctx.globalAlpha = k < 0.15 ? k / 0.15 : k > 0.7 ? (1 - k) / 0.3 : 1;
    this.goldText(ctx, b.text, 360, 420, 44);
    if (b.sub) {
      ctx.font = '17px "PingFang SC", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(220,215,200,0.85)';
      ctx.fillText(b.sub, 360, 456);
    }
    ctx.restore();
  },

  // ---------- 升级三选一 ----------
  drawUpgrade(ctx) {
    const W = CONFIG.canvas.w, H = CONFIG.canvas.h;
    ctx.fillStyle = 'rgba(4,4,10,0.78)';
    ctx.fillRect(0, 0, W, H);

    this.goldText(ctx, '魔契之书 · Lv.' + Player.level + ' 条目重写', W / 2, 300, 34);
    ctx.save();
    ctx.font = '16px "PingFang SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(200,200,210,0.75)';
    ctx.fillText('选择一条重写结果（剩余 ' + Player.pendingLevels + ' 次）', W / 2, 334);
    ctx.restore();

    this.upgradeCards = [];
    const cw = 192, chh = 500, y0 = 380;
    const xs = [64, 264, 464];
    Game.choices.forEach((ch, i) => {
      const d = Skills.describe(ch);
      const x = xs[i];
      ctx.save();
      ctx.fillStyle = d.evo ? 'rgba(38,30,12,0.95)' : 'rgba(18,18,28,0.95)';
      ctx.strokeStyle = d.evo ? '#f0d9a0' : 'rgba(150,140,110,0.5)';
      ctx.lineWidth = d.evo ? 3 : 1.5;
      if (d.evo) { ctx.shadowColor = 'rgba(240,217,160,0.5)'; ctx.shadowBlur = 18; }
      this.rr(ctx, x, y0, cw, chh, 12);
      ctx.fill(); ctx.stroke();
      ctx.restore();

      if (d.evo) {
        ctx.save();
        ctx.fillStyle = '#f0d9a0';
        this.rr(ctx, x + 16, y0 + 14, cw - 32, 26, 13);
        ctx.fill();
        ctx.fillStyle = '#4a3208';
        ctx.font = 'bold 14px "PingFang SC", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('高危处置方案解锁', x + cw / 2, y0 + 32);
        ctx.restore();
      }

      if (d.icon) {
        const icon = Assets.img(d.icon);
        if (icon) ctx.drawImage(icon, x + cw / 2 - 48, y0 + 56, 96, 96);
      } else {
        ctx.save();
        ctx.fillStyle = 'rgba(201,168,106,0.15)';
        ctx.beginPath(); ctx.arc(x + cw / 2, y0 + 104, 44, 0, Math.PI * 2); ctx.fill();
        this.goldText(ctx, '✦', x + cw / 2, y0 + 122, 44);
        ctx.restore();
      }

      ctx.textAlign = 'center';
      ctx.fillStyle = d.evo ? '#f0d9a0' : '#e8e2d2';
      ctx.font = 'bold 23px "PingFang SC", serif';
      ctx.fillText(d.name, x + cw / 2, y0 + 190);
      ctx.fillStyle = 'rgba(180,180,195,0.8)';
      ctx.font = '14px "PingFang SC", sans-serif';
      ctx.fillText(d.sub, x + cw / 2, y0 + 216);

      ctx.save();
      ctx.fillStyle = 'rgba(201,168,106,0.16)';
      const fw = ctx.measureText(d.flow).width + 24;
      this.rr(ctx, x + cw / 2 - fw / 2, y0 + 232, fw, 24, 12);
      ctx.fill();
      ctx.fillStyle = '#c9a86a';
      ctx.font = '13px "PingFang SC", sans-serif';
      ctx.fillText(d.flow, x + cw / 2, y0 + 249);
      ctx.restore();

      ctx.fillStyle = 'rgba(215,215,225,0.88)';
      ctx.font = '14px "PingFang SC", sans-serif';
      let ly = y0 + 292;
      for (const para of d.lines) {
        for (const line of this.wrapText(ctx, para, cw - 32)) {
          ctx.fillText(line, x + cw / 2, ly);
          ly += 23;
        }
        ly += 8;
      }
      this.upgradeCards.push({ x, y: y0, w: cw, h: chh, choice: ch });
    });

    ctx.save();
    ctx.font = '14px "PingFang SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(160,160,175,0.6)';
    ctx.fillText('技能栏 ' + Skills.owned.length + ' / ' + CONFIG.skillSlots, W / 2, y0 + chh + 44);
    ctx.restore();

    // Bug2：跳过按钮（不选技能直接继续）
    const skipW = 160, skipH = 48, skipX = (W - skipW) / 2, skipY = y0 + chh + 60;
    ctx.save();
    ctx.fillStyle = 'rgba(30,30,42,0.85)';
    ctx.strokeStyle = 'rgba(160,160,175,0.4)';
    ctx.lineWidth = 1;
    this.rr(ctx, skipX, skipY, skipW, skipH, 8);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(200,200,210,0.7)';
    ctx.font = '15px "PingFang SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('跳过本次选择', skipX + skipW / 2, skipY + 30);
    ctx.restore();
    this.skipBtn = { x: skipX, y: skipY, w: skipW, h: skipH };
  },

  // ---------- 暂停 ----------
  drawPause(ctx) {
    const W = CONFIG.canvas.w, H = CONFIG.canvas.h;
    ctx.fillStyle = 'rgba(4,4,10,0.7)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(14,14,22,0.95)';
    ctx.strokeStyle = 'rgba(201,168,106,0.6)';
    this.rr(ctx, 90, 200, 540, 880, 14);
    ctx.fill(); ctx.stroke();
    this.goldText(ctx, '处置暂停', W / 2, 268, 34);

    // 声音开关按钮（右上角）
    const sfxOn = (typeof SFX !== 'undefined') && SFX.enabled;
    const sb = { x: 552, y: 228, w: 56, h: 40 };
    ctx.save();
    ctx.fillStyle = sfxOn ? 'rgba(201,168,106,0.25)' : 'rgba(60,60,70,0.4)';
    ctx.strokeStyle = 'rgba(201,168,106,0.5)';
    this.rr(ctx, sb.x, sb.y, sb.w, sb.h, 8);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = sfxOn ? '#f0d9a0' : 'rgba(150,150,160,0.6)';
    ctx.font = '18px "PingFang SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(sfxOn ? '🔊' : '🔇', sb.x + sb.w / 2, sb.y + 27);
    ctx.restore();
    this.sfxBtn = sb;

    // 当前技能列表
    ctx.fillStyle = '#c9a86a';
    ctx.font = 'bold 16px "PingFang SC", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('当前技能（' + Skills.owned.length + '）', 120, 316);

    const owned = Skills.owned;
    const colW = 240, itemH = 64;
    owned.forEach((s, i) => {
      const c = Skills.cfgOf(s.id);
      if (!c) return;
      const col = i % 2, row = Math.floor(i / 2);
      const x = 120 + col * (colW + 20), y = 336 + row * (itemH + 10);
      const isEvo = !!CONFIG.evolutions[s.id];
      ctx.save();
      ctx.fillStyle = isEvo ? 'rgba(201,168,106,0.12)' : 'rgba(20,20,30,0.8)';
      ctx.strokeStyle = isEvo ? 'rgba(240,217,160,0.6)' : 'rgba(100,100,110,0.3)';
      this.rr(ctx, x, y, colW, itemH, 8);
      ctx.fill(); ctx.stroke();
      const icon = Assets.img(c.icon);
      if (icon) ctx.drawImage(icon, x + 8, y + 8, 48, 48);
      ctx.fillStyle = isEvo ? '#f0d9a0' : '#e8e2d2';
      ctx.font = 'bold 14px "PingFang SC", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(c.name, x + 64, y + 26);
      ctx.fillStyle = isEvo ? '#c9a86a' : 'rgba(160,160,175,0.7)';
      ctx.font = '12px "PingFang SC", sans-serif';
      ctx.fillText(isEvo ? '进化' : 'Lv.' + s.lv, x + 64, y + 46);
      ctx.restore();
    });

    // 按钮区（技能列表下方）
    const btnY = 336 + Math.ceil(owned.length / 2) * (itemH + 10) + 20;
    this.pauseButtons = [];
    const defs = [
      { id: 'resume', text: '继续处置' },
      { id: 'restart', text: '重新进入' },
      { id: 'menu', text: '返回档案室' },
    ];
    defs.forEach((d, i) => {
      const bx = 220, by = btnY + i * 76, bw = 280, bh = 60;
      this.drawButton(ctx, bx, by, bw, bh, d.text, i === 0);
      this.pauseButtons.push({ x: bx, y: by, w: bw, h: bh, id: d.id });
    });
  },

  // ---------- 死亡 / 处置报告 ----------
  drawDying(ctx) {
    const k = 1 - Game.dyingT / 1.4;
    ctx.fillStyle = `rgba(60,0,0,${0.35 * k})`;
    ctx.fillRect(0, 0, CONFIG.canvas.w, CONFIG.canvas.h);
    ctx.save();
    ctx.globalAlpha = Math.min(1, k * 2);
    this.goldText(ctx, '执契者信号中断', 360, 560, 42);
    ctx.restore();
  },

  drawDeath(ctx) {
    const W = CONFIG.canvas.w, H = CONFIG.canvas.h;
    ctx.fillStyle = 'rgba(4,4,10,0.85)';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = 'rgba(14,14,22,0.96)';
    ctx.strokeStyle = 'rgba(201,168,106,0.65)';
    ctx.lineWidth = 2;
    this.rr(ctx, 60, 150, 600, 950, 16);
    ctx.fill(); ctx.stroke();

    this.goldText(ctx, '处 置 报 告', W / 2, 226, 40);
    ctx.save();
    ctx.font = '15px "PingFang SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(160,160,175,0.75)';
    ctx.fillText('执契者 · ' + Player.cfg.name + ' · ' + Player.cfg.title, W / 2, 260);
    ctx.strokeStyle = 'rgba(201,168,106,0.35)';
    ctx.beginPath(); ctx.moveTo(120, 284); ctx.lineTo(600, 284); ctx.stroke();
    ctx.restore();

    const r = Game.report;
    const rows = [
      ['存活时间', this.fmtTime(r.time)],
      ['处置敌人', r.kills + ' 个'],
      ['最终等级', 'Lv.' + r.level],
      ['主导流派', r.flow || '无'],
      ['高危方案解锁', r.evoCount + ' 个'],
      ['抵达波次', '第 ' + r.wave + ' 波'],
    ];
    ctx.textAlign = 'left';
    rows.forEach((row, i) => {
      const y = 336 + i * 46;
      ctx.fillStyle = 'rgba(180,180,195,0.85)';
      ctx.font = '17px "PingFang SC", sans-serif';
      ctx.fillText(row[0], 140, y);
      ctx.fillStyle = '#f0d9a0';
      ctx.font = 'bold 19px "PingFang SC", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(row[1], 580, y);
      ctx.textAlign = 'left';
    });

    ctx.fillStyle = 'rgba(201,168,106,0.9)';
    ctx.font = 'bold 17px "PingFang SC", sans-serif';
    ctx.fillText('本局构筑', 140, 596);
    r.build.forEach((b, i) => {
      const col = i % 3, rowI = Math.floor(i / 3);
      const bx = 140 + col * 150, by = 624 + rowI * 108;
      const icon = b.icon ? Assets.img(b.icon) : null;
      ctx.fillStyle = 'rgba(20,20,30,0.9)';
      this.rr(ctx, bx, by, 120, 92, 10);
      ctx.fill();
      if (icon) ctx.drawImage(icon, bx + 34, by + 8, 52, 52);
      ctx.fillStyle = '#e8e2d2';
      ctx.font = '13px "PingFang SC", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(b.name, bx + 60, by + 74);
      ctx.fillStyle = '#c9a86a';
      ctx.fillText(b.evo ? '进化' : 'Lv.' + b.lv, bx + 60, by + 90);
    });

    this.deathButtons = [];
    const b1 = { x: 100, y: 1000, w: 250, h: 64, id: 'restart' };
    const b2 = { x: 380, y: 1000, w: 240, h: 64, id: 'menu' };
    const b3 = { x: 100, y: 920, w: 250, h: 56, id: 'wheel' };
    this.drawButton(ctx, b1.x, b1.y, b1.w, b1.h, '再次进入裂界', true);
    this.drawButton(ctx, b2.x, b2.y, b2.w, b2.h, '返回档案室', false);
    // P1：转盘按钮
    ctx.save();
    ctx.fillStyle = 'rgba(201,168,106,0.25)';
    ctx.strokeStyle = '#f0d9a0';
    ctx.lineWidth = 2;
    this.rr(ctx, b3.x, b3.y, b3.w, b3.h, 10);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f0d9a0';
    ctx.font = 'bold 18px "PingFang SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('战利品分配', b3.x + b3.w / 2, b3.y + 35);
    ctx.restore();
    this.deathButtons.push(b1, b2, b3);
  },

  drawButton(ctx, x, y, w, h, text, primary) {
    ctx.save();
    ctx.fillStyle = primary ? 'rgba(201,168,106,0.92)' : 'rgba(30,30,42,0.9)';
    ctx.strokeStyle = 'rgba(201,168,106,0.8)';
    ctx.lineWidth = 1.5;
    this.rr(ctx, x, y, w, h, 10);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = primary ? '#2a1e08' : '#e0d8c8';
    ctx.font = 'bold 20px "PingFang SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, x + w / 2, y + h / 2 + 7);
    ctx.restore();
  },

  bar(ctx, x, y, w, h, k, color, bg, label) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    this.rr(ctx, x - 2, y - 2, w + 4, h + 4, 4);
    ctx.fill();
    ctx.fillStyle = bg;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w * M.clamp(k, 0, 1), h);
    if (label) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 13px "PingFang SC", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, x + w / 2, y + h - 5);
    }
  },

  rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  },

  // ---------- 点击路由 ----------
  inRect(x, y, r) { return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h; },

  tap(x, y) {
    const st = Game.state;
    if (typeof TalentsUI !== 'undefined' && TalentsUI.open) {
      return TalentsUI.tap(x, y);
    }
    if (typeof Craft !== 'undefined' && Craft.open) {
      return Craft.tap(x, y);
    }
    if (typeof Wheel !== 'undefined' && Wheel.open) {
      return Wheel.tap(x, y);
    }
    if (st === 'menu') {
      if (this.sfxBtn && this.inRect(x, y, this.sfxBtn)) { if (typeof SFX !== 'undefined') SFX.toggle(); return true; }
      if (this.talentBtn && this.inRect(x, y, this.talentBtn)) { TalentsUI.toggle(); return true; }
      if (this.menuExtraBtns) {
        for (const b of this.menuExtraBtns) {
          if (this.inRect(x, y, b)) {
            if (typeof Craft !== 'undefined') Craft.toggle(b.id === 'craft' ? 'weapons' : 'backpack');
            return true;
          }
        }
      }
      for (const c of this.menuCards) {
        if (this.inRect(x, y, c)) { Game.start(c.classId); return true; }
      }
    } else if (st === 'upgrade') {
      // Bug2：跳过按钮
      if (this.skipBtn && this.inRect(x, y, this.skipBtn)) {
        Player.pendingLevels--;
        if (Player.pendingLevels > 0) Game.choices = Skills.genChoices();
        else Game.state = 'battle';
        return true;
      }
      for (const c of this.upgradeCards) {
        if (this.inRect(x, y, c)) { Game.pickChoice(c.choice); return true; }
      }
    } else if (st === 'pause') {
      if (this.sfxBtn && this.inRect(x, y, this.sfxBtn)) { if (typeof SFX !== 'undefined') SFX.toggle(); return true; }
      for (const b of this.pauseButtons) {
        if (this.inRect(x, y, b)) { Game.pauseAction(b.id); return true; }
      }
    } else if (st === 'death') {
      for (const b of this.deathButtons) {
        if (this.inRect(x, y, b)) {
          if (b.id === 'wheel') { Game.state = 'wheel'; if (typeof Wheel !== 'undefined') Wheel.show(); return true; }
          Game.pauseAction(b.id); return true;
        }
      }
    } else if (st === 'battle') {
      const pb = this.pauseBtn;
      if (M.dist(x, y, pb.x, pb.y) < pb.r + 8) { Game.togglePause(); return true; }
      Player.castActive();
      return true;
    }
    return false;
  },
};
