## EvolutionConfig - 技能进化配置 v2.0
## 主技能 Lv.5 + 催化技能 Lv.3 = 进化
## 进化技能 ≈ 普通技能 Lv.5 的 2-3 倍强度

class_name EvolutionConfig
extends RefCounted

static var _configs: Dictionary = {
	"meteor": {
		"name": "陨石术",
		"description": "大范围火陨石，命中后留下燃烧地面",
		"base_skill": "fireball",
		"catalyst_skill": "fire_attunement",
		"base_min_level": 5,
		"catalyst_min_level": 3,
		"result_tags": ["火", "区域", "范围输出"],
		"damage_base": 80,
		"damage_per_level": 40,
		"cooldown": 6.0,
		"cooldown_per_level": -0.5,
		"range": 350,
		"explosion_range": 120,
		"burn_duration": 3.0,
		"burn_dps": 10
	},
	"ice_thorn_storm": {
		"name": "冰棘风暴",
		"description": "环绕分裂冰棘，冻结敌人后触发碎裂",
		"base_skill": "ice_shard",
		"catalyst_skill": "ice_barrier",
		"base_min_level": 5,
		"catalyst_min_level": 3,
		"result_tags": ["冰", "区域", "控制"],
		"damage_base": 30,
		"damage_per_level": 15,
		"cooldown": 5.0,
		"cooldown_per_level": -0.3,
		"range": 300,
		"freeze_duration": 2.0,
		"projectile_count": 6
	},
	"thunder_net": {
		"name": "雷网审判",
		"description": "感电目标之间生成连锁雷网",
		"base_skill": "chain_lightning",
		"catalyst_skill": "thunder_mark",
		"base_min_level": 5,
		"catalyst_min_level": 3,
		"result_tags": ["雷", "区域", "连锁催化"],
		"damage_base": 25,
		"damage_per_level": 12,
		"cooldown": 4.0,
		"cooldown_per_level": -0.3,
		"chain_count": 6,
		"range": 400
	},
	"holy_obelisk": {
		"name": "圣泉方尖碑",
		"description": "固定治疗塔，周期治疗并净化",
		"base_skill": "holy_guardian",
		"catalyst_skill": "life_spring",
		"base_min_level": 5,
		"catalyst_min_level": 3,
		"result_tags": ["圣", "召唤", "治疗"],
		"heal_per_second": 15,
		"heal_per_level": 5,
		"cooldown": 15.0,
		"duration": 20.0,
		"purge_interval": 3.0,
		"range": 300
	},
	"corrosive_lance": {
		"name": "腐蚀长矛",
		"description": "穿透毒矛，毒层满后触发爆毒",
		"base_skill": "poison_dart",
		"catalyst_skill": "venom_coat",
		"base_min_level": 5,
		"catalyst_min_level": 3,
		"result_tags": ["毒", "投射", "输出"],
		"damage_base": 35,
		"damage_per_level": 15,
		"cooldown": 3.5,
		"range": 450,
		"poison_dps": 8,
		"explosion_damage": 50
	},
	"doom_star": {
		"name": "灾厄飞星",
		"description": "追踪飞弹附带抗性削弱",
		"base_skill": "magic_missile",
		"catalyst_skill": "doom_aura",
		"base_min_level": 5,
		"catalyst_min_level": 3,
		"result_tags": ["灾厄", "投射", "削弱"],
		"damage_base": 20,
		"damage_per_level": 10,
		"cooldown": 3.0,
		"cooldown_per_level": -0.2,
		"range": 500,
		"homing": true,
		"resistance_reduction": 0.2
	},
	"charge_banner": {
		"name": "冲锋战旗",
		"description": "召唤物攻速、移速提升，击杀延长持续",
		"base_skill": "vengeance_banner",
		"catalyst_skill": "swift_wind",
		"base_min_level": 5,
		"catalyst_min_level": 3,
		"result_tags": ["圣", "召唤", "增益"],
		"attack_speed_buff": 0.4,
		"move_speed_buff": 0.3,
		"kill_extend": 1.0,
		"duration": 10.0,
		"cooldown": 18.0,
		"range": 300
	},
	"frost_iron_wall": {
		"name": "寒铁壁垒",
		"description": "护盾破裂时冻结周围敌人并反伤",
		"base_skill": "steel_skin",
		"catalyst_skill": "ice_barrier",
		"base_min_level": 5,
		"catalyst_min_level": 3,
		"result_tags": ["冰", "护盾", "防御"],
		"shield_base": 80,
		"shield_per_level": 30,
		"freeze_duration": 2.5,
		"retaliate_damage": 40,
		"cooldown": 12.0,
		"duration": 5.0
	}
}

static func load_data() -> void:
	print("[EvolutionConfig] 已加载 ", _configs.size(), " 个进化组合")

static func get_all_ids() -> Array[String]:
	return _configs.keys()

static func get_config(id: String) -> Dictionary:
	return _configs.get(id, {}).duplicate(true)

static func find_evolution(base_skill_id: String, base_level: int, catalyst_levels: Dictionary) -> String:
	for evo_id in _configs:
		var evo = _configs[evo_id]
		if evo.base_skill == base_skill_id and base_level >= evo.base_min_level:
			var cat_id = evo.catalyst_skill
			if catalyst_levels.get(cat_id, 0) >= evo.catalyst_min_level:
				return evo_id
	return ""
