# 《无尽入侵》P1+P2 局外成长系统设计文档（详细版）

> 版本：v1.0 | 日期：2025-01  
> 定位：俯视角 Roguelite 割草（类 Vampire Survivors），H5 多平台  
> 前置依赖：skill-balance-v1.md / rg-h5-fix1-design.md / config.js

---

## 第二章：等级成长体系

### 2.1 等级总表（30 级）

**核心规则**：5 职业开局全部解锁，等级仅用于解锁天赋行与获得天赋点。

| 等级 | 本级所需经验 | 累计经验 | 解锁天赋行 | 天赋点奖励 | 里程碑奖励 |
|:----:|:-----------:|:-------:|:----------:|:---------:|:----------:|
| 1 | — | 0 | — | — | 初始 |
| 2 | 95 | 95 | 通用R1/战斗R1 | +1 | — |
| 3 | 140 | 235 | — | +1 | — |
| 4 | 190 | 425 | — | +1 | — |
| 5 | 250 | 675 | 通用R2/战斗R2 | +1 | 里程碑+1 |
| 6 | 320 | 995 | — | +1 | — |
| 7 | 400 | 1395 | — | +1 | — |
| 8 | 490 | 1885 | — | +1 | — |
| 9 | 590 | 2475 | — | +1 | — |
| 10 | 695 | 3170 | 通用R3/战斗R3 | +1 | 里程碑+2 |
| 11 | 810 | 3980 | — | +1 | — |
| 12 | 935 | 4915 | — | +1 | — |
| 13 | 1070 | 5985 | — | +1 | — |
| 14 | 1210 | 7195 | — | +1 | — |
| 15 | 1360 | 8555 | 通用R4/战斗R4 | +1 | 里程碑+2 |
| 16 | 1520 | 10075 | — | +1 | — |
| 17 | 1690 | 11765 | — | +1 | — |
| 18 | 1870 | 13635 | — | +1 | — |
| 19 | 2060 | 15695 | — | +1 | — |
| 20 | 2255 | 17950 | 战斗R5 | +1 | 里程碑+3 |
| 21 | 2460 | 20410 | — | +1 | — |
| 22 | 2675 | 23085 | — | +1 | — |
| 23 | 2900 | 25985 | — | +1 | — |
| 24 | 3130 | 29115 | — | +1 | — |
| 25 | 3370 | 32485 | — | +1 | 里程碑+3 |
| 26 | 3620 | 36105 | — | +1 | — |
| 27 | 3880 | 39985 | — | +1 | — |
| 28 | 4150 | 44135 | — | +1 | — |
| 29 | 4430 | 48565 | — | +1 | — |
| 30 | 4715 | 53280 | 全天赋解锁 | +1 | 里程碑+3 |

**经验需求**：见上表「本级所需经验」列。客户端/服务器均使用查表法（lookup table），不使用运行时公式计算。

### 2.2 经验获取公式（所有来源）

| 来源 | 公式/数值 | 说明 |
|------|----------|------|
| 击杀杂兵 | +1 exp/只 | grunt，基础经验 |
| 击杀冲锋兵 | +2 exp/只 | charger |
| 击杀精英 | +10 exp/只 | elite |
| 击杀宝藏哥布林 | +15 exp/只 | goblin，稀有 |
| 波次通关 | +20 exp/波 | 每存活过一个完整波次（25s） |
| 进化完成 | +150 exp/次 | 技能进化触发 |
| 存活时间 | +12 exp/分钟 | 按实际存活秒数折算 |
| 每日首胜 | +200 exp | 每日第一局结算额外奖励 |
| 无伤通关波 | +30 exp/波 | 该波次内未受伤 |
| 全技能满级 | +100 exp | 6 栏全部 Lv5 |

### 2.3 游戏时间演算

**假设条件**（基于 config.js 波次曲线与敌人配置）：

| 参数 | 数值 | 推导依据 |
|------|------|---------|
| 平均每局时长 | 8 分钟 | waves.waveTime=25s，15波=375s≈6.25min，加上精英/哥布林事件 |
| 平均击杀数 | 143 只 | 分布：杂兵100/冲锋兵30/精英12/哥布林1 |
| 平均波次 | 15 波 | 8min ÷ 25s/波 ≈ 19波理论值，实际含死亡约15波 |
| 平均进化次数 | 1 次 | 8分钟内通常完成1组进化 |

**每局经验计算**：

```
击杀经验 = 100×1 + 30×2 + 12×10 + 1×15 = 100+60+120+15 = 295
波次经验 = 15 × 20 = 300
进化经验 = 1 × 150 = 150
时间经验 = 8 × 12 = 96
─────────────────────────────────
每局基础经验 = 841 exp
```

**含每日首胜的周均经验**：
- 每日首局：841 + 200 = 1041 exp
- 后续局：841 exp
- 假设每日玩 6 局：1041 + 841×5 = 5246 exp/天

**1→30 级推算**：

| 指标 | 数值 |
|------|------|
| 总需经验 | 53,280 |
| 每局平均 | 841 |
| 所需局数 | 53280 ÷ 841 ≈ **63.4 局** |
| 每局时长 | 8 分钟 |
| 纯游戏时间 | 63.4 × 8 = **507 分钟 ≈ 8.5 小时** |
| 含加载/结算 | 约 **10 小时**（含每局30s结算+30s加载） |
| 每日6局节奏 | 63.4 ÷ 6 ≈ **10.6 天**（约11天满级） |

### 2.4 天赋点总量演算

| 来源 | 数量 |
|------|------|
| 升级奖励（Lv2-Lv30） | 29 点 |
| 里程碑 Lv5 | +1 |
| 里程碑 Lv10 | +2 |
| 里程碑 Lv15 | +2 |
| 里程碑 Lv20 | +3 |
| 里程碑 Lv25 | +3 |
| 里程碑 Lv30 | +3 |
| **总计** | **43 点** |

**节点总量**：通用 16 + 5职业×20 = **116 节点**

**点亮策略**：
- 单职业专精：通用16 + 战斗20 = 36 点，剩余 7 点可投入第二职业
- 双职业兼修：通用16 + 主职业14 + 副职业13 = 43 点
- 结论：满级玩家可精通 1 职业 + 涉猎 1 副职业，鼓励多职业游玩

---

## 第三章：天赋树设计

### 设计原则

1. **禁止**：伤害百分比、冷却缩减、移速加成
2. **允许**：技能形态变化、概率提升、范围扩大、拾取范围、血量上限、特殊机制
3. 每行 4 节点：前 2 基础向，后 2 进阶向
4. 行解锁：R1=Lv2, R2=Lv5, R3=Lv10, R4=Lv15, R5=Lv20
5. 前置关系：同列上下相邻为前置（R2C1 需 R1C1）

### 3.1 通用天赋树（全职业共享，4行×4列=16节点）

| ID | 名称 | 行/列 | 效果描述 | 数值 | 前置 |
|:--:|:----:|:-----:|---------|:----:|:----:|
| G-01 | 磁力场 | R1C1 | 拾取范围扩大 | +40px（基础110→150） | 无 |
| G-02 | 生命契约 | R1C2 | 生命上限提升 | +30 HP | 无 |
| G-03 | 经验共鸣 | R1C3 | 经验宝石拾取时额外获得经验 | +15% 局内经验 | 无 |
| G-04 | 幸运星 | R1C4 | 掉落物出现概率提升 | +8% 掉落率 | 无 |
| G-05 | 引力漩涡 | R2C1 | 拾取范围再次扩大，且经验宝石自动向玩家漂移 | +60px，漂移速度80px/s | G-01 |
| G-06 | 不屈意志 | R2C2 | 生命上限提升，低于30%血时获得1s无敌（每局1次） | +40 HP，触发1次 | G-02 |
| G-07 | 进化亲和 | R2C3 | 进化所需催化技能等级降低 | 催化需求 Lv3→Lv2 | G-03 |
| G-08 | 宝藏嗅觉 | R2C4 | 宝藏哥布林出现概率提升，击杀额外掉落碎片 | +20%哥布林概率，+1碎片 | G-04 |
| G-09 | 范围共振 | R3C1 | 所有范围技能（火球/火墙/麻痹领域等）作用半径扩大 | +15% 范围 | G-05 |
| G-10 | 重生之力 | R3C2 | 生命上限提升，每局首次致死伤害改为保留1HP | +50 HP，保命1次 | G-06 |
| G-11 | 命运编织 | R3C3 | 升级时三选一变为四选一 | 选项+1 | G-07 |
| G-12 | 精英猎手 | R3C4 | 精英怪击杀后必定掉落1个道具，碎片掉落+2 | 必掉1道具，+2碎片 | G-08 |
| G-13 | 磁场超载 | R4C1 | 拾取范围极大化，屏幕内所有经验宝石每5s自动吸附一次 | 拾取+100px，5s全屏吸 | G-09 |
| G-14 | 不朽契约 | R4C2 | 生命上限大幅提升，每局保命次数+1（共2次） | +60 HP，保命2次 | G-10 |
| G-15 | 进化大师 | R4C3 | 每局可额外进行1次进化（进化上限4→5） | 进化上限+1 | G-11 |
| G-16 | 命运收割 | R4C4 | 结算转盘额外获得1次免费旋转 | +1次转盘 | G-12 |

### 3.2 道士战斗天赋树（5行×4列=20节点）

核心流派：雷霆流（chain_lightning/taoist_thunder_bolt/taoist_thunder_cloud）、火焰流（taoist_burn_curse/taoist_fire_wall/taoist_ignite_explode）、亡者流（taoist_summon_skeleton/taoist_summon_archer/taoist_raise_dead/taoist_corpse_burst）

| ID | 名称 | 行/列 | 效果描述 | 数值 | 前置 |
|:--:|:----:|:-----:|---------|:----:|:----:|
| T-01 | 连锁余震 | R1C1 | chain_lightning 弹射命中后，目标脚下留下0.5s微型雷池 | 雷池半径30px，伤害=弹射伤害×0.3 | 无 |
| T-02 | 灼烧蔓延 | R1C2 | taoist_burn_curse 灼烧扩散范围扩大 | 扩散+30px（80→110） | 无 |
| T-03 | 骨盾 | R1C3 | 召唤骷髅死亡时在原地留下骨盾碎片，玩家经过获得5点护盾 | 护盾5，持续3s | 无 |
| T-04 | 雷符余韵 | R1C4 | 主动技 thunder_seal 释放后，3s内所有雷系技能弹射+1 | 弹射+1，持续3s | 无 |
| T-05 | 分裂闪电 | R2C1 | chain_lightning 每次弹射有概率分裂出1道子弹射 | 分裂概率25%，子弹射伤害×0.5 | T-01 |
| T-06 | 焚身连锁 | R2C2 | taoist_ignite_explode 爆炸命中的敌人若带灼烧，爆炸范围再扩大 | 二次爆炸范围+20px | T-02 |
| T-07 | 亡者军团 | R2C3 | taoist_raise_dead 复活的骷髅击杀敌人时，也触发亡者复苏判定 | 连锁复活概率=原概率×0.5 | T-03 |
| T-08 | 天雷引 | R2C4 | taoist_thunder_bolt 暴击时，额外在目标周围随机位置落下1道小雷 | 小雷伤害=主雷×0.4 | T-04 |
| T-09 | 雷云扩散 | R3C1 | taoist_thunder_cloud 放电范围扩大，且放电目标数+1 | 范围+50px，目标+1 | T-05 |
| T-10 | 火墙延伸 | R3C2 | taoist_fire_wall 长度翻倍，且两端各生成1个火柱（持续2s） | 长度×2，火柱半径25px | T-06 |
| T-11 | 骷髅射手齐射 | R3C3 | taoist_summon_archer 攻击变为双箭齐射（第二箭伤害×0.6） | 双箭，副箭60%伤害 | T-07 |
| T-12 | 麻痹折射 | R3C4 | taoist_paralyze_zone 定身触发时，向周围3个敌人释放折射电弧 | 折射3目标，伤害=区域伤害×0.5 | T-08 |
| T-13 | 雷网交织 | R4C1 | chain_lightning 弹射路径上留下0.3s电弧残影，经过的敌人受1次伤害 | 残影伤害=弹射×0.2 | T-09 |
| T-14 | 烈焰风暴 | R4C2 | taoist_ignite_explode 同时有3个以上敌人爆炸时，触发烈焰风暴（全屏灼烧1s） | 阈值3，全屏DPS=灼烧DPS×0.5 | T-10 |
| T-15 | 白骨王座 | R4C3 | 召唤物数量上限+2，骷髅死亡时尸爆范围+15px | 上限+2，尸爆+15px | T-11 |
| T-16 | 万雷归宗 | R4C4 | 主动技 thunder_seal 弹射数+2，且每次弹射留下雷池 | 弹射+2，雷池同T-01 | T-12 |
| T-17 | 天罚雷域 | R5C1 | 雷云持续期间，每3s在雷云范围内随机生成1个麻痹领域（持续2s） | 3s/个，持续2s | T-13 |
| T-18 | 焚天 | R5C2 | 火墙存在时，其上方持续落下火雨（每0.8s一次，范围30px） | 0.8s间隔，伤害=火墙×0.3 | T-14 |
| T-19 | 亡灵君主 | R5C3 | 召唤物击杀的敌人100%触发亡者复苏，且复苏骷髅继承击杀者50%攻击力 | 概率100%，继承50%ATK | T-15 |
| T-20 | 雷帝敕令 | R5C4 | thunder_seal 释放时，场上所有带感电状态的敌人同时受到1次天雷击伤害 | 触发taoist_thunder_bolt当前等级伤害 | T-16 |

### 3.3 武士战斗天赋树（5行×4列=20节点）

核心流派：一闪突斩（flash_slash）、魔法飞弹（magic_missile）、灾厄光环（doom_aura）

| ID | 名称 | 行/列 | 效果描述 | 数值 | 前置 |
|:--:|:----:|:-----:|---------|:----:|:----:|
| S-01 | 残影斩 | R1C1 | flash_slash 突进路径留下0.5s斩击残影，经过的敌人受1次伤害 | 残影伤害=一闪×0.3 | 无 |
| S-02 | 飞弹分裂 | R1C2 | magic_missile 命中后有概率分裂为2颗小飞弹 | 分裂概率20%，小飞弹伤害×0.4 | 无 |
| S-03 | 气场扩张 | R1C3 | doom_aura 光环范围扩大 | +40px（200→240） | 无 |
| S-04 | 拔刀术 | R1C4 | flash_slash 击杀减CD效果触发时，额外回复5点法力 | 回蓝5 | 无 |
| S-05 | 二连闪 | R2C1 | flash_slash 突进结束后0.3s内可再次释放（第二次伤害×0.6，不消耗法力） | 二段斩60%伤害 | S-01 |
| S-06 | 追踪强化 | R2C2 | magic_missile 追踪范围扩大，且命中后标记目标2s（被标记目标受飞弹优先追踪） | 追踪+80px，标记2s | S-02 |
| S-07 | 灾厄侵蚀 | R2C3 | doom_aura 内敌人每停留2s叠加1层蚀防（最多3层），每层额外降低抗性5% | 2s/层，-5%/层，上限3 | S-03 |
| S-08 | 居合 | R2C4 | flash_slash 无敌时间延长，且无敌期间接触敌人造成斩击伤害 | 无敌+0.15s，接触伤害=一闪×0.5 | S-04 |
| S-09 | 剑气纵横 | R3C1 | flash_slash 突进路径宽度扩大，且路径末端释放扇形剑气（120°） | 路径宽+20px，剑气伤害×0.4 | S-05 |
| S-10 | 飞弹齐射 | R3C2 | magic_missile 发射数+1，且所有飞弹命中同一目标时触发爆裂（范围40px） | +1发，爆裂伤害=飞弹×0.5 | S-06 |
| S-11 | 灾厄领域 | R3C3 | doom_aura 范围内敌人死亡时爆炸（范围50px），爆炸伤害与光环减抗值挂钩 | 爆炸伤害=10+减抗%×20 | S-07 |
| S-12 | 无念 | R3C4 | flash_slash 击杀3个以上敌人时，下次释放不消耗法力且无敌+0.2s | 阈值3杀，免蓝+0.2s无敌 | S-08 |
| S-13 | 万刃归一 | R4C1 | flash_slash 残影数量×2，且残影存在时间延长至1s | 残影×2，持续1s | S-09 |
| S-14 | 灾厄飞弹 | R4C2 | magic_missile 命中带 doom_aura 减抗的敌人时，飞弹穿透+1 | 穿透+1（仅对光环内敌） | S-10 |
| S-15 | 蚀骨之域 | R4C3 | doom_aura 范围再扩大，且范围内敌人移速降低15% | +60px，减速15% | S-11 |
| S-16 | 一闪·极 | R4C4 | flash_slash 击杀减CD触发时，有30%概率立即刷新（不进入冷却） | 刷新概率30% | S-12 |
| S-17 | 天诛 | R5C1 | flash_slash 路径上所有敌人被标记3s，标记期间受所有飞弹额外追踪 | 标记3s | S-13 |
| S-18 | 星陨飞弹 | R5C2 | magic_missile 每第5发变为大型飞弹（伤害×3，范围60px，穿透全部） | 每5发1次 | S-14 |
| S-19 | 终焉光环 | R5C3 | doom_aura 减抗达到最大层数时，目标被定身0.5s（每目标每10s触发1次） | 定身0.5s，CD10s | S-15 |
| S-20 | 无念·真一闪 | R5C4 | flash_slash 连续击杀5个敌人后，下次释放变为全屏斩（伤害×2，全屏范围） | 阈值5，全屏斩×2 | S-16 |

### 3.4 法老战斗天赋树（5行×4列=20节点）

核心流派：召唤（taoist_summon_skeleton/taoist_summon_archer/taoist_raise_dead）、冥棺（sarcophagus）、尸爆（taoist_corpse_burst）

| ID | 名称 | 行/列 | 效果描述 | 数值 | 前置 |
|:--:|:----:|:-----:|---------|:----:|:----:|
| P-01 | 木乃伊守卫 | R1C1 | 召唤骷髅有20%概率变为木乃伊（HP×2，移速-30%，攻击附带减速） | 概率20%，减速20% | 无 |
| P-02 | 尸毒 | R1C2 | taoist_corpse_burst 爆炸附加中毒效果（DPS=当前poisonDps等级值，持续3s） | 中毒3s | 无 |
| P-03 | 冥棺回响 | R1C3 | sarcophagus 释放后，所有召唤物获得2s攻速提升（攻击间隔-30%） | 攻速+30%，2s | 无 |
| P-04 | 骨刺陷阱 | R1C4 | 召唤骷髅死亡位置留下骨刺（持续4s），敌人经过受1次伤害 | 骨刺伤害=骷髅ATK×0.5 | 无 |
| P-05 | 法老诅咒 | R2C1 | 召唤物攻击命中敌人时，有15%概率施加诅咒（被诅咒敌人死亡时必定爆炸） | 概率15% | P-01 |
| P-06 | 毒雾扩散 | R2C2 | taoist_corpse_burst 爆炸范围扩大，且爆炸区域留下2s毒雾 | 范围+20px，毒雾DPS=爆炸×0.2 | P-02 |
| P-07 | 冥棺召唤 | R2C3 | sarcophagus 释放时额外召唤2个临时木乃伊（持续8s后自爆） | +2临时，8s后爆炸伤害=骷髅ATK×2 | P-03 |
| P-08 | 骨墙 | R2C4 | 召唤骷髅死亡时，有30%概率在原地生成骨墙（阻挡敌人2s） | 概率30%，阻挡2s | P-04 |
| P-09 | 亡灵行军 | R3C1 | 召唤物移动速度提升，且向同一方向移动时形成编队（编队内召唤物攻击+1目标） | 编队攻击+1 | P-05 |
| P-10 | 瘟疫传播 | R3C2 | 中毒敌人死亡时，毒素向周围80px内2个敌人传播 | 传播80px，2目标 | P-06 |
| P-11 | 冥棺领域 | R3C3 | sarcophagus 释放后在脚下生成冥域（半径120px，持续5s），域内召唤物HP持续回复 | 回复=召唤物maxHP×5%/s | P-07 |
| P-12 | 骨甲 | R3C4 | 召唤骷髅存活超过10s时获得骨甲（减免50%伤害，持续至死亡） | 10s后触发，减伤50% | P-08 |
| P-13 | 法老军团 | R4C1 | 召唤物上限+3，木乃伊出现概率提升至35% | 上限+3，概率35% | P-09 |
| P-14 | 剧毒尸爆 | R4C2 | taoist_corpse_burst 爆炸伤害范围+30px，中毒敌人爆炸时伤害×1.5 | +30px，中毒×1.5 | P-10 |
| P-15 | 冥王敕令 | R4C3 | sarcophagus 强化倍率期间，召唤物攻击附带范围溅射（50px，伤害×0.3） | 溅射50px，30%伤害 | P-11 |
| P-16 | 白骨堡垒 | R4C4 | 骨墙生成概率提升至50%，且骨墙存在时周围召唤物攻击+1 | 概率50%，攻击+1 | P-12 |
| P-17 | 亡灵天灾 | R5C1 | 场上召唤物达到上限时，每5s自动释放1次尸爆（以随机召唤物为中心） | 5s/次 | P-13 |
| P-18 | 瘟疫之源 | R5C2 | 中毒效果无上限叠加，每层+1 DPS，且传播目标数+2 | 无上限，传播+2 | P-14 |
| P-19 | 永恒冥棺 | R5C3 | sarcophagus 冷却期间，召唤物仍保持强化状态（强化倍率×0.5持续） | 半强化持续 | P-15 |
| P-20 | 法老降临 | R5C4 | 召唤物同时存活8个以上时，法老获得法老光环（半径150px内敌人每秒受召唤物总ATK×5%伤害） | 阈值8，光环DPS=总ATK×5% | P-16 |

### 3.5 寒冰女巫战斗天赋树（5行×4列=20节点）

核心流派：冰冻控制（ice_barrier/frozen_field）、雷系（chain_lightning）、存续（iron_skin/life_spring）

| ID | 名称 | 行/列 | 效果描述 | 数值 | 前置 |
|:--:|:----:|:-----:|---------|:----:|:----:|
| I-01 | 霜痕 | R1C1 | 所有冰系技能命中敌人时留下霜痕（持续3s），霜痕期间敌人受冰系技能范围+20% | 霜痕3s，范围+20% | 无 |
| I-02 | 冰晶碎片 | R1C2 | ice_barrier 破裂时向四周射出4枚冰晶碎片 | 4枚，伤害=盾量×0.3，射程120px | 无 |
| I-03 | 寒流 | R1C3 | frozen_field 释放后，冰域边缘向外扩散1次寒流（额外50px，持续1s） | 扩散+50px，1s | 无 |
| I-04 | 冰甲 | R1C4 | 冻结敌人被击杀时，玩家获得3点护盾（持续5s） | 护盾3，5s | 无 |
| I-05 | 连锁冻结 | R2C1 | 冻结效果有20%概率向周围60px内1个敌人传播 | 概率20%，传播60px | I-01 |
| I-06 | 棱镜折射 | R2C2 | ice_barrier 存在期间，chain_lightning 命中冰盾时折射（额外弹射2次，不衰减） | 折射+2，无衰减 | I-02 |
| I-07 | 永冻 | R2C3 | frozen_field 中心区域（半径50%）冻结时间+0.5s | 中心+0.5s | I-03 |
| I-08 | 碎冰爆裂 | R2C4 | 冻结状态敌人受到任何伤害时，有25%概率立即碎裂（造成冻结碎裂伤害） | 概率25% | I-04 |
| I-09 | 暴风雪 | R3C1 | frozen_field 持续期间每2s在域内随机位置落下冰雹（范围35px） | 2s/个，伤害=DPS×1.5 | I-05 |
| I-10 | 冰棱之墙 | R3C2 | ice_barrier 破裂后在原地留下冰棱墙（持续3s），敌人接触受减速40% | 冰墙3s，减速40% | I-06 |
| I-11 | 绝对零度 | R3C3 | 敌人被冻结2次后进入「深冻」状态（持续3s，期间受到的冻结碎裂伤害×2） | 深冻3s，碎裂×2 | I-07 |
| I-12 | 寒冰护体 | R3C4 | 生命低于50%时，ice_barrier 破裂冻结时间+0.5s，且冻结范围+30px | 冻结+0.5s，范围+30px（<50%HP） | I-08 |
| I-13 | 冰河世纪 | R4C1 | frozen_field 范围+60px，且域内敌人被减速时额外降低攻击速度20% | +60px，攻速-20% | I-09 |
| I-14 | 棱镜风暴 | R4C2 | ice_barrier 存在时，所有投射物（飞弹/火球/闪电）命中冰盾附近敌人时折射+1 | 折射+1 | I-10 |
| I-15 | 冰封万里 | R4C3 | 冻结传播概率提升至40%，传播范围+30px | 概率40%，+30px | I-11 |
| I-16 | 冰心 | R4C4 | 每次冻结敌人回复2HP，每次碎裂敌人回复4HP | 冻结+2HP，碎裂+4HP | I-12 |
| I-17 | 永恒冻土 | R5C1 | frozen_field 结束后，地面保留3s霜冻区域（减速30%，无伤害） | 残留3s，减速30% | I-13 |
| I-18 | 冰晶共鸣 | R5C2 | 场上每存在1个被冻结的敌人，ice_barrier 盾量+10%（最多+50%） | +10%/个，上限50% | I-14 |
| I-19 | 极寒领域·真 | R5C3 | frozen_field 内所有敌人冻结时间+1s，且冻结碎裂伤害×1.5 | +1s，碎裂×1.5 | I-15 |
| I-20 | 冰后降临 | R5C4 | 同时冻结5个以上敌人时，触发冰后降临：全屏冻结1.5s + 全屏碎裂伤害 | 阈值5，全屏1.5s | I-16 |

### 3.6 十字军战斗天赋树（5行×4列=20节点）

核心流派：圣盾（holy_shield/ice_barrier/holy_guardian）、火焰（fireball/fire_attunement）、存续（iron_skin/vitality/life_spring）

| ID | 名称 | 行/列 | 效果描述 | 数值 | 前置 |
|:--:|:----:|:-----:|---------|:----:|:----:|
| C-01 | 盾击 | R1C1 | holy_shield 冲阵路径上敌人被击退30px并眩晕0.3s | 击退30px，眩晕0.3s | 无 |
| C-02 | 圣火 | R1C2 | fireball 爆炸时在地面留下圣火（持续2s，范围30px） | 圣火2s，DPS=火球×0.2 | 无 |
| C-03 | 坚守 | R1C3 | 站立不动超过2s时，获得护盾（=最大HP×5%，持续至移动） | 护盾5%maxHP | 无 |
| C-04 | 圣光脉冲 | R1C4 | holy_guardian 治疗时同时释放光脉冲（半径100px，伤害=治疗量×0.5） | 脉冲100px，伤害=治疗×0.5 | 无 |
| C-05 | 盾反 | R2C1 | holy_shield 吸收伤害时，有30%概率将吸收量×0.5反弹给最近敌人 | 反弹概率30%，×0.5 | C-01 |
| C-06 | 烈焰冲锋 | R2C2 | holy_shield 冲阵路径留下火焰带（持续3s，与fire_wall同机制） | 火带3s，DPS=fireball×0.3 | C-02 |
| C-07 | 铁壁 | R2C3 | 护盾存在时，iron_skin 减伤效果翻倍 | 减伤×2（仅护盾期间） | C-03 |
| C-08 | 祝福之地 | R2C4 | holy_guardian 存在位置生成祝福区域（半径80px），区域内拾取范围+50px | 区域80px，拾取+50px | C-04 |
| C-09 | 圣盾连击 | R3C1 | holy_shield 冲阵命中5个以上敌人时，立即释放第二次冲阵（伤害×0.5） | 阈值5，二段×0.5 | C-05 |
| C-10 | 火雨 | R3C2 | fireball 命中精英时，在精英头顶落下3颗小火球（间隔0.3s） | 3颗，伤害=火球×0.3 | C-06 |
| C-11 | 不动如山 | R3C3 | 坚守护盾触发时，周围100px内敌人被减速30%（持续2s） | 减速30%，2s | C-07 |
| C-12 | 圣光链 | R3C4 | holy_guardian 治疗时，光束连接范围内所有召唤物并治疗（治疗量×0.5） | 连接治疗×0.5 | C-08 |
| C-13 | 审判之盾 | R4C1 | holy_shield 吸收转真伤比例+15%，且冲阵宽度+25px | 转化+15%，宽度+25px | C-09 |
| C-14 | 焚天烈焰 | R4C2 | fire_attunement 激活期间，fireball 爆炸范围+25px且附带击退 | +25px，击退20px | C-10 |
| C-15 | 堡垒 | R4C3 | 坚守护盾值提升至maxHP×10%，且护盾存在时拾取范围+80px | 10%HP，拾取+80px | C-11 |
| C-16 | 圣域 | R4C4 | holy_guardian 持续时间+4s，且存在时每秒为范围内敌人施加1层感电 | +4s，感电1层/s | C-12 |
| C-17 | 天罚冲阵 | R5C1 | holy_shield 冲阵路径上的敌人被标记4s，标记期间受所有圣光伤害×1.5 | 标记4s，×1.5 | C-13 |
| C-18 | 灭世火雨 | R5C2 | fireball 每第3次释放变为大火球（范围×2，留下5s圣火区域） | 每3发1次 | C-14 |
| C-19 | 永恒壁垒 | R5C3 | 护盾被击破时，释放圣光爆发（半径150px，伤害=护盾值×1.0，眩晕0.5s） | 爆发150px，眩晕0.5s | C-15 |
| C-20 | 圣骑士降临 | R5C4 | holy_guardian 存在时，玩家获得圣骑士光环（半径120px，域内敌人每秒受玩家maxHP×2%伤害） | 光环DPS=maxHP×2% | C-16 |

---

## 第四章：碎片与武器系统

### 4.1 碎片获取表

| 来源 | 数量 | 概率 | 每日上限 | 备注 |
|------|:----:|:----:|:--------:|------|
| 普通怪/冲锋怪击杀 | 0 | — | — | 不掉落碎片 |
| 精英击杀 | 1 | 40% | 无上限 | 每只独立判定 |
| 宝藏哥布林击杀 | 2 | 100% | 无上限 | 必掉，稀有高回报 |
| 结算转盘 | 2-8 | 见转盘表 | 无上限 | 随机 |
| 每日任务 | 5 | 100% | 5/天 | 完成3局 |
| 广告观看 | 3 | 100% | 9/天（3次） | 每次3碎片，额外收益 |

**碎片为通用碎片**，可用于解锁任意职业武器。

### 4.2 道士 6 把武器

| ID | 名称 | 稀有度 | 碎片 | 效果描述 | 视觉表现 |
|:--:|:----:|:------:|:----:|---------|---------|
| W-T1 | 青雷竹杖 | 普通 | 80 | chain_lightning 弹射时在每个命中点留下0.3s电弧残影（半径20px，伤害=弹射×0.2） | 竹杖顶端缠绕青色电弧，弹射路径变为青绿色 |
| W-T2 | 焚天符笔 | 普通 | 80 | taoist_fire_wall 宽度+15px，且火焰颜色变为蓝紫色（纯视觉+范围） | 符笔尖端滴落蓝紫墨焰，火墙呈符文形态 |
| W-T3 | 九幽骨笛 | 稀有 | 200 | taoist_summon_skeleton 召唤时，骷髅自带骨弓（每3s射出1箭，伤害=骷髅ATK×0.4） | 骨笛吹响时地面裂开，骷髅手持骨弓爬出 |
| W-T4 | 天雷令旗 | 稀有 | 200 | taoist_thunder_cloud 放电时，有20%概率在放电点生成微型麻痹领域（半径30px，持续1.5s） | 令旗挥动时雷云变为金色，放电附带金色光圈 |
| W-T5 | 万灵幡 | 史诗 | 400 | taoist_raise_dead 触发时，复苏的骷髅有30%概率变为精英骷髅（HP×3，ATK×2，体型×1.5，持续15s后自爆） | 幡旗飘动时绿光弥漫，精英骷髅带金色王冠 |
| W-T6 | 太上雷印 | 史诗 | 400 | thunder_seal 释放时，弹射路径形成雷印阵（持续3s），阵内所有敌人每秒受1次弹射伤害×0.3，且弹射无衰减 | 雷印落地形成八卦阵纹，阵内雷光交织 |

### 4.3 武士 6 把武器

| ID | 名称 | 稀有度 | 碎片 | 效果描述 | 视觉表现 |
|:--:|:----:|:------:|:----:|---------|---------|
| W-S1 | 无名刀 | 普通 | 80 | flash_slash 突进距离+30%，路径宽度+10px | 刀身透明如玻璃，斩击时留下白色弧光 |
| W-S2 | 风魔手里剑 | 普通 | 80 | magic_missile 变为手里剑形态，命中后弹向1个额外目标（伤害×0.5） | 飞弹变为旋转手里剑，命中时分裂 |
| W-S3 | 鬼切 | 稀有 | 200 | flash_slash 击杀敌人时，在击杀点留下鬼火（持续4s），鬼火追踪最近敌人造成1次伤害 | 刀刃泛紫光，击杀时紫色鬼火飘出 |
| W-S4 | 灾厄太刀 | 稀有 | 200 | doom_aura 范围内，武士的 flash_slash 命中敌人时额外施加1层感电 | 太刀缠绕黑红色灾厄之气 |
| W-S5 | 天丛云剑 | 史诗 | 400 | flash_slash 释放时，在突进路径垂直方向释放2道交叉剑气（各120px，伤害=一闪×0.4） | 剑身如云朵般虚幻，释放时三道剑气形成「十」字 |
| W-S6 | 村正·妖刀 | 史诗 | 400 | flash_slash 每次击杀叠加1层「妖气」（最多10层），每层使下次一闪路径留下妖火（持续2s，DPS=一闪×0.1/层） | 刀身血红，层数越高刀身越红，10层时全身环绕血色火焰 |

### 4.4 法老 6 把武器

| ID | 名称 | 稀有度 | 碎片 | 效果描述 | 视觉表现 |
|:--:|:----:|:------:|:----:|---------|---------|
| W-P1 | 骨杖 | 普通 | 80 | taoist_summon_skeleton 召唤的骷髅攻击附带骨刺溅射（30px，伤害×0.2） | 骨杖顶端镶嵌骷髅头，召唤时地面骨刺突出 |
| W-P2 | 防腐香料 | 普通 | 80 | 召唤物存活时间无限制（原无限制），但HP+20%，且死亡时留下毒雾（2s，DPS=3） | 金色香料瓶，召唤物带金色绷带纹理 |
| W-P3 | 阿努比斯权杖 | 稀有 | 200 | taoist_raise_dead 复苏的骷髅有25%概率变为阿努比斯卫士（远程，射程200px，伤害=骷髅×1.5） | 权杖顶端胡狼头，卫士为黑色胡狼形态 |
| W-P4 | 冥河之沙 | 稀有 | 200 | taoist_corpse_burst 爆炸时，爆炸区域变为沙地（3s），沙地内敌人移速-40% | 爆炸时金色沙粒四散，地面变为流沙 |
| W-P5 | 拉之权杖 | 史诗 | 400 | sarcophagus 释放时，在法老周围生成4个太阳火球（环绕3s），接触敌人造成爆炸（范围50px，伤害=冥棺冲击×0.6） | 权杖顶端太阳圆盘，火球为金色太阳形态 |
| W-P6 | 亡灵圣经 | 史诗 | 400 | 场上每存在1个召唤物，所有召唤物攻击附带亡者诅咒（被诅咒敌人死亡时100%触发尸爆，无需taoist_corpse_burst技能） | 圣经翻页时绿色文字飘出，诅咒敌人为绿色骷髅标记 |

### 4.5 寒冰女巫 6 把武器

| ID | 名称 | 稀有度 | 碎片 | 效果描述 | 视觉表现 |
|:--:|:----:|:------:|:----:|---------|---------|
| W-I1 | 霜之魔杖 | 普通 | 80 | ice_barrier 生成时，周围80px内敌人立即减速20%（持续2s） | 魔杖顶端冰晶闪烁，生成时霜花扩散 |
| W-I2 | 冰棱护符 | 普通 | 80 | frozen_field 内敌人被减速时，有15%概率额外受到1次冰棱刺（伤害=DPS×1.0） | 护符散发寒气，冰棱从地面刺出 |
| W-I3 | 北风之弓 | 稀有 | 200 | chain_lightning 命中被冻结/减速的敌人时，弹射次数+2且不衰减 | 弓身覆冰，箭矢为冰蓝色闪电形态 |
| W-I4 | 永冻之心 | 稀有 | 200 | 冻结敌人被击杀时，在原地留下冰雕（持续5s），冰雕周围60px内敌人减速25% | 击杀时敌人变为冰雕，散发寒气 |
| W-I5 | 冰后权杖 | 史诗 | 400 | frozen_field 释放时，域内随机生成3个冰柱（持续至域结束），冰柱每1.5s向最近敌人射出冰锥（伤害=DPS×2） | 权杖顶端冰冠，冰柱为透明蓝水晶 |
| W-I6 | 绝对零度法典 | 史诗 | 400 | 敌人被冻结时，有10%概率触发「绝对零度」（该敌人及周围80px内所有敌人冻结3s，碎裂伤害×2） | 法典翻页时雪花飘出，触发时全屏闪白0.2s |

### 4.6 十字军 6 把武器

| ID | 名称 | 稀有度 | 碎片 | 效果描述 | 视觉表现 |
|:--:|:----:|:------:|:----:|---------|---------|
| W-C1 | 铁壁塔盾 | 普通 | 80 | holy_shield 吸收量+25%，冲阵路径宽度+15px | 塔盾厚重，冲阵时地面留下裂痕 |
| W-C2 | 圣火火炬 | 普通 | 80 | fire_attunement 激活时，fireball 爆炸附带击退（15px） | 火炬燃烧金色圣火，火球带金色尾焰 |
| W-C3 | 审判之锤 | 稀有 | 200 | holy_shield 冲阵终点释放震地（半径80px，伤害=冲击×0.8，眩晕0.5s） | 锤击地面时金色冲击波扩散 |
| W-C4 | 圣杯 | 稀有 | 200 | holy_guardian 治疗量+50%，且治疗溢出部分转化为护盾（上限=maxHP×10%） | 圣杯溢出金色液体，护盾为金色光圈 |
| W-C5 | 誓约之盾 | 史诗 | 400 | holy_shield 吸收的伤害50%转化为圣光储存（上限200），下次冲阵释放全部储存（范围120px真伤） | 盾面刻有誓约文字，储存越多盾面越亮 |
| W-C6 | 圣骑士圣典 | 史诗 | 400 | 生命高于80%时，所有技能范围+20%；生命低于30%时，获得圣光护体（每秒回复maxHP×3%，持续至脱离30%） | 圣典散发柔和金光，高血时金圈环绕，低血时金色护体 |

---

## 第五章：局内道具掉落系统

### 5.1 掉落物完整表

| ID | 类型 | 外观描述 | 效果 | 持续 | 掉落来源 | 概率 | 拾取范围 | 停留时间 | 堆叠上限 |
|:--:|:----:|---------|------|:----:|---------|:----:|:--------:|:--------:|:--------:|
| D-01 | 经验宝石(小) | 蓝色菱形晶体，微光闪烁 | +3 局内经验 | 即时 | 杂兵 | 100% | 110px | 30s | 无 |
| D-02 | 经验宝石(大) | 紫色六芒晶体，脉冲发光 | +10 局内经验 | 即时 | 精英/冲锋兵 | 100% | 110px | 30s | 无 |
| D-03 | 回复药水 | 红色心形瓶，液体晃动 | 回复 30% maxHP | 即时 | 杂兵/冲锋兵 | 8% | 90px | 15s | 1 |
| D-04 | 大回复药水 | 金色心形瓶，光芒四射 | 回复 60% maxHP | 即时 | 精英 | 25% | 90px | 15s | 1 |
| D-05 | 磁铁 | 红色U形磁铁，电弧闪烁 | 全屏吸附所有掉落物 | 8s | 杂兵/冲锋兵 | 4% | 90px | 12s | 1 |
| D-06 | 时停怀表 | 金色怀表，指针停转 | 全场敌人冻结（不含精英） | 5s | 精英 | 12% | 90px | 10s | 1 |
| D-07 | 狂战烙印 | 红色火焰图腾 | 全局伤害 +15% | 12s | 精英 | 10% | 90px | 12s | 1 |
| D-08 | 护盾卷轴 | 蓝色盾牌图标卷轴 | 获得 maxHP×20% 护盾 | 10s | 冲锋兵 | 6% | 90px | 12s | 1 |
| D-09 | 技能残页 | 泛黄羊皮纸，符文闪烁 | 随机1个已有技能+1级 | 即时 | 精英 | 15% | 90px | 20s | 1 |
| D-10 | 进化催化剂 | 紫色星形晶体，旋转发光 | 当前最高级技能催化进度+50% | 即时 | 精英(波次≥10) | 8% | 90px | 20s | 1 |
| D-11 | 碎片袋 | 金色小袋，碎片碰撞声 | +2 局外碎片 | 即时 | 哥布林 | 100% | 110px | 25s | 无 |
| D-12 | 复活羽毛 | 白色羽毛，金光环绕 | 死亡时自动复活（50%HP） | 至触发 | 精英(波次≥12) | 5% | 90px | 20s | 1 |

### 5.2 掉落物交互规则

**拾取动画**：
- 进入拾取范围 → 掉落物以 300px/s 速度飞向玩家（0.3-0.5s）
- 到达玩家 → 缩放消失（0.15s scale 1→0）+ 粒子爆发（5-8粒子）
- 磁铁激活 → 所有掉落物同时飞向玩家，速度 500px/s

**音效**：
- 经验宝石：清脆叮当（音高随连续拾取递增，最多+5半音）
- 回复药水：液体吞咽音
- 磁铁：电磁嗡鸣（持续8s）
- 时停：钟表停摆+玻璃碎裂
- 技能残页：翻页+魔法音效

**飘字**：
- 经验：蓝色「+3 EXP」
- 回复：绿色「+36 HP」
- 狂战：红色「ATK +15%」
- 碎片：金色「+2 碎片」

**磁铁交互**：
- 磁铁与天赋 G-01/G-05/G-13 叠加：拾取范围取最大值
- 磁铁激活时，新掉落的物品也立即被吸附
- 磁铁期间击杀掉落的经验宝石直接计入（无需飞行时间）

### 5.3 掉落物与天赋/武器联动

| 天赋/武器 | 联动效果 |
|----------|---------|
| G-04 幸运星 | 所有掉落概率 ×1.08 |
| G-08 宝藏嗅觉 | 哥布林额外掉落 D-11 碎片袋×1 |
| G-12 精英猎手 | 精英必掉1个 D-03~D-10 中随机道具 |
| G-16 命运收割 | 结算转盘+1次（间接增加碎片/道具） |
| W-T3 九幽骨笛 | 骷髅击杀也触发掉落判定（概率=玩家概率×0.5） |
| W-P4 冥河之沙 | 沙地内击杀的敌人掉落概率+10% |
| W-C4 圣杯 | 回复药水效果+50%（30%→45%） |

---

## 第六章：结算转盘

### 6.1 转盘格子完整表（12格）

| 格号 | 格子名 | 概率 | 奖励内容 | 视觉表现 |
|:----:|:------:|:----:|---------|---------|
| 1 | 碎片·小 | 20% | 2 碎片 | 灰色碎片图标×2 |
| 2 | 金币·小 | 18% | 100 金币 | 铜色硬币堆 |
| 3 | 碎片·中 | 15% | 4 碎片 | 蓝色碎片图标×4 |
| 4 | 经验·小 | 12% | 200 局外经验 | 蓝色经验瓶 |
| 5 | 金币·中 | 10% | 300 金币 | 银币堆 |
| 6 | 碎片·大 | 8% | 8 碎片 | 紫色碎片图标×8 |
| 7 | 经验·大 | 6% | 500 局外经验 | 紫色经验瓶 |
| 8 | 天赋重置券 | 4% | 1张天赋重置券 | 金色卷轴 |
| 9 | 武器碎片箱 | 3% | 随机职业10碎片 | 金色宝箱 |
| 10 | 金币·大 | 2% | 800 金币 | 金币山 |
| 11 | 稀有碎片 | 1.5% | 15 碎片 | 彩虹碎片 |
| 12 | 传说宝箱 | 0.5% | 30碎片+500金币+1天赋重置券 | 彩虹宝箱，金光四射 |

### 6.2 转盘规则

| 规则项 | 数值 | 说明 |
|--------|:----:|------|
| 免费次数 | 1次/局 | 每局结算后自动获得1次 |
| 广告次数 | 2次/天 | 观看15s广告获得1次 |
| 金币次数 | 1次/天 | 花费500金币获得1次 |
| 每日上限 | 5次/天 | 免费1+广告2+金币1+天赋G-16额外1 |
| 旋转动画 | 3.5s | 先快后慢，最后2格减速 |
| 连续旋转 | 支持 | 多次奖励依次弹出 |

### 6.3 保底机制

| 保底规则 | 触发条件 | 效果 |
|---------|---------|------|
| 小保底 | 连续 8 次未出格6-12（概率≤8%的格子） | 第9次必出格6（碎片·大） |
| 大保底 | 连续 20 次未出格9-12（概率≤4%的格子） | 第21次必出格9（武器碎片箱） |
| 传说保底 | 连续 50 次未出格12 | 第51次必出格12（传说宝箱） |
| 保底重置 | 触发对应保底后 | 该级别计数器归零 |

**保底计数器存储**：`localStorage.wheel.pity_small / pity_rare / pity_legend`

### 6.4 转盘与天赋/碎片联动

| 联动项 | 效果 |
|--------|------|
| G-16 命运收割 | 每局结算额外+1次免费旋转（免费次数1→2） |
| G-04 幸运星 | 转盘概率微调：格1-5各-1%，格6-12各+约0.7% |
| G-08 宝藏嗅觉 | 转盘出现格9时，碎片数10→12 |
| 每日首胜 | 首局结算转盘保底进度+2（加速保底） |

---

## 第七章：数据持久化

### 7.1 localStorage 完整 JSON Schema

```json
{
  "version": 2,
  "player": {
    "uid": "string (UUID v4)",
    "nickname": "string (default: '冒险者')",
    "level": "number (1-30, default: 1)",
    "exp": "number (当前等级内经验, default: 0)",
    "totalExp": "number (累计经验, default: 0)",
    "talentPoints": "number (可用天赋点, default: 0)",
    "gold": "number (金币, default: 0)",
    "fragments": "number (通用碎片, default: 0)",
    "talentResetTickets": "number (重置券, default: 0)"
  },
  "talents": {
    "general": ["string[] (已点亮节点ID, e.g. ['G-01','G-02'])"],
    "taoist": ["string[]"],
    "samurai": ["string[]"],
    "pharaoh": ["string[]"],
    "ice_witch": ["string[]"],
    "crusader": ["string[]"]
  },
  "weapons": {
    "taoist": ["string[] (已解锁武器ID, e.g. ['W-T1'])"],
    "samurai": ["string[]"],
    "pharaoh": ["string[]"],
    "ice_witch": ["string[]"],
    "crusader": ["string[]"],
    "equipped": {
      "taoist": "string|null (当前装备武器ID)",
      "samurai": "string|null",
      "pharaoh": "string|null",
      "ice_witch": "string|null",
      "crusader": "string|null"
    }
  },
  "wheel": {
    "pity_small": "number (小保底计数, default: 0)",
    "pity_rare": "number (大保底计数, default: 0)",
    "pity_legend": "number (传说保底计数, default: 0)",
    "dailySpins": "number (今日已用次数, default: 0)",
    "lastSpinDate": "string (YYYY-MM-DD)"
  },
  "stats": {
    "totalRuns": "number (总局数, default: 0)",
    "totalKills": "number (总击杀, default: 0)",
    "bestWave": "number (最高波次, default: 0)",
    "bestTime": "number (最长存活秒, default: 0)",
    "totalEvolutions": "number (总进化次数, default: 0)",
    "classRuns": {
      "taoist": "number", "samurai": "number", "pharaoh": "number",
      "ice_witch": "number", "crusader": "number"
    }
  },
  "daily": {
    "date": "string (YYYY-MM-DD)",
    "runsToday": "number (default: 0)",
    "firstWinClaimed": "boolean (default: false)",
    "adWatchesToday": "number (default: 0)",
    "goldSpinUsed": "boolean (default: false)"
  },
  "settings": {
    "sfxVolume": "number (0-1, default: 0.8)",
    "bgmVolume": "number (0-1, default: 0.6)",
    "vibration": "boolean (default: true)",
    "quality": "string ('high'|'low', default: 'high')"
  },
  "sync": {
    "lastSyncTime": "number (timestamp ms)",
    "serverVersion": "number (服务器数据版本号)",
    "localVersion": "number (本地数据版本号)",
    "pendingUpload": "boolean (是否有未上传数据)"
  }
}
```

### 7.2 每局结算写入逻辑（伪代码）

```javascript
function onRunEnd(result) {
  const save = loadSave();
  
  // 1. 计算本局经验
  let expGain = result.kills.grunt * 1 + result.kills.charger * 2
              + result.kills.elite * 10 + result.kills.goblin * 15;
  expGain += result.waves * 20;
  expGain += result.evolutions * 150;
  expGain += Math.floor(result.surviveTime / 60) * 12;
  
  // 每日首胜
  if (!save.daily.firstWinClaimed && isToday(save.daily.date)) {
    expGain += 200;
    save.daily.firstWinClaimed = true;
  }
  
  // 2. 碎片结算（精英40%概率掉1枚，哥布林100%掉2枚）
  let fragGain = 0;
  for (let i = 0; i < result.kills.elite; i++) {
    if (Math.random() < 0.4) fragGain += 1;
  }
  fragGain += result.kills.goblin * 2;
  save.player.fragments += fragGain;
  
  // 3. 经验入袋 & 升级判定
  save.player.exp += expGain;
  save.player.totalExp += expGain;
  while (save.player.level < 30) {
    const need = EXP_TABLE[save.player.level]; // 查表法，见2.1节等级表
    if (save.player.exp >= need) {
      save.player.exp -= need;
      save.player.level++;
      save.player.talentPoints += 1;
      // 里程碑额外奖励
      if ([5,10,15,20,25,30].includes(save.player.level)) {
        save.player.talentPoints += milestoneBonus(save.player.level);
      }
      showLevelUpUI(save.player.level);
    } else break;
  }
  
  // 4. 统计更新
  save.stats.totalRuns++;
  save.stats.totalKills += result.totalKills;
  save.stats.bestWave = Math.max(save.stats.bestWave, result.waves);
  save.stats.bestTime = Math.max(save.stats.bestTime, result.surviveTime);
  save.stats.totalEvolutions += result.evolutions;
  save.stats.classRuns[result.classId]++;
  save.daily.runsToday++;
  
  // 5. 转盘次数
  save.wheel.dailySpins = 0; // 重置（新的一天）或保持
  
  // 6. 版本标记 & 写入
  save.sync.localVersion++;
  save.sync.pendingUpload = true;
  writeSave(save);
  
  // 7. 尝试上传
  tryUpload(save);
}
```

### 7.3 服务器 MySQL 建表 SQL

```sql
CREATE DATABASE IF NOT EXISTS endless_invasion CHARACTER SET utf8mb4;
USE endless_invasion;

-- 玩家主表
CREATE TABLE t_player (
  uid VARCHAR(36) PRIMARY KEY,
  platform ENUM('wechat','douyin','taptap','tiktok','web') NOT NULL,
  platform_uid VARCHAR(128) NOT NULL,
  nickname VARCHAR(32) DEFAULT '冒险者',
  level TINYINT UNSIGNED DEFAULT 1,
  exp INT UNSIGNED DEFAULT 0,
  total_exp BIGINT UNSIGNED DEFAULT 0,
  talent_points SMALLINT UNSIGNED DEFAULT 0,
  gold INT UNSIGNED DEFAULT 0,
  fragments INT UNSIGNED DEFAULT 0,
  talent_reset_tickets TINYINT UNSIGNED DEFAULT 0,
  data_version INT UNSIGNED DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login DATETIME,
  UNIQUE KEY uk_platform (platform, platform_uid)
) ENGINE=InnoDB;

-- 天赋表
CREATE TABLE t_talent (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  uid VARCHAR(36) NOT NULL,
  tree ENUM('general','taoist','samurai','pharaoh','ice_witch','crusader') NOT NULL,
  node_id VARCHAR(8) NOT NULL,
  unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_uid_node (uid, node_id),
  KEY idx_uid (uid)
) ENGINE=InnoDB;

-- 武器表
CREATE TABLE t_weapon (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  uid VARCHAR(36) NOT NULL,
  weapon_id VARCHAR(8) NOT NULL,
  equipped TINYINT(1) DEFAULT 0,
  unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_uid_weapon (uid, weapon_id),
  KEY idx_uid (uid)
) ENGINE=InnoDB;

-- 转盘保底表
CREATE TABLE t_wheel_pity (
  uid VARCHAR(36) PRIMARY KEY,
  pity_small SMALLINT UNSIGNED DEFAULT 0,
  pity_rare SMALLINT UNSIGNED DEFAULT 0,
  pity_legend SMALLINT UNSIGNED DEFAULT 0,
  total_spins INT UNSIGNED DEFAULT 0
) ENGINE=InnoDB;

-- 局记录表（用于反作弊审计）
CREATE TABLE t_run_log (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  uid VARCHAR(36) NOT NULL,
  run_id VARCHAR(36) NOT NULL,
  class_id VARCHAR(16) NOT NULL,
  waves TINYINT UNSIGNED,
  kills SMALLINT UNSIGNED,
  survive_time SMALLINT UNSIGNED,
  evolutions TINYINT UNSIGNED,
  exp_gained INT UNSIGNED,
  frags_gained SMALLINT UNSIGNED,
  checksum VARCHAR(64),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_uid_time (uid, created_at),
  KEY idx_run (run_id)
) ENGINE=InnoDB;

-- 每日数据表
CREATE TABLE t_daily (
  uid VARCHAR(36) NOT NULL,
  date DATE NOT NULL,
  runs TINYINT UNSIGNED DEFAULT 0,
  first_win TINYINT(1) DEFAULT 0,
  ad_watches TINYINT UNSIGNED DEFAULT 0,
  gold_spin TINYINT(1) DEFAULT 0,
  PRIMARY KEY (uid, date)
) ENGINE=InnoDB;
```

### 7.4 同步策略

**同步时机**：
1. 每局结算后（pendingUpload=true 时）
2. 天赋/武器解锁后
3. 应用切后台时（visibilitychange）
4. 每 5 分钟定时心跳

**冲突解决伪代码**：

```javascript
async function syncToServer(localSave) {
  const serverData = await api.get('/player/data', { uid: localSave.player.uid });
  
  if (!serverData) {
    // 首次上传，直接写入
    await api.post('/player/data', localSave);
    return;
  }
  
  // 版本比较
  if (localSave.sync.localVersion > serverData.data_version) {
    // 本地更新 → 上传
    await api.post('/player/data', localSave);
  } else if (localSave.sync.localVersion < serverData.data_version) {
    // 服务器更新 → 下载覆盖本地
    writeSave(serverData);
  } else {
    // 版本相同 → 取各字段最大值（防丢数据）
    const merged = mergeMax(localSave, serverData);
    await api.post('/player/data', merged);
    writeSave(merged);
  }
}

function mergeMax(local, server) {
  return {
    ...local,
    player: {
      ...local.player,
      level: Math.max(local.player.level, server.player.level),
      totalExp: Math.max(local.player.totalExp, server.player.totalExp),
      gold: Math.max(local.player.gold, server.player.gold),
      fragments: Math.max(local.player.fragments, server.player.fragments),
    },
    stats: {
      totalRuns: Math.max(local.stats.totalRuns, server.stats.totalRuns),
      bestWave: Math.max(local.stats.bestWave, server.stats.bestWave),
      totalKills: Math.max(local.stats.totalKills, server.stats.totalKills),
    },
    talents: mergeArrays(local.talents, server.talents), // 取并集
    weapons: mergeArrays(local.weapons, server.weapons), // 取并集
  };
}
```

---

## 第八章：多平台对接

### 8.1 平台适配层接口定义

```javascript
// PlatformAdapter 抽象接口
const PlatformAdapter = {
  // 初始化（返回 Promise）
  init(): Promise<{ platformId: string }>,
  
  // 登录（获取平台用户标识）
  login(): Promise<{ code: string, platformUid: string }>,
  
  // 用户信息
  getUserInfo(): Promise<{ nickname: string, avatar: string }>,
  
  // 广告
  showRewardedAd(adUnitId: string): Promise<{ completed: boolean }>,
  showBannerAd(adUnitId: string): void,
  hideBannerAd(): void,
  
  // 分享
  shareToFriend(options: { title: string, imageUrl: string, query?: string }): Promise<boolean>,
  shareToTimeline(options: { title: string, imageUrl: string }): Promise<boolean>,
  
  // 支付（金币购买）
  requestPayment(options: { productId: string, price: number }): Promise<{ success: boolean }>,
  
  // 数据上报
  reportAnalytics(event: string, data: object): void,
  
  // 振动反馈
  vibrate(type: 'light'|'medium'|'heavy'): void,
  
  // 分包加载（微信专用，其他平台空实现）
  loadSubpackage(name: string): Promise<void>,
  
  // 系统信息
  getSystemInfo(): { platform: string, screenWidth: number, screenHeight: number, pixelRatio: number },
};
```

### 8.2 各平台 API 对照表

| 功能 | 微信小游戏 | 抖音小游戏 | TapTap | TikTok (海外) |
|------|-----------|-----------|--------|--------------|
| 登录 | wx.login() → code | tt.login() → code | TapSDK.login() → token | tt.login() → code |
| 用户信息 | wx.getUserInfo() | tt.getUserInfo() | TapSDK.getUser() | tt.getUserInfo() |
| 激励广告 | wx.createRewardedVideoAd | tt.createRewardedVideoAd | TapAd.showRewarded | tt.createRewardedVideoAd |
| Banner | wx.createBannerAd | tt.createBannerAd | TapAd.showBanner | tt.createBannerAd |
| 分享好友 | wx.shareAppMessage | tt.shareAppMessage | TapSDK.share | tt.shareAppMessage |
| 分享朋友圈 | wx.onShareTimeline | tt.onShareTimeline | — | tt.onShareTimeline |
| 支付 | wx.requestMidasPayment | tt.pay() | TapPay.purchase | tt.pay() |
| 分包 | wx.loadSubpackage | tt.loadSubpackage | — (单包) | tt.loadSubpackage |
| 振动 | wx.vibrateShort | tt.vibrateShort | navigator.vibrate | tt.vibrateShort |
| 包体限制 | 主包4MB/总20MB | 主包4MB/总20MB | 100MB | 主包4MB/总20MB |
| 数据上报 | wx.reportAnalytics | tt.reportAnalytics | TapSDK.track | tt.reportAnalytics |

### 8.3 微信分包策略

| 包名 | 大小预算 | 包含文件 | 加载时机 |
|------|:--------:|---------|---------|
| 主包 (main) | ≤4MB | index.html, js/config.js, js/core/*.js, js/game.js, css/, ui/ (菜单/天赋/转盘界面) | 启动即加载 |
| 分包1 (game-assets) | ≤6MB | characters/*.png, enemies/*.png, projectiles/*.png, effects/*.png, summons/*.png | 进入游戏局内前 |
| 分包2 (maps-audio) | ≤6MB | maps/*.png, audio/bgm/*.mp3, audio/sfx/*.mp3 | 进入游戏局内前 |
| 分包3 (portraits-ui) | ≤4MB | portraits/*.png, icons/*.png, menu/*.png, drops/*.png, status/*.png | 进入游戏局内前 |

**加载策略**：
```javascript
// 主包启动后，点击「开始游戏」时加载分包
async function preloadGameAssets() {
  showLoadingUI('正在加载资源...');
  await PlatformAdapter.loadSubpackage('game-assets');
  await PlatformAdapter.loadSubpackage('maps-audio');
  await PlatformAdapter.loadSubpackage('portraits-ui');
  hideLoadingUI();
  startGame();
}
```

### 8.4 服务器 API 接口文档

**Base URL**: `https://api.endless-invasion.com/v1`

#### POST /auth/login

```json
// 请求
{
  "platform": "wechat",
  "code": "wx_login_code_xxx",
  "device_id": "uuid"
}
// 响应 200
{
  "token": "jwt_token_xxx",
  "uid": "player_uuid",
  "isNew": true,
  "serverTime": 1706000000000
}
```

#### GET /player/data

```json
// 请求 Headers: Authorization: Bearer {token}
// 响应 200
{
  "data_version": 42,
  "player": { "level": 12, "exp": 350, "gold": 1200, "fragments": 45, "talentPoints": 3 },
  "talents": { "general": ["G-01","G-02","G-05"], "taoist": ["T-01","T-02"] },
  "weapons": { "taoist": ["W-T1","W-T3"], "equipped": { "taoist": "W-T3" } },
  "wheel": { "pity_small": 3, "pity_rare": 12, "pity_legend": 35 },
  "stats": { "totalRuns": 28, "bestWave": 18, "totalKills": 4200 }
}
```

#### POST /player/data

```json
// 请求（完整数据上传）
{
  "data_version": 43,
  "player": { ... },
  "talents": { ... },
  "weapons": { ... },
  "checksum": "sha256_of_payload"
}
// 响应 200
{ "success": true, "data_version": 43 }
// 响应 409（版本冲突）
{ "success": false, "error": "VERSION_CONFLICT", "server_version": 45 }
```

#### POST /run/submit

```json
// 请求
{
  "run_id": "uuid",
  "class_id": "taoist",
  "waves": 15,
  "kills": { "grunt": 100, "charger": 30, "elite": 12, "goblin": 1 },
  "survive_time": 480,
  "evolutions": 1,
  "skills_used": ["chain_lightning","taoist_thunder_bolt","fireball","doom_aura","iron_skin","vitality"],
  "weapon_equipped": "W-T3",
  "checksum": "hmac_sha256"
}
// 响应 200
{
  "success": true,
  "exp_gained": 841,
  "fragments_gained": 7,
  "level_up": false,
  "wheel_spins": 1
}
```

#### POST /wheel/spin

```json
// 请求
{ "spin_type": "free" | "ad" | "gold" }
// 响应 200
{
  "result": { "slot": 6, "name": "碎片·大", "reward": { "fragments": 8 } },
  "pity": { "small": 0, "rare": 13, "legend": 36 },
  "remaining_spins": { "free": 0, "ad": 1, "gold": 1 }
}
```

#### POST /talent/unlock

```json
// 请求
{ "node_id": "T-05", "tree": "taoist" }
// 响应 200
{ "success": true, "remaining_points": 2 }
// 响应 400
{ "success": false, "error": "PREREQUISITE_NOT_MET", "required": "T-01" }
```

#### POST /weapon/unlock

```json
// 请求
{ "weapon_id": "W-T3" }
// 响应 200
{ "success": true, "fragments_remaining": 20 }
// 响应 400
{ "success": false, "error": "INSUFFICIENT_FRAGMENTS", "need": 25, "have": 18 }
```

### 8.5 反作弊策略

| 层级 | 策略 | 实现细节 |
|------|------|---------|
| 客户端 | 数据签名 | 每局结算数据用 HMAC-SHA256 签名，密钥=设备指纹+时间戳哈希 |
| 客户端 | 内存校验 | 关键数值（HP/经验/碎片）存储双份+校验位，检测篡改 |
| 客户端 | 时间校验 | 记录局开始/结束时间戳，存活时间偏差>10%标记异常 |
| 服务器 | 数值上限 | 单局经验≤2000，碎片≤50，击杀≤500，波次≤30 |
| 服务器 | 频率检测 | 同一uid 5分钟内提交>2局 → 拒绝+标记 |
| 服务器 | 回放校验 | 记录技能选择序列+波次数据，抽样回放验证DPS合理性 |
| 服务器 | 设备指纹 | 同设备多账号共享碎片 → 关联封禁 |
| 服务器 | 统计异常 | 7日滑动窗口：平均波次>25 或 碎片获取>日均3倍 → 人工审核 |
| 服务器 | 版本校验 | checksum 算法每版本更新，旧版本签名直接拒绝 |

**异常处理流程**：
```
检测异常 → 标记 flag=1 → 正常返回（不告知玩家）
→ 累计3次 flag → 冻结碎片/经验获取（24h）
→ 累计5次 flag → 封禁账号（7天）
→ 累计10次 flag → 永久封禁
```

---

## 附录：数值交叉验证

| 验证项 | 计算 | 结论 |
|--------|------|------|
| 满级时间 | 53280÷841≈63局×8min=8.5h | 约11天（每日6局），合理 |
| 天赋点vs节点 | 43点 vs 36(通用+1职业) | 满级可精通1职业+7点副职业 |
| 每局碎片 | 精英12×0.4×1+哥布林1×2+转盘≈1.5≈8.3碎片/局 | 每日6局+任务5≈55碎片/天 |
| 单职业武器 | 80×2+200×2+400×2=1360碎片 | 1360÷55≈25天解锁单职业全武器 |
| 武器全解锁 | 5职业×1360=6800碎片 | 6800÷55≈125天全收集 |
| 转盘期望 | 每局1次×63局=63次 | 小保底8次触发约8次，大保底20次触发3次 |

---

*文档结束 | 总章节：第二章~第八章 + 附录 | 覆盖：等级/天赋/武器/掉落/转盘/持久化/多平台*
