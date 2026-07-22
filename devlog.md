# 开发日志 — 无尽入侵

---

## 2026-06-26

### 迁移 Cocos Creator → Godot 4.7 工程骨架

- 删除 Cocos Creator 项目文件（package.json, pnpm, .gitkeep）
- 安装 Godot 4.7（brew cask）
- 创建 `project.godot` + 输入映射配置
- 创建完整工程目录结构（core/config/combat/skill/spawn/ui/platform）

**关键决策**: 从 Cocos Creator 切换到 Godot 4.7。Godot 免费开源、GDScript 开发效率高、2D 渲染质量好，出微信小游戏有社区方案。

### 创建核心系统

- GameApp（主状态机 + 场景切换 + 配置加载）
- EventBus（全局信号系统）
- TimeService（游戏时间，暂停/恢复）
- GameSession（单局会话，含经验/升级/技能/属性）
- ObjectPool（对象池，避免 GC 抖动）
- PlatformAdapter（平台 API 隔离层）

### 配置数据

- 5 个职业：道士、武士、法老、寒冰女巫、十字军
- 15 个基础技能：火/冰/雷/毒/圣/灾厄六大类
- 8 个技能进化组合
- 3 种怪物：杂兵、冲锋兵、精英
- 10 波次模板 + 无限延伸公式

### 战斗系统

- Actor（CharacterBody2D 基类）
- Player（WASD 移动 + 受伤无敌 + 法力回复）
- Enemy（追踪攻击 + 击杀掉经验）
- Projectile（弹幕碰撞 + 追踪最近敌人）
- CollisionGrid（空间网格碰撞优化）
- Damage（伤害类型 + 暴击/抗性计算）
- StatusEffect（毒/灼烧/冰冻/感电）

### 技能系统

- SkillRunner（自动释放 + 主动技能）
- SkillInstance（运行时状态 + 冷却）
- SkillChoiceView（升级三选一 UI）

### UI 系统

- MainMenuView（职业选择 + 开始游戏）
- HudView（HUD：血量/法力/等级/波次/时间）
- PauseView（暂停界面）
- ResultView（结算：波次/击杀/等级/时间）

### 刷怪系统

- WaveDirector（按配表刷新 + 波次增强）
- TreasureGoblin（逃跑 + 击杀奖励）

### Step 2 修复 — 最小可玩纵切

- Actor 全部改为 CharacterBody2D，物理碰撞移动
- Player 输入 + 无敌帧逻辑修复
- Enemy 追踪攻击 + 击杀掉经验回 GameSession
- 开局赠送魔法飞弹自动释放
- 波次配置完整 10 波 + 无限波次公式
- 结算场景读取 GameSession 数据
- 全部 .tscn 修复：Vector2i→Vector2, 枚举名→整数值
- Config 类修复：extends Node → extends RefCounted + class_name
- ObjectPool 修复：get_node 重命名避免覆盖原生
- GameApp 添加程序化 InputMap 设置
- Godot --check-only 零错误验证通过

### Godot MCP 集成

- 发现项目已有 godot_mcp 插件（addons/godot_mcp v1.0.7-pre1）
- 配置 HTTP 模式端口 9080，auth 关闭
- 全局安装 mcp-remote 桥接包
- 写入 .claude/mcp.json 连通配置

### 切换 MCP 方案：外部 Node.js MCP 服务器

- 原有 godot_mcp 编辑器插件因工具注册阶段卡住，端口 9080 无法监听
- 切换为 @coding-solo/godot-mcp（外部 Node.js MCP 服务器）
- 全局安装完成后直接 npx 启动，无需依赖编辑器插件
- 验证通过：get_godot_version、launch_editor 等工具正常响应
- 修复 3 个脚本语法错误：
  - HudView.gd: modulate → self.modulate
  - ResultView.gd: theme_override_* → add_theme_*_override()
  - StatusEffect.gd: 添加 class_name 声明

### CLAUDE.md + devlog 规范

- 写入 CLAUDE.md：含第一性原理原则、架构文档、命令、约定
- 创建 devlog.md 根目录更新日志
- 约定：每次提交前追加日志条目

---

## 2026-06-27 / 第二次

### 修复升级未暂停 & 技能选择界面不消失

- 修复 BUG：升级时游戏没有真正暂停，敌人和弹幕继续运行
  - 根因：`BattleScene._on_level_up()` 只调了 `TimeService.pause()`（仅停止计时器），缺少 `get_tree().paused = true`
  - 修复：在展示技能选择后添加 `get_tree().paused = true`
  - 由于 SkillChoiceView 已设置 `process_mode = PROCESS_MODE_WHEN_PAUSED`，暂停后 UI 按钮不受影响
- 修复 BUG：选择技能后弹窗不消失
  - 根因：虽然 `SkillChoiceView._on_choice_pressed()` 调了 `hide()`，但因为游戏未暂停，后续帧可能被其他事件重绘覆盖
  - 修复：在 `_on_choice_made()` 中添加 `get_tree().paused = false` 解冻引擎，并在解冻前显式 `_choice_view.hide()` 确保 UI 已隐藏
- 决策理由：使用 `get_tree().paused` 而非仅 `TimeService.pause()`，因为 Godot 引擎级的暂停才能冻结 `_process`、`_physics_process` 和输入处理；`TimeService` 仅作为时间统计计数器不能替代引擎暂停

### 修复预制体 Script 挂载缺失 + 调用顺序

- 修复 BUG：选择火墙/召唤骷髅等技能时报错 `Nonexistent function 'setup'`
  - 根因：`effect_zone.tscn`、`effect_aura.tscn`、`skeleton.tscn`、`skeleton_archer.tscn` 四个预制体的根节点都缺少 `script = ExtResource("1")` 行，场景加载时脚本未挂载到节点，运行时调用 `setup()` / `set_minion_stats()` 等方法时直接报错
  - 对比：`hit_effect.tscn`、`skill_choice.tscn` 等正常工作的预制体都有这一行
- 修复 `SkillRunner._cast_area()` 和 `_cast_aura()` 调用顺序
  - 原顺序：`instantiate()` → `setup()` (用 get_tree()) → `add_child()` → ❌ setup 时 get_tree() 返回 null
  - 修复后：`instantiate()` → `add_child()` → `setup()` (get_tree() 可用)
- 决策理由：Godot 4 的 `.tscn` 中 `[ext_resource]` 只声明资源引用，不自动挂载到节点；必须通过节点行上的 `script = ExtResource("1")` 显式指定

### 新增 HUD 经验条 + 条颜色

- hud.tscn：新增 ExpBar（ProgressBar），位于 LevelLabel 和 HPBar 之间
  - 绿色 `#26A84D`，16px 高，带圆角半透明底色
- HudView.gd：新增 exp_bar / exp_bar_label 节点引用 + _process 更新 + experience_gained 信号监听
- hud.tscn：三条进度条统一添加颜色
  - HPBar：红色 `#BF2626`
  - ManaBar：蓝色 `#2659BF`
  - ExpBar：绿色 `#26A84D`
  - 全部使用 SubResource StyleBoxFlat 圆角 3px

### 美术需求文档

- 补充 `docs/design/art-requirements.md` 第十二章：技能美术逐技能详解
  - 弹幕 Sprite（8 个）、区域效果纹理（4 个）、光环纹理（3 个）
  - 召唤物角色（4 个）、状态效果视觉（7 种）、主动技特效（5 个）
  - 进化技能额外视觉（8 个）、技能图标完整清单（33 个）
  - 按 P0（21）/ P1（26）/ P2（24）分级，标注对应代码中的渲染方式

### 图集重切 — 紧凑边界框

- 第一次切割错误：直接用格子坐标（32×32 等）切，导致错位且携带灰色棋盘背景
- 第二次重切：按用户提供的**精灵紧凑边界面包框**切割
  - 道士：从 32×32 格子 → 实际精灵仅 `[16×20]`（其他角色类似缩小）
  - 所有怪物/召唤物/弹幕/特效同理，去掉周围空白
  - 背景转透明：以角落色为基准，tolerance 25 消除背景灰色
  - 大部分帧透明度 40-55%，精灵内容保留完整

- 接收 `daoshi-1.png` 图集（1408×768），Python 脚本按坐标切割为 41 个独立 PNG
  - 切割到 `assets/art/characters/`、`enemies/`、`summons/`、`projectiles/`、`effects/`、`icons/`、`ui/` 子目录
- 替换所有预制体的 ColorRect → Sprite2D + 真实贴图：
  - `player.tscn`：道士 idle 贴图
  - `enemy.tscn`：杂兵 idle 贴图 + Enemy.gd 新增 `set_sprite_by_type(type_str)` 动态切换
  - `treasure_goblin.tscn`：哥布林 idle 贴图
  - `skeleton.tscn`：骷髅兵 idle 贴图
  - `skeleton_archer.tscn`：骷髅射手 idle 贴图
  - `projectile.tscn`：魔法飞弹贴图 + Projectile.gd 新增 `set_texture(tex_path)`
  - `effect_zone.tscn`：麻痹领域贴图（半透明）
  - `effect_aura.tscn`：雷云贴图（半透明）
  - `hit_effect.tscn`：击中特效贴图路径更新
- `SkillRunner.gd` 新增纹理映射：
  - `_get_projectile_texture()` 按 skill_id 返回对应弹幕纹理
  - `_get_area_texture()` + `_get_aura_texture()` 按 skill_id 返回对应效果纹理
- `hud.tscn`：HPBar/ManaBar 使用 StyleBoxTexture 引用纹理 PNG，ExpBar 保留绿色 StyleBoxFlat
- `SkillChoiceView.gd`：技能卡片添加 48×48 图标区域，有图标 PNG 则显示，无则用元素色占位
- 决策理由：所有纹理路径走 `load()` 运行时加载，不强制要求每个技能都有 PNG；无贴图时通过 `has_method` 或 `if tex` 安全降级保持可运行

### 修复场景切换卡死 & 文本纹理化

- 发现 Boot.tscn → MainMenu.tscn 场景切换常驻失败，窗口始终显示 Boot.tscn
- 根因：`call_deferred("_switch_scene", arg)` 在 Godot 4.7 中第二个参数不传递
- 修复：将 `run/main_scene` 直接从 Boot.tscn 改为 MainMenu.tscn，跳过启动场景切换
- 发现 GameApp.gd 遗漏 `_switch_scene` 函数且 autoload 不继承自 Node，全局重写
- 替换所有 Sprite2D 贴图为 ColorRect 彩色方块解决纹理导入缓存问题
- 修复 MainMenu.tscn 缺少 `script = ExtResource("1")` 导致 MainMenuView.gd 不执行
- 修复 GameSession Array[Dictionary] 类型推断错误
- 修复 BattleScene 强类型变量推导失败
- 修复 Projectile 粒子 `scale_amount_curve` 赋值错误
- 修复 ProgressBar `theme_override_styles = null` 导致血条不可见
- 修复 PauseView 暂停后按钮不可点击 → 添加 `process_mode = WHEN_PAUSED`
- 敌人接触伤害修复：CollisionShape2D 扩大至 44x44 保证物理推开前触发 Area2D

### 道士技能体系（15 可用技能，3 条路线）

- 技能配置扩展至 27 个（新增 11 个道士专属技能）
- ⚡ 雷系（5）：弹射闪电、感电烙印、天雷击、雷云、麻痹领域
- 🔥 火系（5）：火球术、炎附、燃烧咒、火墙、焚身爆
- 💀 死灵系（5）：召唤骷髅、骷髅射手、亡者复苏、骷髅强化、尸爆
- 升级三选一 + 暂停机制：杀敌升级 → 暂停游戏 → 弹三张技能卡 → 选完恢复
- 道士技能池筛选：BattleScene._is_taoist_skill 按标签过滤
- SkillRunner 多态释放：投射/区域/光环/召唤 分类分发
- 新增预制体：effect_zone（火墙/麻痹领域区域）、effect_aura（雷云光环）、skeleton（近战骷髅）、skeleton_archer（远程骷髅）
- 新增脚本：EffectZone.gd、EffectAura.gd、SkeletonMinion.gd
- 占位被动技能框架：亡者复苏、焚身爆、骷髅强化、尸爆钩子
- 主菜单锁定为仅道士可选，其他职业显示"（即将开放）"
- 修复 ButtonGroup 互斥逻辑（每个按钮各一个组 → 共享一个组）
- 波次配置翻倍：第 1 波 8 只敌人，生成间隔缩短

### 技能三选一类型修复 & 暂停机制调整

- 修复 SkillChoiceView `show_choices` 数组类型 `Array[String]` → `Array`，Godot 4.7 动态数组与 typed 数组不兼容
- 修复 `_skills` 同样类型问题
- 移除 `get_tree().paused = true`（会阻塞 UI 按钮输入），改为仅 `TimeService.pause()`
- 清理 Player.gd 冗余的输入方向 debug printerr
- 更新 CLAUDE.md：同步架构变更（道士技能体系、新增脚本/预制体）
- 更新 devlog.md：合并 06-27 全部变更记录

---

## 2026-06-29

### 美术大版本重构：放弃旧占位资源

- 明确新版本目标：微信小游戏手机竖屏，不再按横屏 PC 原型继续推进
- 明确旧美术策略：旧 ColorRect / 低保真占位图全部废弃，不作为后续参考
- 按 `docs/design/Demo 能跑起来的核心资源.md` 重新整理 Demo 核心美术资源口径
- 新资源按“黑金灾厄档案 / 破碎龙庭 / 手机单手操作”方向落地

### 接入新美术资源

- 主菜单：接入竖屏背景、标题 Logo、职业选择卡、五职业头像、按钮皮肤
- 战斗地图：接入破碎龙庭背景、黑金裂纹、黑雾边缘、灾级光层、龙骨、青铜祭坛、残墙、符文贴花
- 角色/怪物：接入五职业 Sprite、基础怪、冲锋怪、精英怪、宝藏怪新 Sprite
- HUD：接入左上状态底板、顶部灾级警报条、底部技能槽、左下虚拟摇杆、右下主动技按钮
- 升级/暂停/结算：接入升级卡面、进化提示框、暂停遮罩、暂停面板、结算报告面板、新按钮皮肤
- 宝藏怪：接入屏幕边缘方向箭头提示

### 竖屏微信小游戏适配

- `project.godot` 切换为 `720×1280` 基准画布
- Stretch 策略改为 `canvas_items + keep_width`
- `PlatformAdapter.gd` 启动时锁定 `DisplayServer.SCREEN_PORTRAIT`
- 主菜单重排为手机竖屏：上方 Logo/标题，中段两列职业卡，底部开始按钮
- HUD 重排为移动端结构：顶部灾级信息、左上状态面板、底部技能槽、左下摇杆、右下主动技
- 新增 `EventBus.mobile_move_changed` 和 `EventBus.active_skill_requested`，支持触控移动与主动技能按钮

### 战斗画面与地图更新

- 战斗场景改为破碎龙庭复合地图，背景 3 倍缩放后形成 5016×2823 可移动战斗区域
- 玩家出生点收敛到地图中心，由 `BattleScene.gd` 统一负责，移除 `Player.gd` 中旧的“视口中心出生”逻辑
- `Camera2D` 添加地图边界限制，避免竖屏下镜头越界
- 刷怪位置改为围绕当前玩家/当前可见屏幕边缘生成，避免旧横屏固定视口刷怪逻辑
- 敌人视觉按新 Sprite 缩放显示，波次随机替换不再刷出旧远程占位怪

### 文档更新

- 更新 `docs/design/art-requirements.md`
  - 新增 2026-06-29 大版本美术与移动端更新
  - 修正旧文档中的 `1280×720` 横屏口径
  - 将 UI、地图、技术约束更新为当前竖屏落地状态
- 更新 `docs/design/Demo 能跑起来的核心资源.md`
  - 新增竖屏精品化更新
  - 新增当前已接入资源表
  - 新增本轮 Demo 验收口径
- 更新 `docs/design/mvp-combat-build-and-demo-plan.md`
  - 顶部新增 2026-06-29 执行口径说明
  - 标注 Cocos Creator / TypeScript 段落为历史方案，当前实现以 Godot 4.7 竖屏版本为准

### 验证记录

- `godot --headless --import --path /Users/flyaways/Documents/game` 通过，新资源重新导入完成
- `godot --headless --path /Users/flyaways/Documents/game --quit` 通过，主菜单可加载
- `godot --headless --path /Users/flyaways/Documents/game --scene res://assets/scenes/battle/Battle.tscn --quit` 通过，战斗场景 `_ready` 完成
- `godot --headless --path /Users/flyaways/Documents/game --scene res://assets/prefabs/skill_choice.tscn --quit` 通过，升级选择弹窗可加载
- `godot --headless --path /Users/flyaways/Documents/game --scene res://assets/prefabs/pause.tscn --quit` 通过，暂停弹窗可加载

**已知非阻塞项**：

- Godot MCP 插件端口 9080 被另一个 Godot 进程占用；不影响本轮资源导入和场景加载
- Godot 导入阶段提示 `elite_move.tres` 和 `charger_charge.tres` UID 重复；当前 smoke test 未受影响，后续可单独清理 UID

### 竖屏画面错乱修复

- 修复主菜单和 HUD 贴图按原图尺寸撑爆的问题
  - 根因：Godot 4 的 `TextureRect` 默认会受纹理原始尺寸影响，之前只设置 `size/stretch_mode`，没有正确锁定 `expand_mode`
  - 修复：`UiArt.texture_rect()` 统一设置 `TextureRect.EXPAND_IGNORE_SIZE`，并在赋纹理后重新锁定控件尺寸
  - 修复：主菜单职业卡背景使用 full-rect 锚点填满 150×220 卡片，并开启 `clip_contents`
- 修复开始界面职业卡大图溢出
  - 运行时验证：职业卡 Panel 为 150×220，CardArt 已从错误的 1024×1536 修正为 150×220
- 修复战斗地图整屏绿的问题
  - 根因：`catastrophe_overlay.png` 和 `black_fog_edge_overlay.png` 中央是亮绿色底图，不是透明通道
  - 修复：对两张 overlay 做 chroma-key，绿色中心转透明，保留边缘黑雾/红裂纹
- 修复桌面运行预览不是手机比例的问题
  - `project.godot` 保留内部基准画布 720×1280
  - 新增桌面预览窗口 override：390×844，方便直接从 Godot 运行时查看手机竖屏比例

### 对抗性审查：游戏内画面错乱继续修复

- 重新以 `390×844` 手机预览截图审查战斗画面，确认单纯 headless smoke 不足以发现视觉错乱
- 修复主角“看不见 / 太小”的问题
  - `Player.gd` 默认使用 `taoist` 美术兜底，不再依赖 GameSession 初始化顺序
  - 主角 Sprite 从约 55×64 设计像素提升到约 92×107 设计像素，手机截图中可读性明显增强
  - 玩家脚下法阵重新缩放和对齐，避免放大后漂浮
- 修复 HUD 贴图残留到右下角的问题
  - 根因：技能显示图标 `TextureRect` 曾以 1254×1254 原图尺寸参与容器布局
  - 修复：HUD 技能图标统一使用 `UiArt.skill_icon_rect()`，并给技能格开启裁剪
- 修复 HUD 底部控件在高屏手机上漂到中下部的问题
  - 根因：`keep_width` 会扩展逻辑高度，但 HUD 使用固定 1280 高度坐标
  - 修复：技能槽、左下摇杆、右下主动技按钮按当前 root 高度从底部反推位置
- 修复主菜单高屏灰底
  - Panel/Bg 改为 full-rect 锚点
  - 开始按钮和版本号改为底部锚定
- 修复升级三选一在手机宽度下横排挤压的问题
  - `CardContainer` 从横排改为竖排
  - 选择项改为程序化暗金描边列表卡，避免旧横向卡面装饰线压住文字
  - 技能图标使用安全 fallback，缺失专属图标时回退到 `magic_missile`
- 修复暂停和结算界面高屏适配
  - 暂停面板、升级面板、结算面板改用居中锚点
  - 暂停遮罩、结算背景改为 full-rect

### 对抗性审查验证记录

- `godot --path /Users/flyaways/Documents/game --script tmp/render_main_menu_review.gd` 通过，输出 `main_menu_review.png`
- `godot --path /Users/flyaways/Documents/game --script tmp/render_battle_review.gd` 通过，输出 `battle_review.png`
- `godot --path /Users/flyaways/Documents/game --script tmp/render_ui_overlays_review.gd` 通过，输出 `skill_choice_review.png`、`pause_review.png`、`result_review.png`
- `godot --path /Users/flyaways/Documents/game --script tmp/smoke_visual_scenes.gd` 通过，主菜单、战斗、结算、HUD、升级、暂停均 `SMOKE_OK`

**仍需后续精品化项**：

- 当前主角已可见，但仍是单帧 idle 资产；后续要补 run/cast/hit/death 动画帧，才能达到精品动作表现
- 当前战斗地图仍是横向大图裁切成竖屏战斗区域；后续建议生成竖屏优先的可平铺地图块，减少构图偶然性

### 无动画资源时的程序化动画层

- 新增 `assets/scripts/visual/VisualAnimator.gd`
  - 支持单帧 Sprite 的 idle 呼吸浮动、move 上下 bob 与轻微倾斜
  - 支持 `play_cast_pulse()` 蓝白施法脉冲
  - 支持 `play_hit_flash()` 受击闪白
  - 支持 `play_death()` 缩小淡出
- 主角接入动画层
  - `player.tscn` 新增 `VisualAnimator`
  - `Player.gd` 将移动速度传给动画组件
  - 受击触发闪白，释放技能触发施法脉冲，死亡先短淡出再结算
- 敌人接入动画层
  - `enemy.tscn` 新增 `VisualAnimator`
  - `Enemy.gd` 受击闪白，移动时增加程序化 bob/tilt
  - 死亡时复制一个无碰撞 Sprite 幽影淡出，本体仍立即回对象池，避免扰动对象池生命周期
- 召唤物接入动画层
  - `skeleton.tscn`、`skeleton_archer.tscn` 新增 `VisualAnimator`
  - `SkeletonMinion.gd` 受击闪白、移动 bob/tilt、死亡淡出后释放
- 技能释放接入动画反馈
  - `SkillRunner._try_cast_skill()` 在释放技能前调用 `Player.play_cast_visual()`
- 修复动画接入暴露的对象池复用问题
  - `WaveDirector._init_enemy()` 在敌人从对象池取出后重置 `alive/visible/process/physics_process`
  - `Enemy.set_sprite_by_type()` 重置 Sprite 的 position/rotation/modulate，避免上一次受击闪白残留

### 程序化动画验证记录

- `godot --headless --path /Users/flyaways/Documents/game --script tests/visual_animator_smoke.gd` 通过，输出 `VISUAL_ANIMATOR_SMOKE_OK`
- `godot --headless --path /Users/flyaways/Documents/game --script tests/animated_prefabs_smoke.gd` 通过，输出 `ANIMATED_PREFABS_SMOKE_OK`
- `godot --headless --path /Users/flyaways/Documents/game --script tests/battle_visual_animation_smoke.gd` 通过，输出 `BATTLE_VISUAL_ANIMATION_SMOKE_OK`
- `godot --headless --path /Users/flyaways/Documents/game --quit` 通过，主菜单可加载
- `godot --headless --path /Users/flyaways/Documents/game --scene res://assets/scenes/battle/Battle.tscn --quit` 通过，战斗场景可加载

**后续帧动画替换策略**：

- 保留 `VisualAnimator` 作为 hit/cast/death 的叠加反馈层
- 等道士真实 Sprite Sheet 生成后，把 idle/run/cast/death 的帧切换接入同一组件或新增 `SpriteSheetAnimator`
- 程序化 bob/tilt 可在真实帧动画启用后降权，不必删除

### 启动后人物/怪物错乱与莫名掉血修复

- 根因定位
  - 对象池预热敌人时，Enemy 实例先进入场景树，再被标记 inactive；在玩家尚未移动到地图中心前，默认坐标 `(0, 0)` 的敌人 ContactDamage 会和默认坐标的 Player 短暂重叠，导致第一帧无来源掉血
  - headless 脚本运行时 `get_tree().current_scene` 可能为空，技能弹幕、怪物死亡幽影、命中特效等运行时生成节点会出现空引用
  - HUD 受击闪烁直接改 `CanvasLayer.modulate`，Godot 中 `CanvasLayer` 没有该属性，玩家受击事件会触发 UI 错误
- 修复内容
  - `ObjectPool.create_group()` 改为实例进入树前先 inactive，并把 inactive 节点移到远离战场的位置，同时关闭可见性、process、physics_process 和碰撞/Area 监测
  - `WaveDirector._count_enemies()` 只统计 `visible && alive` 的敌人，避免池内 inactive 敌人影响刷怪
  - `WaveDirector._init_enemy()` 从对象池取出敌人后显式重置 target、alive、计时器、velocity 和视觉状态
  - `Player.take_damage()` 改为实际扣血后发出 `EventBus.player_damaged(amount, source)`，保留伤害来源，方便继续追踪异常伤害
  - 敌方弹幕、SwarmManager 伤害传入明确 source；远程怪弹幕标记为 enemy projectile
  - `SkillRunner`、`Enemy`、`Projectile`、`TreasureGoblinDirector` 的运行时 add_child 改为安全 spawn parent fallback，避免 `current_scene == null` 崩溃
  - `SkillRunner` 寻敌过滤 invisible / inactive 的对象池敌人，避免自动技能瞄准池内怪导致弹幕方向异常
  - `HudView._on_player_damaged()` 改为闪烁内部 `Control` 根节点，不再修改 `CanvasLayer.modulate`
- 新增回归测试
  - `tests/battle_start_integrity_smoke.gd`：验证 Battle 启动后玩家使用道士贴图、视觉缩放合理、开局安全窗口不掉血、至少有一个可见 active 敌人、敌人有贴图且 target 指向玩家
  - `tests/player_damage_signal_smoke.gd`：验证 Player 受击后血量同步到 GameSession，且受击信号触发 HUD 不崩溃
- 验证记录
  - `godot --headless --path /Users/flyaways/Documents/game --script tests/battle_start_integrity_smoke.gd` 通过，输出 `BATTLE_START_INTEGRITY_OK active_enemies=1 health=90.0`
  - `godot --headless --path /Users/flyaways/Documents/game --script tests/player_damage_signal_smoke.gd` 通过，输出 `PLAYER_DAMAGE_SIGNAL_SMOKE_OK health=85.0`
  - `godot --headless --path /Users/flyaways/Documents/game --script tests/visual_animator_smoke.gd` 通过，输出 `VISUAL_ANIMATOR_SMOKE_OK`
  - `godot --headless --path /Users/flyaways/Documents/game --script tests/animated_prefabs_smoke.gd` 通过，输出 `ANIMATED_PREFABS_SMOKE_OK`
  - `godot --headless --path /Users/flyaways/Documents/game --script tests/battle_visual_animation_smoke.gd` 通过，输出 `BATTLE_VISUAL_ANIMATION_SMOKE_OK`
  - `godot --headless --path /Users/flyaways/Documents/game --scene res://assets/scenes/battle/Battle.tscn --quit` 通过，Battle 场景可加载
  - `godot --headless --path /Users/flyaways/Documents/game --quit` 通过，主菜单可加载

### 角色 `.tres` 裁切修正后的主角比例收敛

- 用户手动修正道士等角色 `.tres` region 后，角色从小裁片变成接近完整 1024×1536 角色图，旧的固定 `0.30` 缩放会把主角放大到约 `461px` 高
- 修复：`Player.gd` 不再使用固定 `_visual_scale`，改为按当前 Texture/AtlasTexture 的实际高度自动缩放到 `145px` 目标高度
- 新增 `tests/player_character_visual_scale_smoke.gd`
  - 覆盖 `taoist`、`pharaoh`、`ice_witch`、`samurai`、`crusader` 五个职业
  - 验证每个职业使用正确 idle 贴图，并且实际显示高度保持在 `132-158px` 手机战斗单位区间
- 更新 `tests/battle_start_integrity_smoke.gd`
  - 从检查固定 scale 改为检查实际视觉高度，避免 `.tres` region 调整后测试失真

### 战斗单位与光环 VFX 统一比例尺

- 视觉问题：截图中主角仍像大立绘，普通怪偏小，雷云光环占屏过大，整体像不同资产直接叠在一起
- 修复：`EffectAura.gd` 的视觉尺寸不再使用 `_range * 1.4`
  - 新规则：`clampf(_range * 0.8, 150.0, 220.0)`
  - 雷云实际伤害范围仍为技能范围，视觉只做可读提示，不再盖住主角主体
- 新增 `tests/combat_visual_proportion_smoke.gd`
  - 主角：五职业实际视觉高度锁在 `132-158px`
  - 怪物：普通/射手 `68-92px`，冲锋 `72-104px`，精英 `110-145px`
  - 雷云光环：视觉宽度锁在 `150-240px`

### 开始冒险卡住修复

- 根因定位：`SceneTree.paused` 可能从上一局暂停、升级选择、焦点切出等路径残留；此时点击主菜单“开始冒险”会调用 `GameApp.start_game()`，但进入 Battle 前没有统一清理 paused，表现为切场景/进入战斗后整棵树不动，像卡住
- 修复：`GameApp.start_game()`、`end_game()`、`return_to_menu()` 在切换生命周期场景前统一调用 `_clear_scene_pause()`，确保 `get_tree().paused = false`
- 新增 `tests/start_game_flow_smoke.gd`
  - 人为设置 `SceneTree.paused = true`
  - 调用 `GameApp.start_game("taoist")`
  - 验证会解除 paused 并进入 `Battle.tscn`
- 新增 `tests/main_menu_start_button_smoke.gd`
  - 加载主菜单，确认默认道士选择后开始按钮可用
  - 触发 `StartButton.pressed`
  - 验证进入 `Battle.tscn` 且 `GameApp.state == PLAYING`
