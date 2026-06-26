## SkillConfig - 技能配置
## 基础技能数据：标签、升级、进化催化关系

extends Node

static var _configs: Dictionary = {
	"fireball": {
		"name": "爆裂火球",
		"description": "发射一颗爆炸火球",
		"tags": ["火", "投射", "范围输出"],
		"damage_base": 15,
		"damage_per_level": 8,
		"cooldown": 2.0,
		"cooldown_per_level": -0.1,
		"count_base": 1,
		"range": 400,
		"projectile_speed": 500
	},
	"ice_shard": {
		"name": "分裂冰锥",
		"description": "发射分裂冰锥，命中后分裂",
		"tags": ["冰", "投射", "控制"],
		"damage_base": 10,
		"damage_per_level": 5,
		"cooldown": 2.5,
		"cooldown_per_level": -0.15,
		"count_base": 3,
		"range": 350,
		"projectile_speed": 450
	},
	"chain_lightning": {
		"name": "弹射闪电",
		"description": "闪电弹射命中多个敌人",
		"tags": ["雷", "投射", "连锁催化"],
		"damage_base": 12,
		"damage_per_level": 6,
		"cooldown": 3.0,
		"cooldown_per_level": -0.2,
		"bounce_count": 3,
		"range": 300,
		"projectile_speed": 600
	},
	"poison_dart": {
		"name": "穿心毒刺",
		"description": "穿透毒刺，叠加毒层",
		"tags": ["毒", "投射", "输出"],
		"damage_base": 8,
		"damage_per_level": 4,
		"cooldown": 1.5,
		"cooldown_per_level": -0.05,
		"poison_dps": 3,
		"poison_stack_max": 5,
		"range": 400,
		"projectile_speed": 550
	},
	"magic_missile": {
		"name": "魔法飞弹",
		"description": "自动追踪的魔法飞弹",
		"tags": ["灾厄", "投射", "输出"],
		"damage_base": 8,
		"damage_per_level": 4,
		"cooldown": 1.0,
		"cooldown_per_level": -0.05,
		"count_base": 1,
		"count_per_level": 1,
		"range": 500,
		"projectile_speed": 400,
		"homing": true
	},
	"holy_guardian": {
		"name": "圣光守卫",
		"description": "召唤一个治疗守卫",
		"tags": ["圣", "召唤", "治疗"],
		"damage_base": 0,
		"cooldown": 8.0,
		"cooldown_per_level": -0.5,
		"heal_per_second": 5,
		"heal_per_level": 2,
		"duration": 10.0,
		"summon_limit": 2
	},
	"life_spring": {
		"name": "生命源泉",
		"description": "周期性治疗附近友军",
		"tags": ["圣", "光环", "治疗"],
		"heal_base": 8,
		"heal_per_level": 3,
		"cooldown": 6.0,
		"cooldown_per_level": -0.3,
		"range": 200
	},
	"vengeance_banner": {
		"name": "复仇战旗",
		"description": "召唤战旗提升附近召唤物攻速",
		"tags": ["圣", "召唤", "增益"],
		"damage_base": 0,
		"cooldown": 12.0,
		"cooldown_per_level": -0.5,
		"attack_speed_buff": 0.2,
		"buff_per_level": 0.05,
		"duration": 8.0,
		"range": 250
	},
	"swift_wind": {
		"name": "迅捷之风",
		"description": "提升自身和召唤物移动速度",
		"tags": ["圣", "光环", "增益"],
		"move_speed_bonus": 0.15,
		"bonus_per_level": 0.03,
		"duration": 5.0,
		"cooldown": 8.0
	},
	"steel_skin": {
		"name": "钢铁皮肤",
		"description": "获得一个吸收护盾",
		"tags": ["圣", "护盾", "防御"],
		"shield_base": 30,
		"shield_per_level": 15,
		"duration": 4.0,
		"cooldown": 10.0,
		"cooldown_per_level": -0.4
	},
	"fire_attunement": {
		"name": "炎附",
		"description": "攻击附加火焰伤害",
		"tags": ["火", "附伤", "增益"],
		"bonus_damage": 5,
		"damage_per_level": 3,
		"duration": 6.0,
		"cooldown": 8.0
	},
	"ice_barrier": {
		"name": "冰霜结界",
		"description": "冻结周围敌人的护盾反击",
		"tags": ["冰", "护盾", "控制"],
		"shield_base": 20,
		"shield_per_level": 10,
		"freeze_duration": 1.5,
		"cooldown": 7.0,
		"cooldown_per_level": -0.3
	},
	"thunder_mark": {
		"name": "感电烙印",
		"description": "目标受到额外雷系伤害",
		"tags": ["雷", "附伤", "连锁催化"],
		"bonus_damage": 8,
		"damage_per_level": 4,
		"duration": 4.0,
		"cooldown": 6.0
	},
	"venom_coat": {
		"name": "淬毒",
		"description": "武器附加毒系伤害",
		"tags": ["毒", "附伤", "增益"],
		"bonus_damage": 4,
		"damage_per_level": 2,
		"poison_dps": 2,
		"duration": 5.0,
		"cooldown": 7.0
	},
	"doom_aura": {
		"name": "灾厄光环",
		"description": "周围敌人抗性降低",
		"tags": ["灾厄", "光环", "削弱"],
		"resistance_reduction": 0.15,
		"reduction_per_level": 0.05,
		"range": 200,
		"duration": 0  # 持续光环
	}
}

static func load_data() -> void:
	print("[SkillConfig] 已加载 ", _configs.size(), " 个基础技能")

static func get_all_ids() -> Array[String]:
	return _configs.keys()

static func get_config(id: String) -> Dictionary:
	return _configs.get(id, {}).duplicate(true)

static func get_skill_pool(count: int) -> Array[String]:
	var keys = _configs.keys()
	keys.shuffle()
	return keys.slice(0, min(count, keys.size()))
