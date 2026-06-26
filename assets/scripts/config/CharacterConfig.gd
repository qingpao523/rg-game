## CharacterConfig - 角色配置
## 5 个 MVP 职业：道士、武士、法老、寒冰女巫、十字军

extends Node

static var _configs: Dictionary = {
	"taoist": {
		"name": "道士",
		"description": "中距离爆发，适配暴击与雷系构筑",
		"hp": 90,
		"mana": 60,
		"move_speed": 200.0,
		"exp_to_level": 20,
		"active_skill_id": "thunder_seal",
		"passives": [
			{"id": "crit_boost", "value": 0.05}
		]
	},
	"samurai": {
		"name": "武士",
		"description": "高操作近战，适配击杀连锁与近战爆发",
		"hp": 120,
		"mana": 40,
		"move_speed": 240.0,
		"exp_to_level": 22,
		"active_skill_id": "flash_slash",
		"passives": [
			{"id": "kill_cdr", "value": 0.3}
		]
	},
	"pharaoh": {
		"name": "法老",
		"description": "召唤调度，适配召唤物与受击收益",
		"hp": 80,
		"mana": 70,
		"move_speed": 180.0,
		"exp_to_level": 18,
		"active_skill_id": "sarcophagus",
		"passives": [
			{"id": "summon_boost", "value": 0.15}
		]
	},
	"ice_witch": {
		"name": "寒冰女巫",
		"description": "控场法师，适配冰冻、范围和减速构筑",
		"hp": 75,
		"mana": 80,
		"move_speed": 190.0,
		"exp_to_level": 16,
		"active_skill_id": "frozen_field",
		"passives": [
			{"id": "freeze_duration", "value": 0.5}
		]
	},
	"crusader": {
		"name": "十字军",
		"description": "正面抗压，适配护盾、受击和真伤构筑",
		"hp": 150,
		"mana": 30,
		"move_speed": 170.0,
		"exp_to_level": 25,
		"active_skill_id": "holy_shield",
		"passives": [
			{"id": "shield_absorb", "value": 0.2}
		]
	}
}

static func load_data() -> void:
	print("[CharacterConfig] 已加载 ", _configs.size(), " 个职业")

static func get_all_ids() -> Array[String]:
	return _configs.keys()

static func get_config(id: String) -> Dictionary:
	return _configs.get(id, {}).duplicate(true)
