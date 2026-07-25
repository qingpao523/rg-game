// 全部数值来自 rg-game/docs/design/skill-balance-v1.md
const CONFIG = {
  canvas: { w: 720, h: 1280 },

  player: {
    hp: 120, mana: 100, manaRegen: 6, speed: 230,
    pickup: 110, hurtCd: 0.5, activeCost: 30,
    drawH: 118,
  },

  expNeed(lvl) { return Math.floor(5 + lvl * 3 + lvl * lvl * 0.35); },
  activeLevel(lvl) { return Math.min(5, 1 + Math.floor((lvl - 1) / 4)); },

  // 20 个基础技能 Lv1-5（数组下标 0 = Lv.1）
  skills: {
    magic_missile: {
      name: '魔法飞弹', icon: 'icons/magic_missile.png', flow: '灾厄流', behavior: 'missile',
      desc: '自动追踪的灾厄飞弹', projectile: 'projectiles/magic_missile.png',
      levels: [
        { dmg: 8, cd: 1.0, count: 1 }, { dmg: 12, cd: 0.95, count: 1 },
        { dmg: 16, cd: 0.9, count: 2 }, { dmg: 20, cd: 0.85, count: 2 },
        { dmg: 24, cd: 0.8, count: 3 },
      ],
    },
    fireball: {
      name: '爆裂火球', icon: 'icons/fireball.png', flow: '火焰流', behavior: 'fireball',
      desc: '爆炸范围伤害', projectile: 'projectiles/fireball.png',
      levels: [
        { dmg: 15, cd: 2.0, count: 1, radius: 40 }, { dmg: 23, cd: 1.9, count: 1, radius: 45 },
        { dmg: 31, cd: 1.8, count: 1, radius: 50 }, { dmg: 39, cd: 1.7, count: 2, radius: 55 },
        { dmg: 47, cd: 1.6, count: 2, radius: 60 },
      ],
    },
    doom_aura: {
      name: '灾厄光环', icon: 'icons/doom_aura.png', flow: '灾厄流', behavior: 'doom_aura',
      desc: '削弱光环内敌人的抗性',
      levels: [
        { radius: 200, resDown: 0.15 }, { radius: 210, resDown: 0.20 },
        { radius: 220, resDown: 0.25 }, { radius: 230, resDown: 0.30 },
        { radius: 250, resDown: 0.35 },
      ],
    },
    fire_attunement: {
      name: '炎附', icon: 'icons/fire_attunement.png', flow: '火焰流', behavior: 'buff_fire',
      desc: '周期点燃所有攻击，附加火伤',
      levels: [
        { dmg: 5, dur: 6, cd: 8 }, { dmg: 8, dur: 7, cd: 7.5 },
        { dmg: 11, dur: 8, cd: 7 }, { dmg: 14, dur: 9, cd: 6.5 },
        { dmg: 17, dur: 10, cd: 6 },
      ],
    },
    thunder_mark: {
      name: '感电烙印', icon: 'icons/thunder_mark.png', flow: '雷霆流', behavior: 'buff_thunder',
      desc: '周期为攻击附感电，叠加易伤',
      levels: [
        { dmg: 8, dur: 4, cd: 6 }, { dmg: 12, dur: 4.5, cd: 5.5 },
        { dmg: 16, dur: 5, cd: 5 }, { dmg: 20, dur: 5.5, cd: 4.5 },
        { dmg: 24, dur: 6, cd: 4 },
      ],
    },
    chain_lightning: {
      name: '弹射闪电', icon: 'icons/chain_lightning.png', flow: '雷霆流', behavior: 'chain',
      desc: '在敌群间弹射的闪电',
      levels: [
        { dmg: 12, cd: 3.0, chains: 3, decay: 0.20 }, { dmg: 18, cd: 2.8, chains: 3, decay: 0.18 },
        { dmg: 24, cd: 2.6, chains: 4, decay: 0.16 }, { dmg: 30, cd: 2.4, chains: 4, decay: 0.14 },
        { dmg: 36, cd: 2.2, chains: 5, decay: 0.12 },
      ],
    },
    taoist_thunder_bolt: {
      name: '天雷击', icon: 'icons/thunder_bolt.png', flow: '雷霆流', behavior: 'bolt',
      desc: '单体高伤落雷，可暴击',
      levels: [
        { dmg: 25, cd: 3.5, crit: 0.05 }, { dmg: 37, cd: 3.35, crit: 0.08 },
        { dmg: 49, cd: 3.2, crit: 0.11 }, { dmg: 61, cd: 3.05, crit: 0.14 },
        { dmg: 73, cd: 2.9, crit: 0.17 },
      ],
    },
    taoist_thunder_cloud: {
      name: '雷云', icon: 'icons/thunder_cloud.png', flow: '雷霆流', behavior: 'cloud',
      desc: '头顶雷云持续自动放电',
      levels: [
        { dmg: 6, interval: 1.5, radius: 250, dur: 8 }, { dmg: 9, interval: 1.4, radius: 260, dur: 9 },
        { dmg: 12, interval: 1.3, radius: 270, dur: 10 }, { dmg: 15, interval: 1.2, radius: 280, dur: 11 },
        { dmg: 18, interval: 1.1, radius: 300, dur: 12 },
      ],
    },
    taoist_paralyze_zone: {
      name: '麻痹领域', icon: 'icons/paralysis_field.png', flow: '雷霆流', behavior: 'paralyze',
      desc: '地面雷域，减速并概率定身',
      levels: [
        { dmg: 4, cd: 6, slow: 0.40, stun: 0.15, radius: 60 }, { dmg: 6, cd: 5.8, slow: 0.45, stun: 0.18, radius: 65 },
        { dmg: 8, cd: 5.6, slow: 0.50, stun: 0.21, radius: 70 }, { dmg: 10, cd: 5.4, slow: 0.55, stun: 0.24, radius: 75 },
        { dmg: 12, cd: 5.2, slow: 0.60, stun: 0.30, radius: 80 },
      ],
    },
    taoist_burn_curse: {
      name: '燃烧咒', icon: 'icons/taoist_burn_curse.png', flow: '火焰流', behavior: 'curse',
      desc: '点燃目标，灼烧可向周围扩散', projectile: 'projectiles/burn_curse.png',
      levels: [
        { dmg: 10, dps: 4, burnDur: 3, spread: 80, cd: 4 }, { dmg: 15, dps: 6, burnDur: 3.5, spread: 85, cd: 3.8 },
        { dmg: 20, dps: 8, burnDur: 4, spread: 90, cd: 3.6 }, { dmg: 25, dps: 10, burnDur: 4.5, spread: 95, cd: 3.4 },
        { dmg: 30, dps: 12, burnDur: 5, spread: 100, cd: 3.2 },
      ],
    },
    taoist_fire_wall: {
      name: '火墙', icon: 'icons/fire_wall.png', flow: '火焰流', behavior: 'wall',
      desc: '在敌方向燃起一道火焰带',
      levels: [
        { dmg: 12, cd: 5, dur: 5, radius: 60 }, { dmg: 18, cd: 4.8, dur: 5.5, radius: 65 },
        { dmg: 24, cd: 4.6, dur: 6, radius: 70 }, { dmg: 30, cd: 4.4, dur: 6.5, radius: 75 },
        { dmg: 36, cd: 4.2, dur: 7, radius: 80 },
      ],
    },
    taoist_ignite_explode: {
      name: '焚身爆', icon: 'icons/taoist_ignite_explode.png', flow: '火焰流', behavior: 'passive',
      desc: '灼烧中的敌人死亡时爆炸',
      levels: [
        { dmg: 15, radius: 60 }, { dmg: 23, radius: 65 }, { dmg: 31, radius: 70 },
        { dmg: 39, radius: 75 }, { dmg: 47, radius: 80 },
      ],
    },
    taoist_summon_skeleton: {
      name: '召唤骷髅', icon: 'icons/summon_skeleton.png', flow: '亡者流', behavior: 'summon_melee',
      desc: '召唤近战骷髅兵作战',
      levels: [
        { dmg: 6, hp: 30, cd: 6, max: 3 }, { dmg: 9, hp: 40, cd: 5.7, max: 3 },
        { dmg: 12, hp: 50, cd: 5.4, max: 4 }, { dmg: 15, hp: 60, cd: 5.1, max: 4 },
        { dmg: 18, hp: 70, cd: 4.8, max: 5 },
      ],
    },
    taoist_summon_archer: {
      name: '骷髅射手', icon: 'icons/skeleton_archer.png', flow: '亡者流', behavior: 'summon_archer',
      desc: '召唤远程骷髅射手', projectile: 'projectiles/skeleton_arrow.png',
      levels: [
        { dmg: 8, hp: 20, cd: 7, range: 250 }, { dmg: 12, hp: 28, cd: 6.7, range: 260 },
        { dmg: 16, hp: 36, cd: 6.4, range: 270 }, { dmg: 20, hp: 44, cd: 6.1, range: 280 },
        { dmg: 24, hp: 52, cd: 5.8, range: 300 },
      ],
    },
    taoist_raise_dead: {
      name: '亡者复苏', icon: 'icons/taoist_raise_dead.png', flow: '亡者流', behavior: 'passive',
      desc: '击杀的敌人概率复苏为骷髅',
      levels: [
        { chance: 0.25, hp: 15, max: 4 }, { chance: 0.30, hp: 20, max: 4 },
        { chance: 0.35, hp: 25, max: 5 }, { chance: 0.40, hp: 30, max: 5 },
        { chance: 0.45, hp: 35, max: 6 },
      ],
    },
    taoist_skull_enhance: {
      name: '骷髅强化', icon: 'icons/taoist_skull_enhance.png', flow: '亡者流', behavior: 'passive',
      desc: '全局骷髅攻击与生命强化',
      levels: [
        { atk: 0.30, hp: 0.30 }, { atk: 0.40, hp: 0.40 }, { atk: 0.50, hp: 0.50 },
        { atk: 0.60, hp: 0.60 }, { atk: 0.80, hp: 0.80 },
      ],
    },
    taoist_corpse_burst: {
      name: '尸爆', icon: 'icons/taoist_corpse_burst.png', flow: '亡者流', behavior: 'passive',
      desc: '骷髅死亡时爆炸',
      levels: [
        { dmg: 12, radius: 70 }, { dmg: 18, radius: 75 }, { dmg: 24, radius: 80 },
        { dmg: 30, radius: 85 }, { dmg: 36, radius: 90 },
      ],
    },
    iron_skin: {
      name: '钢铁皮肤', icon: 'icons/frost_iron_wall.png', flow: '存续流', behavior: 'iron_skin',
      desc: '皮肤如霜铁，被动减免所受伤害', tags: ['防御', '被动'],
      levels: [
        { dr: 0.06 }, { dr: 0.09 }, { dr: 0.12 },
        { dr: 0.15 }, { dr: 0.18 },
      ],
    },
    vitality: {
      name: '生命祝福', icon: 'icons/holy_obelisk.png', flow: '存续流', behavior: 'vitality',
      desc: '被动提升生命上限，并回复等量生命', tags: ['生存', '被动'],
      levels: [
        { hp: 25 }, { hp: 35 }, { hp: 45 },
        { hp: 55 }, { hp: 70 },
      ],
    },
    ice_barrier: {
      name: '冰霜结界', icon: 'icons/ice_barrier.png', flow: '存续流', behavior: 'ice_barrier',
      desc: '周期凝结冰盾，减速周围敌人，破裂时冻结', tags: ['防御', '控制'],
      levels: [
        { cd: 12, shield: 30, dur: 4, slow: 0.25, freeze: 1.0 },
        { cd: 12, shield: 45, dur: 4.5, slow: 0.30, freeze: 1.25 },
        { cd: 11, shield: 60, dur: 5, slow: 0.35, freeze: 1.5 },
        { cd: 11, shield: 75, dur: 5.5, slow: 0.40, freeze: 1.75 },
        { cd: 10, shield: 95, dur: 6, slow: 0.45, freeze: 2.0 },
      ],
    },
  },

  // 4 组进化：主技能 Lv5 + 催化技能 Lv3+，合并释放一个栏位
  evolutions: {
    meteor: {
      name: '陨石术', icon: 'icons/meteor.png', flow: '火焰流', behavior: 'meteor',
      main: 'fireball', catalyst: 'fire_attunement',
      cd: 3.5, dmg: 140, radius: 120, burnDps: 12, burnDur: 3, telegraph: 0.7,
      desc: '爆裂火球×炎附：天降陨星，落点焚燃',
    },
    thunder_net: {
      name: '雷网审判', icon: 'icons/thunder_net.png', flow: '雷霆流', behavior: 'thunder_net',
      main: 'chain_lightning', catalyst: 'thunder_mark',
      cd: 2.0, dmg: 40, chains: 8, chainRange: 260, shockStacks: 2,
      desc: '弹射闪电×感电烙印：雷网无衰减连锁',
    },
    doom_star: {
      name: '灾厄飞星', icon: 'icons/doom_star.png', flow: '灾厄流', behavior: 'doom_star',
      main: 'magic_missile', catalyst: 'doom_aura',
      cd: 0.75, dmg: 26, count: 5, pierce: 1, amp: 0.20, ampDur: 3,
      desc: '魔法飞弹×灾厄光环：五星连珠，穿透蚀防',
    },
    white_bone_army: {
      name: '白骨军势', icon: 'icons/white_bone_army.png', flow: '亡者流', behavior: 'bone_army',
      main: 'taoist_summon_skeleton', catalyst: 'taoist_skull_enhance',
      cd: 5, cap: 8, dmg: 18, hp: 70, buff: 0.8, burstDmg: 30, burstRadius: 80,
      desc: '召唤骷髅×骷髅强化：白骨成军，势不可挡',
    },
  },

  // 5 个职业主动技
  actives: {
    thunder_seal: {
      name: '敕令雷符', icon: 'icons/thunder_seal.png', desc: '雷符轰击最密敌群并弹射',
      levels: [
        { dmg: 30, cd: 8, chains: 3 }, { dmg: 40, cd: 7.5, chains: 3 },
        { dmg: 50, cd: 7, chains: 4 }, { dmg: 60, cd: 6.5, chains: 4 },
        { dmg: 70, cd: 6, chains: 5 },
      ],
    },
    flash_slash: {
      name: '一闪', icon: 'icons/flash_slash.png', desc: '无敌突进斩，击杀返还冷却',
      levels: [
        { dmg: 40, cd: 2, invuln: 0.30, killCd: 0.50 }, { dmg: 55, cd: 2, invuln: 0.35, killCd: 0.55 },
        { dmg: 70, cd: 2, invuln: 0.40, killCd: 0.60 }, { dmg: 85, cd: 2, invuln: 0.45, killCd: 0.65 },
        { dmg: 100, cd: 2, invuln: 0.50, killCd: 0.70 },
      ],
    },
    sarcophagus: {
      name: '冥棺敕命', icon: 'icons/sarcophagus.png', desc: '召回并强化全部召唤物',
      levels: [
        { dmg: 30, cd: 10, mult: 1.5, refreshHp: 50 }, { dmg: 45, cd: 9.5, mult: 1.6, refreshHp: 65 },
        { dmg: 60, cd: 9, mult: 1.7, refreshHp: 80 }, { dmg: 75, cd: 8.5, mult: 1.8, refreshHp: 95 },
        { dmg: 90, cd: 8, mult: 2.0, refreshHp: 110 },
      ],
    },
    frozen_field: {
      name: '极寒领域', icon: 'icons/frozen_field.png', desc: '脚下冰域，冻结后碎裂',
      levels: [
        { dps: 8, cd: 10, slow: 0.50, shatter: 30, radius: 200 }, { dps: 11, cd: 9.5, slow: 0.55, shatter: 40, radius: 210 },
        { dps: 14, cd: 9, slow: 0.60, shatter: 50, radius: 220 }, { dps: 17, cd: 8.5, slow: 0.65, shatter: 60, radius: 230 },
        { dps: 20, cd: 8, slow: 0.70, shatter: 75, radius: 250 },
      ],
    },
    holy_shield: {
      name: '圣盾冲阵', icon: 'icons/holy_shield.png', desc: '举盾推进，吸收转为真伤',
      levels: [
        { absorb: 80, dmg: 15, cd: 10, convert: 0.50 }, { absorb: 110, dmg: 20, cd: 9.5, convert: 0.55 },
        { absorb: 140, dmg: 25, cd: 9, convert: 0.60 }, { absorb: 170, dmg: 30, cd: 8.5, convert: 0.65 },
        { absorb: 200, dmg: 35, cd: 8, convert: 0.70 },
      ],
    },
  },

  classes: {
    taoist: {
      name: '道士', title: '敕雷执契者', portrait: 'portraits/taoist_portrait.png',
      idle: 'characters/taoist_idle.png', move: 'characters/taoist_move.png',
      active: 'thunder_seal', start: 'taoist_thunder_bolt',
      passive: { cdMult: 0.92 }, passiveDesc: '技能冷却 -8%',
      desc: '雷符敕令，万邪辟易',
    },
    samurai: {
      name: '武士', title: '无念一闪', portrait: 'portraits/samurai_portrait.png',
      idle: 'characters/samurai_idle.png', move: 'characters/samurai_move.png',
      active: 'flash_slash', start: 'magic_missile',
      passive: { speedMult: 1.12 }, passiveDesc: '移动速度 +12%',
      desc: '拔刀即斩，生死一线',
    },
    pharaoh: {
      name: '法老', title: '冥棺之主', portrait: 'portraits/pharaoh_portrait.png',
      idle: 'characters/pharaoh_idle.png', move: 'characters/pharaoh_move.png',
      active: 'sarcophagus', start: 'taoist_summon_skeleton',
      passive: { summonMult: 1.15 }, passiveDesc: '召唤物强度 +15%',
      desc: '亡者军团，听吾敕命',
    },
    ice_witch: {
      name: '寒冰女巫', title: '极寒低语', portrait: 'portraits/ice_witch_portrait.png',
      idle: 'characters/ice_witch_idle.png', move: 'characters/ice_witch_move.png',
      active: 'frozen_field', start: 'chain_lightning',
      passive: { manaRegenMult: 1.5, manaBonus: 20 }, passiveDesc: '法力回复 +50%，法力上限 +20',
      desc: '冰霜覆盖之处，时间静止',
    },
    crusader: {
      name: '十字军', title: '圣盾先锋', portrait: 'portraits/crusader_portrait.png',
      idle: 'characters/crusader_idle.png', move: 'characters/crusader_move.png',
      active: 'holy_shield', start: 'fireball',
      passive: { hpBonus: 40, armor: 0.10 }, passiveDesc: '生命上限 +40，受伤 -10%',
      desc: '圣光为盾，一往无前',
    },
  },
  classOrder: ['taoist', 'samurai', 'pharaoh', 'ice_witch', 'crusader'],

  // 敌人：杂兵 HP20(+5/波)、冲锋兵 HP15(+3/波)、精英 HP80(+20/波)
  enemies: {
    grunt: {
      name: '杂兵', hp: 20, hpWave: 5, dmg: 8, dmgWave: 0.5, speed: 85,
      exp: 1, r: 24, drawH: 80, img: 'enemies/grunt_move.png',
    },
    charger: {
      name: '冲锋兵', hp: 15, hpWave: 3, dmg: 12, dmgWave: 0.6, speed: 70,
      chargeSpeed: 330, chargeRange: 380, exp: 2, r: 24, drawH: 84, img: 'enemies/charger_move.png',
    },
    elite: {
      name: '精英', hp: 80, hpWave: 20, dmg: 20, dmgWave: 1.2, speed: 55,
      exp: 10, r: 40, drawH: 150, img: 'enemies/elite_move.png',
    },
    goblin: {
      name: '宝藏哥布林', hp: 40, hpWave: 8, dmg: 0, dmgWave: 0, speed: 170,
      exp: 15, r: 22, drawH: 76, img: 'enemies/goblin_run.png',
    },
  },

  // 压力曲线：单局 8-12 分钟
  waves: {
    waveTime: 25,            // 每 25s 一波
    baseInterval: 1.5,       // 初始刷怪间隔
    minInterval: 0.45,       // 最小刷怪间隔
    batchBase: 2,
    batchPerWave: 0.8,
    maxAlive: 120,
    chargerFromWave: 2,
    eliteFirstTime: 70,      // 精英首次加入
    eliteInterval: 30,
    eliteCap: 5,
    goblinFirst: 45,
    goblinMin: 40, goblinMax: 70,
    goblinSpawnR: 520,     // 哥布林出生半径（普通敌人为 840）
  },

  // 状态效果数值表（Lv1/Lv3/Lv5 档位插值到 5 级）
  status: {
    shockAmp: [0.20, 0.22, 0.25, 0.28, 0.30], // 感电增伤/层
    shockDur: 3.5,
    burnIconDur: [3, 3.5, 4, 4.5, 5],
    slowDur: 2.5,
    stunDur: 0.8,
    freezeDur: [1, 1.25, 1.5, 1.75, 2],
    poisonDps: [3, 5, 7, 9, 11],
  },

  goblinRewards: [
    { id: 'heal', name: '紧急修护', desc: '生命回复 40%' },
    { id: 'skill', name: '禁忌残页', desc: '随机一个技能 +1 级' },
    { id: 'dmg', name: '狂战烙印', desc: '全局伤害 +10%' },
    { id: 'magnet', name: '聚宝磁场', desc: '拾取范围 +40%' },
    { id: 'mana', name: '魔力奔涌', desc: '法力全满并 +25 上限' },
  ],

  statCards: [
    { id: 'hp', name: '命契加固', desc: '生命上限 +25 并回复 25', flow: '存续' },
    { id: 'speed', name: '疾风步', desc: '移动速度 +6%', flow: '存续' },
    { id: 'mana', name: '灵泉', desc: '法力上限 +30', flow: '存续' },
    { id: 'dmg', name: '锐契', desc: '全局伤害 +8%', flow: '存续' },
    { id: 'pickup', name: '引力符', desc: '拾取范围 +30%', flow: '存续' },
  ],

  skillSlots: 8,
  archerCap: 3,

  assetsExtra: [
    'projectiles/magic_missile.png', 'projectiles/fireball.png', 'projectiles/burn_curse.png',
    'projectiles/skeleton_arrow.png', 'projectiles/chain_lightning.png', 'projectiles/thunder_bolt.png',
    'effects/hit_effect.png', 'effects/crit_effect.png', 'effects/meteor_vfx.png',
    'effects/thunder_net_vfx.png', 'effects/thunder_cloud.png', 'effects/paralysis_field.png',
    'effects/fire_wall.png', 'effects/level_up_particle.png', 'effects/upgrade_effect.png',
    'effects/flash_slash_vfx.png', 'effects/frozen_field_vfx.png', 'effects/holy_shield_vfx.png',
    'effects/sarcophagus_vfx.png', 'effects/thunder_seal_vfx.png',
    'status/burn.png', 'status/shock.png', 'status/slow.png', 'status/stun.png', 'status/freeze.png',
    'drops/experience_crystal.png', 'drops/pickup_glow.png',
    'maps/broken_dragon_palace_bg.png', 'maps/black_fog_edge_overlay.png',
    'ui/goblin_direction_arrow.png', 'ui/active_skill_button.png',
    'menu/main_menu_bg.png', 'menu/title_logo.png',
    'enemies/grunt_move.png', 'enemies/charger_move.png', 'enemies/charger_charge.png',
    'enemies/elite_move.png', 'enemies/goblin_run.png',
    'summons/skeleton_idle.png', 'summons/skeleton_shoot.png',
  ],
};
