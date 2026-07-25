// P0 合成音效：AudioContext + OscillatorNode 合成 6 种短音
const SFX = {
  ctx: null,
  enabled: true,

  init() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    } catch (e) { this.ctx = null; }
  },

  // 首次用户手势时解锁音频（移动端自动播放限制）
  unlock() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },

  // 基础振荡器包络：type 波形 / freq 起始频率 / dur 时长 / vol 峰值音量 / slide 频率滑动目标
  tone(type, freq, dur, vol, slide) {
    if (!this.enabled || !this.ctx) return;
    const t0 = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(this.ctx.destination);
    o.start(t0); o.stop(t0 + dur + 0.02);
  },

  hit() { this.tone('square', 220, 0.07, 0.10, 140); },
  crit() { this.tone('sawtooth', 480, 0.14, 0.14, 180); this.tone('square', 720, 0.10, 0.08, 320); },
  levelup() { this.tone('square', 520, 0.12, 0.12, 780); this.tone('square', 780, 0.16, 0.10, 1040); },
  evolve() { this.tone('sawtooth', 300, 0.35, 0.14, 900); this.tone('square', 600, 0.30, 0.10, 1200); },
  death() { this.tone('sawtooth', 220, 0.6, 0.16, 50); },
  pickup() { this.tone('square', 660, 0.06, 0.07, 990); },
  // P3 新增音效
  elite() { this.tone('sawtooth', 120, 0.4, 0.18, 60); this.tone('square', 180, 0.3, 0.12, 90); },
  goblin() { this.tone('square', 880, 0.08, 0.10, 1320); this.tone('square', 1100, 0.06, 0.08, 1650); },
  heal() { this.tone('sine', 520, 0.15, 0.08, 780); this.tone('sine', 780, 0.12, 0.06, 1040); },
  loot() { this.tone('square', 660, 0.10, 0.10, 990); this.tone('square', 880, 0.12, 0.08, 1320); this.tone('square', 1100, 0.14, 0.06, 1650); },

  play(type) {
    if (typeof this[type] === 'function') this[type]();
  },
};
