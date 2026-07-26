// 配置单一事实源（Schema 驱动）
// 同时驱动：admin 渲染/校验、服务端 PUT 校验、客户端兜底校验
// 字段名 100% 对齐客户端 js/config.js 消费路径，零改名

// 字段规格：path | label(中文) | type | min | max | step | def(默认) | desc | unit
// type: int | num | bool | str
const CONFIG_SCHEMA = [
  // ===== 模块 A：玩家基础属性 (player) =====
  { path: 'player.hp', label: '生命上限', type: 'int', min: 1, max: 99999, def: 120, desc: '开局血量（职业被动加成在此之上叠加）' },
  { path: 'player.speed', label: '移动速度', type: 'int', min: 10, max: 2000, def: 230, desc: '像素/秒。参考：杂兵85、哥布林170', unit: 'px/s' },
  { path: 'player.pickup', label: '拾取范围', type: 'int', min: 10, max: 2000, def: 110, desc: '经验水晶自动吸附半径', unit: 'px' },
  { path: 'player.hurtCd', label: '受击无敌时间', type: 'num', min: 0, max: 10, step: 0.05, def: 0.5, desc: '被击中后的免伤窗口', unit: '秒' },
  { path: 'player.drawH', label: '立绘渲染高度', type: 'int', min: 10, max: 1000, def: 118, desc: '进阶字段，改动会导致人物变高变矮', unit: 'px' },

  // ===== 模块 B：局内升级经验曲线 (playerExp) =====
  // 公式: expNeed(lv) = floor(base + lv*linear + lv^2*quad)
  { path: 'playerExp.base', label: '基础经验', type: 'int', min: 1, max: 99999, def: 5, desc: '每级所需经验的常数项' },
  { path: 'playerExp.linear', label: '线性系数', type: 'num', min: 0, max: 1000, step: 0.5, def: 3, desc: '随等级线性增长部分' },
  { path: 'playerExp.quad', label: '二次系数', type: 'num', min: 0, max: 100, step: 0.05, def: 0.35, desc: '随等级平方增长，越大后期升级越慢' },

  // ===== 模块 C1：结算奖励 (settlement) =====
  { path: 'settlement.expPerKill', label: '经验/击杀', type: 'num', min: 0, max: 100, step: 0.1, def: 0.3, desc: '结算局外经验 = 击杀×本值 + 存活秒×expPerSecond' },
  { path: 'settlement.expPerSecond', label: '经验/秒', type: 'num', min: 0, max: 100, step: 0.1, def: 0.5, desc: '存活时间折算经验' },
  { path: 'settlement.goldPerKill', label: '金币/击杀', type: 'num', min: 0, max: 100, step: 0.01, def: 0.1, desc: '结算金币 = 击杀×本值 + 存活秒×goldPerSecond' },
  { path: 'settlement.goldPerSecond', label: '金币/秒', type: 'num', min: 0, max: 100, step: 0.01, def: 0.05, desc: '存活时间折算金币' },
  { path: 'settlement.shardPerElite', label: '精英碎片数', type: 'int', min: 0, max: 99, def: 1, desc: '击杀精英掉落碎片个数' },
  { path: 'settlement.shardPerGoblinMin', label: '哥布林碎片最少', type: 'int', min: 0, max: 99, def: 2, desc: '哥布林死亡掉落碎片数下限' },
  { path: 'settlement.shardPerGoblinMax', label: '哥布林碎片最多', type: 'int', min: 0, max: 99, def: 3, desc: '上限，必须≥最小值' },

  // ===== 模块 C2：局外升级曲线 (economy.expNeed*) =====
  { path: 'economy.expNeedBase', label: '升级基础经验', type: 'int', min: 1, max: 99999, def: 20, desc: '局外等级公式 floor(base+lv*linear+lv^2*quad)' },
  { path: 'economy.expNeedLinear', label: '升级线性系数', type: 'int', min: 0, max: 9999, def: 15, desc: '局外升级线性增长' },
  { path: 'economy.expNeedQuad', label: '升级二次系数', type: 'num', min: 0, max: 100, step: 0.1, def: 0.8, desc: '当前节奏：满级50约需30天' },

  // ===== 模块 D：波次曲线 (waves) =====
  { path: 'waves.waveTime', label: '每波时长', type: 'int', min: 5, max: 600, def: 25, desc: '秒；波次数=游戏时长÷本值', unit: '秒' },
  { path: 'waves.baseInterval', label: '初始刷怪间隔', type: 'num', min: 0.1, max: 60, step: 0.05, def: 1.5, desc: '随时间线性收紧', unit: '秒' },
  { path: 'waves.minInterval', label: '最小刷怪间隔', type: 'num', min: 0.05, max: 60, step: 0.05, def: 0.45, desc: '刷怪间隔下限，必须≤baseInterval', unit: '秒' },
  { path: 'waves.batchBase', label: '基础批量', type: 'int', min: 1, max: 50, def: 2, desc: '每批刷怪基础数量' },
  { path: 'waves.batchPerWave', label: '每波批量增长', type: 'num', min: 0, max: 10, step: 0.1, def: 0.8, desc: '批量=min(12, batchBase+波次×本值)' },
  { path: 'waves.maxAlive', label: '最大存活怪数', type: 'int', min: 1, max: 1000, def: 120, desc: '场上怪物上限（性能与难度双阀门）' },
  { path: 'waves.chargerFromWave', label: '冲锋兵出现波次', type: 'int', min: 1, max: 99, def: 2, desc: '第N波起冲锋兵按30%比例混刷' },
  { path: 'waves.eliteFirstTime', label: '精英首现时间', type: 'int', min: 10, max: 3600, def: 70, desc: '首个精英刷新点', unit: '秒' },
  { path: 'waves.eliteInterval', label: '精英刷新间隔', type: 'int', min: 5, max: 3600, def: 30, unit: '秒' },
  { path: 'waves.eliteCap', label: '精英同时上限', type: 'int', min: 0, max: 50, def: 5, desc: '0=不出精英' },
  { path: 'waves.goblinFirst', label: '哥布林首现时间', type: 'int', min: 10, max: 3600, def: 45, unit: '秒' },
  { path: 'waves.goblinMin', label: '哥布林最小间隔', type: 'int', min: 5, max: 3600, def: 40, desc: '必须≤goblinMax', unit: '秒' },
  { path: 'waves.goblinMax', label: '哥布林最大间隔', type: 'int', min: 5, max: 3600, def: 70, unit: '秒' },
  { path: 'waves.goblinSpawnR', label: '哥布林出生半径', type: 'int', min: 100, max: 2000, def: 520, desc: '普通怪固定840', unit: 'px' },

  // ===== 模块 F：掉落系统 (drops) =====
  { path: 'drops.eliteShardChance', label: '精英碎片概率', type: 'num', min: 0, max: 1, step: 0.05, def: 0.3, desc: '0.3=30%。天赋幸运在此之上叠加' },
  { path: 'drops.eliteHealChance', label: '精英血瓶概率', type: 'num', min: 0, max: 1, step: 0.05, def: 0.25, desc: '0.25=25%' },
  { path: 'drops.healValue', label: '血瓶回复量', type: 'int', min: 1, max: 9999, def: 30, desc: '拾取血瓶回复的生命值' },
  { path: 'drops.goblinExpValue', label: '哥布林经验水晶值', type: 'int', min: 1, max: 9999, def: 8, desc: '哥布林掉落的每个经验水晶的经验' },
  { path: 'drops.goblinShardMin', label: '哥布林碎片最少', type: 'int', min: 0, max: 99, def: 2, desc: '与goblinShardMax成对' },
  { path: 'drops.goblinShardMax', label: '哥布林碎片最多', type: 'int', min: 0, max: 99, def: 3, desc: '必须≥goblinShardMin' },
  { path: 'drops.expDoubleChance', label: '经验翻倍概率', type: 'num', min: 0, max: 1, step: 0.01, def: 0, desc: '拾取经验水晶时数值翻倍的概率' },

  // ===== 模块 H：天赋解锁与武器 (talents/weapons) =====
  { path: 'talents.generalUnlock.2', label: '通用天赋·第2层解锁', type: 'int', min: 0, max: 999, def: 8, desc: '第1层累计投入≥N点解锁第2层' },
  { path: 'talents.generalUnlock.3', label: '通用天赋·第3层解锁', type: 'int', min: 0, max: 999, def: 16, desc: '须≥第2层值' },
  { path: 'talents.generalUnlock.4', label: '通用天赋·第4层解锁', type: 'int', min: 0, max: 999, def: 24, desc: '须≥第3层值' },
  { path: 'talents.specialistUnlock.2', label: '专精天赋·第2层解锁', type: 'int', min: 0, max: 999, def: 5, desc: '第1层累计投入≥N点解锁第2层' },
  { path: 'talents.specialistUnlock.3', label: '专精天赋·第3层解锁', type: 'int', min: 0, max: 999, def: 10, desc: '须≥第2层值' },
  { path: 'weapons.normalShards', label: '普通武器碎片需求', type: 'int', min: 1, max: 9999, def: 20, desc: '全部普通稀有度武器统一消耗' },
  { path: 'weapons.rareShards', label: '稀有武器碎片需求', type: 'int', min: 1, max: 9999, def: 50, desc: '全部稀有稀有度武器统一消耗' },

  // ===== 模块 I：技能系统 (skillSystem) =====
  { path: 'skillSystem.skillSlots', label: '技能栏数量', type: 'int', min: 1, max: 12, def: 8, desc: '局内最多持有技能数' },
  { path: 'skillSystem.archerCap', label: '骷髅射手上限', type: 'int', min: 0, max: 20, def: 3, desc: '召唤流平衡阀门' },
  { path: 'skillSystem.evoMainLevel', label: '进化主技能等级', type: 'int', min: 1, max: 10, def: 5, desc: '主技能需达到的等级' },
  { path: 'skillSystem.evoCatalystLevel', label: '进化催化等级', type: 'int', min: 1, max: 10, def: 3, desc: '催化技能需达到的等级，须≤evoMainLevel' },
  { path: 'skillSystem.maxLevel', label: '局内等级上限', type: 'int', min: 0, max: 99, def: 0, desc: '0=无限；>0时经验满后不再升级' },

  // ===== 模块 J：功能开关 (features) =====
  { path: 'features.elementalReaction', label: '元素反应', type: 'bool', def: true, desc: '关闭后冰+火不触发熔融、叠冰不触发冻结' },
  { path: 'features.wheel', label: '结算转盘', type: 'bool', def: true, desc: '关闭后死亡结算页不显示转盘入口' },
  { path: 'features.leaderboard', label: '排行榜', type: 'bool', def: true, desc: '关闭后锻造/背包页隐藏排行tab' },
  { path: 'features.skipUpgrade', label: '升级可跳过', type: 'bool', def: true, desc: '关闭后升级选择页隐藏跳过按钮' },
];

// 客户端消费点白名单（防"字段对不上"）
// 从 js/config.js 及各消费文件冻结的路径清单
const CONSUMED_PATHS = CONFIG_SCHEMA.map(s => s.path);

// 跨字段校验规则
const CROSS_FIELD_RULES = [
  { a: 'waves.minInterval', b: 'waves.baseInterval', op: '<=', msg: '最小刷怪间隔必须 ≤ 初始刷怪间隔' },
  { a: 'waves.goblinMin', b: 'waves.goblinMax', op: '<=', msg: '哥布林最小间隔必须 ≤ 最大间隔' },
  { a: 'drops.goblinShardMin', b: 'drops.goblinShardMax', op: '<=', msg: '哥布林碎片最少必须 ≤ 最多' },
  { a: 'settlement.shardPerGoblinMin', b: 'settlement.shardPerGoblinMax', op: '<=', msg: '哥布林碎片最少必须 ≤ 最多' },
  { a: 'talents.generalUnlock.2', b: 'talents.generalUnlock.3', op: '<=', msg: '通用天赋第2层解锁值必须 ≤ 第3层' },
  { a: 'talents.generalUnlock.3', b: 'talents.generalUnlock.4', op: '<=', msg: '通用天赋第3层解锁值必须 ≤ 第4层' },
  { a: 'talents.specialistUnlock.2', b: 'talents.specialistUnlock.3', op: '<=', msg: '专精天赋第2层解锁值必须 ≤ 第3层' },
  { a: 'skillSystem.evoCatalystLevel', b: 'skillSystem.evoMainLevel', op: '<=', msg: '进化催化等级必须 ≤ 主技能等级' },
];

// ---------- 工具函数 ----------
function getPath(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}
function setPath(obj, path, val) {
  const keys = path.split('.');
  let o = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (o[keys[i]] == null || typeof o[keys[i]] !== 'object') o[keys[i]] = {};
    o = o[keys[i]];
  }
  o[keys[keys.length - 1]] = val;
}

// 按 schema 构建默认配置
function buildDefaults() {
  const out = {};
  for (const f of CONFIG_SCHEMA) setPath(out, f.path, f.def);
  return out;
}

// 校验单个字段值，返回错误信息或 null
function validateField(field, val) {
  if (val === undefined || val === null || val === '') return '不能为空';
  if (field.type === 'bool') {
    if (typeof val !== 'boolean') return '必须是开关值';
    return null;
  }
  if (field.type === 'int' || field.type === 'num') {
    const n = typeof val === 'number' ? val : parseFloat(val);
    if (isNaN(n)) return '必须是数字';
    if (field.type === 'int' && !Number.isInteger(n)) return '必须是整数';
    if (n < field.min) return `不能小于 ${field.min}`;
    if (n > field.max) return `不能大于 ${field.max}`;
    return null;
  }
  if (field.type === 'str') {
    if (typeof val !== 'string') return '必须是文本';
    return null;
  }
  return null;
}

// 校验整个配置 payload，返回错误数组 [{path, msg}]
// strictUnknownKeys: 是否拒绝 schema 之外的键
function validateConfig(payload, opts) {
  opts = opts || {};
  const errors = [];
  const knownPaths = new Set(CONFIG_SCHEMA.map(f => f.path));

  // 收集 payload 里的所有叶子路径
  function collectPaths(obj, prefix, out) {
    for (const k in obj) {
      const p = prefix ? prefix + '.' + k : k;
      const v = obj[k];
      if (v != null && typeof v === 'object' && !Array.isArray(v)) collectPaths(v, p, out);
      else out.push({ path: p, val: v });
    }
  }
  const leaves = [];
  collectPaths(payload, '', leaves);

  // 单字段校验 + 未知键检查
  for (const leaf of leaves) {
    const field = CONFIG_SCHEMA.find(f => f.path === leaf.path);
    if (!field) {
      if (opts.strictUnknownKeys !== false) errors.push({ path: leaf.path, msg: '未知字段（schema 中不存在，可能拼写错误）' });
      continue;
    }
    const err = validateField(field, leaf.val);
    if (err) errors.push({ path: leaf.path, msg: err });
  }

  // 跨字段校验（仅当两个字段都存在时）
  const valByPath = {};
  for (const leaf of leaves) valByPath[leaf.path] = typeof leaf.val === 'number' ? leaf.val : parseFloat(leaf.val);
  for (const rule of CROSS_FIELD_RULES) {
    const va = valByPath[rule.a], vb = valByPath[rule.b];
    if (va === undefined || vb === undefined || isNaN(va) || isNaN(vb)) continue;
    const ok = rule.op === '<=' ? va <= vb : va >= vb;
    if (!ok) errors.push({ path: rule.a, msg: rule.msg });
  }

  return errors;
}

// 按 schema 白名单深合并：payload 未提供的字段保持原值（消灭浅合并丢字段）
function deepMergeConfig(current, payload) {
  const out = JSON.parse(JSON.stringify(current)); // 深拷贝
  for (const field of CONFIG_SCHEMA) {
    const v = getPath(payload, field.path);
    if (v !== undefined && v !== null) {
      setPath(out, field.path, field.type === 'int' ? Math.round(parseFloat(v)) : (field.type === 'num' ? parseFloat(v) : v));
    }
  }
  return out;
}

// 导出（兼容 Node CommonJS 和浏览器 <script>）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CONFIG_SCHEMA, CONSUMED_PATHS, CROSS_FIELD_RULES, buildDefaults, validateField, validateConfig, deepMergeConfig, getPath, setPath };
}
