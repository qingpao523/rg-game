# CLAUDE.md

This file provides guidance to Claude Code when working with this project.

## 基本原则

**基于第一性原理解决一切问题。**
遇到任何问题，回到最底层原理做推理，不依赖经验、惯例或猜测。拆解到不可再分的物理/数学/逻辑事实后重建解决方案。

## 项目简介

无尽入侵（Endless Invasion）— Godot 4.7 2D Roguelite 生存割草游戏。

## Commands

```bash
open -a Godot project.godot    # 在编辑器中打开项目
godot --headless --check-only  # 静态检查全部脚本语法
```

## 架构

**引擎**: Godot 4.7 stable
**语言**: GDScript
**目标平台**: 微信小游戏（开发阶段优先桌面验证）

**场景结构**:
- `assets/scenes/boot/` — 启动（空场景，GameApp autoload 自动初始化）
- `assets/scenes/main_menu/` — 主菜单 + 5 职业选择
- `assets/scenes/battle/` — 战斗场景（移动/刷怪/技能/升级/死亡循环）
- `assets/scenes/result/` — 死亡结算

**Autoload**:
- `GameApp` — 游戏主状态机 + 场景切换
- `EventBus` — 全局事件总线
- `TimeService` — 游戏时间管理
- `GameSession` — 单局会话状态
- `ObjectPool` — 通用对象池
- `PlatformAdapter` — 平台适配层

**模块目录**:
- `assets/scripts/config/` — 数据配置（职业/技能/进化/怪物/波次），纯静态类
- `assets/scripts/combat/` — 战斗实体（Actor/Player/Enemy/Projectile/Collision/Damage/StatusEffect）
- `assets/scripts/skill/` — 技能系统（SkillRunner/SkillInstance）
- `assets/scripts/spawn/` — 刷怪系统（WaveDirector/TreasureGoblin）
- `assets/scripts/ui/` — UI 层（MainMenu/HUD/SkillChoice/Pause/Result）

**关键约定**:
- 中文 UI 字符串
- commit 用 conventional-commit 风格 + 中文描述
- Config 类用 `class_name` + `extends RefCounted`（不 autoload）
- 战斗实体全部用 `CharacterBody2D` 基类
- 所有 `wx.*` 调用必须隔离到 `PlatformAdapter`
- 对象必须对象池化（ObjectPool），避免频繁 GC

## 开发日志

根目录 `devlog.md` 文件记录每次完成代码后的更新日志。
每次提交前追加一次日志条目：日期、变更摘要、关键决策理由。
