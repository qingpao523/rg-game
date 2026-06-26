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

### CLAUDE.md + devlog 规范

- 写入 CLAUDE.md：含第一性原理原则、架构文档、命令、约定
- 创建 devlog.md 根目录更新日志
- 约定：每次提交前追加日志条目
