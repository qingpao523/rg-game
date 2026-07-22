## SkillConfig - 技能配置 v2.0
## 平衡版：Lv.1 可打前 3 波，Lv.5 可打 7-10 波
## 公式：damage = base + per_level × (level-1)
##       cooldown = max(0.3, cd + cd_per_level × (level-1))

class_name SkillConfig
extends RefCounted

static var _configs: Dictionary = {
	# =====================
	# 通用基础技能（5 个）
	# =====================
	"magic_missile": {
		"name": "魔法飞弹",
		"description": "自动追踪的魔法飞弹",
		"tags": ["灾厄", "投射", "输出"],
		"damage_base": 8,
		"damage_per_level": 1,
		"cooldown": 1.0,
		"cooldown_per_level": -0.03,
		"count_base": 1,
		"count_per_level": 0.5,   # Lv.3=2, Lv.5=3
		"range": 500,
		"projectile_speed": 400,
		"homing": true
	},
	"fireball": {
		"name": "爆裂火球",
		"description": "发射一颗爆炸火球",
		"tags": ["火", "投射", "范围输出"],
		"damage_base": 15,
		"damage_per_level": 4,
		"cooldown": 2.0,
		"cooldown_per_level": -0.03,
		"count_base": 1,
		"count_per_level": 0.25,   # Lv.4=2
		"range": 400,
		"projectile_speed": 500,
		"explosion_range_base": 40,
		"explosion_range_per_level": 5
	},
	"doom_aura": {
		"name": "灾厄光环",
		"description": "周围敌人抗性降低",
		"tags": ["灾厄", "光环", "削弱"],
		"resistance_reduction": 0.15,
		"reduction_per_level": 0.05,
		"range": 200,
		"range_per_level": 10,
		"duration": 0
	},
	"fire_attunement": {
		"name": "炎附",
		"description": "攻击附加火焰伤害",
		"tags": ["火", "附伤", "增益"],
		"bonus_damage": 5,
		"damage_per_level": 1,
		"duration": 6.0,
		"duration_per_level": 1.0,
		"cooldown": 8.0,
		"cooldown_per_level": -0.2
	},
	"thunder_mark": {
		"name": "感电烙印",
		"description": "目标受到额外雷系伤害",
		"tags": ["雷", "附伤", "连锁催化"],
		"bonus_damage": 8,
		"damage_per_level": 1,
		"duration": 4.0,
		"duration_per_level": 0.5,
		"cooldown": 6.0,
		"cooldown_per_level": -0.2
	},

	# =====================
	# ⚡ 雷系·道士（5 个）
	# =====================
	"chain_lightning": {
		"name": "弹射闪电",
		"description": "闪电弹射命中多个敌人",
		"tags": ["雷", "投射", "连锁催化"],
		"damage_base": 12,
		"damage_per_level": 1,
		"cooldown": 3.0,
		"cooldown_per_level": -0.03,
		"bounce_count": 3,
		"bounce_per_level": 0.5,     # Lv.3=4, Lv.5=5
		"bounce_attenuation": 0.20,
		"attenuation_per_level": -0.02,
		"range": 300,
		"projectile_speed": 600
	},
	"taoist_thunder_bolt": {
		"name": "天雷击",
		"description": "从天空降下一道落雷，高额单体伤害",
		"tags": ["雷", "投射", "输出"],
		"damage_base": 25,
		"damage_per_level": 6,
		"cooldown": 3.5,
		"cooldown_per_level": -0.08,
		"crit_rate_bonus": 0.05,
		"crit_rate_per_level": 0.03,
		"range": 400
	},
	"taoist_thunder_cloud": {
		"name": "雷云",
		"description": "头顶生成雷云，自动对附近敌人放电",
		"tags": ["雷", "光环", "输出"],
		"damage_base": 6,
		"damage_per_level": 1,
		"cooldown": 1.5,             # 放电间隔
		"cooldown_per_level": -0.03,
		"range": 250,
		"range_per_level": 10,
		"duration": 8.0,
		"duration_per_level": 1.0
	},
	"taoist_paralyze_zone": {
		"name": "麻痹领域",
		"description": "在目标位置释放麻痹区域，减速并概率定身敌人",
		"tags": ["雷", "区域", "控制"],
		"damage_base": 4,
		"damage_per_level": 1,
		"cooldown": 6.0,
		"cooldown_per_level": -0.03,
		"range": 60,
		"range_per_level": 5,
		"duration": 4.0,
		"slow_percent": 0.4,
		"slow_per_level": 0.05,
		"stun_chance": 0.15,
		"stun_per_level": 0.03
	},
	"taoist_burn_curse": {
		"name": "燃烧咒",
		"description": "点燃目标，灼烧持续伤害，可扩散到附近敌人",
		"tags": ["火", "投射", "输出"],
		"damage_base": 10,
		"damage_per_level": 1,
		"burn_dps": 4,
		"burn_dps_per_level": 2,
		"burn_duration": 3.0,
		"burn_duration_per_level": 0.5,
		"pierce": 3,
		"spread_range": 80,
		"spread_per_level": 5,
		"cooldown": 2.0,
		"cooldown_per_level": -0.03,
		"range": 350
	},

	# =====================
	# 🔥 火系·道士（2+2 被动）
	# =====================
	"taoist_fire_wall": {
		"name": "火墙",
		"description": "召唤一堵火焰墙壁，穿过者受到灼烧伤害",
		"tags": ["火", "区域", "输出"],
		"damage_base": 12,
		"damage_per_level": 1,
		"cooldown": 5.0,
		"cooldown_per_level": -0.03,
		"duration": 5.0,
		"duration_per_level": 0.5,
		"range": 60,
		"range_per_level": 5
	},
	"taoist_ignite_explode": {
		"name": "焚身爆",
		"description": "处于灼烧状态的敌人死亡时爆炸，对周围造成火焰伤害",
		"tags": ["火", "区域", "输出"],
		"damage_base": 15,
		"damage_per_level": 4,
		"explode_range": 60,
		"explode_range_per_level": 5,
		"cooldown": 0,
		"passive": true
	},

	# =====================
	# 💀 死灵系·道士（3+2 被动）
	# =====================
	"taoist_summon_skeleton": {
		"name": "召唤骷髅",
		"description": "召唤一个近战骷髅兵为你作战",
		"tags": ["召唤", "输出"],
		"damage_base": 6,
		"damage_per_level": 1,
		"cooldown": 6.0,
		"cooldown_per_level": -0.15,
		"summon_hp": 30,
		"summon_hp_per_level": 10,
		"summon_limit": 3,
		"summon_limit_per_level": 0.5,   # Lv.3=4, Lv.5=5
		"duration": 15.0
	},
	"taoist_summon_archer": {
		"name": "骷髅射手",
		"description": "召唤一个远程骷髅射手",
		"tags": ["召唤", "投射"],
		"damage_base": 8,
		"damage_per_level": 1,
		"cooldown": 7.0,
		"cooldown_per_level": -0.15,
		"summon_hp": 20,
		"summon_hp_per_level": 8,
		"summon_limit": 2,
		"summon_limit_per_level": 0,     # 保持 2 只
		"duration": 12.0,
		"attack_range": 250,
		"attack_range_per_level": 10
	},
	"taoist_raise_dead": {
		"name": "亡者复苏",
		"description": "击杀敌人时有概率将其复活为骷髅为你作战",
		"tags": ["召唤", "增益"],
		"revive_chance": 0.25,
		"chance_per_level": 0.05,
		"summon_hp": 15,
		"summon_hp_per_level": 5,
		"summon_limit": 4,
		"summon_limit_per_level": 0.5,
		"cooldown": 0,
		"passive": true
	},
	"taoist_skull_enhance": {
		"name": "骷髅强化",
		"description": "提升所有骷髅系召唤物的攻击力和生命值",
		"tags": ["召唤", "增益"],
		"attack_buff": 0.30,
		"attack_buff_per_level": 0.10,
		"hp_buff": 0.30,
		"hp_buff_per_level": 0.10,
		"cooldown": 0,
		"passive": true
	},
	"taoist_corpse_burst": {
		"name": "尸爆",
		"description": "骷髅死亡时爆炸，对周围敌人造成范围伤害",
		"tags": ["召唤", "区域", "输出"],
		"damage_base": 12,
		"damage_per_level": 1,
		"explode_range": 70,
		"explode_range_per_level": 5,
		"cooldown": 0,
		"passive": true
	}
}

static func load_data() -> void:
	print("[SkillConfig] 已加载 ", _configs.size(), " 个技能")

static func get_all_ids() -> Array[String]:
	return _configs.keys()

static func get_config(id: String) -> Dictionary:
	return _configs.get(id, {}).duplicate(true)

static func get_skill_pool(count: int) -> Array[String]:
	var keys = _configs.keys()
	keys.shuffle()
	return keys.slice(0, min(count, keys.size()))
